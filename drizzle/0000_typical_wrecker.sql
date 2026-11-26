CREATE TABLE `research_feeds` (
	`feed_key` text PRIMARY KEY NOT NULL,
	`payload` text,
	`checked` integer DEFAULT 0 NOT NULL,
	`success` integer DEFAULT 0 NOT NULL,
	`issue` text,
	`lease` integer DEFAULT 0 NOT NULL,
	`token` text
);
