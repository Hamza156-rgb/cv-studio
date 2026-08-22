CREATE TABLE `credentialAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(512) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credentialAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `credentialAccounts_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `credentialAccounts_email_unique` UNIQUE(`email`)
);
