CREATE TABLE `break_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workHourId` int NOT NULL,
	`employeeId` int NOT NULL,
	`breakStart` timestamp NOT NULL,
	`breakEnd` timestamp,
	`breakDuration` int,
	`breakType` enum('meal','rest','combined') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `break_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `break_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurisdiction` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`dailyWorkHours` int NOT NULL,
	`breakDuration` int NOT NULL,
	`breakType` enum('meal','rest','combined') NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT true,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `break_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_audit_trail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`auditDate` timestamp NOT NULL,
	`auditType` enum('daily_hours','weekly_hours','break_compliance','overtime','wage_calculation') NOT NULL,
	`status` enum('compliant','warning','violation') NOT NULL,
	`details` json NOT NULL,
	`severity` enum('low','medium','high') NOT NULL DEFAULT 'low',
	`actionTaken` text,
	`resolvedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_audit_trail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`startTime` varchar(5),
	`endTime` varchar(5),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_availability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`breakDuration` int DEFAULT 0,
	`daysOfWeek` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`shiftDate` timestamp NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`breakDuration` int DEFAULT 0,
	`projectId` int,
	`status` enum('scheduled','in_progress','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timesheet_offline_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`deviceId` varchar(255) NOT NULL,
	`entryData` json NOT NULL,
	`syncStatus` enum('pending','syncing','synced','failed') NOT NULL DEFAULT 'pending',
	`syncAttempts` int DEFAULT 0,
	`lastSyncAttempt` timestamp,
	`syncedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timesheet_offline_cache_id` PRIMARY KEY(`id`)
);
