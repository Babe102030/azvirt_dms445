ALTER TABLE `deliveries` ADD `customerName` varchar(255);--> statement-breakpoint
ALTER TABLE `deliveries` ADD `customerPhone` varchar(50);--> statement-breakpoint
ALTER TABLE `deliveries` ADD `smsNotificationSent` boolean DEFAULT false;