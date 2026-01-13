CREATE TABLE "ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"modelName" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"batchId" integer NOT NULL,
	"materialId" integer NOT NULL,
	"plannedQuantity" double precision NOT NULL,
	"actualQuantity" double precision,
	"unit" varchar(50) NOT NULL,
	"inventoryDeducted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concrete_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"targetStrength" varchar(50),
	"slump" varchar(50),
	"maxAggregateSize" varchar(50),
	"yieldVolume" double precision DEFAULT 1,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"recipeId" integer NOT NULL,
	"batchId" integer,
	"ticketNumber" varchar(100),
	"truckNumber" varchar(50),
	"driverId" integer,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"scheduledTime" timestamp NOT NULL,
	"startTime" timestamp,
	"arrivalTime" timestamp,
	"deliveryTime" timestamp,
	"completionTime" timestamp,
	"gpsLocation" varchar(100),
	"photos" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deliveries_ticketNumber_unique" UNIQUE("ticketNumber")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50),
	"url" text NOT NULL,
	"projectId" integer,
	"uploadedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"employeeNumber" varchar(50),
	"firstName" varchar(100) NOT NULL,
	"lastName" varchar(100) NOT NULL,
	"jobTitle" varchar(100),
	"department" varchar(100),
	"hireDate" timestamp,
	"hourlyRate" integer,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_userId_unique" UNIQUE("userId"),
	CONSTRAINT "employees_employeeNumber_unique" UNIQUE("employeeNumber")
);
--> statement-breakpoint
CREATE TABLE "machine_work_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"machineId" integer NOT NULL,
	"hours" double precision NOT NULL,
	"date" timestamp NOT NULL,
	"operatorId" integer
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100),
	"serialNumber" varchar(100),
	"status" varchar(20) DEFAULT 'active',
	"lastMaintenanceAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mixing_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer,
	"deliveryId" integer,
	"recipeId" integer,
	"recipeName" varchar(255),
	"batchNumber" varchar(100) NOT NULL,
	"volume" double precision NOT NULL,
	"unit" varchar(50) DEFAULT 'm3' NOT NULL,
	"status" varchar(20) DEFAULT 'planned' NOT NULL,
	"startTime" timestamp,
	"endTime" timestamp,
	"operatorId" integer,
	"approvedBy" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mixing_logs_batchNumber_unique" UNIQUE("batchNumber")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50),
	"status" varchar(20) DEFAULT 'unread',
	"sentAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"deliveryId" integer,
	"projectId" integer,
	"testType" varchar(50) NOT NULL,
	"resultValue" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"testedBy" integer,
	"testedAt" timestamp DEFAULT now() NOT NULL,
	"photos" text,
	"inspectorSignature" text,
	"supervisorSignature" text,
	"gpsLocation" varchar(100),
	"standardUsed" varchar(100) DEFAULT 'EN 206',
	"syncStatus" varchar(20) DEFAULT 'synced',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipeId" integer NOT NULL,
	"materialId" integer NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"createdBy" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskId" integer NOT NULL,
	"userId" integer NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium',
	"dueDate" timestamp,
	"projectId" integer,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"shiftId" integer NOT NULL,
	"approverId" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approvedAt" timestamp,
	"comments" text,
	"rejectionReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "quantity" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "minStock" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "criticalThreshold" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "lastSignedIn" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_ai_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_ingredients" ADD CONSTRAINT "batch_ingredients_batchId_mixing_logs_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."mixing_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_ingredients" ADD CONSTRAINT "batch_ingredients_materialId_materials_id_fk" FOREIGN KEY ("materialId") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_recipeId_concrete_recipes_id_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."concrete_recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_batchId_mixing_logs_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."mixing_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedBy_users_id_fk" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_work_hours" ADD CONSTRAINT "machine_work_hours_machineId_machines_id_fk" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_work_hours" ADD CONSTRAINT "machine_work_hours_operatorId_users_id_fk" FOREIGN KEY ("operatorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mixing_logs" ADD CONSTRAINT "mixing_logs_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mixing_logs" ADD CONSTRAINT "mixing_logs_recipeId_concrete_recipes_id_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."concrete_recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mixing_logs" ADD CONSTRAINT "mixing_logs_operatorId_users_id_fk" FOREIGN KEY ("operatorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mixing_logs" ADD CONSTRAINT "mixing_logs_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_tests" ADD CONSTRAINT "quality_tests_deliveryId_deliveries_id_fk" FOREIGN KEY ("deliveryId") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_tests" ADD CONSTRAINT "quality_tests_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_tests" ADD CONSTRAINT "quality_tests_testedBy_users_id_fk" FOREIGN KEY ("testedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_concrete_recipes_id_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."concrete_recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_materialId_materials_id_fk" FOREIGN KEY ("materialId") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employeeId_users_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_taskId_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_approvals" ADD CONSTRAINT "timesheet_approvals_shiftId_shifts_id_fk" FOREIGN KEY ("shiftId") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_approvals" ADD CONSTRAINT "timesheet_approvals_approverId_users_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;