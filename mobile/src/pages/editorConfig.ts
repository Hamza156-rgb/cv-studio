import type { ResumeData, ResumeSectionKey } from "@shared/resume";

/** Field layout for each list section of the resume, rendered by the generic CollectionEditor. */

export type FieldDef = {
  key: string;
  label: string;
  kind?: "text" | "rich" | "select" | "toggle" | "lines";
  options?: readonly string[];
  half?: boolean;
  placeholder?: string;
  /** Hide this field while another boolean field is true (e.g. End date while "current"). */
  hiddenWhen?: string;
};

export type CollectionKey = "experiences" | "education" | "skills" | "projects" | "certifications" | "languages" | "awards" | "volunteer";
export type CollectionItem = Record<string, unknown> & { id: string };

export type CollectionDef = {
  section: ResumeSectionKey;
  title: string;
  addLabel: string;
  itemTitle: (item: CollectionItem) => string;
  create: () => CollectionItem;
  fields: FieldDef[];
};

const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const text = (value: unknown) => (typeof value === "string" ? value : "");

export const COLLECTIONS: Record<CollectionKey, CollectionDef> = {
  experiences: {
    section: "experience", title: "Experience", addLabel: "Add experience",
    itemTitle: (item) => [text(item.role), text(item.company)].filter(Boolean).join(" · ") || "New role",
    create: () => ({ id: id(), role: "", company: "", location: "", start: "", end: "", current: false, description: "", highlights: [] }),
    fields: [
      { key: "role", label: "Job title" }, { key: "company", label: "Company" },
      { key: "location", label: "Location" },
      { key: "start", label: "Start date", half: true, placeholder: "Mar 2024" }, { key: "end", label: "End date", half: true, placeholder: "Jan 2026", hiddenWhen: "current" },
      { key: "current", label: "I currently work here", kind: "toggle" },
      { key: "description", label: "Description", kind: "rich", placeholder: "**Project name**\n- What you built and the impact it had" },
      { key: "highlights", label: "Achievements (one per line)", kind: "lines" },
    ],
  },
  education: {
    section: "education", title: "Education", addLabel: "Add education",
    itemTitle: (item) => text(item.qualification) || text(item.institution) || "New qualification",
    create: () => ({ id: id(), qualification: "", institution: "", location: "", start: "", end: "", grade: "", description: "" }),
    fields: [
      { key: "qualification", label: "Degree or qualification" }, { key: "institution", label: "Institution" },
      { key: "location", label: "Location", half: true }, { key: "grade", label: "Grade / GPA", half: true },
      { key: "start", label: "Start year", half: true }, { key: "end", label: "End year", half: true },
      { key: "description", label: "Details", kind: "rich" },
    ],
  },
  skills: {
    section: "skills", title: "Skills", addLabel: "Add skill",
    itemTitle: (item) => text(item.name) || "New skill",
    create: () => ({ id: id(), name: "", level: "Advanced" }),
    fields: [{ key: "name", label: "Skill" }, { key: "level", label: "Level", kind: "select", options: ["Beginner", "Intermediate", "Advanced", "Expert"] }],
  },
  projects: {
    section: "projects", title: "Projects", addLabel: "Add project",
    itemTitle: (item) => text(item.name) || "New project",
    create: () => ({ id: id(), name: "", role: "", liveDemoUrl: "", githubUrl: "", caseStudyUrl: "", description: "", technologies: "" }),
    fields: [
      { key: "name", label: "Project name" }, { key: "role", label: "Your role", half: true }, { key: "technologies", label: "Technologies", half: true },
      { key: "liveDemoUrl", label: "Live demo URL", placeholder: "https://" }, { key: "githubUrl", label: "GitHub URL", placeholder: "https://github.com/…" }, { key: "caseStudyUrl", label: "Case study URL", placeholder: "https://" },
      { key: "description", label: "Description", kind: "rich" },
    ],
  },
  certifications: {
    section: "certifications", title: "Certifications", addLabel: "Add certification",
    itemTitle: (item) => text(item.name) || "New certification",
    create: () => ({ id: id(), name: "", issuer: "", date: "", credentialUrl: "" }),
    fields: [{ key: "name", label: "Certification" }, { key: "issuer", label: "Issuer", half: true }, { key: "date", label: "Date", half: true }, { key: "credentialUrl", label: "Credential URL", placeholder: "https://" }],
  },
  languages: {
    section: "languages", title: "Languages", addLabel: "Add language",
    itemTitle: (item) => text(item.name) || "New language",
    create: () => ({ id: id(), name: "", proficiency: "Fluent" }),
    fields: [{ key: "name", label: "Language" }, { key: "proficiency", label: "Proficiency", kind: "select", options: ["Basic", "Intermediate", "Advanced", "Fluent", "Native"] }],
  },
  awards: {
    section: "awards", title: "Awards", addLabel: "Add award",
    itemTitle: (item) => text(item.name) || "New award",
    create: () => ({ id: id(), name: "", issuer: "", date: "", description: "" }),
    fields: [{ key: "name", label: "Award" }, { key: "issuer", label: "Issuer", half: true }, { key: "date", label: "Date", half: true }, { key: "description", label: "Description", kind: "rich" }],
  },
  volunteer: {
    section: "volunteer", title: "Volunteer", addLabel: "Add volunteer role",
    itemTitle: (item) => text(item.role) || text(item.organization) || "New role",
    create: () => ({ id: id(), organization: "", role: "", start: "", end: "", description: "" }),
    fields: [{ key: "role", label: "Role" }, { key: "organization", label: "Organization" }, { key: "start", label: "Start", half: true }, { key: "end", label: "End", half: true }, { key: "description", label: "Description", kind: "rich" }],
  },
};

export const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: "Summary", experience: "Experience", education: "Education", skills: "Skills", projects: "Projects",
  certifications: "Certifications", languages: "Languages", awards: "Awards", volunteer: "Volunteer", interests: "Interests",
};

export const COLLECTION_FOR_SECTION = Object.fromEntries(Object.entries(COLLECTIONS).map(([key, def]) => [def.section, key])) as Partial<Record<ResumeSectionKey, CollectionKey>>;

export const ACCENT_PRESETS = ["#24474A", "#355C7D", "#6C4B61", "#7C5C36", "#1F4D3A", "#1E293B", "#9A3412"];

export type PersonalKey = keyof Pick<ResumeData, "fullName" | "professionalTitle" | "email" | "phone" | "location" | "website" | "linkedin" | "github">;
export const PERSONAL_FIELDS: { key: PersonalKey; label: string; type?: "email" | "tel" | "url"; half?: boolean }[] = [
  { key: "fullName", label: "Full name" }, { key: "professionalTitle", label: "Professional title" },
  { key: "email", label: "Email", type: "email", half: true }, { key: "phone", label: "Phone", type: "tel", half: true },
  { key: "location", label: "Location" }, { key: "website", label: "Website", type: "url" },
  { key: "linkedin", label: "LinkedIn", half: true }, { key: "github", label: "GitHub", half: true },
];
