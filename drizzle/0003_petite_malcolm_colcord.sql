CREATE TABLE "material_consumption_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"materialId" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"quantityUsed" double precision NOT NULL,
	"deliveryId" integer
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchaseOrderId" integer NOT NULL,
	"materialId" integer NOT NULL,
	"quantity" double precision NOT NULL,
	"unitPrice" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"orderDate" timestamp DEFAULT now() NOT NULL,
	"expectedDeliveryDate" timestamp,
	"actualDeliveryDate" timestamp,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"totalCost" double precision,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"contactPerson" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"averageLeadTimeDays" integer,
	"onTimeDeliveryRate" double precision,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "leadTimeDays" integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "reorderPoint" double precision;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "optimalOrderQuantity" double precision;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "supplierId" integer;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "lastOrderDate" timestamp;--> statement-breakpoint
ALTER TABLE "material_consumption_history" ADD CONSTRAINT "material_consumption_history_materialId_materials_id_fk" FOREIGN KEY ("materialId") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_consumption_history" ADD CONSTRAINT "material_consumption_history_deliveryId_deliveries_id_fk" FOREIGN KEY ("deliveryId") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_purchase_orders_id_fk" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_materialId_materials_id_fk" FOREIGN KEY ("materialId") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_suppliers_id_fk" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;