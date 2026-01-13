CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(20) DEFAULT 'other' NOT NULL,
	"unit" varchar(50) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"minStock" integer DEFAULT 0 NOT NULL,
	"criticalThreshold" integer DEFAULT 0 NOT NULL,
	"supplier" varchar(255),
	"unitPrice" integer,
	"lowStockEmailSent" boolean DEFAULT false,
	"lastEmailSentAt" timestamp,
	"supplierEmail" varchar(255),
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location" varchar(500),
	"status" varchar(20) DEFAULT 'planning' NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"phoneNumber" varchar(50),
	"smsNotificationsEnabled" boolean DEFAULT false NOT NULL,
	"languagePreference" varchar(10) DEFAULT 'en' NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"lastSignedIn" timestamp NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
