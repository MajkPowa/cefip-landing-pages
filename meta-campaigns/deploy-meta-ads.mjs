#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, stat, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(SCRIPT_DIR);
const DEFAULT_PLAN = path.join(SCRIPT_DIR, "campaign-plan.json");
const DEFAULT_CHECKPOINT = path.join(SCRIPT_DIR, ".meta-ads-checkpoint.json");
const DEFAULT_GRAPH_VERSION = "v25.0";
const EXPECTED_CAMPAIGNS = 2;
const EXPECTED_ADS = 12;
const PAUSED = "PAUSED";
const GRAPH_ORIGIN = "https://graph.facebook.com";

// Marketing API permissions used by this deployer. Creatives intentionally use
// only their Facebook Page identity (Meta's page-backed Instagram fallback), so
// the separate Instagram Graph API `instagram_basic` permission is not required.
export const REQUIRED_META_PERMISSIONS = Object.freeze([
  "ads_management",
  "ads_read",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_ads",
]);

export const PAGE_ACCESS_FIELDS = "id,name,tasks,instagram_business_account{id},connected_instagram_account{id}";

export function parseArgs(argv) {
  const options = {
    execute: false,
    tokenStdin: false,
    json: false,
    help: false,
    planPath: DEFAULT_PLAN,
    checkpointPath: DEFAULT_CHECKPOINT,
    apiVersion: undefined,
    videoTimeoutMs: 15 * 60 * 1000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") options.execute = true;
    else if (arg === "--token-stdin") options.tokenStdin = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (["--plan", "--checkpoint", "--api-version", "--video-timeout-ms"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Chybí hodnota pro ${arg}.`);
      index += 1;
      if (arg === "--plan") options.planPath = path.resolve(value);
      if (arg === "--checkpoint") options.checkpointPath = path.resolve(value);
      if (arg === "--api-version") options.apiVersion = value;
      if (arg === "--video-timeout-ms") options.videoTimeoutMs = Number(value);
    } else {
      throw new Error(`Neznámý parametr: ${arg}`);
    }
  }

  if (options.tokenStdin && !options.execute) {
    throw new Error("--token-stdin lze použít pouze společně s --execute.");
  }
  if (!Number.isInteger(options.videoTimeoutMs) || options.videoTimeoutMs < 60_000) {
    throw new Error("--video-timeout-ms musí být celé číslo alespoň 60000.");
  }
  return options;
}

export function usage() {
  return `CEFIP Meta Ads deployer (výchozí režim: bezpečný dry-run)

Použití:
  node meta-campaigns/deploy-meta-ads.mjs
  Get-Clipboard | node meta-campaigns/deploy-meta-ads.mjs --execute --token-stdin
  node meta-campaigns/deploy-meta-ads.mjs --execute

Parametry:
  --execute                 Povolí zápis do Meta API. Bez něj se API vůbec nevolá.
  --token-stdin             Načte token ze stdin (doporučeno; jen s --execute).
  --plan <soubor>           Jiný campaign-plan.json.
  --checkpoint <soubor>     Jiný lokální checkpoint pro bezpečné pokračování.
  --api-version <vN.N>      Graph API verze; výchozí META_GRAPH_VERSION / plán / v25.0.
  --video-timeout-ms <ms>   Limit čekání na zpracování videa (min. 60000).
  --json                    Strojově čitelný výstup dry-runu.
  --help                    Tato nápověda.

Token se nikdy nepřijímá v argumentu. Bez --token-stdin se při --execute čte pouze
z META_ADS_ACCESS_TOKEN. Všechny kampaně, sady a reklamy se vždy vytvářejí PAUSED.`;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function isNumericId(value) {
  return typeof value === "string" && /^\d{8,30}$/.test(value);
}

function isNonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveWithin(root, relativePath, label, errors) {
  if (!isNonEmpty(relativePath) || path.isAbsolute(relativePath)) {
    errors.push(`${label} musí být neprázdná relativní cesta.`);
    return undefined;
  }
  const absoluteRoot = path.resolve(root);
  const resolved = path.resolve(absoluteRoot, relativePath);
  const prefix = `${absoluteRoot}${path.sep}`;
  if (resolved !== absoluteRoot && !resolved.startsWith(prefix)) {
    errors.push(`${label} míří mimo nakonfigurovaný kořen assetů.`);
    return undefined;
  }
  return resolved;
}

function buildLandingUrl(campaign, ad) {
  const result = new URL(campaign.landingUrl);
  if (ad.variant && ad.variant !== "default") result.searchParams.set("v", ad.variant);
  return result.toString();
}

export async function loadAndValidatePlan(planPath = DEFAULT_PLAN, { checkFiles = true } = {}) {
  const raw = await readFile(planPath, "utf8");
  let plan;
  try {
    plan = JSON.parse(raw);
  } catch {
    throw new Error(`Plán není platný JSON: ${planPath}`);
  }
  const validation = await validatePlan(plan, { planPath, checkFiles });
  return {
    ...validation,
    raw,
    planSha256: createHash("sha256").update(raw).digest("hex"),
  };
}

export async function validatePlan(plan, { planPath = DEFAULT_PLAN, checkFiles = true } = {}) {
  const errors = [];
  const assets = new Map();
  const planRepoRoot = path.dirname(path.dirname(path.resolve(planPath)));

  assert(plan && typeof plan === "object", "Kořen plánu musí být objekt.", errors);
  if (!plan || typeof plan !== "object") throw new Error(errors.join("\n"));
  assert(plan.mode === "PAUSED_DRAFT_ONLY", "mode musí být PAUSED_DRAFT_ONLY.", errors);
  assert(isNumericId(plan.meta?.businessId), "meta.businessId není platné Meta ID.", errors);
  assert(isNumericId(plan.meta?.adAccountId), "meta.adAccountId není platné Meta ID.", errors);
  assert(isNumericId(plan.meta?.datasetId), "meta.datasetId není platné Meta ID.", errors);
  assert(/^v\d+\.\d+$/.test(plan.meta?.graphVersion ?? ""), "meta.graphVersion musí mít formát vN.N.", errors);
  assert(plan.defaults?.status === PAUSED, "defaults.status musí být PAUSED.", errors);
  assert(plan.defaults?.specialAdCategory === "HOUSING", "specialAdCategory musí být HOUSING.", errors);
  assert(plan.defaults?.conversionLocation === "WEBSITE", "conversionLocation musí být WEBSITE.", errors);
  assert(plan.defaults?.optimizationEvent === "LEAD", "optimizationEvent musí být LEAD.", errors);
  assert(plan.defaults?.proposedDailyBudgetCzk === 750, "Denní rozpočet musí být přesně 750 CZK na kampaň.", errors);
  assert(Array.isArray(plan.defaults?.geoCities) && plan.defaults.geoCities.length === 8, "Plán musí obsahovat osm cílových měst.", errors);
  assert(isNonEmpty(plan.defaults?.urlParameters), "Chybí URL parametry.", errors);
  assert(Array.isArray(plan.campaigns) && plan.campaigns.length === EXPECTED_CAMPAIGNS, `Plán musí obsahovat přesně ${EXPECTED_CAMPAIGNS} kampaně.`, errors);
  assert(isNonEmpty(plan.assetRoots?.static), "Chybí assetRoots.static.", errors);
  assert(isNonEmpty(plan.assetRoots?.video), "Chybí assetRoots.video.", errors);

  const staticRoot = path.resolve(planRepoRoot, plan.assetRoots?.static ?? "");
  const videoRoot = path.resolve(planRepoRoot, plan.assetRoots?.video ?? "");
  const campaignKeys = new Set();
  const entityNames = new Set();
  let adCount = 0;
  let staticCount = 0;
  let videoCount = 0;

  for (const campaign of plan.campaigns ?? []) {
    assert(isNonEmpty(campaign.key) && !campaignKeys.has(campaign.key), `Neplatný nebo duplicitní campaign.key: ${campaign.key ?? "(prázdné)"}.`, errors);
    campaignKeys.add(campaign.key);
    assert(isNonEmpty(campaign.name) && !entityNames.has(campaign.name), `Neplatný nebo duplicitní název kampaně: ${campaign.name ?? "(prázdné)"}.`, errors);
    entityNames.add(campaign.name);
    assert(isNonEmpty(campaign.adSetName), `Kampaň ${campaign.key} nemá adSetName.`, errors);
    assert(isNumericId(campaign.pageId), `Kampaň ${campaign.key} nemá platné pageId.`, errors);
    assert(campaign.identityMode === "PAGE_BACKED", `Kampaň ${campaign.key} musí používat identityMode PAGE_BACKED.`, errors);
    assert(!Object.hasOwn(campaign, "instagramActorId"), `Kampaň ${campaign.key} nesmí obsahovat neověřený instagramActorId.`, errors);
    assert(isNonEmpty(campaign.dsaBeneficiary), `Kampaň ${campaign.key} nemá DSA beneficiary.`, errors);
    assert(isNonEmpty(campaign.dsaPayor), `Kampaň ${campaign.key} nemá DSA payor.`, errors);
    try {
      const url = new URL(campaign.landingUrl);
      assert(url.protocol === "https:", `Landing URL kampaně ${campaign.key} musí používat HTTPS.`, errors);
    } catch {
      errors.push(`Landing URL kampaně ${campaign.key} není platná.`);
    }
    assert(Array.isArray(campaign.ads) && campaign.ads.length === 6, `Kampaň ${campaign.key} musí mít přesně 6 reklam.`, errors);

    for (const ad of campaign.ads ?? []) {
      adCount += 1;
      const label = `${campaign.key}/${ad.name ?? "(bez názvu)"}`;
      assert(isNonEmpty(ad.name) && !entityNames.has(ad.name), `Neplatný nebo duplicitní název reklamy: ${ad.name ?? "(prázdné)"}.`, errors);
      entityNames.add(ad.name);
      assert(ad.status === PAUSED, `Reklama ${label} musí být PAUSED.`, errors);
      assert(isNonEmpty(ad.variant), `Reklama ${label} nemá variantu landing page.`, errors);
      assert(["STATIC", "VIDEO"].includes(ad.creative?.type), `Reklama ${label} má neplatný creative.type.`, errors);
      assert(isNonEmpty(ad.creative?.primaryText), `Reklama ${label} nemá primaryText.`, errors);
      assert(isNonEmpty(ad.creative?.headline), `Reklama ${label} nemá headline.`, errors);
      assert(["LEARN_MORE", "CONTACT_US"].includes(ad.creative?.cta), `Reklama ${label} má nepovolené CTA.`, errors);
      try {
        buildLandingUrl(campaign, ad);
      } catch {
        errors.push(`Reklama ${label} nedokáže vytvořit platnou landing URL.`);
      }

      if (ad.creative?.type === "STATIC") {
        staticCount += 1;
        const feed = resolveWithin(staticRoot, ad.creative.feedAsset, `${label}.feedAsset`, errors);
        const vertical = resolveWithin(staticRoot, ad.creative.verticalAsset, `${label}.verticalAsset`, errors);
        if (feed) assets.set(`${campaign.key}/${ad.name}/feed`, feed);
        if (vertical) assets.set(`${campaign.key}/${ad.name}/vertical`, vertical);
      } else if (ad.creative?.type === "VIDEO") {
        videoCount += 1;
        const video = resolveWithin(videoRoot, ad.creative.videoAsset, `${label}.videoAsset`, errors);
        if (video) assets.set(`${campaign.key}/${ad.name}/video`, video);
      }
    }
  }

  assert(adCount === EXPECTED_ADS, `Plán musí obsahovat přesně ${EXPECTED_ADS} reklam.`, errors);
  assert(staticCount === 10, "Plán musí obsahovat přesně 10 statických reklam.", errors);
  assert(videoCount === 2, "Plán musí obsahovat přesně 2 videoreklamy.", errors);

  if (checkFiles) {
    for (const [key, assetPath] of assets) {
      try {
        const file = await stat(assetPath);
        assert(file.isFile() && file.size > 0, `Asset ${key} není neprázdný soubor: ${assetPath}`, errors);
      } catch {
        errors.push(`Asset ${key} nebyl nalezen: ${assetPath}`);
      }
    }
  }

  if (errors.length) throw new Error(`Validace plánu selhala:\n- ${errors.join("\n- ")}`);
  return { plan, assets, summary: { campaigns: EXPECTED_CAMPAIGNS, adSets: EXPECTED_CAMPAIGNS, ads: adCount, staticAds: staticCount, videoAds: videoCount, imageUploads: staticCount * 2, videoUploads: videoCount } };
}

function encodeGraphValue(value) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function safeGraphError(body, status, token) {
  const graphError = body?.error;
  const blameFields = graphError?.error_data?.blame_field_specs;
  const parts = [
    `Meta Graph API vrátilo HTTP ${status}.`,
    graphError?.type ? `type=${graphError.type}` : "",
    Number.isInteger(graphError?.code) ? `code=${graphError.code}` : "",
    Number.isInteger(graphError?.error_subcode) ? `subcode=${graphError.error_subcode}` : "",
    graphError?.message ? graphError.message : "",
    graphError?.error_user_title ? `title=${graphError.error_user_title}` : "",
    graphError?.error_user_msg ? `user_msg=${graphError.error_user_msg}` : "",
    Array.isArray(blameFields) && blameFields.length ? `fields=${JSON.stringify(blameFields)}` : "",
    graphError?.error_data?.details ? `details=${graphError.error_data.details}` : "",
    graphError?.fbtrace_id ? `trace=${graphError.fbtrace_id}` : "",
  ].filter(Boolean);
  return parts.join(" ").replaceAll(token, "[REDACTED]");
}

export class GraphClient {
  #accessToken;
  #version;

  constructor({ accessToken, version, fetchImpl = globalThis.fetch }) {
    if (!isNonEmpty(accessToken)) throw new Error("Chybí Meta access token.");
    if (!/^v\d+\.\d+$/.test(version)) throw new Error("Neplatná Graph API verze.");
    if (typeof fetchImpl !== "function") throw new Error("Toto Node.js prostředí nemá fetch API.");
    this.#accessToken = accessToken;
    this.#version = version;
    this.fetchImpl = fetchImpl;
  }

  async request(method, graphPath, params = {}, { formData } = {}) {
    const cleanPath = String(graphPath).replace(/^\/+/, "");
    const url = new URL(`${GRAPH_ORIGIN}/${this.#version}/${cleanPath}`);
    const init = { method, headers: { Authorization: `Bearer ${this.#accessToken}` } };

    if (method === "GET") {
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, encodeGraphValue(value));
    } else if (formData) {
      for (const [key, value] of Object.entries(params)) formData.append(key, encodeGraphValue(value));
      init.body = formData;
    } else {
      const body = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) body.set(key, encodeGraphValue(value));
      init.headers["Content-Type"] = "application/x-www-form-urlencoded";
      init.body = body;
    }

    let response;
    try {
      response = await this.fetchImpl(url, init);
    } catch (error) {
      const message = String(error?.message ?? error).replaceAll(this.#accessToken, "[REDACTED]");
      throw new Error(`Meta Graph API není dostupné: ${message}`);
    }
    let body;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    if (!response.ok || body?.error) throw new Error(safeGraphError(body, response.status, this.#accessToken));
    return body;
  }

  get(graphPath, params) {
    return this.request("GET", graphPath, params);
  }

  post(graphPath, params) {
    return this.request("POST", graphPath, params);
  }

  async upload(graphPath, fieldName, filePath, params = {}) {
    const bytes = await readFile(filePath);
    const form = new FormData();
    form.append(fieldName, new Blob([bytes]), path.basename(filePath));
    return this.request("POST", graphPath, params, { formData: form });
  }

  async listAll(graphPath, params = {}) {
    const rows = [];
    let after;
    do {
      const page = await this.get(graphPath, { ...params, limit: 200, ...(after ? { after } : {}) });
      rows.push(...(page?.data ?? []));
      after = page?.paging?.cursors?.after;
    } while (after);
    return rows;
  }
}

function graphObjective(plan) {
  if (plan.defaults.objective === "LEADS") return "OUTCOME_LEADS";
  throw new Error(`Nepodporovaný cíl kampaně: ${plan.defaults.objective}`);
}

export function buildCampaignPayload(plan, campaign) {
  return {
    name: campaign.name,
    buying_type: plan.defaults.buyingType,
    objective: graphObjective(plan),
    special_ad_categories: ["HOUSING"],
    special_ad_category_country: ["CZ"],
    daily_budget: String(plan.defaults.proposedDailyBudgetCzk * 100),
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    status: PAUSED,
  };
}

export function buildAdSetPayload(plan, campaign, campaignId, resolvedCities) {
  return {
    name: campaign.adSetName,
    campaign_id: campaignId,
    billing_event: "IMPRESSIONS",
    optimization_goal: "OFFSITE_CONVERSIONS",
    destination_type: "WEBSITE",
    promoted_object: { pixel_id: plan.meta.datasetId, custom_event_type: "LEAD" },
    attribution_spec: [
      { event_type: "CLICK_THROUGH", window_days: 7 },
      { event_type: "VIEW_THROUGH", window_days: 1 },
    ],
    dsa_beneficiary: campaign.dsaBeneficiary,
    dsa_payor: campaign.dsaPayor,
    targeting: {
      age_min: 18,
      geo_locations: {
        // Meta requires at least a 17 km radius for city targeting in the
        // HOUSING special-ad category (error subcode 2909035/2909052).
        cities: resolvedCities.map((city) => ({ key: city.key, radius: 17, distance_unit: "kilometer" })),
        location_types: ["home"],
      },
    },
    status: PAUSED,
  };
}

const FEED_PLACEMENTS = {
  publisher_platforms: ["facebook", "instagram"],
  facebook_positions: ["feed", "marketplace", "video_feeds", "search"],
  instagram_positions: ["stream", "explore", "explore_home", "profile_feed"],
};

const VERTICAL_PLACEMENTS = {
  publisher_platforms: ["facebook", "instagram", "messenger"],
  facebook_positions: ["story", "facebook_reels"],
  instagram_positions: ["story", "reels"],
  messenger_positions: ["story"],
};

export function buildStaticCreativePayload(plan, campaign, ad, imageHashes) {
  return {
    name: `${ad.name} | CREATIVE`,
    object_story_spec: { page_id: campaign.pageId },
    asset_feed_spec: {
      ad_formats: ["SINGLE_IMAGE"],
      images: [
        { hash: imageHashes.feed, adlabels: [{ name: "feed-4x5" }] },
        { hash: imageHashes.vertical, adlabels: [{ name: "vertical-9x16" }] },
      ],
      bodies: [{ text: ad.creative.primaryText }],
      titles: [{ text: ad.creative.headline }],
      link_urls: [{ website_url: buildLandingUrl(campaign, ad) }],
      call_to_action_types: [ad.creative.cta],
      asset_customization_rules: [
        { customization_spec: FEED_PLACEMENTS, image_label: { name: "feed-4x5" } },
        { customization_spec: VERTICAL_PLACEMENTS, image_label: { name: "vertical-9x16" } },
      ],
    },
    url_tags: plan.defaults.urlParameters,
  };
}

export function buildVideoCreativePayload(plan, campaign, ad, videoId, thumbnailUrl) {
  return {
    name: `${ad.name} | CREATIVE`,
    object_story_spec: {
      page_id: campaign.pageId,
      video_data: {
        video_id: videoId,
        image_url: thumbnailUrl,
        message: ad.creative.primaryText,
        title: ad.creative.headline,
        call_to_action: { type: ad.creative.cta, value: { link: buildLandingUrl(campaign, ad) } },
      },
    },
    url_tags: plan.defaults.urlParameters,
  };
}

function normalizePlace(value) {
  return String(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("cs-CZ").trim();
}

function normalizeAdAccountId(value) {
  return String(value ?? "").replace(/^act_/, "");
}

/**
 * AdAccount.business is the owner, not every portfolio with partner/client access.
 * Accept the expected portfolio only when the account appears on exactly one of
 * its official Business edges. Merely being able to GET the account is not enough.
 */
export function resolveBusinessAdAccountRelationship({ account, adAccountId, businessId, ownedAccounts, clientAccounts }) {
  const expectedAccountId = normalizeAdAccountId(adAccountId);
  const ownedMatches = ownedAccounts.filter((row) => normalizeAdAccountId(row.id) === expectedAccountId);
  const clientMatches = clientAccounts.filter((row) => normalizeAdAccountId(row.id) === expectedAccountId);
  if (ownedMatches.length > 1 || clientMatches.length > 1 || (ownedMatches.length && clientMatches.length)) {
    throw new Error(`Vazba reklamního účtu ${expectedAccountId} na business ${businessId} je nejednoznačná.`);
  }
  if (!ownedMatches.length && !clientMatches.length) {
    throw new Error(`Business portfolio ${businessId} nemá reklamní účet ${expectedAccountId} ani v owned_ad_accounts, ani v client_ad_accounts.`);
  }

  const relationship = ownedMatches.length ? "OWNED" : "CLIENT";
  const edgeAccount = ownedMatches[0] ?? clientMatches[0];
  const ownerBusinessId = String(account.business?.id ?? edgeAccount.business?.id ?? "");
  if (relationship === "OWNED" && ownerBusinessId && ownerBusinessId !== String(businessId)) {
    throw new Error(`Účet je na owned_ad_accounts businessu ${businessId}, ale AdAccount.business uvádí vlastníka ${ownerBusinessId}.`);
  }
  if (normalizeAdAccountId(account.id) !== expectedAccountId) throw new Error("Preflight vrátil jiný reklamní účet.");
  if (edgeAccount.currency && account.currency && edgeAccount.currency !== account.currency) {
    throw new Error("Měna reklamního účtu se mezi AdAccount a Business edge neshoduje.");
  }
  if (edgeAccount.account_status != null && account.account_status != null && Number(edgeAccount.account_status) !== Number(account.account_status)) {
    throw new Error("Stav reklamního účtu se mezi AdAccount a Business edge neshoduje.");
  }
  return { relationship, portfolioBusinessId: String(businessId), ownerBusinessId: ownerBusinessId || undefined };
}

export function validatePageBackedIdentityPreflight({ campaigns, instagramAccounts, pages }) {
  const invalidCampaign = campaigns.find((campaign) => campaign.identityMode !== "PAGE_BACKED" || Object.hasOwn(campaign, "instagramActorId"));
  if (invalidCampaign) {
    throw new Error(`Kampaň ${invalidCampaign.key} není bezpečně nakonfigurována pro PAGE_BACKED identitu bez instagramActorId.`);
  }
  if (instagramAccounts.length) {
    const ids = instagramAccounts.map((account) => account.id).filter(Boolean).join(", ");
    throw new Error(`Reklamní účet nově zpřístupňuje Instagram účet (${ids || "ID neuvedeno"}). PAGE_BACKED fallback se zastavil, aby nebyla bez schválení použita jiná identita.`);
  }

  const pagesById = new Map(pages.map((page) => [String(page.id), page]));
  const checkedPages = [];
  for (const campaign of campaigns) {
    const page = pagesById.get(campaign.pageId);
    if (!page) throw new Error(`Facebook stránka ${campaign.pageId} není dostupná.`);
    const tasks = Array.isArray(page.tasks) ? page.tasks.map((task) => String(task).toUpperCase()) : [];
    if (!tasks.includes("ADVERTISE")) {
      throw new Error(`Token nemá na Facebook stránce ${campaign.pageId} úlohu ADVERTISE.`);
    }
    const connectedIds = [page.instagram_business_account?.id, page.connected_instagram_account?.id].filter(Boolean).map(String);
    if (connectedIds.length) {
      throw new Error(`Facebook stránka ${campaign.pageId} je nově propojena s Instagram účtem ${connectedIds.join(", ")}. PAGE_BACKED fallback vyžaduje nové schválení identity.`);
    }
    checkedPages.push({ pageId: campaign.pageId, name: page.name, tasks: ["ADVERTISE"], instagramConnected: false });
  }
  return { mode: "PAGE_BACKED", instagramActorIdsUsed: [], pages: checkedPages };
}

async function resolveGeoLocations(client, cityNames) {
  const resolved = [];
  for (const cityName of cityNames) {
    const result = await client.get("search", {
      type: "adgeolocation",
      location_types: ["city"],
      country_code: "CZ",
      q: cityName,
      limit: 50,
    });
    const candidates = (result?.data ?? []).filter((row) => row.country_code === "CZ" && row.type === "city");
    const exact = candidates.filter((row) => normalizePlace(row.name) === normalizePlace(cityName));
    if (exact.length !== 1 || !isNonEmpty(exact[0]?.key)) {
      throw new Error(`Meta geolocation nedala jednoznačný výsledek pro „${cityName}“ (${exact.length} přesných shod).`);
    }
    resolved.push({ key: exact[0].key, name: exact[0].name, region: exact[0].region, country_code: exact[0].country_code });
  }
  return resolved;
}

async function preflight(client, plan) {
  const accountId = `act_${plan.meta.adAccountId}`;
  const permissions = await client.get("me/permissions", {});
  const granted = new Set((permissions?.data ?? []).filter((row) => row.status === "granted").map((row) => row.permission));
  const missingPermissions = REQUIRED_META_PERMISSIONS.filter((permission) => !granted.has(permission));
  if (missingPermissions.length) {
    throw new Error(`Token nemá všechna oprávnění potřebná pro bezpečný preflight a tvorbu reklam: ${missingPermissions.join(", ")}.`);
  }

  const business = await client.get(plan.meta.businessId, { fields: "id,name,verification_status" });
  if (String(business.id ?? "") !== plan.meta.businessId) throw new Error("Preflight vrátil jiné business portfolio.");

  const accountFields = "id,name,currency,account_status,disable_reason,business{id,name}";
  const account = await client.get(accountId, { fields: accountFields });
  const ownedAccounts = await client.listAll(`${plan.meta.businessId}/owned_ad_accounts`, { fields: accountFields });
  const clientAccounts = await client.listAll(`${plan.meta.businessId}/client_ad_accounts`, { fields: accountFields });
  const businessRelationship = resolveBusinessAdAccountRelationship({
    account,
    adAccountId: plan.meta.adAccountId,
    businessId: plan.meta.businessId,
    ownedAccounts,
    clientAccounts,
  });
  if (account.currency !== "CZK") throw new Error(`Reklamní účet musí být veden v CZK; Meta hlásí ${account.currency ?? "neznámou měnu"}.`);
  if (Number(account.account_status) !== 1) throw new Error(`Reklamní účet není aktivní pro přípravu reklam (account_status=${account.account_status}).`);

  const pixels = await client.listAll(`${accountId}/adspixels`, { fields: "id,name" });
  if (!pixels.some((pixel) => String(pixel.id) === plan.meta.datasetId)) {
    throw new Error(`Dataset/pixel ${plan.meta.datasetId} není dostupný z reklamního účtu.`);
  }

  const instagramAccounts = await client.listAll(`${accountId}/instagram_accounts`, { fields: "id,username" });
  // Page access tasks belong to the /me/accounts edge for a User token. Asking
  // for `tasks` on /{page-id} returns OAuthException code 100 in this context.
  const pages = await client.listAll("me/accounts", { fields: PAGE_ACCESS_FIELDS });
  const identity = validatePageBackedIdentityPreflight({ campaigns: plan.campaigns, instagramAccounts, pages });

  const resolvedCities = await resolveGeoLocations(client, plan.defaults.geoCities);
  return {
    business: { id: business.id, name: business.name, verificationStatus: business.verification_status },
    account: { id: normalizeAdAccountId(account.id), name: account.name, currency: account.currency, ...businessRelationship },
    identity,
    resolvedCities,
  };
}

function initialCheckpoint({ planSha256, graphVersion, plan, preflightResult }) {
  return {
    schemaVersion: 1,
    planSha256,
    graphVersion,
    adAccountId: plan.meta.adAccountId,
    mode: "PAUSED_DRAFT_ONLY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preflight: preflightResult,
    campaigns: {},
  };
}

async function loadCheckpoint(checkpointPath) {
  try {
    return JSON.parse(await readFile(checkpointPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw new Error(`Checkpoint nelze načíst: ${checkpointPath}`);
  }
}

function verifyCheckpoint(checkpoint, { planSha256, graphVersion, plan }) {
  const mismatches = [];
  if (checkpoint.schemaVersion !== 1) mismatches.push("schemaVersion");
  if (checkpoint.planSha256 !== planSha256) mismatches.push("planSha256");
  if (checkpoint.graphVersion !== graphVersion) mismatches.push("graphVersion");
  if (checkpoint.adAccountId !== plan.meta.adAccountId) mismatches.push("adAccountId");
  if (checkpoint.mode !== "PAUSED_DRAFT_ONLY") mismatches.push("mode");
  if (mismatches.length) {
    throw new Error(`Checkpoint neodpovídá tomuto spuštění (${mismatches.join(", ")}). Použijte nový --checkpoint; stávající soubor nemažte naslepo.`);
  }
}

async function saveCheckpoint(checkpointPath, checkpoint) {
  checkpoint.updatedAt = new Date().toISOString();
  await mkdir(path.dirname(checkpointPath), { recursive: true });
  const temporary = `${checkpointPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, checkpointPath);
}

function getCampaignState(checkpoint, campaign) {
  checkpoint.campaigns[campaign.key] ??= { name: campaign.name, ads: {}, uploads: {}, creatives: {} };
  return checkpoint.campaigns[campaign.key];
}

async function assertPausedNode(client, id, kind, { correctNewNode = false } = {}) {
  let node = await client.get(id, { fields: "id,name,status,effective_status" });
  if (node.status !== PAUSED && correctNewNode) {
    await client.post(id, { status: PAUSED });
    node = await client.get(id, { fields: "id,name,status,effective_status" });
  }
  if (node.status !== PAUSED) {
    throw new Error(`${kind} ${id} není PAUSED (status=${node.status}). Skript ji z bezpečnostních důvodů nepoužije ani neupraví.`);
  }
  return node;
}

async function exactNamedRows(client, edge, name, fields) {
  const rows = await client.listAll(edge, { fields });
  return rows.filter((row) => row.name === name);
}

async function findOrCreateCampaign(client, plan, campaign, state, checkpointPath, checkpoint, logger) {
  if (state.campaignId) {
    await assertPausedNode(client, state.campaignId, "Kampaň");
    logger(`↪ Kampaň z checkpointu: ${campaign.name} (${state.campaignId})`);
    return state.campaignId;
  }

  const edge = `act_${plan.meta.adAccountId}/campaigns`;
  const existing = await exactNamedRows(client, edge, campaign.name, "id,name,status,effective_status,objective,special_ad_categories,daily_budget,buying_type");
  if (existing.length > 1) throw new Error(`Existuje více kampaní se jménem „${campaign.name}“. Nelze bezpečně pokračovat.`);
  if (existing.length === 1) {
    const row = existing[0];
    if (row.status !== PAUSED || row.objective !== "OUTCOME_LEADS" || !row.special_ad_categories?.includes("HOUSING") || String(row.daily_budget) !== String(plan.defaults.proposedDailyBudgetCzk * 100)) {
      throw new Error(`Existující kampaň „${campaign.name}“ neodpovídá bezpečnému plánu.`);
    }
    state.campaignId = String(row.id);
    await saveCheckpoint(checkpointPath, checkpoint);
    logger(`↪ Převzata existující PAUSED kampaň: ${campaign.name} (${row.id})`);
    return state.campaignId;
  }

  const created = await client.post(edge, buildCampaignPayload(plan, campaign));
  if (!isNumericId(String(created.id))) throw new Error(`Meta nevrátila ID nové kampaně „${campaign.name}“.`);
  await assertPausedNode(client, String(created.id), "Nová kampaň", { correctNewNode: true });
  state.campaignId = String(created.id);
  await saveCheckpoint(checkpointPath, checkpoint);
  logger(`✓ Vytvořena PAUSED kampaň: ${campaign.name} (${created.id})`);
  return state.campaignId;
}

async function findOrCreateAdSet(client, plan, campaign, state, checkpointPath, checkpoint, logger) {
  if (state.adSetId) {
    await assertPausedNode(client, state.adSetId, "Sada reklam");
    logger(`↪ Sada z checkpointu: ${campaign.adSetName} (${state.adSetId})`);
    return state.adSetId;
  }

  const edge = `${state.campaignId}/adsets`;
  const existing = await exactNamedRows(client, edge, campaign.adSetName, "id,name,status,effective_status,campaign_id,optimization_goal,billing_event,destination_type,promoted_object");
  if (existing.length > 1) throw new Error(`Existuje více sad se jménem „${campaign.adSetName}“ v kampani ${state.campaignId}.`);
  if (existing.length === 1) {
    const row = existing[0];
    if (row.status !== PAUSED || String(row.campaign_id) !== state.campaignId || row.optimization_goal !== "OFFSITE_CONVERSIONS" || String(row.promoted_object?.pixel_id) !== plan.meta.datasetId || row.promoted_object?.custom_event_type !== "LEAD") {
      throw new Error(`Existující sada „${campaign.adSetName}“ neodpovídá bezpečnému plánu.`);
    }
    state.adSetId = String(row.id);
    await saveCheckpoint(checkpointPath, checkpoint);
    logger(`↪ Převzata existující PAUSED sada: ${campaign.adSetName} (${row.id})`);
    return state.adSetId;
  }

  const created = await client.post(`act_${plan.meta.adAccountId}/adsets`, buildAdSetPayload(plan, campaign, state.campaignId, checkpoint.preflight.resolvedCities));
  if (!isNumericId(String(created.id))) throw new Error(`Meta nevrátila ID nové sady „${campaign.adSetName}“.`);
  await assertPausedNode(client, String(created.id), "Nová sada reklam", { correctNewNode: true });
  state.adSetId = String(created.id);
  await saveCheckpoint(checkpointPath, checkpoint);
  logger(`✓ Vytvořena PAUSED sada: ${campaign.adSetName} (${created.id})`);
  return state.adSetId;
}

async function uploadImage(client, plan, campaign, ad, placement, state, assets, checkpointPath, checkpoint, logger) {
  const uploadKey = `${ad.name}/${placement}`;
  if (state.uploads[uploadKey]?.hash) return state.uploads[uploadKey].hash;
  const assetPath = assets.get(`${campaign.key}/${ad.name}/${placement}`);
  const result = await client.upload(`act_${plan.meta.adAccountId}/adimages`, "filename", assetPath);
  const uploaded = Object.values(result?.images ?? {})[0];
  if (!isNonEmpty(uploaded?.hash)) throw new Error(`Meta nevrátila image hash pro ${uploadKey}.`);
  state.uploads[uploadKey] = { hash: uploaded.hash, file: path.relative(REPO_ROOT, assetPath) };
  await saveCheckpoint(checkpointPath, checkpoint);
  logger(`  ✓ Nahrán obraz ${placement}: ${path.basename(assetPath)}`);
  return uploaded.hash;
}

async function waitForVideo(client, videoId, timeoutMs, logger) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const video = await client.get(videoId, { fields: "id,status" });
    const status = String(video?.status?.video_status ?? "").toLowerCase();
    if (["ready", "processed"].includes(status)) return;
    if (["error", "failed"].includes(status)) throw new Error(`Meta nezpracovala video ${videoId} (status=${status}).`);
    logger(`  … video ${videoId} se zpracovává (${status || "čeká"})`);
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`Vypršel limit čekání na zpracování videa ${videoId}. Spusťte stejný příkaz znovu; checkpoint bezpečně naváže.`);
}

async function videoThumbnail(client, videoId) {
  const result = await client.get(`${videoId}/thumbnails`, { fields: "uri,is_preferred,width,height", limit: 20 });
  const thumbnail = (result?.data ?? []).find((row) => row.is_preferred) ?? result?.data?.[0];
  if (!isNonEmpty(thumbnail?.uri)) throw new Error(`Meta nevrátila náhled pro video ${videoId}.`);
  return thumbnail.uri;
}

async function uploadVideo(client, plan, campaign, ad, state, assets, checkpointPath, checkpoint, timeoutMs, logger) {
  const uploadKey = `${ad.name}/video`;
  let videoId = state.uploads[uploadKey]?.videoId;
  if (!videoId) {
    const assetPath = assets.get(`${campaign.key}/${ad.name}/video`);
    const result = await client.upload(`act_${plan.meta.adAccountId}/advideos`, "source", assetPath, { name: ad.name });
    if (!isNumericId(String(result.id))) throw new Error(`Meta nevrátila video ID pro ${ad.name}.`);
    videoId = String(result.id);
    state.uploads[uploadKey] = { videoId, file: path.relative(REPO_ROOT, assetPath) };
    await saveCheckpoint(checkpointPath, checkpoint);
    logger(`  ✓ Nahráno video: ${path.basename(assetPath)} (${videoId})`);
  }
  await waitForVideo(client, videoId, timeoutMs, logger);
  const thumbnailUrl = state.uploads[uploadKey].thumbnailUrl ?? await videoThumbnail(client, videoId);
  state.uploads[uploadKey].thumbnailUrl = thumbnailUrl;
  await saveCheckpoint(checkpointPath, checkpoint);
  return { videoId, thumbnailUrl };
}

async function createCreative(client, plan, campaign, ad, state, payload, checkpointPath, checkpoint, logger) {
  if (state.creatives[ad.name]) return state.creatives[ad.name];
  const result = await client.post(`act_${plan.meta.adAccountId}/adcreatives`, payload);
  if (!isNumericId(String(result.id))) throw new Error(`Meta nevrátila creative ID pro ${ad.name}.`);
  state.creatives[ad.name] = String(result.id);
  await saveCheckpoint(checkpointPath, checkpoint);
  logger(`  ✓ Vytvořena kreativa: ${ad.name} (${result.id})`);
  return state.creatives[ad.name];
}

async function findOrCreateAd(client, plan, campaign, ad, state, creativeId, checkpointPath, checkpoint, logger) {
  if (state.ads[ad.name]) {
    await assertPausedNode(client, state.ads[ad.name], "Reklama");
    logger(`  ↪ Reklama z checkpointu: ${ad.name} (${state.ads[ad.name]})`);
    return state.ads[ad.name];
  }

  const existing = await exactNamedRows(client, `${state.adSetId}/ads`, ad.name, "id,name,status,effective_status,adset_id,creative");
  if (existing.length > 1) throw new Error(`Existuje více reklam se jménem „${ad.name}“ v sadě ${state.adSetId}.`);
  if (existing.length === 1) {
    const row = existing[0];
    if (row.status !== PAUSED || String(row.adset_id) !== state.adSetId) throw new Error(`Existující reklama „${ad.name}“ není bezpečný PAUSED draft.`);
    state.ads[ad.name] = String(row.id);
    await saveCheckpoint(checkpointPath, checkpoint);
    logger(`  ↪ Převzata existující PAUSED reklama: ${ad.name} (${row.id})`);
    return state.ads[ad.name];
  }

  const result = await client.post(`act_${plan.meta.adAccountId}/ads`, { name: ad.name, adset_id: state.adSetId, creative: { creative_id: creativeId }, status: PAUSED });
  if (!isNumericId(String(result.id))) throw new Error(`Meta nevrátila ID reklamy ${ad.name}.`);
  await assertPausedNode(client, String(result.id), "Nová reklama", { correctNewNode: true });
  state.ads[ad.name] = String(result.id);
  await saveCheckpoint(checkpointPath, checkpoint);
  logger(`  ✓ Vytvořena PAUSED reklama: ${ad.name} (${result.id})`);
  return state.ads[ad.name];
}

async function deploy({ client, plan, assets, planSha256, graphVersion, checkpointPath, videoTimeoutMs, logger }) {
  let checkpoint = await loadCheckpoint(checkpointPath);
  if (checkpoint) {
    verifyCheckpoint(checkpoint, { planSha256, graphVersion, plan });
    logger(`Navazuji z checkpointu: ${checkpointPath}`);
  } else {
    logger("Provádím preflight bez zápisu do reklamního účtu…");
    const preflightResult = await preflight(client, plan);
    checkpoint = initialCheckpoint({ planSha256, graphVersion, plan, preflightResult });
    await saveCheckpoint(checkpointPath, checkpoint);
    logger(`Preflight prošel. Checkpoint: ${checkpointPath}`);
  }

  for (const campaign of plan.campaigns) {
    const state = getCampaignState(checkpoint, campaign);
    await findOrCreateCampaign(client, plan, campaign, state, checkpointPath, checkpoint, logger);
    await findOrCreateAdSet(client, plan, campaign, state, checkpointPath, checkpoint, logger);

    for (const ad of campaign.ads) {
      if (state.ads[ad.name]) {
        await assertPausedNode(client, state.ads[ad.name], "Reklama");
        logger(`  ↪ Reklama z checkpointu: ${ad.name} (${state.ads[ad.name]})`);
        continue;
      }
      let creativeId;
      if (ad.creative.type === "STATIC") {
        const feed = await uploadImage(client, plan, campaign, ad, "feed", state, assets, checkpointPath, checkpoint, logger);
        const vertical = await uploadImage(client, plan, campaign, ad, "vertical", state, assets, checkpointPath, checkpoint, logger);
        creativeId = await createCreative(client, plan, campaign, ad, state, buildStaticCreativePayload(plan, campaign, ad, { feed, vertical }), checkpointPath, checkpoint, logger);
      } else {
        const { videoId, thumbnailUrl } = await uploadVideo(client, plan, campaign, ad, state, assets, checkpointPath, checkpoint, videoTimeoutMs, logger);
        creativeId = await createCreative(client, plan, campaign, ad, state, buildVideoCreativePayload(plan, campaign, ad, videoId, thumbnailUrl), checkpointPath, checkpoint, logger);
      }
      if (!isNumericId(String(creativeId))) throw new Error(`Chybí creative ID pro ${ad.name}.`);
    }
  }

  // Ad objects are intentionally created only after every campaign, ad set,
  // upload and creative is checkpointed. If Meta blocks ad creation because an
  // account prerequisite is missing (for example a payment method), the whole
  // package remains prepared and can be resumed without duplicate uploads.
  for (const campaign of plan.campaigns) {
    const state = checkpoint.campaigns[campaign.key];
    for (const ad of campaign.ads) {
      await findOrCreateAd(client, plan, campaign, ad, state, state.creatives[ad.name], checkpointPath, checkpoint, logger);
    }
  }

  for (const campaign of plan.campaigns) {
    const state = checkpoint.campaigns[campaign.key];
    await assertPausedNode(client, state.campaignId, "Kampaň");
    await assertPausedNode(client, state.adSetId, "Sada reklam");
    for (const ad of campaign.ads) await assertPausedNode(client, state.ads[ad.name], "Reklama");
  }
  checkpoint.completedAt = new Date().toISOString();
  await saveCheckpoint(checkpointPath, checkpoint);
  return checkpoint;
}

async function readStdinToken(input = process.stdin) {
  input.setEncoding("utf8");
  let value = "";
  for await (const chunk of input) value += chunk;
  return value.trim();
}

function validateToken(token) {
  if (!isNonEmpty(token) || token.length < 20 || /\s/.test(token)) {
    throw new Error("Meta access token chybí nebo nemá očekávaný formát.");
  }
  return token;
}

export function dryRunReport({ plan, summary, assets, graphVersion, checkpointPath }) {
  return {
    mode: "DRY_RUN_NO_NETWORK",
    graphVersion,
    adAccountId: plan.meta.adAccountId,
    businessId: plan.meta.businessId,
    datasetId: plan.meta.datasetId,
    status: PAUSED,
    specialAdCategory: "HOUSING",
    budget: { perCampaignCzkPerDay: 750, campaigns: 2, totalCzkPerDay: 1500, billingOnlyAfterSeparateActivation: true },
    ...summary,
    assetFilesValidated: assets.size,
    checkpointPath,
  };
}

export async function main(argv = process.argv.slice(2), env = process.env, io = console) {
  const options = parseArgs(argv);
  if (options.help) {
    io.log(usage());
    return { help: true };
  }

  const validated = await loadAndValidatePlan(options.planPath);
  const graphVersion = options.apiVersion ?? env.META_GRAPH_VERSION ?? validated.plan.meta.graphVersion ?? DEFAULT_GRAPH_VERSION;
  if (!/^v\d+\.\d+$/.test(graphVersion)) throw new Error("Graph API verze musí mít formát vN.N.");
  const report = dryRunReport({ ...validated, graphVersion, checkpointPath: options.checkpointPath });

  if (!options.execute) {
    if (options.json) io.log(JSON.stringify(report, null, 2));
    else {
      io.log("✓ CEFIP Meta plán je platný. DRY-RUN: nebylo provedeno žádné síťové volání ani změna.");
      io.log(`  ${report.campaigns} kampaně + ${report.adSets} sady + ${report.ads} reklam, vše ${PAUSED}`);
      io.log(`  ${report.imageUploads} obrazových uploadů + ${report.videoUploads} videa; ${report.assetFilesValidated} souborů ověřeno`);
      io.log(`  Rozpočet v konceptu: 750 CZK/den/kampaň (bez útraty, dokud někdo samostatně neaktivuje)`);
      io.log(`  Graph API: ${graphVersion}; checkpoint: ${options.checkpointPath}`);
      io.log("  Pro zápis použijte výslovně --execute a token přes --token-stdin nebo META_ADS_ACCESS_TOKEN.");
    }
    return report;
  }

  if (options.tokenStdin && isNonEmpty(env.META_ADS_ACCESS_TOKEN)) {
    throw new Error("Je nastaveno META_ADS_ACCESS_TOKEN i --token-stdin. Zvolte právě jeden zdroj tokenu.");
  }
  const token = validateToken(options.tokenStdin ? await readStdinToken() : env.META_ADS_ACCESS_TOKEN);
  const client = new GraphClient({ accessToken: token, version: graphVersion });
  io.log(`EXECUTE: vytvářím pouze PAUSED drafty přes Meta Graph API ${graphVersion}. Nic nebude aktivováno.`);
  const checkpoint = await deploy({ client, ...validated, graphVersion, checkpointPath: options.checkpointPath, videoTimeoutMs: options.videoTimeoutMs, logger: (message) => io.log(message) });
  io.log(`✓ Hotovo: 2 PAUSED kampaně, 2 PAUSED sady a 12 PAUSED reklam. Checkpoint: ${options.checkpointPath}`);
  return checkpoint;
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntrypoint) {
  main().catch((error) => {
    console.error(`CHYBA: ${error?.message ?? "Neznámá chyba."}`);
    process.exitCode = 1;
  });
}
