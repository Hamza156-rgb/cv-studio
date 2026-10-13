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
  { id: "harvard", name: "Harvard", category: "Graduate", description: "The classic Ivy League format: centered serif header, ruled sections, and a pure black-and-white ATS-safe page.", ats: true, supportsPhoto: false },
  { id: "precision", name: "Precision", category: "Developer", description: "A dense single-column engineering resume in the style of the popular Jake's Resume — fits more projects per page.", ats: true, supportsPhoto: false },
  { id: "chronicle", name: "Chronicle", category: "Corporate", description: "A timeline layout with dates in a left rail, so career progression reads at a glance.", ats: true, supportsPhoto: false },
  { id: "meridian", name: "Meridian", category: "Professional", description: "A two-column layout with a tinted side panel for skills, education, and languages, plus room for a headshot.", ats: false, supportsPhoto: true },
  { id: "summit", name: "Summit", category: "Leadership", description: "A bold corporate format with a strong name block and solid accent section bars for senior roles.", ats: true, supportsPhoto: false },
] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATES)[number]["id"];
export type ResumeSectionKey = "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages" | "awards" | "volunteer" | "interests";

export type ResumeTheme = {
  accent: string;
  text: string;
  font: "modern" | "serif" | "classic";
  scale: "compact" | "comfortable" | "airy";
  photoShape: "circle" | "rounded" | "square";
  atsMode: boolean;
  experienceOrderMode: "auto" | "manual";
};

export type Experience = { id: string; role: string; company: string; location: string; start: string; end: string; current: boolean; description: string; highlights: string[] };
export type Education = { id: string; qualification: string; institution: string; location: string; start: string; end: string; grade: string; description: string };
export type Skill = { id: string; name: string; level: "Beginner" | "Intermediate" | "Advanced" | "Expert" };
export type Project = { id: string; name: string; role: string; liveDemoUrl: string; githubUrl: string; caseStudyUrl: string; url?: string; description: string; technologies: string };
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

const defaultTheme: ResumeTheme = { accent: "#24474A", text: "#1C2526", font: "modern", scale: "comfortable", photoShape: "circle", atsMode: false, experienceOrderMode: "auto" };
const makeFallbackId = () => `resume-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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
  projects: [{ id: "sample-project", name: "Onboarding refresh", role: "Design lead", liveDemoUrl: "", githubUrl: "", caseStudyUrl: "", description: "A self-serve onboarding experience that helped new teams reach value earlier.", technologies: "Figma, Maze, React" }],
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
    projects: Array.isArray(candidate.projects) ? candidate.projects.map((project) => { const item = project as Partial<Project>; return { id: item.id ?? makeFallbackId(), name: item.name ?? "", role: item.role ?? "", liveDemoUrl: item.liveDemoUrl ?? item.url ?? "", githubUrl: item.githubUrl ?? "", caseStudyUrl: item.caseStudyUrl ?? "", description: item.description ?? "", technologies: item.technologies ?? "" }; }) : [],
    certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
    languages: Array.isArray(candidate.languages) ? candidate.languages : [],
    awards: Array.isArray(candidate.awards) ? candidate.awards : [],
    volunteer: Array.isArray(candidate.volunteer) ? candidate.volunteer : [],
    interests: Array.isArray(candidate.interests) ? candidate.interests : [],
    sectionOrder: Array.isArray(candidate.sectionOrder) ? candidate.sectionOrder : base.sectionOrder,
    hiddenSections: Array.isArray(candidate.hiddenSections) ? candidate.hiddenSections : [],
  };
}
