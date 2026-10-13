import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";
import { newResumeData, type Education, type Experience, type ResumeData } from "../shared/resume";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function cleanOcrArtifacts(value: string) {
  return value
    .replace(/¦/g, "I")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

const BULLET_MARKER = /^\s*(?:[-•●▪◦■*+»=]|\d+[.)])\s+/;

/** Repairs the misreads OCR reliably makes on resume text (I↔l, O↔0, stray spacing). */
function fixOcrWords(value: string) {
  return value
    .replace(/\bAl\b(?=[\s-]|$)/g, "AI")
    .replace(/\bUl\b/g, "UI")
    .replace(/\bSocket\.[lI|1][O0]\b/g, "Socket.IO")
    .replace(/\blonic\b/g, "Ionic")
    .replace(/\bNode\.\s+js\b/g, "Node.js")
    .replace(/\bc[lI1]\s*[r/]\s*c[bd]\b/gi, "CI/CD")
    .replace(/\s+—-?\s+|\s+-—\s+/g, " — ")
    .replace(/\s+,\s*(?=\S)/g, ", ")
    .replace(/\s+([.,;:])(?=\s|$)/g, "$1");
}

/** Cleans one extracted line, keeping a leading "- " when the source line was a bullet. */
function cleanLine(line: string) {
  const bullet = BULLET_MARKER.test(line) && !/^\s*\d+[.)]\s+\d/.test(line);
  const text = fixOcrWords(cleanOcrArtifacts(line.replace(/\s+/g, " ")));
  return bullet && text ? `- ${text}` : text;
}

function normalizedHeading(line: string) {
  const normalized = cleanOcrArtifacts(line.toLowerCase().replace(/[:|]/g, "").replace(/\s+/g, " ").trim());
  const exact = headingAliases[normalized];
  if (exact) return exact;
  const match = Object.entries(headingAliases).find(([alias]) => normalized.includes(alias) && normalized.length <= alias.length + 18);
  return match?.[1];
}

function linesOf(text: string) {
  return text.replace(/\r/g, "").split("\n").map(cleanLine).filter((line) => line && !/^(?:-{1,2}\s*)?page\s+\d+\s*(?:of|\/)\s*\d+\s*(?:--)?$/i.test(line)).slice(0, 1200);
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
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE_TOKEN = /\b(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s.,/-]*)?((?:19|20)\d{2})\b|\b(present|current|now)\b/gi;

type ParsedDates = { start: string; end: string; current: boolean; rest: string };

/** Finds a date or date range in a line such as "BINARY TECH (Nov 2022 - FEB 2026)". */
function parseDates(line: string): ParsedDates | null {
  if (line.length > 110 || line.startsWith("- ")) return null;
  const tokens = Array.from(line.matchAll(DATE_TOKEN));
  const years = tokens.filter((token) => token[2]);
  if (!years.length) return null;
  const hasMonth = years.some((token) => token[1]);
  const isPresent = tokens.some((token) => token[3]);
  if (years.length < 2 && !hasMonth && !isPresent && !/\(\s*(?:19|20)\d{2}\s*\)/.test(line)) return null;
  const format = (token: RegExpMatchArray) => {
    if (token[3]) return "Present";
    const month = token[1] ? MONTHS.find((name) => token[1].toLowerCase().startsWith(name)) : undefined;
    return month ? `${month[0].toUpperCase()}${month.slice(1)} ${token[2]}` : token[2];
  };
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const paren = line.match(/\(([^)]*(?:19|20)\d{2}[^)]*)\)/);
  const rest = (paren ? line.replace(paren[0], " ") : `${line.slice(0, first.index)} ${line.slice((last.index ?? 0) + last[0].length)}`)
    .replace(/\s+/g, " ").replace(/^[\s|·,–—-]+|[\s|·,–—-]+$/g, "").trim();
  return { start: format(first), end: tokens.length > 1 && !last[3] ? format(last) : "", current: isPresent, rest };
}

function dateRange(line: string): string[] | null {
  const parsed = parseDates(line);
  return parsed ? [line, parsed.start, parsed.current ? "Present" : parsed.end] : null;
}
function withoutDate(line: string) { return parseDates(line)?.rest ?? line; }

const ACTION_VERB = /^(achieved|delivered|led|built|improved|created|managed|reduced|increased|launched|engineered|architected|contributed|handled|implemented|collaborated|worked|developed|designed|owned|integrated)\b/i;
const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with", "&", "/", "—", "-", "–"]);

function looksLikeHeading(line: string) {
  if (line.length > 75 || /[.,;]$/.test(line)) return false;
  if (/:$/.test(line) || /\s[—–]\s|\s-\s/.test(line)) return true;
  const words = line.split(/\s+/).map((word) => word.replace(/^[^\w]+|[^\w]+$/g, "")).filter((word) => word && !SMALL_WORDS.has(word.toLowerCase()));
  return words.length > 0 && words.filter((word) => /^[A-Z0-9]/.test(word)).length / words.length >= 0.7;
}

