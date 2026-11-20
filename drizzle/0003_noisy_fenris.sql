CREATE TABLE IF NOT EXISTS "calendar_commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid,
	"template_id" uuid,
	"session_archetype_code" text,
	"activity_class" text DEFAULT 'serious' NOT NULL,
	"local_date" date NOT NULL,
	"kind" text DEFAULT 'personal_block' NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"blocks_workout" boolean DEFAULT false NOT NULL,
	"ea_signed_delta" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_daily_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid,
	"local_date" date NOT NULL,
	"commitment_key" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"ea_signed_delta" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT true NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planning_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sport_id" uuid,
	"modality_code" text DEFAULT 'strength' NOT NULL,
	"complementary_modality_code" text,
	"mode" text DEFAULT 'wellness_constancy' NOT NULL,
	"event_title" text NOT NULL,
	"modality_label" text DEFAULT 'Multimodal & Força' NOT NULL,
	"primary_kpi_key" text,
	"baseline_kpi_value" double precision,
	"target_kpi_value" double precision,
	"kpi_unit" text,
	"start_date" date NOT NULL,
	"target_date" date NOT NULL,
	"initial_ea" integer NOT NULL,
	"target_ea" integer NOT NULL,
	"projected_peak_ea" integer NOT NULL,
	"target_days_per_week" integer DEFAULT 4 NOT NULL,
	"preferred_workout_days" jsonb DEFAULT '[1,2,4,6]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "athlete_kpi_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sport_id" uuid,
	"session_id" uuid,
	"modality_code" text NOT NULL,
	"kpi_key" text NOT NULL,
	"value_numeric" double precision NOT NULL,
	"unit" text NOT NULL,
	"source" text DEFAULT 'manual_test' NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planning_goals" ADD COLUMN IF NOT EXISTS "sport_id" uuid;--> statement-breakpoint
ALTER TABLE "planning_goals" ADD COLUMN IF NOT EXISTS "modality_code" text DEFAULT 'strength' NOT NULL;--> statement-breakpoint
ALTER TABLE "planning_goals" ADD COLUMN IF NOT EXISTS "complementary_modality_code" text;--> statement-breakpoint
ALTER TABLE "planning_goals" ADD COLUMN IF NOT EXISTS "primary_kpi_key" text;--> statement-breakpoint
ALTER TABLE "planning_goals" ADD COLUMN IF NOT EXISTS "baseline_kpi_value" double precision;--> statement-breakpoint
ALTER TABLE "planning_goals" ADD COLUMN IF NOT EXISTS "target_kpi_value" double precision;--> statement-breakpoint
ALTER TABLE "planning_goals" ADD COLUMN IF NOT EXISTS "kpi_unit" text;--> statement-breakpoint
ALTER TABLE "calendar_commitments" ADD COLUMN IF NOT EXISTS "template_id" uuid;--> statement-breakpoint
ALTER TABLE "calendar_commitments" ADD COLUMN IF NOT EXISTS "session_archetype_code" text;--> statement-breakpoint
ALTER TABLE "calendar_commitments" ADD COLUMN IF NOT EXISTS "activity_class" text DEFAULT 'serious' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sports" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'primary' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sports" ADD COLUMN IF NOT EXISTS "target_kpi_key" text;--> statement-breakpoint
ALTER TABLE "user_sports" ADD COLUMN IF NOT EXISTS "target_kpi_value" double precision;--> statement-breakpoint
ALTER TABLE "user_sports" ADD COLUMN IF NOT EXISTS "target_kpi_unit" text;--> statement-breakpoint
ALTER TABLE "user_sports" ADD COLUMN IF NOT EXISTS "weekly_sessions_target" integer;--> statement-breakpoint
ALTER TABLE "user_sports" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "training_programs" ADD COLUMN IF NOT EXISTS "sport_id" uuid;--> statement-breakpoint
ALTER TABLE "training_programs" ADD COLUMN IF NOT EXISTS "target_primary_modality_code" text;--> statement-breakpoint
ALTER TABLE "training_programs" ADD COLUMN IF NOT EXISTS "training_effect" jsonb;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN IF NOT EXISTS "sport_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN IF NOT EXISTS "activity_class" text DEFAULT 'serious' NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN IF NOT EXISTS "session_archetype_code" text;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN IF NOT EXISTS "activity_class" text DEFAULT 'serious' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "calendar_commitments" ADD CONSTRAINT "calendar_commitments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "calendar_commitments" ADD CONSTRAINT "calendar_commitments_goal_id_planning_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."planning_goals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "calendar_commitments" ADD CONSTRAINT "calendar_commitments_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "plan_daily_checkins" ADD CONSTRAINT "plan_daily_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "plan_daily_checkins" ADD CONSTRAINT "plan_daily_checkins_goal_id_planning_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."planning_goals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "planning_goals" ADD CONSTRAINT "planning_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "planning_goals" ADD CONSTRAINT "planning_goals_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "athlete_kpi_measurements" ADD CONSTRAINT "athlete_kpi_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "athlete_kpi_measurements" ADD CONSTRAINT "athlete_kpi_measurements_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "athlete_kpi_measurements" ADD CONSTRAINT "athlete_kpi_measurements_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "athlete_kpi_user_modality_key_idx" ON "athlete_kpi_measurements" USING btree ("user_id","modality_code","kpi_key","measured_at");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sport_metrics_sport_id_metric_key_idx" ON "sport_metrics" USING btree ("sport_id","metric_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_sports_user_id_sport_id_idx" ON "user_sports" USING btree ("user_id","sport_id");
