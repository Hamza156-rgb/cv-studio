import type { Express, Request, Response } from "express";
import type { Browser } from "puppeteer";
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

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = import("puppeteer").then(({ default: puppeteer }) => puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
    }));
    browserPromise.then((browser) => browser.on("disconnected", () => { browserPromise = null; })).catch(() => { browserPromise = null; });
  }
  return browserPromise;
}

export function pdfFileName(title: string, fullName: string) {
  const base = title && title !== "Untitled resume" ? title : fullName;
  return `${(base || "Resume").trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Resume"}_CV.pdf`;
}

/** Renders the same ResumeDocument the live preview uses, so the PDF matches it exactly. */
export async function renderResumePdf(origin: string, payload: { data: unknown; template: string }) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = new URL(request.url());
      const chain = request.redirectChain();
      const startedLocally = (chain.length ? new URL(chain[0].url()).origin : url.origin) === origin;
      if (url.protocol === "data:" || url.protocol === "blob:" || startedLocally || ALLOWED_EXTERNAL_HOSTS.has(url.hostname)) request.continue();
      else request.abort();
    });
    await page.evaluateOnNewDocument((value) => { (window as unknown as { __CV_RENDER__: unknown }).__CV_RENDER__ = value; }, payload);
    await page.goto(`${origin}/render/resume`, { waitUntil: "domcontentloaded", timeout: RENDER_TIMEOUT_MS });
    await page.waitForFunction("window.__CV_READY__ === true", { timeout: RENDER_TIMEOUT_MS });
    return await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
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
  app.post("/api/resume/pdf", async (req, res) => {
    const parsed = pdfInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid resume data." }); return; }
    await sendResumePdf(req, res, { data: parsed.data.data, template: parsed.data.template, title: parsed.data.title });
  });
}
