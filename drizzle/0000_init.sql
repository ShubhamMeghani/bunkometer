CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"semester_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"colour" text NOT NULL,
	"required_pct" smallint DEFAULT 80 NOT NULL,
	"count_tutorials" boolean DEFAULT true NOT NULL,
	"medical_cap" smallint,
	"window_mode" text DEFAULT 'whole' NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "courses_code_len" CHECK (char_length("courses"."code") between 1 and 16),
	CONSTRAINT "courses_name_len" CHECK (char_length("courses"."name") between 1 and 80),
	CONSTRAINT "courses_required_pct" CHECK ("courses"."required_pct" between 0 and 100),
	CONSTRAINT "courses_medical_cap" CHECK ("courses"."medical_cap" is null or "courses"."medical_cap" between 0 and 99),
	CONSTRAINT "courses_window_mode" CHECK ("courses"."window_mode" in ('whole', 'split'))
);
--> statement-breakpoint
CREATE TABLE "no_class_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"semester_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "periods_order" CHECK ("no_class_periods"."start_date" <= "no_class_periods"."end_date"),
	CONSTRAINT "periods_label_len" CHECK (char_length("no_class_periods"."label") between 1 and 40),
	CONSTRAINT "periods_kind" CHECK ("no_class_periods"."kind" in ('holiday', 'exam', 'other'))
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"midsem_date" date NOT NULL,
	"end_date" date NOT NULL,
	"share_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "semesters_share_token_unique" UNIQUE("share_token"),
	CONSTRAINT "semesters_name_len" CHECK (char_length("semesters"."name") between 1 and 60),
	CONSTRAINT "semesters_date_order" CHECK ("semesters"."start_date" < "semesters"."midsem_date" and "semesters"."midsem_date" < "semesters"."end_date"),
	CONSTRAINT "semesters_span" CHECK ("semesters"."end_date" - "semesters"."start_date" <= 366)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"slot_id" uuid,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"duration_min" smallint NOT NULL,
	"kind" text NOT NULL,
	"is_extra" boolean NOT NULL,
	"status" text,
	"makeup_date" date,
	"makeup_done" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_extra_slot" CHECK ("sessions"."is_extra" = ("sessions"."slot_id" is null)),
	CONSTRAINT "sessions_kind" CHECK ("sessions"."kind" in ('lecture', 'tutorial', 'lab')),
	CONSTRAINT "sessions_status" CHECK ("sessions"."status" is null or "sessions"."status" in ('present', 'absent', 'medical', 'cancelled')),
	CONSTRAINT "sessions_makeup" CHECK (("sessions"."makeup_date" is null and "sessions"."makeup_done" = false) or ("sessions"."kind" = 'lab' and "sessions"."status" in ('absent', 'medical'))),
	CONSTRAINT "sessions_duration" CHECK ("sessions"."duration_min" between 15 and 240)
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"duration_min" smallint NOT NULL,
	"kind" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	CONSTRAINT "slots_weekday" CHECK ("slots"."weekday" between 1 and 7),
	CONSTRAINT "slots_duration" CHECK ("slots"."duration_min" between 15 and 240),
	CONSTRAINT "slots_kind" CHECK ("slots"."kind" in ('lecture', 'tutorial', 'lab'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"active_semester_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "no_class_periods" ADD CONSTRAINT "no_class_periods_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_active_semester_id_semesters_id_fk" FOREIGN KEY ("active_semester_id") REFERENCES "public"."semesters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "courses_semester_code_uq" ON "courses" USING btree ("semester_id",lower("code"));--> statement-breakpoint
CREATE INDEX "periods_semester_idx" ON "no_class_periods" USING btree ("semester_id");--> statement-breakpoint
CREATE INDEX "semesters_user_idx" ON "semesters" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_slot_date_uq" ON "sessions" USING btree ("slot_id","date");--> statement-breakpoint
CREATE INDEX "sessions_course_date_idx" ON "sessions" USING btree ("course_id","date");--> statement-breakpoint
CREATE INDEX "slots_course_idx" ON "slots" USING btree ("course_id");