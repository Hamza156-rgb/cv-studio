import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, resumePhotos, resumes, type Resume, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("The database is temporarily unavailable.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listResumesForUser(userId: number) {
  const db = await requireDb();
  return db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.updatedAt));
}

export async function getResumeForUser(userId: number, id: number) {
  const db = await requireDb();
  const result = await db.select().from(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, userId))).limit(1);
  return result[0];
}

export async function createResumeForUser(input: { userId: number; title: string; template: string; data: string }) {
  const db = await requireDb();
  const result: any = await db.insert(resumes).values(input);
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  if (!id) throw new Error("Could not create the resume.");
  return getResumeForUser(input.userId, id) as Promise<Resume>;
}

export async function updateResumeForUser(input: { userId: number; id: number; title?: string; template?: string; data?: string }) {
  const db = await requireDb();
  const update: Record<string, string> = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.template !== undefined) update.template = input.template;
  if (input.data !== undefined) update.data = input.data;
  if (Object.keys(update).length) {
    await db.update(resumes).set(update).where(and(eq(resumes.id, input.id), eq(resumes.userId, input.userId)));
  }
  return getResumeForUser(input.userId, input.id);
}

export async function deleteResumeForUser(userId: number, id: number) {
  const db = await requireDb();
  const result: any = await db.delete(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
  const affected = Number(result?.[0]?.affectedRows ?? result?.affectedRows ?? 0);
  return affected > 0;
}

export async function duplicateResumeForUser(userId: number, id: number) {
  const original = await getResumeForUser(userId, id);
  if (!original) return undefined;
  return createResumeForUser({ userId, title: `${original.title} — copy`, template: original.template, data: original.data });
}

export async function listResumePhotosForUser(userId: number) {
  const db = await requireDb();
  return db.select().from(resumePhotos).where(eq(resumePhotos.userId, userId)).orderBy(desc(resumePhotos.createdAt));
}

export async function createResumePhoto(input: { userId: number; storageKey: string; url: string; fileName: string; mimeType: string }) {
  const db = await requireDb();
  const result: any = await db.insert(resumePhotos).values(input);
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  const rows = await db.select().from(resumePhotos).where(and(eq(resumePhotos.id, id), eq(resumePhotos.userId, input.userId))).limit(1);
  return rows[0];
}
