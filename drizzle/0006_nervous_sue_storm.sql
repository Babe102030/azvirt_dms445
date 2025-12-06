CREATE TABLE `forecast_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`materialName` varchar(255) NOT NULL,
	`currentStock` int NOT NULL,
	`dailyConsumptionRate` int NOT NULL,
	`predictedRunoutDate` timestamp,
	`daysUntilStockout` int,
	`recommendedOrderQty` int,
	`confidence` int,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forecast_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_consumption_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`quantity` int NOT NULL,
	`consumptionDate` timestamp NOT NULL,
	`projectId` int,
	`deliveryId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `material_consumption_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`materialName` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`supplier` varchar(255),
	`supplierEmail` varchar(255),
	`status` enum('pending','approved','ordered','received','cancelled') NOT NULL DEFAULT 'pending',
	`orderDate` timestamp NOT NULL DEFAULT (now()),
	`expectedDelivery` timestamp,
	`actualDelivery` timestamp,
	`totalCost` int,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `materials` ADD `lowStockEmailSent` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `materials` ADD `lastEmailSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `materials` ADD `supplierEmail` varchar(255);