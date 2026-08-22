import { describe, expect, it } from "vitest";
import { newResumeData, normalizeResumeData, RESUME_TEMPLATES, sampleResumeData } from "../shared/resume";
import { decodeResumePhoto } from "./routers";

describe("resume data model", () => {
  it("creates a complete blank resume with an ordered set of sections", () => {
    const resume = newResumeData("modern");
    expect(resume.sectionOrder).toContain("experience");
    expect(resume.hiddenSections).toEqual([]);
    expect(resume.theme.accent).toBe("#24474A");
  });

  it("normalizes incomplete persisted data without dropping valid content", () => {
    const normalized = normalizeResumeData({ fullName: "Casey", skills: [{ id: "1", name: "Writing", level: "Expert" }], theme: { accent: "#000000" } }, "minimal");
    expect(normalized.fullName).toBe("Casey");
    expect(normalized.skills).toHaveLength(1);
    expect(normalized.theme.font).toBe("modern");
    expect(normalized.sectionOrder).toContain("education");
  });

  it("provides sample content suitable for a preview", () => {
    const sample = sampleResumeData();
    expect(sample.experiences[0]?.highlights).toHaveLength(2);
    expect(sample.summary.length).toBeGreaterThan(80);
  });

  it("includes Portrait as a deliberately photo-ready layout with a no-image placeholder fallback", () => {
    const portrait = RESUME_TEMPLATES.find((template) => template.id === "portrait");
    expect(portrait).toMatchObject({ name: "Portrait", category: "Photo-forward", supportsPhoto: true });
    expect(sampleResumeData("portrait").photoUrl).toBe("");
  });

  it("accepts supported, non-empty image uploads and exposes safe storage metadata", () => {
    const photo = decodeResumePhoto("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/3OvXJwAAAABJRU5ErkJggg==");
    expect(photo.mimeType).toBe("image/png");
    expect(photo.bytes.subarray(0, 4).toString("hex")).toBe("89504e47");
  });

  it("rejects unsupported or empty headshot data", () => {
    expect(() => decodeResumePhoto("data:image/svg+xml;base64,PHN2Zy8+")).toThrow("Please upload a JPG, PNG, or WebP image.");
    expect(() => decodeResumePhoto("data:image/jpeg;base64,")).toThrow("Please upload a JPG, PNG, or WebP image.");
    expect(() => decodeResumePhoto("data:image/png;base64,aGVsbG8=")).toThrow("The uploaded file does not match its declared image format.");
    expect(() => decodeResumePhoto("data:image/png;base64,iVBORw0KGgo=")).toThrow("The uploaded file does not match its declared image format.");
  });
});
