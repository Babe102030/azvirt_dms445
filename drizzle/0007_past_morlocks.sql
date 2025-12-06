CREATE TABLE `email_branding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`logoUrl` varchar(500),
	`primaryColor` varchar(20) NOT NULL DEFAULT '#f97316',
	`secondaryColor` varchar(20) NOT NULL DEFAULT '#ea580c',
	`companyName` varchar(255) NOT NULL DEFAULT 'AzVirt',
	`footerText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_branding_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(100) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`htmlTemplate` text NOT NULL,
	`variables` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_type_unique` UNIQUE(`type`)
);
--> statement-breakpoint
CREATE TABLE `report_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_recipients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`includeProduction` boolean NOT NULL DEFAULT true,
	`includeDeliveries` boolean NOT NULL DEFAULT true,
	`includeMaterials` boolean NOT NULL DEFAULT true,
	`includeQualityControl` boolean NOT NULL DEFAULT true,
	`reportTime` varchar(10) NOT NULL DEFAULT '18:00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_settings_userId_unique` UNIQUE(`userId`)
);
