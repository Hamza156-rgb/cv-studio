import type { ResumeData, ResumeTemplateId } from "@shared/resume";
import { AtSign, ExternalLink, Github, Globe2, Linkedin, MapPin, Phone } from "lucide-react";
import React from "react";

type Props = { data: ResumeData; template: ResumeTemplateId; className?: string };

const sectionLabels = { summary: "Profile", experience: "Experience", education: "Education", skills: "Core skills", projects: "Selected work", certifications: "Certifications", languages: "Languages", awards: "Recognition", volunteer: "Volunteer work", interests: "Interests" } as const;

function DateRange({ start, end, current }: { start: string; end: string; current?: boolean }) {
  if (!start && !end) return null;
  return <span className="resume-date">{start}{start && (end || current) ? " — " : ""}{current ? "Present" : end}</span>;
}

export function ResumeDocument({ data, template, className = "" }: Props) {
  const photoAllowed = template === "modern" || template === "executive" || template === "studio" || template === "portrait" || template === "horizon" || template === "boutique" || template === "editorial";
  const initials = data.fullName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "CV";
  const visible = (key: keyof typeof sectionLabels) => !data.hiddenSections.includes(key);
  const hasContacts = Boolean(data.email || data.phone || data.location || data.website || data.linkedin || data.github);
  const summary = data.summary || "A concise professional profile will appear here as you build your resume.";
  const experienceHasContent = (item: ResumeData["experiences"][number]) => Boolean(item.role || item.company || item.location || item.start || item.end || item.current || item.description || item.highlights.some(Boolean));
  const projectHasContent = (item: ResumeData["projects"][number]) => Boolean(item.name || item.role || item.liveDemoUrl || item.githubUrl || item.caseStudyUrl || item.url || item.description || item.technologies);
  const sortedExperiences = data.theme.experienceOrderMode === "manual" ? data.experiences : [...data.experiences].sort(compareExperiences);

  return (
    <article
      className={`resume-document resume-${template} resume-scale-${data.theme.scale} font-${data.theme.font} ${data.theme.atsMode ? "resume-ats" : ""} ${className}`}
      style={{ "--resume-accent": data.theme.accent, "--resume-text": data.theme.text } as React.CSSProperties}
      aria-label="Live resume preview"
    >
      <header className="resume-header">
        <div className="resume-identity">
          <h1>{data.fullName || "Your name"}</h1>
          <p className="resume-role">{data.professionalTitle || "Your professional title"}</p>
          {hasContacts && <div className="resume-contact">
            {data.email && <span><AtSign />{data.email}</span>}
            {data.phone && <span><Phone />{data.phone}</span>}
            {data.location && <span><MapPin />{data.location}</span>}
            {data.website && <span><Globe2 />{data.website.replace(/^https?:\/\//, "")}</span>}
            {data.linkedin && <span><Linkedin />{data.linkedin.replace(/^https?:\/\//, "")}</span>}
            {data.github && <span><Github />{data.github.replace(/^https?:\/\//, "")}</span>}
          </div>}
        </div>
        {!data.theme.atsMode && photoAllowed && (data.photoUrl ? <img className={`resume-photo photo-${data.theme.photoShape}`} src={data.photoUrl} alt={`${data.fullName || "Resume"} headshot`} /> : (template === "portrait" || template === "modern" || template === "editorial") ? <div className="resume-photo resume-photo-placeholder" aria-label="Headshot placement">{initials}</div> : null)}
      </header>

      <div className="resume-body">
        {data.sectionOrder.map((section) => {
          if (!visible(section)) return null;
          if (section === "summary") return <ResumeSection key={section} title={sectionLabels[section]}><div className="resume-summary"><FormattedText text={summary} /></div></ResumeSection>;
          if (section === "experience" && sortedExperiences.some(experienceHasContent)) return <ResumeSection key={section} title={sectionLabels[section]}>{sortedExperiences.filter(experienceHasContent).map((item) => <div className="resume-entry resume-experience-entry" key={item.id}><div className="resume-entry-heading"><div className="resume-entry-main">{item.role && <h3>{item.role}</h3>}{(item.company || item.location) && <p className="resume-company-line">{item.company && <strong>{item.company}</strong>}{item.company && item.location && <span className="resume-meta-separator"> · </span>}{item.location && <span>{item.location}</span>}</p>}</div><DateRange start={item.start} end={item.end} current={item.current} /></div>{item.description && <div className="resume-work-content"><FormattedText text={item.description} /></div>}{item.highlights.filter(Boolean).length > 0 && <ul className="resume-achievements">{item.highlights.filter(Boolean).map((line, index) => <li key={`${item.id}-${index}`}>{line}</li>)}</ul>}</div>)}</ResumeSection>;
          if (section === "education" && data.education.length) return <ResumeSection key={section} title={sectionLabels[section]}>{data.education.map((item) => <div className="resume-entry compact-entry" key={item.id}><div className="resume-entry-heading"><div><h3>{item.qualification || "Qualification"}</h3><p>{item.institution}{item.location ? ` · ${item.location}` : ""}</p></div><DateRange start={item.start} end={item.end} /></div>{item.grade && <p>{item.grade}</p>}{item.description && <FormattedText text={item.description} />}</div>)}</ResumeSection>;
          if (section === "skills" && data.skills.length) return <ResumeSection key={section} title={sectionLabels[section]}><div className="resume-skills">{data.skills.map((skill) => <span key={skill.id}>{skill.name}</span>)}</div></ResumeSection>;
          if (section === "projects" && data.projects.some(projectHasContent)) return <ResumeSection key={section} title={sectionLabels[section]}>{data.projects.filter(projectHasContent).map((item) => <div className="resume-entry compact-entry resume-project-entry" key={item.id}><div className="resume-entry-heading"><div className="resume-entry-main">{item.name && <h3>{item.name}</h3>}{(item.role || item.technologies) && <p className="resume-project-meta">{item.role}{item.role && item.technologies ? " · " : ""}{item.technologies}</p>}</div><div className="resume-project-links">{(item.liveDemoUrl || item.url) && <a className="resume-project-link" href={toExternalUrl(item.liveDemoUrl || item.url || "")} target="_blank" rel="noreferrer"><ExternalLink />Live demo</a>}{item.githubUrl && <a className="resume-project-link" href={toExternalUrl(item.githubUrl)} target="_blank" rel="noreferrer"><ExternalLink />GitHub</a>}{item.caseStudyUrl && <a className="resume-project-link" href={toExternalUrl(item.caseStudyUrl)} target="_blank" rel="noreferrer"><ExternalLink />Case study</a>}</div></div>{item.description && <FormattedText text={item.description} />}</div>)}</ResumeSection>;
          if (section === "certifications" && data.certifications.some((item) => item.name)) return <ResumeSection key={section} title={sectionLabels[section]}><div className="resume-inline-list">{data.certifications.filter((item) => item.name).map((item) => { const details = [item.issuer, item.date].filter(Boolean).join(", "); return <span key={item.id}><strong>{item.name}</strong>{details ? ` · ${details}` : ""}</span>; })}</div></ResumeSection>;
          if (section === "languages" && data.languages.some((item) => item.name)) return <ResumeSection key={section} title={sectionLabels[section]}><div className="resume-inline-list">{data.languages.filter((item) => item.name).map((item) => <span key={item.id}><strong>{item.name}</strong>{item.proficiency ? ` · ${item.proficiency}` : ""}</span>)}</div></ResumeSection>;
          if (section === "awards" && data.awards.length) return <ResumeSection key={section} title={sectionLabels[section]}>{data.awards.map((item) => <div className="resume-entry compact-entry" key={item.id}><h3>{item.name}</h3><p>{item.issuer}{item.date ? ` · ${item.date}` : ""}</p>{item.description && <FormattedText text={item.description} />}</div>)}</ResumeSection>;
          if (section === "volunteer" && data.volunteer.length) return <ResumeSection key={section} title={sectionLabels[section]}>{data.volunteer.map((item) => <div className="resume-entry compact-entry" key={item.id}><div className="resume-entry-heading"><div><h3>{item.role}</h3><p>{item.organization}</p></div><DateRange start={item.start} end={item.end} /></div>{item.description && <FormattedText text={item.description} />}</div>)}</ResumeSection>;
          if (section === "interests" && data.interests.filter(Boolean).length) return <ResumeSection key={section} title={sectionLabels[section]}><p className="resume-interests">{data.interests.filter(Boolean).join(" · ")}</p></ResumeSection>;
          return null;
        })}
      </div>
    </article>
  );
}

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="resume-section"><h2>{title}</h2>{children}</section>;
}

function compareExperiences(a: ResumeData["experiences"][number], b: ResumeData["experiences"][number]) { const score = (item: ResumeData["experiences"][number]) => item.current ? Number.POSITIVE_INFINITY : Number.parseInt((item.start || item.end || "0").match(/\d{4}/)?.[0] ?? "0", 10); return score(b) - score(a); }

function toExternalUrl(value: string) { return /^https?:\/\//i.test(value) ? value : `https://${value}`; }

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={index}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

const BULLET_LINE = /^\s*[-•]\s+/;
const ORDERED_LINE = /^\s*\d+[.)]\s+/;

function FormattedText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const content: React.ReactNode[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const pattern = BULLET_LINE.test(line) ? BULLET_LINE : ORDERED_LINE.test(line) ? ORDERED_LINE : null;
    if (pattern) {
      const items: string[] = [];
      while (index < lines.length && pattern.test(lines[index])) { items.push(lines[index].replace(pattern, "")); index += 1; }
      index -= 1;
      const children = items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>);
      content.push(pattern === BULLET_LINE ? <ul className="resume-rich-list" key={`list-${index}`}>{children}</ul> : <ol className="resume-rich-list" key={`list-${index}`}>{children}</ol>);
    } else if (/^\s*\*\*[^*]+\*\*\s*$/.test(line)) content.push(<h4 className="resume-rich-subheading" key={`heading-${index}`}>{line.trim().slice(2, -2)}</h4>);
    else if (line.trim()) content.push(<p className="resume-rich-paragraph" key={`line-${index}`}>{renderInline(line)}</p>);
  }
  return <>{content}</>;
}

export function ResumeThumbnail({ data, template }: Omit<Props, "className">) {
  return <div className="resume-thumbnail"><ResumeDocument data={data} template={template} /></div>;
}
