import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  createResumeForUser: vi.fn(),
  deleteResumeForUser: vi.fn(),
  duplicateResumeForUser: vi.fn(),
  getResumeForUser: vi.fn(),
  listResumePhotosForUser: vi.fn(),
  listResumesForUser: vi.fn(),
  updateResumeForUser: vi.fn(),
  createResumePhoto: vi.fn(),
  createCredentialUser: vi.fn(),
  getCredentialUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  touchCredentialUser: vi.fn(),
}));
const storage = vi.hoisted(() => ({ storagePut: vi.fn() }));
const pdf = vi.hoisted(() => ({ sendResumePdf: vi.fn() }));

vi.mock("./db", () => db);
vi.mock("./storage", () => storage);
vi.mock("./resumePdf", () => pdf);
vi.mock("./resumeImport", () => ({ importResumeDocument: vi.fn(), MAX_IMPORT_BYTES: 8 * 1024 * 1024 }));

import { hashPassword, issueCredentialSession } from "./credentialAuth";
import { registerMobileApi } from "./mobileApi";

const user = { id: 42, openId: "credentials_x", name: "Hamza Waseem", email: "hamza@example.com", loginMethod: "credentials", role: "user" as const, createdAt: new Date("2026-01-01"), updatedAt: new Date(), lastSignedIn: new Date() };
const storedResume = { id: 17, userId: 42, title: "Full stack resume", template: "modern", data: JSON.stringify({ fullName: "Hamza Waseem" }), createdAt: new Date(), updatedAt: new Date() };
// Smallest valid PNG header that passes the upload signature check.
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), Buffer.from("IHDR"), Buffer.from([0, 0, 0, 1, 0, 0, 0, 1]), Buffer.alloc(13)]);

let server: Server;
let base = "";
let token = "";

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  registerMobileApi(app);
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  token = await issueCredentialSession(user.id);
});
afterAll(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => {
  vi.clearAllMocks();
  db.getUserById.mockImplementation(async (id: number) => (id === user.id ? user : undefined));
});

const call = (path: string, init: RequestInit & { auth?: boolean } = {}) => fetch(`${base}${path}`, {
  ...init,
  headers: { "Content-Type": "application/json", ...(init.auth === false ? {} : { Authorization: `Bearer ${token}` }), ...(init.headers ?? {}) },
});

