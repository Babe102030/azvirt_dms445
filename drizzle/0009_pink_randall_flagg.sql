ALTER TABLE `ai_models` ADD `isAvailable` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `ai_models` DROP COLUMN `isInstalled`;