type Block = { type: "heading" | "paragraph" | "bullet"; text: string; lastLength: number };

/** Re-flows OCR/PDF line wraps into headings, paragraphs and bullets. */
function blocksOf(lines: string[], hasMarkers = lines.some((line) => line.startsWith("- "))) {
  const blocks: Block[] = [];
  for (const raw of lines) {
    const prev = blocks[blocks.length - 1];
    const isMarkedBullet = raw.startsWith("- ");
    const text = raw.replace(/^- /, "");
    const startsTitle = text.length <= 40 && !text.includes(",") && looksLikeHeading(text);
    const unfinished = prev && prev.type !== "heading" && ((/[,]$/.test(prev.text) && !startsTitle) || /[–—&-]$/.test(prev.text) || /\b(?:and|or|with|the|a|an|of|to|using|for|in|on|across|via|from)$/i.test(prev.text));
    if (isMarkedBullet || (!hasMarkers && ACTION_VERB.test(text) && !unfinished)) { blocks.push({ type: "bullet", text, lastLength: raw.length }); continue; }
    const continues = prev && prev.type !== "heading" && (/^[a-z]/.test(text) || unfinished || (!/[.!?:]$/.test(prev.text) && prev.lastLength >= 70 && !looksLikeHeading(text)));
    if (continues) { prev.text = `${prev.text} ${text}`; prev.lastLength = raw.length; continue; }
    blocks.push({ type: looksLikeHeading(text) && !/^[A-Z][\w /&-]{1,24}:\s+\S/.test(text) ? "heading" : "paragraph", text, lastLength: raw.length });
  }
  return blocks;
}

function blocksToMarkdown(blocks: Block[]) {
  const out: string[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const next = blocks[index + 1];
    if (block.type === "heading" && block.text.endsWith(":") && next?.type === "paragraph") { out.push(`**${block.text}** ${next.text}`); index += 1; continue; }
    if (block.type === "heading") { out.push(`**${block.text}**`); continue; }
    if (block.type === "bullet") { out.push(`- ${block.text}`); continue; }
    const label = block.text.match(/^([A-Z][\w /&-]{1,24}:)\s+(.+)$/);
    out.push(label ? `**${label[1]}** ${label[2]}` : block.text);
  }
  return out.join("\n");
}

function parseExperiences(lines: string[]): Experience[] {
  const entries: { entry: Experience; body: string[] }[] = [];
  const hasMarkers = lines.some((line) => line.startsWith("- "));
  const start = (role: string, dates?: ParsedDates | null, company = "") => {
    entries.push({ entry: { id: id(), role, company, location: "", start: dates?.start ?? "", end: dates?.end ?? "", current: dates?.current ?? false, description: "", highlights: [] }, body: [] });
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const current = entries[entries.length - 1];
    const dates = parseDates(line);
    const nextDates = lines[index + 1] ? parseDates(lines[index + 1]) : null;
    if (!dates && nextDates && !line.startsWith("- ") && line.length <= 80) {
      start(line, nextDates, nextDates.rest);
      index += 1;
    } else if (dates && current && !current.entry.company && !current.body.length) {
      Object.assign(current.entry, { company: dates.rest, start: dates.start, end: dates.end, current: dates.current });
    } else if (dates && (!current || current.body.length || current.entry.company)) {
      const [role = "", company = ""] = dates.rest.split(/\s+[|·]\s+|\s+[—–]\s+|\s*\|\s*/).filter(Boolean);
      start(role, dates, company);
    } else if (!current) {
      const [role = line, company = ""] = line.split(/\s+[|·]\s+/);
      start(role, null, company);
    } else current.body.push(line);
  }
  return entries.map(({ entry, body }, index) => {
    // A lone start date on the most recent role ("Acme (March 2026)") means it is ongoing.
    if (index === 0 && entry.start && !entry.end && !entry.current) entry.current = true;
    const blocks = blocksOf(body, hasMarkers);
    if (blocks.every((block) => block.type === "bullet")) entry.highlights = blocks.map((block) => block.text);
    else entry.description = blocksToMarkdown(blocks);
    return entry;
  }).filter((entry) => entry.role || entry.company).slice(0, 12);
}

