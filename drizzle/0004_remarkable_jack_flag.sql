CREATE TABLE "delivery_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"deliveryId" integer NOT NULL,
	"status" varchar(50) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"gpsLocation" varchar(100),
	"notes" text,
	"createdBy" integer
);
--> statement-breakpoint
ALTER TABLE "delivery_status_history" ADD CONSTRAINT "delivery_status_history_deliveryId_deliveries_id_fk" FOREIGN KEY ("deliveryId") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_status_history" ADD CONSTRAINT "delivery_status_history_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;