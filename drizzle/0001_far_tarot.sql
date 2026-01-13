ALTER TABLE "materials" ALTER COLUMN "category" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "category" SET DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'planning';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';