CREATE TABLE `daily_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dueDate` timestamp NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`assignedTo` int,
	`category` varchar(100),
	`tags` json,
	`attachments` json,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`assignedTo` int NOT NULL,
	`assignedBy` int NOT NULL,
	`responsibility` varchar(255) NOT NULL,
	`completionPercentage` int NOT NULL DEFAULT 0,
	`notes` text,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`previousStatus` varchar(50),
	`newStatus` varchar(50) NOT NULL,
	`changedBy` int NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_status_history_id` PRIMARY KEY(`id`)
);
