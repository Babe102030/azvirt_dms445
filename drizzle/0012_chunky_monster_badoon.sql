CREATE TABLE `notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationId` int NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('email','sms','in_app') NOT NULL,
	`status` enum('sent','failed','bounced','opened') NOT NULL,
	`recipient` varchar(255) NOT NULL,
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`openedAt` timestamp,
	`metadata` json,
	CONSTRAINT `notification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`smsEnabled` boolean NOT NULL DEFAULT false,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`overdueReminders` boolean NOT NULL DEFAULT true,
	`completionNotifications` boolean NOT NULL DEFAULT true,
	`assignmentNotifications` boolean NOT NULL DEFAULT true,
	`statusChangeNotifications` boolean NOT NULL DEFAULT true,
	`quietHoursStart` varchar(5),
	`quietHoursEnd` varchar(5),
	`timezone` varchar(50) NOT NULL DEFAULT 'UTC',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `task_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('overdue_reminder','completion_confirmation','assignment','status_change','comment') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`status` enum('pending','sent','failed','read') NOT NULL DEFAULT 'pending',
	`channels` json,
	`scheduledFor` timestamp,
	`sentAt` timestamp,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_notifications_id` PRIMARY KEY(`id`)
);
