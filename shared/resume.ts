export const RESUME_TEMPLATES = [
  { id: "modern", name: "Modern", category: "Professional", description: "Balanced hierarchy with a confident editorial header.", ats: false, supportsPhoto: true },
  { id: "minimal", name: "Minimal", category: "ATS-friendly", description: "Clean, scannable structure designed for clarity.", ats: true, supportsPhoto: false },
  { id: "executive", name: "Executive", category: "Leadership", description: "A refined two-column layout for senior professionals.", ats: false, supportsPhoto: true },
  { id: "classic", name: "Classic", category: "Traditional", description: "Conservative typography and timeless document structure.", ats: true, supportsPhoto: false },
  { id: "studio", name: "Studio", category: "Creative", description: "An elegant sidebar layout with expressive visual rhythm.", ats: false, supportsPhoto: true },
  { id: "portrait", name: "Portrait", category: "Photo-forward", description: "A warm, editorial profile layout designed around your professional headshot.", ats: false, supportsPhoto: true },
  { id: "focus", name: "Focus", category: "Developer", description: "A compact, one-page-forward style for technical roles.", ats: true, supportsPhoto: false },
  { id: "atlas", name: "Atlas", category: "Consulting", description: "A sharp, analytical layout that keeps high-impact experience easy to scan.", ats: true, supportsPhoto: false },
  { id: "horizon", name: "Horizon", category: "Design", description: "A confident, photo-ready layout with an expressive but professional header.", ats: false, supportsPhoto: true },
  { id: "monograph", name: "Monograph", category: "Academic", description: "A refined serif document for research, education, and considered career stories.", ats: true, supportsPhoto: false },
  { id: "ledger", name: "Ledger", category: "Finance", description: "A disciplined, data-led format for finance, operations, and business roles.", ats: true, supportsPhoto: false },
  { id: "boutique", name: "Boutique", category: "Creative", description: "A boutique studio-inspired profile with space for a memorable headshot.", ats: false, supportsPhoto: true },
  { id: "editorial", name: "Editorial", category: "Photo-forward", description: "A premium modern layout with a bold masthead, headshot, and highly scannable project history.", ats: false, supportsPhoto: true },
] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATES)[number]["id"];
export type ResumeSectionKey = "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages" | "awards" | "volunteer" | "interests";

export type ResumeTheme = {
  accent: string;
  text: string;
  font: "modern" | "serif" | "classic";
  scale: "compact" | "comfortable" | "airy";
  photoShape: "circle" | "rounded" | "square";
};

export type Experience = { id: string; role: string; company: string; location: string; start: string; end: string; current: boolean; description: string; highlights: string[] };
export type Education = { id: string; qualification: string; institution: string; location: string; start: string; end: string; grade: string; description: string };
export type Skill = { id: string; name: string; level: "Beginner" | "Intermediate" | "Advanced" | "Expert" };
export type Project = { id: string; name: string; role: string; url: string; description: string; technologies: string };
export type Certification = { id: string; name: string; issuer: string; date: string; credentialUrl: string };
export type Language = { id: string; name: string; proficiency: "Basic" | "Intermediate" | "Advanced" | "Fluent" | "Native" };
export type Award = { id: string; name: string; issuer: string; date: string; description: string };
export type Volunteer = { id: string; organization: string; role: string; start: string; end: string; description: string };

export type ResumeData = {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  photoUrl: string;
  summary: string;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  awards: Award[];
  volunteer: Volunteer[];
  interests: string[];
  sectionOrder: ResumeSectionKey[];
  hiddenSections: ResumeSectionKey[];
  theme: ResumeTheme;
};

const defaultTheme: ResumeTheme = { accent: "#24474A", text: "#1C2526", font: "modern", scale: "comfortable", photoShape: "circle" };

export const newResumeData = (template: ResumeTemplateId = "modern"): ResumeData => ({
  fullName: "",
  professionalTitle: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  github: "",
  photoUrl: "",
  summary: "",
  experiences: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  awards: [],
  volunteer: [],
  interests: [],
  sectionOrder: ["summary", "experience", "education", "skills", "projects", "certifications", "languages", "awards", "volunteer", "interests"],
  hiddenSections: [],
  theme: { ...defaultTheme },
});

export const sampleResumeData = (template: ResumeTemplateId = "modern"): ResumeData => ({
  ...newResumeData(template),
  fullName: "Alex Morgan",
  professionalTitle: "Product Designer",
  email: "alex.morgan@email.com",
  phone: "+1 (415) 555-0138",
  location: "San Francisco, CA",
  website: "alexmorgan.design",
  linkedin: "linkedin.com/in/alexmorgan",
  summary: "Thoughtful product designer with 7+ years of experience shaping clear, accessible digital products. I combine research, systems thinking, and craft to help ambitious teams turn complex workflows into confident customer experiences.",
  experiences: [{ id: "sample-experience", role: "Senior Product Designer", company: "Northstar Systems", location: "San Francisco, CA", start: "2021", end: "", current: true, description: "Led product design across the company’s planning platform, partnering with product and engineering from discovery through launch.", highlights: ["Redesigned the core workflow, improving successful task completion by 28%.", "Established a shared component library used across three product teams."] }],
  education: [{ id: "sample-education", qualification: "BFA, Interaction Design", institution: "California College of the Arts", location: "San Francisco, CA", start: "2012", end: "2016", grade: "", description: "" }],
  skills: [{ id: "sample-skill-1", name: "Product strategy", level: "Expert" }, { id: "sample-skill-2", name: "UX research", level: "Expert" }, { id: "sample-skill-3", name: "Design systems", level: "Advanced" }, { id: "sample-skill-4", name: "Prototyping", level: "Advanced" }],
  projects: [{ id: "sample-project", name: "Onboarding refresh", role: "Design lead", url: "", description: "A self-serve onboarding experience that helped new teams reach value earlier.", technologies: "Figma, Maze, React" }],
});

export function normalizeResumeData(value: unknown, template: ResumeTemplateId = "modern"): ResumeData {
  const base = newResumeData(template);
  if (!value || typeof value !== "object") return base;
  const candidate = value as Partial<ResumeData>;
  return {
    ...base,
    ...candidate,
    theme: { ...base.theme, ...(candidate.theme ?? {}) },
    experiences: Array.isArray(candidate.experiences) ? candidate.experiences : [],
    education: Array.isArray(candidate.education) ? candidate.education : [],
    skills: Array.isArray(candidate.skills) ? candidate.skills : [],
    projects: Array.isArray(candidate.projects) ? candidate.projects : [],
    certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
    languages: Array.isArray(candidate.languages) ? candidate.languages : [],
    awards: Array.isArray(candidate.awards) ? candidate.awards : [],
    volunteer: Array.isArray(candidate.volunteer) ? candidate.volunteer : [],
    interests: Array.isArray(candidate.interests) ? candidate.interests : [],
    sectionOrder: Array.isArray(candidate.sectionOrder) ? candidate.sectionOrder : base.sectionOrder,
    hiddenSections: Array.isArray(candidate.hiddenSections) ? candidate.hiddenSections : [],
  };
}
