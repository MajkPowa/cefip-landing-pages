import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAdSetPayload,
  buildCampaignPayload,
  buildStaticCreativePayload,
  buildVideoCreativePayload,
  loadAndValidatePlan,
  main,
  parseArgs,
  REQUIRED_META_PERMISSIONS,
  resolveBusinessAdAccountRelationship,
  validatePlan,
} from "../deploy-meta-ads.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLAN_PATH = path.join(TEST_DIR, "..", "campaign-plan.json");

test("production plan validates all paused entities and local assets", async () => {
  const { plan, summary, assets } = await loadAndValidatePlan(PLAN_PATH);
  assert.equal(plan.mode, "PAUSED_DRAFT_ONLY");
  assert.deepEqual(summary, {
    campaigns: 2,
    adSets: 2,
    ads: 12,
    staticAds: 10,
    videoAds: 2,
    imageUploads: 20,
    videoUploads: 2,
  });
  assert.equal(assets.size, 22);
  assert.ok(plan.campaigns.every((campaign) => campaign.ads.every((ad) => ad.status === "PAUSED")));
});

test("payload builders hard-code housing, lead optimization, budget and paused status", async () => {
  const { plan } = await loadAndValidatePlan(PLAN_PATH);
  const campaign = plan.campaigns[0];
  const campaignPayload = buildCampaignPayload(plan, campaign);
  assert.equal(campaignPayload.status, "PAUSED");
  assert.equal(campaignPayload.objective, "OUTCOME_LEADS");
  assert.equal(campaignPayload.daily_budget, "75000");
  assert.deepEqual(campaignPayload.special_ad_categories, ["HOUSING"]);
  assert.deepEqual(campaignPayload.special_ad_category_country, ["CZ"]);

  const adSet = buildAdSetPayload(plan, campaign, "12345678901", plan.defaults.geoCities.map((name, index) => ({ name, key: String(1000 + index) })));
  assert.equal(adSet.status, "PAUSED");
  assert.equal(adSet.destination_type, "WEBSITE");
  assert.equal(adSet.optimization_goal, "OFFSITE_CONVERSIONS");
  assert.deepEqual(adSet.promoted_object, { pixel_id: plan.meta.datasetId, custom_event_type: "LEAD" });
  assert.equal(adSet.targeting.geo_locations.cities.length, 8);
  assert.equal(adSet.targeting.age_min, 18);
  assert.equal("bid_strategy" in adSet, false);
  assert.equal("genders" in adSet.targeting, false);
  assert.equal("publisher_platforms" in adSet.targeting, false);
});

test("static creative uses both placement images; video creative uses uploaded video", async () => {
  const { plan } = await loadAndValidatePlan(PLAN_PATH);
  const construction = plan.campaigns[0];
  const imageAd = construction.ads[0];
  const staticPayload = buildStaticCreativePayload(plan, construction, imageAd, { feed: "feedhash", vertical: "verticalhash" });
  assert.deepEqual(staticPayload.asset_feed_spec.images.map((image) => image.hash), ["feedhash", "verticalhash"]);
  assert.equal(staticPayload.asset_feed_spec.asset_customization_rules.length, 2);
  assert.equal(staticPayload.object_story_spec.page_id, construction.pageId);
  assert.match(staticPayload.asset_feed_spec.link_urls[0].website_url, /[?&]v=r1(?:&|$)/);
  assert.equal(staticPayload.degrees_of_freedom_spec.creative_features_spec.standard_enhancements.enroll_status, "OPT_OUT");

  const videoAd = construction.ads.at(-1);
  const videoPayload = buildVideoCreativePayload(plan, construction, videoAd, "98765432101", "https://example.test/thumbnail.jpg");
  assert.equal(videoPayload.object_story_spec.video_data.video_id, "98765432101");
  assert.equal(videoPayload.object_story_spec.video_data.image_url, "https://example.test/thumbnail.jpg");
  assert.equal(videoPayload.object_story_spec.video_data.call_to_action.type, "LEARN_MORE");
});

test("dry-run needs no token, performs no fetch and reports no mutation", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("fetch must not run in dry-run");
  };
  const lines = [];
  try {
    const report = await main(["--plan", PLAN_PATH, "--json"], {}, { log: (line) => lines.push(line) });
    assert.equal(report.mode, "DRY_RUN_NO_NETWORK");
    assert.equal(report.ads, 12);
    assert.equal(fetchCalls, 0);
    assert.doesNotMatch(lines.join("\n"), /access[_ -]?token/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("execute requires a non-CLI token source", async () => {
  await assert.rejects(
    main(["--plan", PLAN_PATH, "--execute"], {}, { log() {} }),
    /access token chybí/i,
  );
  assert.throws(() => parseArgs(["--token-stdin"]), /pouze společně s --execute/);
  assert.throws(() => parseArgs(["--access-token", "secret"]), /Neznámý parametr/);
});

test("Marketing API preflight uses ad/page scopes and not Instagram Graph scope", () => {
  assert.deepEqual(REQUIRED_META_PERMISSIONS, [
    "ads_management",
    "ads_read",
    "business_management",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_ads",
  ]);
  assert.equal(REQUIRED_META_PERMISSIONS.includes("instagram_basic"), false);
});

test("business relationship accepts ownership and partner/client access, but not an unrelated account", () => {
  const common = {
    account: { id: "act_2596685627375368", currency: "CZK", account_status: 1, business: { id: "9999999999999999" } },
    adAccountId: "2596685627375368",
    businessId: "1754407605947820",
  };
  const client = resolveBusinessAdAccountRelationship({
    ...common,
    ownedAccounts: [],
    clientAccounts: [{ id: "2596685627375368", currency: "CZK", account_status: 1 }],
  });
  assert.deepEqual(client, {
    relationship: "CLIENT",
    portfolioBusinessId: "1754407605947820",
    ownerBusinessId: "9999999999999999",
  });

  const owned = resolveBusinessAdAccountRelationship({
    ...common,
    account: { ...common.account, business: { id: "1754407605947820" } },
    ownedAccounts: [{ id: "act_2596685627375368", currency: "CZK", account_status: 1 }],
    clientAccounts: [],
  });
  assert.equal(owned.relationship, "OWNED");

  assert.throws(
    () => resolveBusinessAdAccountRelationship({ ...common, ownedAccounts: [], clientAccounts: [] }),
    /ani v owned_ad_accounts, ani v client_ad_accounts/,
  );
  assert.throws(
    () => resolveBusinessAdAccountRelationship({
      ...common,
      account: { ...common.account, business: { id: "1754407605947820" } },
      ownedAccounts: [{ id: "2596685627375368" }],
      clientAccounts: [{ id: "act_2596685627375368" }],
    }),
    /nejednoznačná/,
  );
});

test("validation rejects any attempt to activate an entity", async () => {
  const { plan } = await loadAndValidatePlan(PLAN_PATH);
  const modified = structuredClone(plan);
  modified.campaigns[0].ads[0].status = "ACTIVE";
  await assert.rejects(validatePlan(modified, { planPath: PLAN_PATH, checkFiles: false }), /musí být PAUSED/);
});
