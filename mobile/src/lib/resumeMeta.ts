import type { ResumeData, ResumeSectionKey } from "@shared/resume";
import { BadgeCheck, BriefcaseBusiness, Compass, FolderKanban, GraduationCap, HeartHandshake, Languages, ScrollText, Trophy, UserRound, Wrench, type LucideIcon } from "lucide-react";

/** Guided editor steps, worded like the website editor's sections. */
export type StepKey = "personal" | ResumeSectionKey;
export type StepInfo = { key: StepKey; label: string; eyebrow: string; title: string; text: string; icon: LucideIcon; optional?: boolean };

export const STEPS: Record<StepKey, StepInfo> = {
  personal: { key: "personal", label: "Personal", eyebrow: "Foundation", title: "Personal details", text: "Add the information recruiters need to reach you. Choose a headshot only if it fits your field and template.", icon: UserRound },
  summary: { key: "summary", label: "Summary", eyebrow: "Your introduction", title: "Professional summary", text: "In 2–4 sentences, connect your experience to the value you bring.", icon: ScrollText },
  experience: { key: "experience", label: "Experience", eyebrow: "Work history", title: "Experience", text: "Focus on outcomes, not only responsibilities.", icon: BriefcaseBusiness },
  education: { key: "education", label: "Education", eyebrow: "Learning", title: "Education", text: "Add degrees, diplomas, relevant coursework, or professional learning.", icon: GraduationCap },
  skills: { key: "skills", label: "Skills", eyebrow: "Your toolkit", title: "Skills", text: "Keep the list relevant to the role you want.", icon: Wrench },
  projects: { key: "projects", label: "Projects", eyebrow: "Optional section", title: "Projects", text: "Work worth showing.", icon: FolderKanban, optional: true },
  certifications: { key: "certifications", label: "Certifications", eyebrow: "Optional section", title: "Certifications", text: "Credentials and training.", icon: BadgeCheck, optional: true },
  languages: { key: "languages", label: "Languages", eyebrow: "Optional section", title: "Languages", text: "Language proficiency.", icon: Languages, optional: true },
  awards: { key: "awards", label: "Awards", eyebrow: "Optional section", title: "Awards", text: "Recognition and wins.", icon: Trophy, optional: true },
  volunteer: { key: "volunteer", label: "Volunteer", eyebrow: "Optional section", title: "Volunteer", text: "Community experience.", icon: HeartHandshake, optional: true },
  interests: { key: "interests", label: "Interests", eyebrow: "Optional section", title: "Interests", text: "A little more about you.", icon: Compass, optional: true },
};

/** Personal details first, then the resume's own section order. */
export const stepOrder = (data: ResumeData): StepKey[] => ["personal", ...data.sectionOrder];

export function isStepDone(data: ResumeData, step: StepKey) {
  switch (step) {
    case "personal": return Boolean(data.fullName && data.email);
    case "summary": return data.summary.trim().length > 0;
    case "experience": return data.experiences.length > 0;
    case "interests": return data.interests.length > 0;
    default: return (data[step as Exclude<StepKey, "personal" | "summary" | "experience" | "interests">] as unknown[]).length > 0;
  }
}

/** Same 7 checks as the website's completion bar. */
export function completion(data: ResumeData) {
  const checks = [data.fullName, data.professionalTitle, data.email, data.summary, data.experiences.length, data.education.length, data.skills.length];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Next things worth doing, shown as gentle tips (like the website's resume health card). */
export function nextTips(data: ResumeData) {
  const tips: string[] = [];
  if (!data.summary || data.summary.length < 60) tips.push("Add a 2–4 sentence professional summary");
  if (!data.phone) tips.push("Include a phone number");
  if (!data.experiences.length) tips.push("Add your most recent role");
  if (data.skills.length < 3) tips.push("List at least 3 skills");
  return tips;
}

/** Time-of-day greeting; late night (10 pm – 5 am) gets its own line instead of "Good morning". */
export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Working late";
}

export function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
