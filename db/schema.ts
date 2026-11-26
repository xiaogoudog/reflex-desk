import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const researchFeeds=sqliteTable("research_feeds",{
  key:text("feed_key").primaryKey(),payload:text("payload"),checked:integer("checked").notNull().default(0),
  success:integer("success").notNull().default(0),issue:text("issue"),lease:integer("lease").notNull().default(0),token:text("token"),
  archiveHash:text("archive_hash")
});
export const readings=sqliteTable("research_readings",{
  feed:text("feed").notNull(),item:text("item").notNull(),reading:text("reading").notNull()
},t=>[primaryKey({columns:[t.feed,t.item]})]);
export const changes=sqliteTable("research_changes",{
  id:integer("id").primaryKey({autoIncrement:true}),feed:text("feed").notNull(),item:text("item").notNull(),
  period:text("period").notNull(),label:text("label").notNull(),unit:text("unit").notNull(),reading:text("reading").notNull(),
  previous:text("previous"),source:text("source").notNull(),provider:text("provider").notNull(),seen:integer("seen").notNull()
},t=>[index("research_change_feed").on(t.feed,t.id),index("research_change_item").on(t.feed,t.item,t.id)]);
export const watchlist=sqliteTable("research_watchlist",{
  symbol:text("symbol").primaryKey(),active:integer("active").notNull(),updated:integer("updated").notNull()
});
export const runs=sqliteTable("research_runs",{
  id:integer("id").primaryKey(),started:integer("started").notNull(),finished:integer("finished"),origin:text("origin").notNull()
});
export const jobs=sqliteTable("research_jobs",{
  run:integer("run").notNull(),feed:text("feed").notNull(),status:text("status").notNull().default("pending"),
  lease:integer("lease").notNull().default(0),owner:text("owner"),tries:integer("tries").notNull().default(0),
  changed:integer("changed").notNull().default(0),issue:text("issue")
},t=>[primaryKey({columns:[t.run,t.feed]})]);

export const clocks=sqliteTable("research_clock",{
  slot:integer("slot").primaryKey(),started:integer("started").notNull(),finished:integer("finished"),runId:integer("run_id"),issue:text("issue")
});
