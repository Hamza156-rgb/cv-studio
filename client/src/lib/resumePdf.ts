import type { ResumeData, ResumeTemplateId } from "@shared/resume";
import { jsPDF } from "jspdf";

const pageWidth = 210;
const pageHeight = 297;
const margin = 16;

function colorFromHex(value: string) {
  const normalized = value.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [36, 71, 74] as const;
  return [parseInt(normalized.slice(0, 2), 16), parseInt(normalized.slice(2, 4), 16), parseInt(normalized.slice(4, 6), 16)] as const;
}

function safeFileName(value: string) {
  return (value || "Resume").trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Resume";
}

// The editor stores light markdown (**bold**, *italic*, "- " lists); the PDF renders it as plain text.
function plainText(value: string) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/(^|\n)\s*[-•]\s+/g, "$1•  ");
}

export function downloadResumePdf({ data, title, template }: { data: ResumeData; title: string; template: ResumeTemplateId }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const accent = colorFromHex(data.theme.accent);
  const text = colorFromHex(data.theme.text);
  const bodySize = data.theme.scale === "compact" ? 8.8 : data.theme.scale === "airy" ? 10.1 : 9.4;
  const headingFont = data.theme.font === "serif" || data.theme.font === "classic" ? "times" : "helvetica";
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };
  const writeParagraph = (value: string, size = bodySize, indent = 0, color: readonly number[] = text) => {
    if (!value.trim()) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(plainText(value), pageWidth - margin * 2 - indent);
    ensureSpace(lines.length * (size * 0.47) + 2);
    doc.text(lines, margin + indent, y);
    y += lines.length * (size * 0.47) + 2.2;
  };
  const section = (name: string) => {
    ensureSpace(11);
    y += 1.5;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(.45);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(name.toUpperCase(), margin, y);
    y += 4.6;
  };
  const entry = (heading: string, subheading: string, date: string, description?: string, highlights?: string[]) => {
    // Fall back to the subheading (e.g. company) when the main title is blank.
    const [primary, secondary] = heading ? [heading, subheading] : [subheading, ""];
    if (!primary && !date && !description?.trim() && !highlights?.some(Boolean)) return;
    const titleLines = doc.splitTextToSize(primary || "Untitled entry", 123);
    const secondaryLines = secondary ? doc.splitTextToSize(secondary, 123) : [];
    const required = (titleLines.length + secondaryLines.length) * 4 + (description ? 6 : 0) + (highlights?.length ?? 0) * 4 + 3;
    ensureSpace(required);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(text[0], text[1], text[2]);
    doc.text(titleLines, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(81, 101, 98);
    if (date) doc.text(date, pageWidth - margin, y, { align: "right" });
    y += titleLines.length * 4.2;
    if (secondaryLines.length) { doc.setFont("helvetica", "normal"); doc.text(secondaryLines, margin, y); y += secondaryLines.length * 3.8; }
    if (description) writeParagraph(description, bodySize);
    highlights?.filter(Boolean).forEach((highlight) => { writeParagraph(`•  ${highlight}`, bodySize, 1.5); });
    y += 1.3;
  };

  doc.setFont(headingFont, "bold");
  doc.setFontSize(template === "executive" ? 25 : 27);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  if (data.fullName) { doc.text(data.fullName, margin, y); y += 7.6; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(text[0], text[1], text[2]);
  if (data.professionalTitle) { doc.text(data.professionalTitle, margin, y); y += 6; }
  const contacts = [data.email, data.phone, data.location, data.website, data.linkedin, data.github].filter(Boolean).join("   ·   ");
  writeParagraph(contacts, 7.7, 0, [81, 101, 98]);
  y += 1;

  data.sectionOrder.forEach((key) => {
    if (data.hiddenSections.includes(key)) return;
    if (key === "summary" && data.summary) { section("Profile"); writeParagraph(data.summary); }
    if (key === "experience" && data.experiences.length) { section("Experience"); data.experiences.forEach((item) => entry(item.role, [item.company, item.location].filter(Boolean).join(" · "), [item.start, item.current ? "Present" : item.end].filter(Boolean).join(" — "), item.description, item.highlights)); }
    if (key === "education" && data.education.length) { section("Education"); data.education.forEach((item) => entry(item.qualification, [item.institution, item.location, item.grade].filter(Boolean).join(" · "), [item.start, item.end].filter(Boolean).join(" — "), item.description)); }
    if (key === "skills" && data.skills.length) { section("Core skills"); writeParagraph(data.skills.map((skill) => skill.name).filter(Boolean).join("  ·  ")); }
    if (key === "projects" && data.projects.length) { section("Selected work"); data.projects.forEach((item) => entry(item.name, [item.role, item.technologies].filter(Boolean).join(" · "), "", item.description)); }
    if (key === "certifications" && data.certifications.length) { section("Certifications"); data.certifications.forEach((item) => writeParagraph([item.name, item.issuer, item.date].filter(Boolean).join(" · "))); }
    if (key === "languages" && data.languages.length) { section("Languages"); writeParagraph(data.languages.map((item) => `${item.name}${item.proficiency ? ` · ${item.proficiency}` : ""}`).join("     ")); }
    if (key === "awards" && data.awards.length) { section("Recognition"); data.awards.forEach((item) => entry(item.name, item.issuer, item.date, item.description)); }
    if (key === "volunteer" && data.volunteer.length) { section("Volunteer work"); data.volunteer.forEach((item) => entry(item.role, item.organization, [item.start, item.end].filter(Boolean).join(" — "), item.description)); }
    if (key === "interests" && data.interests.filter(Boolean).length) { section("Interests"); writeParagraph(data.interests.filter(Boolean).join("  ·  ")); }
  });
  doc.save(`${safeFileName(title && title !== "Untitled resume" ? title : data.fullName)}_CV.pdf`);
}
