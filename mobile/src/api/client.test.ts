import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RESUME_TEMPLATES } from "@shared/resume";
import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteAssetUrl, api, API_ORIGIN, ApiError, setAuthToken, setUnauthorizedHandler } from "./client";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

describe("mobile API client", () => {
  afterEach(() => { vi.unstubAllGlobals(); setAuthToken(null); setUnauthorizedHandler(null); });

  it("sends the bearer token and JSON body to the versioned API", async () => {
    const fetchMock = vi.fn(async () => json({ resume: { id: 3, title: "CV" } }, 201));
    vi.stubGlobal("fetch", fetchMock);
    setAuthToken("abc");
    await api.createResume({ title: "CV", template: "harvard", data: {} });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API_ORIGIN}/api/v1/resumes`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer abc", "Content-Type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({ title: "CV", template: "harvard", data: {} });
  });

  it("turns API errors into ApiError with the server's message and field details", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: { code: "BAD_REQUEST", message: "Bad title", details: [{ path: "title", message: "Too short" }] } }, 400)));
    await expect(api.createResume({ title: "", template: "modern" })).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST", message: "Bad title", details: [{ path: "title", message: "Too short" }] });
  });

  it("signs the user out when an authenticated request returns 401", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAuthToken("expired");
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401)));
    await expect(api.listResumes()).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("reports network failures with a friendly message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(api.templates()).rejects.toMatchObject({ status: 0, code: "NETWORK" });
  });

  it("downloads PDFs with the server's file name and optional template", async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(["%PDF-1.4"]), { status: 200, headers: { "Content-Disposition": 'attachment; filename="Hamza_CV.pdf"' } }));
    vi.stubGlobal("fetch", fetchMock);
    const file = await api.downloadPdf(7, "summit");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(`${API_ORIGIN}/api/v1/resumes/7/pdf?template=summit`);
    expect(file.fileName).toBe("Hamza_CV.pdf");
    expect(await file.blob.text()).toBe("%PDF-1.4");
  });

  it("has one client function per operation in the server's OpenAPI document", async () => {
    const { MOBILE_API_SPEC } = await import("../../../server/mobileApiSpec");
    const operations = Object.values(MOBILE_API_SPEC.paths).flatMap((path) => Object.keys(path).filter((key) => ["get", "post", "patch", "delete"].includes(key)));
    expect(operations).toHaveLength(16);
    expect(Object.keys(api)).toHaveLength(operations.length);
  });

  it("makes site-relative photo URLs absolute", () => {
    expect(absoluteAssetUrl("/manus-storage/a.jpg")).toBe(`${API_ORIGIN}/manus-storage/a.jpg`);
    expect(absoluteAssetUrl("data:image/png;base64,xx")).toBe("data:image/png;base64,xx");
    expect(absoluteAssetUrl("")).toBe("");
  });
});

describe("shared resume styles", () => {
  it("contains every template's styles from the website", () => {
    const css = readFileSync(resolve(import.meta.dirname, "../generated/resume.css"), "utf8");
    for (const template of RESUME_TEMPLATES) expect(css, template.id).toContain(`.resume-${template.id}`);
    expect(css).not.toMatch(/\.resume-card\b|\.resume-zoom\b|pdf-render/);
  });
});