describe("mobile REST API", () => {
  it("signs up and returns a bearer token that authenticates later requests", async () => {
    db.getCredentialUserByEmail.mockResolvedValue(undefined);
    db.createCredentialUser.mockResolvedValue(user);
    const signUp = await call("/auth/signup", { method: "POST", auth: false, body: JSON.stringify({ name: "Hamza Waseem", email: "hamza@example.com", password: "correct-horse" }) });
    expect(signUp.status).toBe(201);
    const session = await signUp.json();
    expect(session).toMatchObject({ tokenType: "Bearer", user: { id: 42, email: "hamza@example.com" } });
    expect(session.user).not.toHaveProperty("openId");

    const me = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${session.token}` } });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ user: { id: 42, name: "Hamza Waseem" } });
  });

  it("reports a duplicate email as 409 CONFLICT", async () => {
    db.getCredentialUserByEmail.mockResolvedValue({ user, credential: { passwordHash: "x" } });
    const response = await call("/auth/signup", { method: "POST", auth: false, body: JSON.stringify({ name: "H", email: "hamza@example.com", password: "correct-horse" }) });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CONFLICT");
  });

  it("signs in with the right password and locks out repeated failures", async () => {
    db.getCredentialUserByEmail.mockResolvedValue({ user, credential: { passwordHash: await hashPassword("correct-horse") } });
    const ok = await call("/auth/login", { method: "POST", auth: false, body: JSON.stringify({ email: "hamza@example.com", password: "correct-horse" }) });
    expect(ok.status).toBe(200);
    expect((await ok.json()).token).toEqual(expect.any(String));

    const body = JSON.stringify({ email: "locked@example.com", password: "wrong" });
    db.getCredentialUserByEmail.mockResolvedValue(undefined);
    for (let attempt = 0; attempt < 10; attempt += 1) expect((await call("/auth/login", { method: "POST", auth: false, body })).status).toBe(401);
    const locked = await call("/auth/login", { method: "POST", auth: false, body });
    expect(locked.status).toBe(429);
    expect((await locked.json()).error.code).toBe("TOO_MANY_REQUESTS");
  });

  it("rejects requests without a valid token", async () => {
    expect((await call("/resumes", { auth: false })).status).toBe(401);
    const forged = await fetch(`${base}/resumes`, { headers: { Authorization: "Bearer not-a-real-token" } });
    expect(forged.status).toBe(401);
    expect(await forged.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } });
  });

  it("lists, creates, reads, updates, duplicates and deletes the user's resumes", async () => {
    db.listResumesForUser.mockResolvedValue([storedResume]);
    const list = await (await call("/resumes")).json();
    expect(db.listResumesForUser).toHaveBeenCalledWith(42);
    expect(list.resumes[0]).toMatchObject({ id: 17, title: "Full stack resume", data: { fullName: "Hamza Waseem" } });

    db.createResumeForUser.mockResolvedValue(storedResume);
    const created = await call("/resumes", { method: "POST", body: JSON.stringify({ title: "Full stack resume", template: "harvard", data: { fullName: "Hamza Waseem" } }) });
    expect(created.status).toBe(201);
    const saved = JSON.parse(db.createResumeForUser.mock.calls[0][0].data);
    expect(saved).toMatchObject({ fullName: "Hamza Waseem", sectionOrder: expect.any(Array) });

    db.getResumeForUser.mockResolvedValue(storedResume);
    expect((await call("/resumes/17")).status).toBe(200);
    expect(db.getResumeForUser).toHaveBeenCalledWith(42, 17);

    db.updateResumeForUser.mockResolvedValue({ ...storedResume, title: "Renamed" });
    const updated = await call("/resumes/17", { method: "PATCH", body: JSON.stringify({ title: "Renamed" }) });
    expect((await updated.json()).resume.title).toBe("Renamed");
    expect(db.updateResumeForUser).toHaveBeenCalledWith({ userId: 42, id: 17, title: "Renamed", template: undefined, data: undefined });

    db.duplicateResumeForUser.mockResolvedValue({ ...storedResume, id: 18 });
    expect((await call("/resumes/17/duplicate", { method: "POST" })).status).toBe(201);

    db.deleteResumeForUser.mockResolvedValue(true);
    expect((await call("/resumes/17", { method: "DELETE" })).status).toBe(204);
  });

  it("returns 404 for resumes that belong to someone else, and 400 with details for bad input", async () => {
    db.getResumeForUser.mockResolvedValue(undefined);
    const missing = await call("/resumes/99");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("NOT_FOUND");

    const invalid = await call("/resumes", { method: "POST", body: JSON.stringify({ title: "", template: "not-a-template" }) });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: "template" })]));
    expect((await call("/resumes/17", { method: "PATCH", body: "{}" })).status).toBe(400);
  });

  it("uploads a photo and returns an absolute URL plus the value to store in the resume", async () => {
    storage.storagePut.mockResolvedValue({ key: "resume-photos/42/a.png", url: "/manus-storage/resume-photos/42/a.png" });
    db.createResumePhoto.mockImplementation(async (input) => ({ id: 5, createdAt: new Date(), ...input }));
    const response = await call("/photos", { method: "POST", body: JSON.stringify({ fileName: "me.png", dataUrl: `data:image/png;base64,${png.toString("base64")}` }) });
    expect(response.status).toBe(201);
    const { photo } = await response.json();
    expect(photo.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/manus-storage\/resume-photos\/42\/a\.png$/);
    expect(photo.storageUrl).toBe("/manus-storage/resume-photos/42/a.png");
    expect(storage.storagePut.mock.calls[0][0]).toMatch(/^resume-photos\/42\//);

    const wrongType = await call("/photos", { method: "POST", body: JSON.stringify({ fileName: "me.gif", dataUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }) });
    expect(wrongType.status).toBe(400);
  });

  it("renders the saved resume to PDF, optionally with another template", async () => {
    db.getResumeForUser.mockResolvedValue(storedResume);
    pdf.sendResumePdf.mockImplementation(async (_req, res) => { res.type("application/pdf").send(Buffer.from("%PDF-1.4")); });
    const response = await call("/resumes/17/pdf?template=summit");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(pdf.sendResumePdf.mock.calls[0][2]).toMatchObject({ template: "summit", title: "Full stack resume" });
    expect((await call("/resumes/17/pdf?template=nope")).status).toBe(400);
  });

  it("answers malformed JSON and unknown routes with the standard JSON error shape", async () => {
    const malformed = await call("/resumes", { method: "POST", body: "{not json" });
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("BAD_REQUEST");
    const unknown = await call("/nope");
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).error.code).toBe("NOT_FOUND");
  });

  it("answers CORS preflights so the Capacitor web view can call it", async () => {
    const preflight = await fetch(`${base}/resumes`, { method: "OPTIONS", headers: { Origin: "capacitor://localhost", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-headers")).toContain("Authorization");
    expect((await call("/templates", { auth: false })).headers.get("access-control-expose-headers")).toBe("Content-Disposition");
  });

  it("publishes its OpenAPI document and the template catalog without auth", async () => {
    const spec = await (await call("/openapi.json", { auth: false })).json();
    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths)).toEqual(expect.arrayContaining(["/auth/login", "/resumes", "/resumes/{id}/pdf", "/photos"]));
    const { templates } = await (await call("/templates", { auth: false })).json();
    expect(templates.map((template: { id: string }) => template.id)).toContain("harvard");
  });
});
