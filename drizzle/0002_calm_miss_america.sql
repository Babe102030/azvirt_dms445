CREATE TABLE `aggregateInputs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`concreteBaseId` int NOT NULL,
	`date` timestamp NOT NULL,
	`materialType` enum('cement','sand','gravel','water','admixture','other') NOT NULL DEFAULT 'other',
	`materialName` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`unit` varchar(50) NOT NULL,
	`supplier` varchar(255),
	`batchNumber` varchar(100),
	`receivedBy` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aggregateInputs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `concreteBases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` varchar(500) NOT NULL,
	`capacity` int NOT NULL,
	`status` enum('operational','maintenance','inactive') NOT NULL DEFAULT 'operational',
	`managerName` varchar(255),
	`phoneNumber` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `concreteBases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`employeeNumber` varchar(50) NOT NULL,
	`position` varchar(100) NOT NULL,
	`department` enum('construction','maintenance','quality','administration','logistics') NOT NULL DEFAULT 'construction',
	`phoneNumber` varchar(50),
	`email` varchar(320),
	`hourlyRate` int,
	`status` enum('active','inactive','on_leave') NOT NULL DEFAULT 'active',
	`hireDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_employeeNumber_unique` UNIQUE(`employeeNumber`)
);
--> statement-breakpoint
CREATE TABLE `machineMaintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`date` timestamp NOT NULL,
	`maintenanceType` enum('lubrication','fuel','oil_change','repair','inspection','other') NOT NULL DEFAULT 'other',
	`description` text,
	`lubricationType` varchar(100),
	`lubricationAmount` int,
	`fuelType` varchar(100),
	`fuelAmount` int,
	`cost` int,
	`performedBy` varchar(255),
	`hoursAtMaintenance` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machineMaintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machineWorkHours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`projectId` int,
	`date` timestamp NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`hoursWorked` int,
	`operatorId` int,
	`operatorName` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machineWorkHours_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`machineNumber` varchar(100) NOT NULL,
	`type` enum('mixer','pump','truck','excavator','crane','other') NOT NULL DEFAULT 'other',
	`manufacturer` varchar(255),
	`model` varchar(255),
	`year` int,
	`concreteBaseId` int,
	`status` enum('operational','maintenance','repair','inactive') NOT NULL DEFAULT 'operational',
	`totalWorkingHours` int DEFAULT 0,
	`lastMaintenanceDate` timestamp,
	`nextMaintenanceDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machines_id` PRIMARY KEY(`id`),
	CONSTRAINT `machines_machineNumber_unique` UNIQUE(`machineNumber`)
);
--> statement-breakpoint
CREATE TABLE `workHours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`projectId` int,
	`date` timestamp NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`hoursWorked` int,
	`overtimeHours` int DEFAULT 0,
	`workType` enum('regular','overtime','weekend','holiday') NOT NULL DEFAULT 'regular',
	`notes` text,
	`approvedBy` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workHours_id` PRIMARY KEY(`id`)
);
