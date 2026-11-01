import type { Express, Request, Response } from "express";
import type { Browser, HTTPRequest } from "puppeteer";
import { z } from "zod";
import { RESUME_TEMPLATES, normalizeResumeData } from "../shared/resume";

const templateIds = RESUME_TEMPLATES.map((template) => template.id) as [string, ...string[]];
const pdfInput = z.object({
  title: z.string().max(160).optional().default(""),
  template: z.enum(templateIds),
  data: z.unknown(),
});

// Fonts are the only third-party requests the render page needs.
const ALLOWED_EXTERNAL_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const MAX_CONCURRENT_RENDERS = 2;
const RENDER_TIMEOUT_MS = 25_000;

let browserPromise: Promise<Browser> | null = null;
let activeRenders = 0;

const BASE_ARGS = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"];
type LaunchReport = { strategy: string; ok: boolean; error?: string };
let lastLaunch: LaunchReport[] = [];

/**
 * Starts headless Chrome, trying in order:
 *   1. PUPPETEER_EXECUTABLE_PATH (a Chrome the host provides),
 *   2. the Chrome that `puppeteer` downloads at install time,
 *   3. @sparticuz/chromium, a self-contained Chromium for locked-down Linux servers
 *      (used when the host lacks the system libraries the regular Chrome needs).
 */
async function launchBrowser(): Promise<Browser> {
  const { default: puppeteer } = await import("puppeteer");
  const attempts: { strategy: string; launch: () => Promise<Browser> }[] = [];
  if (process.env.PUPPETEER_EXECUTABLE_PATH) attempts.push({ strategy: "env-executable", launch: () => puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, args: BASE_ARGS }) });
  attempts.push({ strategy: "puppeteer-chrome", launch: () => puppeteer.launch({ headless: true, args: BASE_ARGS }) });
  if (process.platform === "linux") {
    attempts.push({ strategy: "sparticuz-chromium", launch: async () => {
      // Outside AWS Lambda the package skips unpacking its bundled system libraries (libnss3,
      // libnspr4, …); this makes it unpack them so it also runs on bare Linux hosts.
      process.env.AWS_LAMBDA_JS_RUNTIME ??= "nodejs20.x";
      const { default: chromium } = await import("@sparticuz/chromium");
      // Its defaults target one-shot serverless calls; --single-process / --no-zygote crash on
      // page navigation, which the renderer relies on, so the long-lived server drops them.
      const args = chromium.args.filter((arg) => arg !== "--single-process" && arg !== "--no-zygote");
      return puppeteer.launch({ headless: true, executablePath: await chromium.executablePath(), args: [...args, "--font-render-hinting=none"] });
    } });
  }
  lastLaunch = [];
  for (const attempt of attempts) {
    try {
      const browser = await attempt.launch();
      lastLaunch.push({ strategy: attempt.strategy, ok: true });
      return browser;
    } catch (error) {
      const message = error instanceof Error ? error.message.split("\n").slice(0, 3).join(" ") : String(error);
      lastLaunch.push({ strategy: attempt.strategy, ok: false, error: message.slice(0, 400) });
      console.error(`[ResumePdf] ${attempt.strategy} failed:`, message);
    }
  }
  throw new Error(`No headless browser could start: ${lastLaunch.map((item) => `${item.strategy}: ${item.error}`).join(" | ")}`);
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser();
    browserPromise.then((browser) => browser.on("disconnected", () => { browserPromise = null; })).catch(() => { browserPromise = null; });
  }
  return browserPromise;
}

/** Diagnostics for GET /api/resume/pdf/health: can this server start a browser and print a page? */
export async function pdfHealth(req: Request) {
  const started = Date.now();
  try {
    const browser = await getBrowser();
    const pdf = await renderResumePdf(localOrigin(req), { data: {}, template: "modern" });
    return { ok: true, browser: await browser.version(), strategy: lastLaunch.find((item) => item.ok)?.strategy, bytes: pdf.length, ms: Date.now() - started, attempts: lastLaunch };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 1200) : String(error), attempts: lastLaunch, platform: `${process.platform}-${process.arch}`, node: process.version, ms: Date.now() - started };
  }
}

