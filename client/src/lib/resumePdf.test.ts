import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData, type ResumeTemplateId } from "@shared/resume";

const pdf = vi.hoisted(() => {
  const document = {
    addPage: vi.fn(),
    line: vi.fn(),
    save: vi.fn(),
    setDrawColor: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setLineWidth: vi.fn(),
    setTextColor: vi.fn(),
    splitTextToSize: vi.fn((value: string) => [value]),
    text: vi.fn(),
  };
  return { document, jsPDF: vi.fn(() => document) };
});

vi.mock("jspdf", () => ({ jsPDF: pdf.jsPDF }));

import { downloadResumePdf } from "./resumePdf";

describe("expanded template PDF export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exports every newly added template through the shared PDF pipeline", () => {
    const templates: ResumeTemplateId[] = ["atlas", "horizon", "monograph", "ledger", "boutique"];
    templates.forEach((template) => downloadResumePdf({ data: sampleResumeData(template), template, title: `${template} QA` }));
    expect(pdf.jsPDF).toHaveBeenCalledTimes(templates.length);
    expect(pdf.document.save).toHaveBeenCalledTimes(templates.length);
    expect(pdf.document.save).toHaveBeenLastCalledWith("boutique_QA_CV.pdf");
  });

  it("renders formatted text as plain text and titles blank entries by organization", () => {
    const data = sampleResumeData("modern");
    data.summary = "**Engineer** with *calm* focus\n- First point";
    data.volunteer = [{ id: "v1", organization: "Code Club", role: "", start: "", end: "", description: "" }];
    downloadResumePdf({ data, template: "modern", title: "Untitled resume" });
    const written = pdf.document.splitTextToSize.mock.calls.map(([value]) => String(value));
    expect(written).toContain("Engineer with calm focus\n•  First point");
    expect(written.some((value) => value.includes("*"))).toBe(false);
    expect(written).toContain("Code Club");
    expect(written).not.toContain("Untitled entry");
    expect(pdf.document.save).toHaveBeenLastCalledWith("Alex_Morgan_CV.pdf");
  });
});
