import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

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

const resumeImport = vi.hoisted(() => ({ importResumeDocument: vi.fn() }));

vi.mock("./db", () => db);
vi.mock("./resumeImport", () => ({ importResumeDocument: resumeImport.importResumeDocument, MAX_IMPORT_BYTES: 8 * 1024 * 1024 }));

import { appRouter } from "./routers";

function contextFor(userId: number): TrpcContext {
  return {
    user: { id: userId, openId: `user-${userId}`, name: "Test User", email: "test@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const storedResume = { id: 17, userId: 42, title: "Product design resume", template: "modern", data: JSON.stringify({ fullName: "Taylor Reed" }), createdAt: new Date(), updatedAt: new Date() };

describe("resume router contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a normalized resume under the authenticated user", async () => {
    db.createResumeForUser.mockResolvedValue(storedResume);
    const caller = appRouter.createCaller(contextFor(42));
    const result = await caller.resume.create({ title: "Product design resume", template: "modern", data: { fullName: "Taylor Reed" } });
    expect(db.createResumeForUser).toHaveBeenCalledWith(expect.objectContaining({ userId: 42, title: "Product design resume", template: "modern" }));
    expect(result.data.fullName).toBe("Taylor Reed");
    expect(result.data.sectionOrder).toContain("experience");
  });

  it("lists only the authenticated user’s stored resumes", async () => {
    db.listResumesForUser.mockResolvedValue([storedResume]);
    const caller = appRouter.createCaller(contextFor(42));
    const result = await caller.resume.list();
    expect(db.listResumesForUser).toHaveBeenCalledWith(42);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(17);
  });

  it("scopes updates and deletes to the authenticated user", async () => {
    db.updateResumeForUser.mockResolvedValue(storedResume);
    db.deleteResumeForUser.mockResolvedValue(true);
    const caller = appRouter.createCaller(contextFor(42));
    await caller.resume.update({ id: 17, title: "Tailored resume" });
    await caller.resume.delete({ id: 17 });
    expect(db.updateResumeForUser).toHaveBeenCalledWith(expect.objectContaining({ userId: 42, id: 17, title: "Tailored resume" }));
    expect(db.deleteResumeForUser).toHaveBeenCalledWith(42, 17);
  });

  it("returns a not-found error when the scoped resume is unavailable", async () => {
    db.getResumeForUser.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(contextFor(42));
    await expect(caller.resume.get({ id: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.getResumeForUser).toHaveBeenCalledWith(42, 999);
  });

  it("imports a resume only through an authenticated caller", async () => {
    resumeImport.importResumeDocument.mockResolvedValue({ fileName: "resume.pdf", format: "pdf", data: { fullName: "Taylor Reed" }, textPreview: "Taylor Reed", warnings: [] });
    const caller = appRouter.createCaller(contextFor(42));
    const result = await caller.resume.import({ fileName: "resume.pdf", dataUrl: "data:application/pdf;base64,JVBERi0xLjQ=" });
    expect(resumeImport.importResumeDocument).toHaveBeenCalledWith("data:application/pdf;base64,JVBERi0xLjQ=", "resume.pdf");
    expect(result.data.fullName).toBe("Taylor Reed");
  });
});
