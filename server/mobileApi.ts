import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { User } from "../drizzle/schema";
import { RESUME_TEMPLATES, normalizeResumeData } from "../shared/resume";
import { authenticateCredentialAccount, getUserForSessionToken, issueCredentialSession, registerCredentialAccount } from "./credentialAuth";
import { createResumeForUser, createResumePhoto, deleteResumeForUser, duplicateResumeForUser, getResumeForUser, listResumePhotosForUser, listResumesForUser, updateResumeForUser } from "./db";
import { MOBILE_API_SPEC } from "./mobileApiSpec";
import { importResumeDocument, MAX_IMPORT_BYTES } from "./resumeImport";
import { sendResumePdf } from "./resumePdf";
import { decodeResumePhoto, toResumeDto } from "./routers";
import { storagePut } from "./storage";

/*
 * Versioned REST API for the mobile app, mounted at /api/v1. It shares the website's database,
 * accounts and business logic; only the transport differs: JSON over REST, and a bearer token
 * instead of the browser session cookie.
 */

export const MOBILE_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

type AuthedRequest = Request & { user: User };
type ErrorCode = "BAD_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "TOO_MANY_REQUESTS" | "INTERNAL";
const STATUS: Record<ErrorCode, number> = { BAD_REQUEST: 400, UNAUTHORIZED: 401, NOT_FOUND: 404, CONFLICT: 409, TOO_MANY_REQUESTS: 429, INTERNAL: 500 };

class ApiError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly details?: unknown) { super(message); }
}

const templateIds = RESUME_TEMPLATES.map((template) => template.id) as [string, ...string[]];
const signUpInput = z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(320), password: z.string().min(8).max(128) });
const signInInput = z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) });
const createResumeInput = z.object({ title: z.string().trim().min(1).max(160), template: z.enum(templateIds), data: z.unknown().optional() });
const updateResumeInput = createResumeInput.partial().refine((value) => Object.keys(value).length > 0, "Provide at least one of title, template, or data.");
const fileInput = z.object({ fileName: z.string().trim().min(1).max(255), dataUrl: z.string().min(32) });
const importInput = fileInput.extend({ dataUrl: z.string().min(32).max(Math.ceil(MAX_IMPORT_BYTES * 1.4)) });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError("BAD_REQUEST", result.error.issues[0]?.message ?? "Invalid request.", result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
  return result.data;
}

function resumeId(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError("NOT_FOUND", "This resume was not found.");
  return id;
}

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

/** Photo URLs are stored relative to the site; a native app needs them absolute. */
function absoluteUrl(req: Request, url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol).split(",")[0].trim();
  return `${proto}://${req.get("host")}${url}`;
}

async function issueToken(user: User) {
  const token = await issueCredentialSession(user.id, MOBILE_TOKEN_MAX_AGE);
  return { token, tokenType: "Bearer" as const, expiresAt: new Date(Date.now() + MOBILE_TOKEN_MAX_AGE * 1000).toISOString(), user: publicUser(user) };
}

// Brute-force guard for sign-in: 10 failed attempts per email+IP within 15 minutes.
const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
const SIGN_IN_MAX_FAILURES = 10;
const signInFailures = new Map<string, { count: number; resetAt: number }>();
function signInKey(req: Request, email: string) { return `${req.ip}|${email.toLowerCase()}`; }
function assertSignInAllowed(key: string) {
  const entry = signInFailures.get(key);
  if (entry && entry.resetAt > Date.now() && entry.count >= SIGN_IN_MAX_FAILURES) throw new ApiError("TOO_MANY_REQUESTS", "Too many sign-in attempts. Please wait a few minutes and try again.");
}
function recordSignInFailure(key: string) {
  const now = Date.now();
  const entry = signInFailures.get(key);
  signInFailures.set(key, entry && entry.resetAt > now ? { ...entry, count: entry.count + 1 } : { count: 1, resetAt: now + SIGN_IN_WINDOW_MS });
  if (signInFailures.size > 10_000) for (const [stale, value] of Array.from(signInFailures)) if (value.resetAt <= now) signInFailures.delete(stale);
}

