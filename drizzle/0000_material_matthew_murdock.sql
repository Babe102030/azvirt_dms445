CREATE TABLE `aggregate_inputs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`concreteBaseId` integer NOT NULL,
	`date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`materialType` text NOT NULL,
	`materialName` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`supplier` text,
	`batchNumber` text,
	`receivedBy` text,
	`notes` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`concreteBaseId`) REFERENCES `concrete_bases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`modelName` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversationId` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`conversationId`) REFERENCES `ai_conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `batch_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`materialId` integer NOT NULL,
	`plannedQuantity` real NOT NULL,
	`actualQuantity` real,
	`unit` text NOT NULL,
	`inventoryDeducted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`batchId`) REFERENCES `mixing_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checkInRecords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shiftId` integer NOT NULL,
	`employeeId` integer NOT NULL,
	`projectSiteId` integer NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`accuracy` real NOT NULL,
	`distanceFromSiteMeters` real,
	`isWithinGeofence` integer NOT NULL,
	`checkInType` text DEFAULT 'check_in' NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`notes` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`projectSiteId`) REFERENCES `projectSites`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `compliance_audit_trail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employeeId` integer NOT NULL,
	`action` text NOT NULL,
	`entityType` text NOT NULL,
	`entityId` integer NOT NULL,
	`oldValue` text,
	`newValue` text,
	`reason` text,
	`performedBy` integer NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `concrete_bases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`capacity` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`managerName` text,
	`phoneNumber` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `concrete_recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`targetStrength` text,
	`slump` text,
	`maxAggregateSize` text,
	`yieldVolume` real DEFAULT 1,
	`notes` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer,
	`projectName` text,
	`recipeId` integer,
	`concreteType` text,
	`volume` real,
	`batchId` integer,
	`ticketNumber` text,
	`truckNumber` text,
	`vehicleNumber` text,
	`driverId` integer,
	`driverName` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`scheduledTime` integer NOT NULL,
	`startTime` integer,
	`arrivalTime` integer,
	`deliveryTime` integer,
	`completionTime` integer,
	`estimatedArrival` integer,
	`actualArrivalTime` integer,
	`actualDeliveryTime` integer,
	`gpsLocation` text,
	`photos` text,
	`deliveryPhotos` text,
	`notes` text,
	`driverNotes` text,
	`customerName` text,
	`customerPhone` text,
	`smsNotificationSent` integer DEFAULT false,
	`createdBy` integer,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipeId`) REFERENCES `concrete_recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batchId`) REFERENCES `mixing_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deliveries_ticketNumber_unique` ON `deliveries` (`ticketNumber`);--> statement-breakpoint
CREATE TABLE `delivery_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deliveryId` integer NOT NULL,
	`status` text NOT NULL,
	`timestamp` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`gpsLocation` text,
	`notes` text,
	`createdBy` integer,
	FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text,
	`url` text NOT NULL,
	`projectId` integer,
	`uploadedBy` integer,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_branding` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`logoUrl` text,
	`primaryColor` text DEFAULT '#f97316' NOT NULL,
	`secondaryColor` text DEFAULT '#ea580c' NOT NULL,
	`companyName` text DEFAULT 'AzVirt' NOT NULL,
	`footerText` text,
	`headerStyle` text DEFAULT 'gradient' NOT NULL,
	`fontFamily` text DEFAULT 'Arial, sans-serif' NOT NULL,
	`updatedBy` integer,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`subject` text NOT NULL,
	`bodyHtml` text NOT NULL,
	`bodyText` text,
	`isCustom` integer DEFAULT false NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`variables` text,
	`createdBy` integer,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_templates_type_unique` ON `email_templates` (`type`);--> statement-breakpoint
