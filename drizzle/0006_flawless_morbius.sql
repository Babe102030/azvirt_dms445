CREATE TABLE "aggregate_inputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"concreteBaseId" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"materialType" varchar(50) NOT NULL,
	"materialName" varchar(255) NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" varchar(20) NOT NULL,
	"supplier" varchar(255),
	"batchNumber" varchar(100),
	"receivedBy" varchar(255),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concrete_bases" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" text,
	"capacity" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"managerName" varchar(255),
	"phoneNumber" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_branding" (
	"id" serial PRIMARY KEY NOT NULL,
	"logoUrl" text,
	"primaryColor" varchar(20) DEFAULT '#f97316' NOT NULL,
	"secondaryColor" varchar(20) DEFAULT '#ea580c' NOT NULL,
	"companyName" varchar(255) DEFAULT 'AzVirt' NOT NULL,
	"footerText" text,
	"headerStyle" varchar(50) DEFAULT 'gradient' NOT NULL,
	"fontFamily" varchar(100) DEFAULT 'Arial, sans-serif' NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"subject" varchar(500) NOT NULL,
	"bodyHtml" text NOT NULL,
	"bodyText" text,
	"isCustom" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"variables" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_type_unique" UNIQUE("type")
);
--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "totalWorkingHours" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "concreteBaseId" integer;--> statement-breakpoint
ALTER TABLE "aggregate_inputs" ADD CONSTRAINT "aggregate_inputs_concreteBaseId_concrete_bases_id_fk" FOREIGN KEY ("concreteBaseId") REFERENCES "public"."concrete_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_branding" ADD CONSTRAINT "email_branding_updatedBy_users_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_concreteBaseId_concrete_bases_id_fk" FOREIGN KEY ("concreteBaseId") REFERENCES "public"."concrete_bases"("id") ON DELETE no action ON UPDATE no action;