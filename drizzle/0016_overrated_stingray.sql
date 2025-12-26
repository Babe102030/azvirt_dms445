CREATE TABLE `geofence_violations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`locationLogId` int NOT NULL,
	`employeeId` int NOT NULL,
	`jobSiteId` int NOT NULL,
	`violationType` enum('outside_geofence','check_in_outside','check_out_outside') NOT NULL,
	`distanceFromGeofence` int NOT NULL,
	`severity` enum('warning','violation') NOT NULL DEFAULT 'warning',
	`isResolved` boolean NOT NULL DEFAULT false,
	`resolvedBy` int,
	`resolutionNotes` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `geofence_violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geofences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobSiteId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`centerLatitude` decimal(10,8) NOT NULL,
	`centerLongitude` decimal(11,8) NOT NULL,
	`radiusMeters` int NOT NULL,
	`geofenceType` enum('circular','polygon') NOT NULL DEFAULT 'circular',
	`polygonCoordinates` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geofences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`geofenceRadius` int NOT NULL DEFAULT 100,
	`address` varchar(500),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftId` int NOT NULL,
	`employeeId` int NOT NULL,
	`jobSiteId` int NOT NULL,
	`eventType` enum('check_in','check_out','location_update') NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`accuracy` int,
	`isWithinGeofence` boolean NOT NULL DEFAULT false,
	`distanceFromGeofence` int,
	`deviceId` varchar(255),
	`ipAddress` varchar(45),
	`userAgent` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `location_logs_id` PRIMARY KEY(`id`)
);
