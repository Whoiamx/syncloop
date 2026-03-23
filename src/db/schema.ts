import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const defaultSubtitleStyle = {
  fontFamily: "Inter",
  fontSize: 24,
  textColor: "#ffffff",
  backgroundColor: "#000000",
  backgroundOpacity: 0.75,
  showBackground: true,
  animation: "none" as "none" | "fade" | "slide" | "typewriter",
};

export type SubtitleStyle = typeof defaultSubtitleStyle;

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  template: varchar("template", { length: 50 }),
  language: varchar("language", { length: 10 }).default("en"),
  subtitleStyle: jsonb("subtitle_style").$type<SubtitleStyle>().default(defaultSubtitleStyle),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" })
    .unique(),
  fileName: varchar("file_name", { length: 500 }),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  duration: real("duration"),
  width: integer("width"),
  height: integer("height"),
  fps: real("fps"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subtitles = pgTable("subtitles", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  index: integer("index").notNull(),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  text: text("text").notNull(),
  source: varchar("source", { length: 50 }).default("ai_generated"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type Subtitle = typeof subtitles.$inferSelect;
export type NewSubtitle = typeof subtitles.$inferInsert;
