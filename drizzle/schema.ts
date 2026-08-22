import { index, int, longtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const resumes = mysqlTable("resumes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  template: varchar("template", { length: 48 }).notNull().default("modern"),
  data: longtext("data").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("resumes_user_updated_idx").on(table.userId, table.updatedAt)]);

export const resumePhotos = mysqlTable("resumePhotos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("resume_photos_user_created_idx").on(table.userId, table.createdAt)]);

export const credentialAccounts = mysqlTable("credentialAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 512 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Resume = typeof resumes.$inferSelect;
export type ResumePhoto = typeof resumePhotos.$inferSelect;
export type CredentialAccount = typeof credentialAccounts.$inferSelect;
