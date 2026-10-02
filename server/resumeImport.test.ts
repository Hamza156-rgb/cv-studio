import { describe, expect, it } from "vitest";
import { decodeResumeDocument, importResumeDocument, parseResumeText } from "./resumeImport";

const pdfDataUrl = (content: string) => `data:application/pdf;base64,${Buffer.from(`%PDF-1.7\n${content}`).toString("base64")}`;
const docxDataUrl = () => {
  const zip = Buffer.from("PK\x03\x04mock-docx");
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${zip.toString("base64")}`;
};

describe("resume import parsing", () => {
  it("rejects spoofed or mismatched document uploads", () => {
    expect(() => decodeResumeDocument(pdfDataUrl("not a real document"), "resume.docx")).toThrow(/does not match/i);
    expect(() => decodeResumeDocument("data:application/pdf;base64,AAAA", "resume.pdf")).toThrow(/does not match/i);
  });

  it("accepts a PDF signature and enforces the supported extension", () => {
    const decoded = decodeResumeDocument(pdfDataUrl("text"), "Taylor-Reed.pdf");
    expect(decoded.format).toBe("pdf");
    expect(decoded.mimeType).toBe("application/pdf");
  });

  it("maps common resume headings and contact details into editable fields", () => {
    const data = parseResumeText(`Taylor Reed\nSenior Product Designer\ntaylor@example.com | +1 415 555 0138\nlinkedin.com/in/taylorreed\n\nSUMMARY\nProduct designer with 8 years of experience building accessible products.\n\nEXPERIENCE\nSenior Product Designer | Northstar Systems | 2021 - Present\n- Led the design system rollout across three teams\n- Improved activation by 28%\n\nEDUCATION\nBFA Interaction Design\nCalifornia College of the Arts\n2012 - 2016\n\nSKILLS\nFigma, Research, Design systems, Prototyping`);
    expect(data.fullName).toBe("Taylor Reed");
    expect(data.professionalTitle).toBe("Senior Product Designer");
    expect(data.email).toBe("taylor@example.com");
    expect(data.experiences[0]).toMatchObject({ role: "Senior Product Designer", company: "Northstar Systems", start: "2021", end: "Present", current: true });
    expect(data.experiences[0]?.highlights).toHaveLength(2);
    expect(data.education[0]).toMatchObject({ qualification: "BFA Interaction Design", institution: "California College of the Arts", start: "2012", end: "2016" });
    expect(data.skills.map((skill) => skill.name)).toEqual(["Figma", "Research", "Design systems", "Prototyping"]);
  });

  it("does not accept a ZIP-shaped DOCX unless the document parser can read it", async () => {
    await expect(importResumeDocument(docxDataUrl(), "resume.docx")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
