CREATE TABLE `lead_files` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lead_files_lead_id` ON `lead_files` (`lead_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`event_id` text NOT NULL,
	`created_at` text NOT NULL,
	`service_type` text NOT NULL,
	`landing_variant` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`location` text NOT NULL,
	`property_type` text NOT NULL,
	`message` text,
	`details_json` text NOT NULL,
	`contact_preference` text NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_term` text,
	`utm_content` text,
	`campaign_id` text,
	`adset_id` text,
	`ad_id` text,
	`placement` text,
	`landing_path` text NOT NULL,
	`referrer_origin` text,
	`privacy_version` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_submission_id` ON `leads` (`submission_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_event_id` ON `leads` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_leads_status_created_at` ON `leads` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_leads_service_created_at` ON `leads` (`service_type`,`created_at`);