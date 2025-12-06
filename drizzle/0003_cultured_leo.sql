ALTER TABLE `materials` ADD `criticalThreshold` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phoneNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `smsNotificationsEnabled` boolean DEFAULT false NOT NULL;