import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull(),
  eventId: text('event_id').notNull(),
  createdAt: text('created_at').notNull(),
  serviceType: text('service_type').notNull(),
  landingVariant: text('landing_variant').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  location: text('location').notNull(),
  propertyType: text('property_type').notNull(),
  message: text('message'),
  detailsJson: text('details_json').notNull(),
  contactPreference: text('contact_preference').notNull(),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmTerm: text('utm_term'),
  utmContent: text('utm_content'),
  campaignId: text('campaign_id'),
  adsetId: text('adset_id'),
  adId: text('ad_id'),
  placement: text('placement'),
  landingPath: text('landing_path').notNull(),
  referrerOrigin: text('referrer_origin'),
  privacyVersion: text('privacy_version').notNull(),
  status: text('status').notNull().default('new'),
}, (table) => [
  uniqueIndex('idx_leads_submission_id').on(table.submissionId),
  uniqueIndex('idx_leads_event_id').on(table.eventId),
  index('idx_leads_status_created_at').on(table.status, table.createdAt),
  index('idx_leads_service_created_at').on(table.serviceType, table.createdAt),
]);

export const leadFiles = sqliteTable('lead_files', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_lead_files_lead_id').on(table.leadId),
]);
