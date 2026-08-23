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
});
