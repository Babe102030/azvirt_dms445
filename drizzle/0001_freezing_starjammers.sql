CREATE TABLE `deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`projectName` varchar(255) NOT NULL,
	`concreteType` varchar(100) NOT NULL,
	`volume` int NOT NULL,
	`scheduledTime` timestamp NOT NULL,
	`actualTime` timestamp,
	`status` enum('scheduled','in_transit','delivered','cancelled') NOT NULL DEFAULT 'scheduled',
	`driverName` varchar(255),
	`vehicleNumber` varchar(100),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`category` enum('contract','blueprint','report','certificate','invoice','other') NOT NULL DEFAULT 'other',
	`projectId` int,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('cement','aggregate','admixture','water','other') NOT NULL DEFAULT 'other',
	`unit` varchar(50) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`minStock` int NOT NULL DEFAULT 0,
	`supplier` varchar(255),
	`unitPrice` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`location` varchar(500),
	`status` enum('planning','active','completed','on_hold') NOT NULL DEFAULT 'planning',
	`startDate` timestamp,
	`endDate` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualityTests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testName` varchar(255) NOT NULL,
	`testType` enum('slump','strength','air_content','temperature','other') NOT NULL DEFAULT 'other',
	`result` varchar(255) NOT NULL,
	`unit` varchar(50),
	`status` enum('pass','fail','pending') NOT NULL DEFAULT 'pending',
	`deliveryId` int,
	`projectId` int,
	`testedBy` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualityTests_id` PRIMARY KEY(`id`)
);
