export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_TOTAL_PHOTO_BYTES = 22 * 1024 * 1024;

export const ALLOWED_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export type ServiceType = "reconstruction" | "buyout";

export type ParsedPhoto = {
  contentType: string;
  data: Buffer;
};

export type NormalizedLead = {
  submissionId: string;
  serviceType: ServiceType;
  landingVariant: string;
  name: string;
  phone: string;
  email: string | null;
  location: string;
  propertyType: string;
  message: string | null;
  details: {
    scope: string | null;
    timeline: string | null;
    salePath: string | null;
    propertyCondition: string | null;
    relationship: string | null;
  };
  contactPreference: "phone" | "email";
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  campaignId: string | null;
  adsetId: string | null;
  adId: string | null;
  placement: string | null;
  landingPath: string;
  referrerOrigin: string | null;
  privacyVersion: string;
};

export type ValidationResult =
  | { ok: true; value: NormalizedLead }
  | { ok: false; errors: Record<string, string> };

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROPERTY_TYPES: Record<ServiceType, ReadonlySet<string>> = {
  reconstruction: new Set(["apartment", "house", "apartment_building", "other"]),
  buyout: new Set(["apartment", "house", "apartment_building", "land", "other"]),
};

const SCOPES = new Set(["complete", "partial", "unknown"]);
const SALE_PATHS = new Set(["direct_buyout", "market_sale", "compare"]);
const RELATIONSHIPS = new Set(["owner", "co_owner", "authorized", "other"]);
const TIMELINES = new Set(["soon", "three_months", "six_months", "later"]);
const PROPERTY_CONDITIONS = new Set(["renovated", "used", "before_renovation", "unfinished"]);

export function clipped(fields: Record<string, string>, key: string, max = 160): string {
  return (fields[key] ?? "").trim().slice(0, max);
}

function optional(fields: Record<string, string>, key: string, max = 160): string | null {
  return clipped(fields, key, max) || null;
}

export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00420")) digits = digits.slice(5);
  if (digits.startsWith("420") && digits.length === 12) digits = digits.slice(3);
  if (digits.length === 9) return `+420${digits}`;
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

function selected(value: string | null, allowed: ReadonlySet<string>): string | null {
  return value && allowed.has(value) ? value : null;
}

export function validateLead(fields: Record<string, string>): ValidationResult {
  const submissionId = clipped(fields, "submissionId", 80);
  const serviceTypeRaw = clipped(fields, "serviceType", 24);
  const serviceType = serviceTypeRaw === "reconstruction" || serviceTypeRaw === "buyout"
    ? serviceTypeRaw
    : null;
  const name = clipped(fields, "name", 100);
  const phone = normalizePhone(clipped(fields, "phone", 40));
  const email = optional(fields, "email", 254)?.toLowerCase() ?? null;
  const location = clipped(fields, "location", 120);
  const propertyType = clipped(fields, "propertyType", 40);
  const scopeRaw = optional(fields, "scope", 40);
  const salePathRaw = optional(fields, "salePath", 40);
  const relationshipRaw = optional(fields, "relationship", 40);
  const errors: Record<string, string> = {};

  if (!UUID_V4.test(submissionId)) errors.form = "Formulář obnovte a zkuste to znovu.";
  if (!serviceType) errors.form = "Neplatný typ poptávky.";
  if (name.length < 2) errors.name = "Uveďte své jméno.";
  if (phone.replace(/\D/g, "").length < 9) errors.phone = "Uveďte platné telefonní číslo.";
  if (email && !EMAIL.test(email)) errors.email = "Zkontrolujte e-mailovou adresu.";
  if (location.length < 2) errors.location = "Uveďte obec nebo PSČ.";
  if (!serviceType || !PROPERTY_TYPES[serviceType].has(propertyType)) {
    errors.propertyType = "Vyberte typ nemovitosti.";
  }
  if (serviceType === "reconstruction" && (!scopeRaw || !SCOPES.has(scopeRaw))) {
    errors.scope = "Vyberte předpokládaný rozsah.";
  }
  if (serviceType === "buyout" && (!salePathRaw || !SALE_PATHS.has(salePathRaw))) {
    errors.salePath = "Vyberte, jakou cestu zvažujete.";
  }
  if (serviceType === "buyout" && (!relationshipRaw || !RELATIONSHIPS.has(relationshipRaw))) {
    errors.relationship = "Uveďte svůj vztah k nemovitosti.";
  }
  if (clipped(fields, "privacyAcknowledged", 8) !== "true") {
    errors.privacyAcknowledged = "Potvrďte seznámení s informacemi o zpracování údajů.";
  }

  if (!serviceType || Object.keys(errors).length > 0) return { ok: false, errors };

  const landingVariantRaw = clipped(fields, "landingVariant", 32).toLowerCase();
  const landingVariant = /^(default|r[1-5]|v[1-5])$/.test(landingVariantRaw)
    ? landingVariantRaw
    : "default";
  const landingPathRaw = clipped(fields, "landingPath", 120);
  const landingPath = landingPathRaw.startsWith("/")
    ? landingPathRaw
    : serviceType === "reconstruction"
      ? "/rekonstrukce"
      : "/vykup-nemovitosti";

  return {
    ok: true,
    value: {
      submissionId,
      serviceType,
      landingVariant,
      name,
      phone,
      email,
      location,
      propertyType,
      message: optional(fields, "message", 1500),
      details: {
        scope: serviceType === "reconstruction" ? selected(scopeRaw, SCOPES) : null,
        timeline: serviceType === "reconstruction"
          ? selected(optional(fields, "timeline", 40), TIMELINES)
          : null,
        salePath: serviceType === "buyout" ? selected(salePathRaw, SALE_PATHS) : null,
        propertyCondition: serviceType === "buyout"
          ? selected(optional(fields, "propertyCondition", 40), PROPERTY_CONDITIONS)
          : null,
        relationship: serviceType === "buyout" ? selected(relationshipRaw, RELATIONSHIPS) : null,
      },
      contactPreference: clipped(fields, "contactPreference", 20) === "email" ? "email" : "phone",
      utmSource: optional(fields, "utm_source", 64),
      utmMedium: optional(fields, "utm_medium", 32),
      utmCampaign: optional(fields, "utm_campaign", 160),
      utmTerm: optional(fields, "utm_term", 160),
      utmContent: optional(fields, "utm_content", 160),
      campaignId: optional(fields, "campaign_id", 64),
      adsetId: optional(fields, "adset_id", 64),
      adId: optional(fields, "ad_id", 64),
      placement: optional(fields, "placement", 64),
      landingPath,
      referrerOrigin: optional(fields, "referrerOrigin", 180),
      privacyVersion: "1.0-2026-08-24",
    },
  };
}