CREATE TABLE `employee_availability` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employeeId` integer NOT NULL,
	`dayOfWeek` integer NOT NULL,
	`startTime` text NOT NULL,
	`endTime` text NOT NULL,
	`isAvailable` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer,
	`employeeNumber` text,
	`firstName` text NOT NULL,
	`lastName` text NOT NULL,
	`jobTitle` text,
	`department` text,
	`hireDate` integer,
	`hourlyRate` integer,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_userId_unique` ON `employees` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employeeNumber_unique` ON `employees` (`employeeNumber`);--> statement-breakpoint
CREATE TABLE `machine_work_hours` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`machineId` integer NOT NULL,
	`hours` real NOT NULL,
	`date` integer NOT NULL,
	`operatorId` integer,
	FOREIGN KEY (`machineId`) REFERENCES `machines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operatorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `machines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text,
	`serialNumber` text,
	`status` text DEFAULT 'active',
	`lastMaintenanceAt` integer,
	`totalWorkingHours` real DEFAULT 0,
	`concreteBaseId` integer,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`concreteBaseId`) REFERENCES `concrete_bases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `material_consumption_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`materialId` integer NOT NULL,
	`date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`quantityUsed` real NOT NULL,
	`deliveryId` integer,
	FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`unit` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`minStock` real DEFAULT 0 NOT NULL,
	`criticalThreshold` real DEFAULT 0 NOT NULL,
	`supplier` text,
	`unitPrice` integer,
	`lowStockEmailSent` integer DEFAULT false,
	`lastEmailSentAt` integer,
	`supplierEmail` text,
	`leadTimeDays` integer DEFAULT 7,
	`reorderPoint` real,
	`optimalOrderQuantity` real,
	`supplierId` integer,
	`lastOrderDate` integer,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mixing_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer,
	`deliveryId` integer,
	`recipeId` integer,
	`recipeName` text,
	`batchNumber` text NOT NULL,
	`volume` real NOT NULL,
	`unit` text DEFAULT 'm3' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`startTime` integer,
	`endTime` integer,
	`operatorId` integer,
	`approvedBy` integer,
	`notes` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipeId`) REFERENCES `concrete_recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operatorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mixing_logs_batchNumber_unique` ON `mixing_logs` (`batchNumber`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text,
	`status` text DEFAULT 'unread',
	`sentAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projectSites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`radiusMeters` integer DEFAULT 50 NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`zipCode` text,
	`country` text,
	`isActive` integer DEFAULT true NOT NULL,
	`createdBy` integer,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`location` text,
	`status` text DEFAULT 'planning' NOT NULL,
	`startDate` integer,
	`endDate` integer,
	`createdBy` integer NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchaseOrderId` integer NOT NULL,
	`materialId` integer NOT NULL,
	`quantity` real NOT NULL,
	`unitPrice` real NOT NULL,
	FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplierId` integer NOT NULL,
	`orderDate` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`expectedDeliveryDate` integer,
	`actualDeliveryDate` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`totalCost` real,
	`notes` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quality_tests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deliveryId` integer,
	`projectId` integer,
	`testName` text,
	`testType` text NOT NULL,
	`result` text,
	`resultValue` text,
	`unit` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`testedByUserId` integer,
	`testedBy` text,
	`testedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`photos` text,
	`photoUrls` text,
	`notes` text,
	`inspectorSignature` text,
	`supervisorSignature` text,
	`gpsLocation` text,
	`testLocation` text,
	`standardUsed` text DEFAULT 'EN 206',
	`complianceStandard` text,
	`syncStatus` text DEFAULT 'synced',
	`offlineSyncStatus` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`testedByUserId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipeId` integer NOT NULL,
	`materialId` integer NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	FOREIGN KEY (`recipeId`) REFERENCES `concrete_recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shift_breaks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shiftId` integer NOT NULL,
	`startTime` integer NOT NULL,
	`endTime` integer,
	`type` text DEFAULT 'unpaid' NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shift_swaps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shiftId` integer NOT NULL,
	`fromEmployeeId` integer NOT NULL,
	`toEmployeeId` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`requestedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`respondedAt` integer,
	`notes` text,
	FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fromEmployeeId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`toEmployeeId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shift_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`startTime` text NOT NULL,
	`endTime` text NOT NULL,
	`durationHours` real,
	`color` text,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employeeId` integer NOT NULL,
	`templateId` integer,
	`startTime` integer NOT NULL,
	`endTime` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`createdBy` integer,
	`notes` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`templateId`) REFERENCES `shift_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`contactPerson` text,
	`email` text,
	`phone` text,
	`averageLeadTimeDays` integer,
	`onTimeDeliveryRate` real,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`taskId` integer NOT NULL,
	`userId` integer NOT NULL,
	`assignedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium',
	`dueDate` integer,
	`projectId` integer,
	`createdBy` integer NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `timesheet_approvals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shiftId` integer NOT NULL,
	`approverId` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`approvedAt` integer,
	`comments` text,
	`rejectionReason` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`phoneNumber` text,
	`smsNotificationsEnabled` integer DEFAULT false NOT NULL,
	`languagePreference` text DEFAULT 'en' NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`lastSignedIn` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE TABLE `work_hours` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employeeId` integer NOT NULL,
	`projectId` integer,
	`date` integer NOT NULL,
	`hoursWorked` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
