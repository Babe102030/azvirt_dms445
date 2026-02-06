CREATE TABLE "checkInRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"shiftId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"projectSiteId" integer NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"accuracy" double precision NOT NULL,
	"distanceFromSiteMeters" double precision,
	"isWithinGeofence" boolean NOT NULL,
	"checkInType" varchar(20) DEFAULT 'check_in' NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_audit_trail" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"entityId" integer NOT NULL,
	"oldValue" text,
	"newValue" text,
	"reason" text,
	"performedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTime" varchar(5) NOT NULL,
	"endTime" varchar(5) NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projectSites" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radiusMeters" integer DEFAULT 50 NOT NULL,
	"address" varchar(500),
	"city" varchar(100),
	"state" varchar(100),
	"zipCode" varchar(20),
	"country" varchar(100),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_breaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"shiftId" integer NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"type" varchar(50) DEFAULT 'unpaid' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_swaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"shiftId" integer NOT NULL,
	"fromEmployeeId" integer NOT NULL,
	"toEmployeeId" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"respondedAt" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "shift_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"startTime" varchar(5) NOT NULL,
	"endTime" varchar(5) NOT NULL,
	"durationHours" double precision,
	"color" varchar(20),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "templateId" integer;--> statement-breakpoint
ALTER TABLE "checkInRecords" ADD CONSTRAINT "checkInRecords_shiftId_shifts_id_fk" FOREIGN KEY ("shiftId") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkInRecords" ADD CONSTRAINT "checkInRecords_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkInRecords" ADD CONSTRAINT "checkInRecords_projectSiteId_projectSites_id_fk" FOREIGN KEY ("projectSiteId") REFERENCES "public"."projectSites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_audit_trail" ADD CONSTRAINT "compliance_audit_trail_employeeId_users_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_audit_trail" ADD CONSTRAINT "compliance_audit_trail_performedBy_users_id_fk" FOREIGN KEY ("performedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_availability" ADD CONSTRAINT "employee_availability_employeeId_users_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectSites" ADD CONSTRAINT "projectSites_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectSites" ADD CONSTRAINT "projectSites_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_breaks" ADD CONSTRAINT "shift_breaks_shiftId_shifts_id_fk" FOREIGN KEY ("shiftId") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swaps" ADD CONSTRAINT "shift_swaps_shiftId_shifts_id_fk" FOREIGN KEY ("shiftId") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swaps" ADD CONSTRAINT "shift_swaps_fromEmployeeId_users_id_fk" FOREIGN KEY ("fromEmployeeId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swaps" ADD CONSTRAINT "shift_swaps_toEmployeeId_users_id_fk" FOREIGN KEY ("toEmployeeId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_templateId_shift_templates_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."shift_templates"("id") ON DELETE no action ON UPDATE no action;