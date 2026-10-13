import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RESUME_TEMPLATES } from "@shared/resume";

const stylesheet = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("shared print styling", () => {
  it("keeps every new template inside the same printable resume document container", () => {
    const newTemplates = ["atlas", "horizon", "monograph", "ledger", "boutique", "harvard", "precision", "chronicle", "meridian", "summit"];
    expect(stylesheet).toContain("@media print");
    expect(stylesheet).toContain(".resume-document, .resume-document * { visibility: visible !important; }");
    newTemplates.forEach((template) => {
      expect(RESUME_TEMPLATES.some((item) => item.id === template)).toBe(true);
      expect(stylesheet).toContain(`.resume-${template}`);
    });
  });
});
