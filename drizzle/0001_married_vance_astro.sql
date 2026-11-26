CREATE TABLE `research_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feed` text NOT NULL,
	`item` text NOT NULL,
	`period` text NOT NULL,
	`label` text NOT NULL,
	`unit` text NOT NULL,
	`reading` text NOT NULL,
	`previous` text,
	`source` text NOT NULL,
	`provider` text NOT NULL,
	`seen` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `research_change_feed` ON `research_changes` (`feed`,`id`);--> statement-breakpoint
CREATE INDEX `research_change_item` ON `research_changes` (`feed`,`item`,`id`);--> statement-breakpoint
CREATE TABLE `research_jobs` (
	`run` integer NOT NULL,
	`feed` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`lease` integer DEFAULT 0 NOT NULL,
	`owner` text,
	`tries` integer DEFAULT 0 NOT NULL,
	`changed` integer DEFAULT 0 NOT NULL,
	`issue` text,
	PRIMARY KEY(`run`, `feed`)
);
--> statement-breakpoint
CREATE TABLE `research_readings` (
	`feed` text NOT NULL,
	`item` text NOT NULL,
	`reading` text NOT NULL,
	PRIMARY KEY(`feed`, `item`)
);
--> statement-breakpoint
CREATE TABLE `research_runs` (
	`id` integer PRIMARY KEY NOT NULL,
	`started` integer NOT NULL,
	`finished` integer,
	`origin` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_watchlist` (
	`symbol` text PRIMARY KEY NOT NULL,
	`active` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `research_feeds` ADD `archive_hash` text;