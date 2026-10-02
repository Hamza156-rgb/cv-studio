import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";
import { newResumeData, type Education, type Experience, type ResumeData } from "../shared/resume";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function decodeResumeDocument(dataUrl: string, fileName: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose a PDF or DOCX resume file." });
  const mimeType = match[1].toLowerCase();
  const bytes = Buffer.from(match[2], "base64");
  const extension = fileName.toLowerCase().split(".").pop();
  const isPdf = mimeType === PDF_MIME && extension === "pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const isDocx = mimeType === DOCX_MIME && extension === "docx" && bytes.subarray(0, 2).toString("ascii") === "PK";
  if (!isPdf && !isDocx) throw new TRPCError({ code: "BAD_REQUEST", message: "The uploaded file does not match a supported PDF or DOCX resume." });
  if (!bytes.length || bytes.length > MAX_IMPORT_BYTES) throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose a resume smaller than 8 MB." });
  return { mimeType, bytes, format: isPdf ? ("pdf" as const) : ("docx" as const) };
}

export async function extractResumeText(bytes: Buffer, format: "pdf" | "docx") {
  if (format === "docx") {
    const result = await mammoth.extractRawText({ buffer: bytes });
    return result.value;
  }
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText({ pageJoiner: "\n", itemJoiner: " " });
    const extracted = result.text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "").trim();
    if (extracted.replace(/\s/g, "").length >= 30) return extracted;

    // A large number of resumes are scans or image-only exports. Render each
    // page and OCR it instead of returning the PDF page counters as content.
    const screenshots = await parser.getScreenshot({ desiredWidth: 1600, imageDataUrl: true, imageBuffer: false });
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const pages: string[] = [];
      for (const page of screenshots.pages) {
        const pageText = await worker.recognize(page.dataUrl);
        if (pageText.data.text.trim()) pages.push(pageText.data.text.trim());
      }
      return pages.join("\n\n").trim();
    } finally {
      await worker.terminate();
    }
  } finally {
    await parser.destroy();
  }
}

const headingAliases: Record<string, string> = {
  summary: "summary", profile: "summary", objective: "summary", about: "summary",
  experience: "experience", employment: "experience", "work experience": "experience", "professional experience": "experience",
  education: "education", academic: "education", qualifications: "education",
  skills: "skills", "technical skills": "skills", competencies: "skills", expertise: "skills",
  projects: "projects", portfolio: "projects", certifications: "certifications", certificates: "certifications",
  languages: "languages", awards: "awards", achievements: "awards", volunteer: "volunteer", volunteering: "volunteer", interests: "interests", hobbies: "interests",
};

function cleanLine(line: string) {
  return line.replace(/[•●▪◦]/g, "").replace(/\s+/g, " ").trim();
}

function normalizedHeading(line: string) {
  return headingAliases[line.toLowerCase().replace(/[:|]/g, "").replace(/\s+/g, " ").trim()];
}

function linesOf(text: string) {
  return text.replace(/\r/g, "").split("\n").map(cleanLine).filter((line) => line && !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)).slice(0, 1200);
}

function sectionMap(lines: string[]) {
  const sections = new Map<string, string[]>();
  let current = "header";
  sections.set(current, []);
  for (const line of lines) {
    const heading = normalizedHeading(line);
    if (heading) {
      current = heading;
      if (!sections.has(current)) sections.set(current, []);
    } else {
      sections.get(current)?.push(line);
    }
  }
  return sections;
}

function unique(values: string[]) { return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))); }
function id() { return randomUUID(); }
function dateRange(line: string) { return line.match(/((?:19|20)\d{2}|present|current)\s*(?:[-–—]|to)\s*((?:19|20)\d{2}|present|current)?/i); }
function isBullet(line: string) { return /^[\-*+]/.test(line) || /^(achieved|delivered|led|built|improved|created|managed|reduced|increased|launched)\b/i.test(line); }

function parseExperiences(lines: string[]): Experience[] {
  const entries: Experience[] = [];
  let current: Experience | null = null;
  for (const line of lines) {
    const range = dateRange(line);
    if (range || (!current && entries.length === 0) || (current && !current.description && entries.length > 0 && line.length < 90)) {
      if (current) entries.push(current);
      const parts = line.split(/\s+[|·]\s+/);
      current = { id: id(), role: parts[0] ?? "", company: parts[1] ?? "", location: "", start: range?.[1] ?? "", end: range?.[2] ?? "", current: /present|current/i.test(line), description: "", highlights: [] };
      continue;
    }
    if (!current) continue;
    if (isBullet(line)) current.highlights.push(line.replace(/^[\-*+]\s*/, ""));
    else if (!current.company && line.length < 90) current.company = line;
    else if (!current.description) current.description = line;
    else current.description += ` ${line}`;
  }
  if (current) entries.push(current);
  return entries.filter((entry) => entry.role || entry.company).slice(0, 12);
}

