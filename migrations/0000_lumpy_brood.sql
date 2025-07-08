CREATE TABLE "analytics_daily_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"date" text NOT NULL,
	"total_calls" integer DEFAULT 0,
	"successful_calls" integer DEFAULT 0,
	"total_appointments" integer DEFAULT 0,
	"avg_call_duration" integer DEFAULT 0,
	"total_call_time" integer DEFAULT 0,
	"sentiment_positive" integer DEFAULT 0,
	"sentiment_neutral" integer DEFAULT 0,
	"sentiment_negative" integer DEFAULT 0,
	"avg_sentiment_score" integer DEFAULT 0,
	"call_outcomes" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"assistant_id" text NOT NULL,
	"calendar_event_id" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"email" text,
	"phone" text,
	"service" text,
	"patient_type" text,
	"synced_at" timestamp DEFAULT now(),
	CONSTRAINT "appointments_calendar_event_id_unique" UNIQUE("calendar_event_id")
);
--> statement-breakpoint
CREATE TABLE "assistant_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"google_calendar_id" text NOT NULL,
	"calendar_name" text NOT NULL,
	"user_email" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assistant_performance_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assistant_id" text NOT NULL,
	"assistant_name" text NOT NULL,
	"tenant_id" text NOT NULL,
	"date" text NOT NULL,
	"call_count" integer DEFAULT 0,
	"appointment_count" integer DEFAULT 0,
	"avg_duration" integer DEFAULT 0,
	"sentiment_avg" integer DEFAULT 0,
	"success_rate" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"industry" text NOT NULL,
	"phone" text NOT NULL,
	"location" text NOT NULL,
	"website" text NOT NULL,
	"scraped_content" jsonb,
	"business_hours" jsonb,
	"services" jsonb,
	"appointment_settings" jsonb,
	"calendar_provider" text,
	"calendar_connected" boolean DEFAULT false,
	"assistant_created" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expiry_date" timestamp,
	"user_email" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"assistant_id" text NOT NULL,
	"assistant_name" text NOT NULL,
	"phone_customer" text,
	"phone_assistant" text,
	"started_at" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"result" text,
	"ended_reason" text NOT NULL,
	"audio_url" text,
	"transcript" jsonb,
	"synced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_sentiment_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"sentiment_score" integer NOT NULL,
	"sentiment_label" text NOT NULL,
	"key_topics" jsonb,
	"analyzed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "industry_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"industry" text NOT NULL,
	"display_name" text NOT NULL,
	"prompt_template" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "industry_prompts_industry_unique" UNIQUE("industry")
);