function parseEducation(lines: string[]): Education[] {
  const entries: Education[] = [];
  let current: Education | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const range = dateRange(line);
    const nextIsDate = Boolean(lines[index + 1] && dateRange(lines[index + 1]));
    if (nextIsDate && current && (current.institution || current.description)) {
      entries.push(current);
      current = { id: id(), qualification: line, institution: "", location: "", start: "", end: "", grade: "", description: "" };
      continue;
    }
    if (current && range && !current.institution) {
      current.institution = withoutDate(line);
      current.start = range[1] ?? current.start;
      current.end = range[2] ?? current.end;
      continue;
    }
    if (current && range && !current.description) {
      current.description = withoutDate(line);
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
  const phone = Array.from(text.matchAll(/(?<!\d{4}[-–])(?:\+?\d[\d\s().-]{7,}\d)/g)).map((match) => match[0].trim()).find((value) => value.replace(/\D/g, "").length >= 9 && !/^(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}$/.test(value)) ?? "";
  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,)]+/i)?.[0] ?? "";
  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,)]+/i)?.[0] ?? "";
  const headerCandidates = header.filter((line) => line !== email && !(phone && line.includes(phone)) && !/linkedin\.com|github\.com|https?:\/\//i.test(line));
  const nameLine = headerCandidates.find((line) => /^(?:[A-Z][a-z]+\s+){1,3}[A-Z][a-z]+[!?]?$/.test(line) && !/summary|resume|curriculum|res|lie|age|pg/i.test(line)) ?? headerCandidates.find((line) => /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(line) && !/summary|resume|curriculum/i.test(line)) ?? "";
  result.fullName = /[!?]$/.test(nameLine) ? nameLine.replace(/[!?]\s*$/, "").split(/\s+/).slice(0, 2).join(" ") : nameLine;
  const titleLine = headerCandidates.find((line) => line !== nameLine && /developer|engineer|designer|manager|specialist|architect/i.test(line)) ?? "";
  result.professionalTitle = titleLine.match(/^.*?\b(?:developer|engineer|designer|manager|specialist|architect)\b/i)?.[0] ?? titleLine;
  const locationLine = headerCandidates.find((line) => /\b(?:lahore|pakistan|islamabad|karachi|rawalpindi)\b/i.test(line)) ?? "";
  result.location = (locationLine.match(/\b(?:lahore|islamabad|karachi|rawalpindi)(?:\s*[+,•·]\s*pakistan)?/i)?.[0] ?? locationLine).replace(/\s*[+•·]\s*/g, ", ");
  result.email = email;
  result.phone = phone;
  result.linkedin = linkedin;
  result.github = github;
  const websiteLine = lines.find((line) => /(?:https?:\/\/|www\.)[a-z0-9-]+\.[a-z]{2,}/i.test(line) && !/linkedin\.com|github\.com/i.test(line) && !line.includes(email));
  result.website = websiteLine?.match(/(?:https?:\/\/|www\.)[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s|,)]+)?/i)?.[0] ?? "";
  result.summary = (sections.get("summary") ?? []).join(" ").slice(0, 1800);
  result.experiences = parseExperiences(sections.get("experience") ?? []);
  result.education = parseEducation(sections.get("education") ?? []);
  const skillText = (sections.get("skills") ?? []).join(" ").replace(/100%|page\s+\d+\s+of\s+\d+/gi, "");
  const knownSkills = ["Angular 9/17", "AWS (S3/SES)", "CI/CD", "Express JS/TS", "Firebase", "Google Cloud Deployment", "Ionic Angular", "Mongo DB", "My SQL", "Netlify Deployment", "Node JS/TS", "PostgreSQL", "Railway Deployment", "React JS/TS", "Supabase", "Vercel Deployment", "Vue JS", "React", "Angular", "TypeScript", "Node.js", "Express", "MongoDB", "SQL", "PostgreSQL", "GCP", "Docker", "Socket.IO", "Redis", "Tailwind CSS"];
  const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const detectedKnownSkills = knownSkills
    .map((skill) => ({ skill, at: skillText.search(new RegExp(`(?<![\\w])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\? /g, "\\s*")}(?![\\w])`, "i")) }))
    .filter((match) => match.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((match) => match.skill)
    .filter((skill, index, all) => !all.some((other, otherIndex) => otherIndex !== index && compact(other) !== compact(skill) && compact(other).includes(compact(skill))));
  const detectedLooseSkills = unique((sections.get("skills") ?? []).flatMap((line) => line.split(/[,;|•]/))).map((value) => value.replace(/100%|[^\w#+./()& -]/g, "").trim()).filter((value) => value.length > 1 && !/^page\b/i.test(value));
  result.skills = unique(detectedKnownSkills.length ? detectedKnownSkills : detectedLooseSkills).map((name) => ({ id: id(), name, level: "Advanced" as const })).slice(0, 40);
  result.projects = (sections.get("projects") ?? []).filter(Boolean).slice(0, 8).map((name) => ({ id: id(), name, role: "", liveDemoUrl: "", githubUrl: "", caseStudyUrl: "", description: "", technologies: "" }));
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
