import { describe, expect, it } from "vitest";
import { pdfFileName } from "./resumePdf";

describe("resume PDF export", () => {
  it("names the file after the resume title, falling back to the person's name", () => {
    expect(pdfFileName("Hamza Waseem Full Stack Developer", "Hamza Waseem")).toBe("Hamza_Waseem_Full_Stack_Developer_CV.pdf");
    expect(pdfFileName("Untitled resume", "Alex Morgan")).toBe("Alex_Morgan_CV.pdf");
    expect(pdfFileName("", "")).toBe("Resume_CV.pdf");
  });
});