const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };
const authed = (fn: (req: AuthedRequest, res: Response) => Promise<unknown>) => handle(async (req, res) => {
  const header = req.headers.authorization ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  const user = await getUserForSessionToken(token);
  if (!user) throw new ApiError("UNAUTHORIZED", "Sign in to continue.");
  (req as AuthedRequest).user = user;
  await fn(req as AuthedRequest, res);
});

export function createMobileApiRouter() {
  const router = express.Router();

  router.get("/", (_req, res) => { res.json({ name: "CV Studio API", version: "1", docs: "/api/v1/openapi.json" }); });
  router.get("/openapi.json", (_req, res) => { res.json(MOBILE_API_SPEC); });
  router.get("/templates", (_req, res) => { res.json({ templates: RESUME_TEMPLATES }); });

  // ---- Authentication ----
  router.post("/auth/signup", handle(async (req, res) => {
    const input = parse(signUpInput, req.body);
    try {
      const user = await registerCredentialAccount(input);
      res.status(201).json(await issueToken(user));
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not create your account.";
      throw new ApiError(message.includes("already exists") ? "CONFLICT" : "BAD_REQUEST", message);
    }
  }));
  router.post("/auth/login", handle(async (req, res) => {
    const input = parse(signInInput, req.body);
    const key = signInKey(req, input.email);
    assertSignInAllowed(key);
    const user = await authenticateCredentialAccount(input);
    if (!user) { recordSignInFailure(key); throw new ApiError("UNAUTHORIZED", "Incorrect email or password."); }
    signInFailures.delete(key);
    res.json(await issueToken(user));
  }));
  router.post("/auth/refresh", authed(async (req, res) => { res.json(await issueToken(req.user)); }));
  router.get("/auth/me", authed(async (req, res) => { res.json({ user: publicUser(req.user) }); }));
  // Tokens are stateless: signing out means the app deletes its stored token.
  router.post("/auth/logout", authed(async (_req, res) => { res.status(204).end(); }));

  // ---- Resumes ----
  router.get("/resumes", authed(async (req, res) => {
    const resumes = (await listResumesForUser(req.user.id)).map(toResumeDto);
    res.json({ resumes });
  }));
  router.post("/resumes", authed(async (req, res) => {
    const input = parse(createResumeInput, req.body);
    const resume = await createResumeForUser({ userId: req.user.id, title: input.title, template: input.template, data: JSON.stringify(normalizeResumeData(input.data ?? {}, input.template as any)) });
    res.status(201).json({ resume: toResumeDto(resume) });
  }));
  router.post("/resumes/import", authed(async (req, res) => {
    const input = parse(importInput, req.body);
    try {
      res.json(await importResumeDocument(input.dataUrl, input.fileName));
    } catch (error) {
      throw new ApiError("BAD_REQUEST", error instanceof Error ? error.message : "We could not read this file.");
    }
  }));
  router.get("/resumes/:id", authed(async (req, res) => {
    const resume = await getResumeForUser(req.user.id, resumeId(req));
    if (!resume) throw new ApiError("NOT_FOUND", "This resume was not found.");
    res.json({ resume: toResumeDto(resume) });
  }));
  router.patch("/resumes/:id", authed(async (req, res) => {
    const id = resumeId(req);
    const input = parse(updateResumeInput, req.body);
    let template = input.template;
    if (input.data !== undefined && !template) template = (await getResumeForUser(req.user.id, id))?.template;
    const data = input.data === undefined ? undefined : JSON.stringify(normalizeResumeData(input.data, (template ?? "modern") as any));
    const resume = await updateResumeForUser({ userId: req.user.id, id, title: input.title, template: input.template, data });
    if (!resume) throw new ApiError("NOT_FOUND", "This resume was not found.");
    res.json({ resume: toResumeDto(resume) });
  }));
  router.delete("/resumes/:id", authed(async (req, res) => {
    if (!(await deleteResumeForUser(req.user.id, resumeId(req)))) throw new ApiError("NOT_FOUND", "This resume was not found.");
    res.status(204).end();
  }));
  router.post("/resumes/:id/duplicate", authed(async (req, res) => {
    const resume = await duplicateResumeForUser(req.user.id, resumeId(req));
    if (!resume) throw new ApiError("NOT_FOUND", "This resume was not found.");
    res.status(201).json({ resume: toResumeDto(resume) });
  }));
  router.get("/resumes/:id/pdf", authed(async (req, res) => {
    const stored = await getResumeForUser(req.user.id, resumeId(req));
    if (!stored) throw new ApiError("NOT_FOUND", "This resume was not found.");
    const resume = toResumeDto(stored);
    const requested = typeof req.query.template === "string" ? req.query.template : undefined;
    if (requested && !templateIds.includes(requested)) throw new ApiError("BAD_REQUEST", "Unknown template.");
    await sendResumePdf(req, res, { data: resume.data, template: requested ?? resume.template, title: resume.title }, (response, status, message) => sendError(response, status === 429 ? "TOO_MANY_REQUESTS" : "INTERNAL", message));
  }));

  // ---- Photos ----
  router.get("/photos", authed(async (req, res) => {
    const photos = await listResumePhotosForUser(req.user.id);
    res.json({ photos: photos.map((photo) => ({ ...photo, url: absoluteUrl(req, photo.url), storageUrl: photo.url })) });
  }));
  router.post("/photos", authed(async (req, res) => {
    const input = parse(fileInput, req.body);
    let decoded: ReturnType<typeof decodeResumePhoto>;
    try { decoded = decodeResumePhoto(input.dataUrl); } catch (error) { throw new ApiError("BAD_REQUEST", error instanceof Error ? error.message : "Please upload a JPG, PNG, or WebP image."); }
    const extension = decoded.mimeType === "image/jpeg" ? "jpg" : decoded.mimeType.split("/")[1];
    const stored = await storagePut(`resume-photos/${req.user.id}/${nanoid()}.${extension}`, decoded.bytes, decoded.mimeType);
    const photo = await createResumePhoto({ userId: req.user.id, storageKey: stored.key, url: stored.url, fileName: input.fileName, mimeType: decoded.mimeType });
    // `storageUrl` is the value to save in a resume's data.photoUrl so the website shows it too.
    res.status(201).json({ photo: { ...photo, url: absoluteUrl(req, photo.url), storageUrl: photo.url } });
  }));

  router.use((_req, _res, next) => next(new ApiError("NOT_FOUND", "This endpoint does not exist.")));
  router.use(mobileErrorHandler);
  return router;
}

function mobileErrorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) { sendError(res, error.code, error.message, error.details); return; }
  const status = (error as { status?: number; type?: string }).status;
  if ((error as { type?: string }).type === "entity.parse.failed") { sendError(res, "BAD_REQUEST", "The request body is not valid JSON."); return; }
  if (status === 413) { res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large." } }); return; }
  console.error("[MobileApi] unexpected error", error);
  sendError(res, "INTERNAL", "Something went wrong. Please try again.");
}

function sendError(res: Response, code: ErrorCode, message: string, details?: unknown) {
  res.status(STATUS[code]).json({ error: { code, message, ...(details ? { details } : {}) } });
}

/**
 * The Capacitor app calls the API from a web view (origin capacitor://localhost or
 * https://localhost), which enforces CORS. Any origin is allowed because the API authenticates
 * with a bearer token, never cookies, so a third-party page cannot act as a signed-in user.
 */
function allowCrossOrigin(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  next();
}

export function registerMobileApi(app: Express) {
  app.use("/api/v1", allowCrossOrigin, createMobileApiRouter());
  // Body-parser errors (invalid JSON, oversized body) happen before the router runs.
  app.use("/api/v1", mobileErrorHandler);
}
