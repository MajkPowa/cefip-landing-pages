import { env } from 'cloudflare:workers';

export type NewLead = {
  id: string;
  submissionId: string;
  eventId: string;
  createdAt: string;
  serviceType: 'reconstruction' | 'buyout';
  landingVariant: string;
  name: string;
  phone: string;
  email: string | null;
  location: string;
  propertyType: string;
  message: string | null;
  detailsJson: string;
  contactPreference: string;
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

let initialized = false;

export async function ensureLeadSchema() {
  if (initialized) return;
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL UNIQUE,
      event_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      service_type TEXT NOT NULL CHECK(service_type IN ('reconstruction','buyout')),
      landing_variant TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      location TEXT NOT NULL,
      property_type TEXT NOT NULL,
      message TEXT,
      details_json TEXT NOT NULL,
      contact_preference TEXT NOT NULL,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_term TEXT,
      utm_content TEXT,
      campaign_id TEXT,
      adset_id TEXT,
      ad_id TEXT,
      placement TEXT,
      landing_path TEXT NOT NULL,
      referrer_origin TEXT,
      privacy_version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new'
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS lead_files (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )`),
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_submission_id ON leads(submission_id)'),
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_event_id ON leads(event_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_leads_status_created_at ON leads(status, created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_leads_service_created_at ON leads(service_type, created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_lead_files_lead_id ON lead_files(lead_id)'),
  ]);
  initialized = true;
}

export async function createLead(lead: NewLead) {
  await ensureLeadSchema();
  const db = env.DB;
  const existing = await db.prepare('SELECT id, event_id AS eventId FROM leads WHERE submission_id = ?')
    .bind(lead.submissionId)
    .first<{ id: string; eventId: string }>();
  if (existing) return { id: existing.id, eventId: existing.eventId, duplicate: true };

  await db.prepare(`INSERT INTO leads (
    id, submission_id, event_id, created_at, service_type, landing_variant,
    name, phone, email, location, property_type, message, details_json,
    contact_preference, utm_source, utm_medium, utm_campaign, utm_term,
    utm_content, campaign_id, adset_id, ad_id, placement, landing_path,
    referrer_origin, privacy_version, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`)
    .bind(
      lead.id, lead.submissionId, lead.eventId, lead.createdAt, lead.serviceType, lead.landingVariant,
      lead.name, lead.phone, lead.email, lead.location, lead.propertyType, lead.message, lead.detailsJson,
      lead.contactPreference, lead.utmSource, lead.utmMedium, lead.utmCampaign, lead.utmTerm,
      lead.utmContent, lead.campaignId, lead.adsetId, lead.adId, lead.placement, lead.landingPath,
      lead.referrerOrigin, lead.privacyVersion,
    ).run();
  return { id: lead.id, eventId: lead.eventId, duplicate: false };
}

export async function saveLeadFile(input: {
  id: string;
  leadId: string;
  r2Key: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}) {
  await env.DB.prepare(`INSERT INTO lead_files (id, lead_id, r2_key, content_type, size_bytes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(input.id, input.leadId, input.r2Key, input.contentType, input.sizeBytes, input.createdAt)
    .run();
}