export function pdfFileName(title: string, fullName: string) {
  const base = title && title !== "Untitled resume" ? title : fullName;
  return `${(base || "Resume").trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Resume"}_CV.pdf`;
}

/** Renders the same ResumeDocument the live preview uses, so the PDF matches it exactly. */
const assetCache = new Map<string, { status: number; contentType: string; body: Buffer }>();

async function respondViaNode(request: HTTPRequest) {
  const key = request.url();
  try {
    let asset = assetCache.get(key);
    if (!asset) {
      const response = await fetch(key, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0 Safari/537.36" }, signal: AbortSignal.timeout(15_000) });
      asset = { status: response.status, contentType: response.headers.get("content-type") ?? "application/octet-stream", body: Buffer.from(await response.arrayBuffer()) };
      // Fonts never change; cache them for later renders (photos are per-user, so not cached).
      if (response.ok && /fonts\.(googleapis|gstatic)\.com/.test(key) && assetCache.size < 200) assetCache.set(key, asset);
    }
    await request.respond({ status: asset.status, contentType: asset.contentType, body: asset.body, headers: { "Access-Control-Allow-Origin": "*" } });
  } catch {
    await request.abort().catch(() => undefined);
  }
}

export async function renderResumePdf(origin: string, payload: { data: unknown; template: string }) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = new URL(request.url());
      const chain = request.redirectChain();
      const startedLocally = (chain.length ? new URL(chain[0].url()).origin : url.origin) === origin;
      if (!(url.protocol === "data:" || url.protocol === "blob:" || startedLocally || ALLOWED_EXTERNAL_HOSTS.has(url.hostname))) { void request.abort(); return; }
      // Fetch https files (Google Fonts, photos redirected to cloud storage) in Node and hand them
      // to Chrome: on bare Linux hosts Chrome's own TLS stack (NSS) is missing libraries and crashes.
      if (url.protocol === "https:") { void respondViaNode(request); return; }
      void request.continue();
    });
    await page.evaluateOnNewDocument((value) => { (window as unknown as { __CV_RENDER__: unknown }).__CV_RENDER__ = value; }, payload);
    await page.goto(`${origin}/render/resume`, { waitUntil: "domcontentloaded", timeout: RENDER_TIMEOUT_MS });
    await page.waitForFunction("window.__CV_READY__ === true", { timeout: RENDER_TIMEOUT_MS });
    const letter = (payload.data as { theme?: { pageSize?: string } } | null)?.theme?.pageSize === "letter";
    return await page.pdf({ format: letter ? "Letter" : "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await page.close().catch(() => undefined);
  }
}

function localOrigin(req: Request) {
  return `http://127.0.0.1:${req.socket.localPort}`;
}

type PdfFailure = (res: Response, status: 429 | 500, message: string) => void;
const sendWebFailure: PdfFailure = (res, status, message) => { res.status(status).json({ message }); };

/** Renders and sends a resume PDF, enforcing the shared render concurrency limit. */
export async function sendResumePdf(req: Request, res: Response, input: { data: unknown; template: string; title: string }, fail: PdfFailure = sendWebFailure) {
  if (activeRenders >= MAX_CONCURRENT_RENDERS) { fail(res, 429, "The PDF service is busy. Please try again in a moment."); return; }
  activeRenders += 1;
  try {
    const data = normalizeResumeData(input.data, input.template as any);
    const pdf = await renderResumePdf(localOrigin(req), { data, template: input.template });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${pdfFileName(input.title, data.fullName)}"`);
    res.send(Buffer.from(pdf));
  } catch (error) {
    console.error("[ResumePdf] render failed", error);
    fail(res, 500, "We could not create the PDF. Please try again.");
  } finally {
    activeRenders -= 1;
  }
}

export function registerResumePdfRoute(app: Express) {
  app.get("/api/resume/pdf/health", async (req, res) => { res.json(await pdfHealth(req)); });
  app.post("/api/resume/pdf", async (req, res) => {
    const parsed = pdfInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid resume data." }); return; }
    await sendResumePdf(req, res, { data: parsed.data.data, template: parsed.data.template, title: parsed.data.title });
  });
}