function parseEducation(lines: string[]): Education[] {
  const entries: Education[] = [];
  let current: Education | null = null;
  for (const line of lines) {
    const range = dateRange(line);
    if (current && range && !/[A-Za-z]{3,}/.test(line.replace(range[0], ""))) {
      current.start = range[1] ?? current.start;
      current.end = range[2] ?? current.end;
      continue;
    }
    if (!current || range) {
      if (current) entries.push(current);
      current = { id: id(), qualification: line.replace(/\s*[|·].*$/, ""), institution: "", location: "", start: range?.[1] ?? "", end: range?.[2] ?? "", grade: "", description: "" };
    } else if (!current.institution && line.length < 100) current.institution = line;
    else if (!current.description) current.description = line;
    else current.description += ` ${line}`;
  }
  if (current) entries.push(current);
  return entries.filter((entry) => entry.qualification || entry.institution).slice(0, 8);
}

export function parseResumeText(text: string): ResumeData {
  const result = newResumeData("modern");
  const lines = linesOf(text);
  const sections = sectionMap(lines);
  const header = sections.get("header") ?? [];
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? "";
  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,)]+/i)?.[0] ?? "";
  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,)]+/i)?.[0] ?? "";
  const headerCandidates = header.filter((line) => line !== email && !line.includes(phone) && !/linkedin\.com|github\.com|https?:\/\//i.test(line));
  result.fullName = headerCandidates.find((line) => line.split(" ").length <= 6 && !/resume|curriculum vitae/i.test(line)) ?? "";
  result.professionalTitle = headerCandidates.find((line) => line !== result.fullName && line.length <= 100) ?? "";
  result.email = email;
  result.phone = phone;
  result.linkedin = linkedin;
  result.github = github;
  const websiteLine = lines.find((line) => /(?:https?:\/\/|www\.)[a-z0-9-]+\.[a-z]{2,}/i.test(line) && !/linkedin\.com|github\.com/i.test(line) && !line.includes(email));
  result.website = websiteLine?.match(/(?:https?:\/\/|www\.)[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s|,)]+)?/i)?.[0] ?? "";
  result.summary = (sections.get("summary") ?? []).join(" ").slice(0, 1800);
  result.experiences = parseExperiences(sections.get("experience") ?? []);
  result.education = parseEducation(sections.get("education") ?? []);
  result.skills = unique((sections.get("skills") ?? []).flatMap((line) => line.split(/[,;|•]/))).map((name) => ({ id: id(), name, level: "Advanced" as const })).slice(0, 40);
  result.projects = (sections.get("projects") ?? []).filter(Boolean).slice(0, 8).map((name) => ({ id: id(), name, role: "", url: "", description: "", technologies: "" }));
  result.certifications = (sections.get("certifications") ?? []).slice(0, 8).map((name) => ({ id: id(), name, issuer: "", date: "", credentialUrl: "" }));
  result.languages = (sections.get("languages") ?? []).flatMap((line) => line.split(/[,;|]/)).map((name) => ({ id: id(), name: name.trim(), proficiency: "Fluent" as const })).filter((item) => item.name).slice(0, 12);
  result.awards = (sections.get("awards") ?? []).slice(0, 8).map((name) => ({ id: id(), name, issuer: "", date: "", description: "" }));
  result.interests = unique((sections.get("interests") ?? []).flatMap((line) => line.split(/[,;|]/))).slice(0, 20);
  return result;
}

export async function importResumeDocument(dataUrl: string, fileName: string) {
  const { bytes, format } = decodeResumeDocument(dataUrl, fileName);
  let text = "";
  try { text = await extractResumeText(bytes, format); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "We could not read this file. Try exporting it again as a text-based PDF or DOCX." }); }
  if (text.replace(/\s/g, "").length < 30) throw new TRPCError({ code: "BAD_REQUEST", message: "This file does not contain enough selectable text to import. Scanned PDFs need OCR before importing." });
  const data = parseResumeText(text);
  return { fileName, format, data, textPreview: text.replace(/\s+/g, " ").trim().slice(0, 800), warnings: ["Imported content is a starting point—review dates, bullets, and section labels before saving."] };
}
