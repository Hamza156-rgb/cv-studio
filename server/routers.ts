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
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  resume: router({
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
