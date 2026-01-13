CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(255) NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`unit` text(50) NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`minStock` integer DEFAULT 0 NOT NULL,
	`criticalThreshold` integer DEFAULT 0 NOT NULL,
	`supplier` text(255),
	`unitPrice` integer,
	`lowStockEmailSent` integer DEFAULT false,
	`lastEmailSentAt` integer,
	`supplierEmail` text(255),
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(255) NOT NULL,
	`description` text,
	`location` text(500),
	`status` text DEFAULT 'planning' NOT NULL,
	`startDate` integer,
	`endDate` integer,
	`createdBy` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text(64) NOT NULL,
	`name` text,
	`email` text(320),
	`loginMethod` text(64),
	`role` text DEFAULT 'user' NOT NULL,
	`phoneNumber` text(50),
	`smsNotificationsEnabled` integer DEFAULT false NOT NULL,
	`languagePreference` text(10) DEFAULT 'en' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastSignedIn` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);