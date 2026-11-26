CREATE TABLE `research_clock` (
	`slot` integer PRIMARY KEY NOT NULL,
	`started` integer NOT NULL,
	`finished` integer,
	`run_id` integer,
	`issue` text
);
