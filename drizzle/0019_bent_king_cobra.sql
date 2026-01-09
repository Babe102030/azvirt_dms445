CREATE TABLE `timesheet_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timesheetId` int NOT NULL,
	`approverId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`comments` text,
	`rejectionReason` text,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timesheet_approvals_id` PRIMARY KEY(`id`)
);
