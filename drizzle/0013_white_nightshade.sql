CREATE TABLE `notification_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`subject` varchar(255) NOT NULL,
	`bodyText` text NOT NULL,
	`bodyHtml` text,
	`channels` json NOT NULL,
	`variables` json,
	`tags` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_triggers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`templateId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`eventType` varchar(100) NOT NULL,
	`triggerCondition` json NOT NULL,
	`actions` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastTriggeredAt` timestamp,
	`triggerCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_triggers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trigger_execution_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggerId` int NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`conditionsMet` boolean NOT NULL,
	`notificationsSent` int NOT NULL DEFAULT 0,
	`error` text,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trigger_execution_log_id` PRIMARY KEY(`id`)
);
