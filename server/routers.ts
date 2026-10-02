import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { RESUME_TEMPLATES, normalizeResumeData } from "../shared/resume";
import { COOKIE_NAME } from "../shared/const";
import { createResumeForUser, createResumePhoto, deleteResumeForUser, duplicateResumeForUser, getResumeForUser, listResumePhotosForUser, listResumesForUser, updateResumeForUser } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { authenticateCredentialAccount, CREDENTIAL_SESSION_COOKIE, CREDENTIAL_SESSION_MAX_AGE, issueCredentialSession, registerCredentialAccount } from "./credentialAuth";
import { importResumeDocument, MAX_IMPORT_BYTES } from "./resumeImport";

const templateIds = RESUME_TEMPLATES.map((template) => template.id) as [string, ...string[]];
const resumeInput = z.object({
  title: z.string().trim().min(1).max(160),
  template: z.enum(templateIds),
  data: z.unknown(),
});

export function decodeResumePhoto(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload a JPG, PNG, or WebP image." });
  const [, mimeType, encoded] = match;
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose an image smaller than 2 MB." });
  const isPng = mimeType === "image/png" && bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && bytes.subarray(12, 16).toString("ascii") === "IHDR" && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0;
  const isJpeg = mimeType === "image/jpeg" && bytes.length >= 4 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) && bytes.subarray(-2).equals(Buffer.from([0xff, 0xd9]));
  const isWebp = mimeType === "image/webp" && bytes.length >= 20 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP" && bytes.readUInt32LE(4) + 8 === bytes.length;
  if (!isPng && !isJpeg && !isWebp) throw new TRPCError({ code: "BAD_REQUEST", message: "The uploaded file does not match its declared image format." });
  return { mimeType, bytes };
}

function toResumeDto(resume: { id: number; title: string; template: string; data: string; createdAt: Date; updatedAt: Date }) {
  const template = RESUME_TEMPLATES.some((item) => item.id === resume.template) ? resume.template as (typeof templateIds)[number] : "modern";
  let rawData: unknown = {};
  try { rawData = JSON.parse(resume.data); } catch { rawData = {}; }
  return { ...resume, template, data: normalizeResumeData(rawData, template as any) };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    signUp: publicProcedure.input(z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(320), password: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      try {
        const user = await registerCredentialAccount(input);
        const token = await issueCredentialSession(user.id);
        ctx.res.cookie(CREDENTIAL_SESSION_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: CREDENTIAL_SESSION_MAX_AGE * 1000 });
        return user;
      } catch (error) {
        const message = error instanceof Error ? error.message : "We could not create your account.";
        throw new TRPCError({ code: message.includes("already exists") ? "CONFLICT" : "BAD_REQUEST", message });
      }
    }),
    signIn: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await authenticateCredentialAccount(input);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect email or password." });
      const token = await issueCredentialSession(user.id);
      ctx.res.cookie(CREDENTIAL_SESSION_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: CREDENTIAL_SESSION_MAX_AGE * 1000 });
      return user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(ctx.req));
      ctx.res.clearCookie(CREDENTIAL_SESSION_COOKIE, getSessionCookieOptions(ctx.req));
      return { success: true } as const;
    }),
  }),
  resume: router({
    import: protectedProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), dataUrl: z.string().max(Math.ceil(MAX_IMPORT_BYTES * 1.4)).min(32) })).mutation(async ({ input }) => importResumeDocument(input.dataUrl, input.fileName)),
    list: protectedProcedure.query(async ({ ctx }) => (await listResumesForUser(ctx.user.id)).map(toResumeDto)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const resume = await getResumeForUser(ctx.user.id, input.id);
      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "This resume was not found." });
      return toResumeDto(resume);
    }),
    create: protectedProcedure.input(resumeInput).mutation(async ({ ctx, input }) => {
      const resume = await createResumeForUser({ userId: ctx.user.id, title: input.title, template: input.template, data: JSON.stringify(normalizeResumeData(input.data, input.template as any)) });
      return toResumeDto(resume);
    }),
    update: protectedProcedure.input(resumeInput.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const data = input.data === undefined ? undefined : JSON.stringify(normalizeResumeData(input.data, input.template as any));
      const resume = await updateResumeForUser({ userId: ctx.user.id, id: input.id, title: input.title, template: input.template, data });
      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "This resume was not found." });
      return toResumeDto(resume);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const deleted = await deleteResumeForUser(ctx.user.id, input.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "This resume was not found." });
      return { success: true };
    }),
    duplicate: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const resume = await duplicateResumeForUser(ctx.user.id, input.id);
      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "This resume was not found." });
      return toResumeDto(resume);
    }),
  }),
  photo: router({
    list: protectedProcedure.query(({ ctx }) => listResumePhotosForUser(ctx.user.id)),
    upload: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(255), dataUrl: z.string().min(32) })).mutation(async ({ ctx, input }) => {
      const { mimeType, bytes } = decodeResumePhoto(input.dataUrl);
      const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
      const stored = await storagePut(`resume-photos/${ctx.user.id}/${nanoid()}.${extension}`, bytes, mimeType);
      return createResumePhoto({ userId: ctx.user.id, storageKey: stored.key, url: stored.url, fileName: input.fileName, mimeType });
    }),
  }),
});

export type AppRouter = typeof appRouter;
