ALTER TABLE "quality_tests" DROP CONSTRAINT "quality_tests_testedBy_users_id_fk";
--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "projectId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "recipeId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quality_tests" ALTER COLUMN "testedBy" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "projectName" varchar(255);--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "concreteType" varchar(100);--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "volume" double precision;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "vehicleNumber" varchar(50);--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "driverName" varchar(255);--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "estimatedArrival" integer;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "actualArrivalTime" integer;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "actualDeliveryTime" integer;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "deliveryPhotos" text;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "driverNotes" text;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "customerName" varchar(255);--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "customerPhone" varchar(50);--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "smsNotificationSent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "createdBy" integer;--> statement-breakpoint
ALTER TABLE "quality_tests" ADD COLUMN "testName" varchar(255);--> statement-breakpoint
ALTER TABLE "quality_tests" ADD COLUMN "result" varchar(100);--> statement-breakpoint
ALTER TABLE "quality_tests" ADD COLUMN "unit" varchar(50);--> statement-breakpoint
ALTER TABLE "quality_tests" ADD COLUMN "testedByUserId" integer;--> statement-breakpoint
ALTER TABLE "quality_tests" ADD COLUMN "photoUrls" text;--> statement-breakpoint
ALTER TABLE "quality_tests" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "quality_tests" ADD COLUMN "testLocation" varchar(100);--> statement-breakpoint
ALTER TABLE "quality_tests" ADD COLUMN "complianceStandard" varchar(100);--> statement-breakpoint
ALTER TABLE "quality_tests" ADD COLUMN "offlineSyncStatus" varchar(20);--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_tests" ADD CONSTRAINT "quality_tests_testedByUserId_users_id_fk" FOREIGN KEY ("testedByUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;