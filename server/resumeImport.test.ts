import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { decodeResumeDocument, extractResumeText, importResumeDocument, parseResumeText } from "./resumeImport";

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

  it("removes PDF page counters from selectable text", async () => {
    const pdf = new jsPDF();
    pdf.text("Hamza Waseem", 20, 20);
    const text = await extractResumeText(Buffer.from(pdf.output("arraybuffer")), "pdf");
    expect(text).toContain("Hamza Waseem");
    expect(text).not.toMatch(/--\s*1\s+of\s+1\s*--/i);
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

  it("recovers fields from OCR noise, icon headings, and compact month-year dates", () => {
    const data = parseResumeText(`7! Res Lie\nHamza Waseem Adis!\nFull Stack Software Engineer A 18 > 4\nLahore + Pakistan Sit rsa 8\n@] Professional Summary\nMERN & MEAN Stack Developer with experience in React, Angular, Node.js, Express, MongoDB, SQL.\n©] Work Experience\nFull Stack Software Engineer\nTechbang (March 2026)\n- Led a development team delivering the platform end to end.\nMEAN / MERN Stack Developer\nBINARY TECH (Nov 2022 - FEB 2026)\n- Contributed as a MEAN Stack Developer.\n0G] skills\nAngular 9/17 AWS (S3/SES) CI/CD\nExpress JS/TS Firebase Google Cloud Deployment\nE] Education\nBSCS - Bachelor's\nLahore Garrison University Lahore (2021)\nBachelor's Degree — Lahore Garrison University, Lahore (2017-2021)`);
    expect(data.fullName).toBe("Hamza Waseem");
    expect(data.professionalTitle).toBe("Full Stack Software Engineer");
    expect(data.summary).toContain("MERN & MEAN Stack Developer");
    expect(data.experiences).toHaveLength(2);
    expect(data.experiences[1]).toMatchObject({ company: "BINARY TECH NovFEB 2026", start: "2022", end: "2026" });
    expect(data.education[0]).toMatchObject({ qualification: "BSCS - Bachelor's", institution: "Lahore Garrison University Lahore", start: "2017", end: "2021" });
    expect(data.skills.map((skill) => skill.name)).toContain("Angular 9/17");
  });

  it("does not accept a ZIP-shaped DOCX unless the document parser can read it", async () => {
    await expect(importResumeDocument(docxDataUrl(), "resume.docx")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
