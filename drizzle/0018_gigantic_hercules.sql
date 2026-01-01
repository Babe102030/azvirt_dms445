CREATE TABLE `batch_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`materialId` int,
	`materialName` varchar(255) NOT NULL,
	`plannedQuantity` int NOT NULL,
	`actualQuantity` int,
	`unit` varchar(50) NOT NULL,
	`inventoryDeducted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `batch_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mixing_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchNumber` varchar(100) NOT NULL,
	`recipeId` int NOT NULL,
	`recipeName` varchar(255) NOT NULL,
	`volume` int NOT NULL,
	`volumeM3` decimal(10,2) NOT NULL,
	`status` enum('planned','in_progress','completed','rejected') NOT NULL DEFAULT 'planned',
	`projectId` int,
	`deliveryId` int,
	`startTime` timestamp,
	`endTime` timestamp,
	`producedBy` int,
	`approvedBy` int,
	`notes` text,
	`qualityNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mixing_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `mixing_logs_batchNumber_unique` UNIQUE(`batchNumber`)
);
