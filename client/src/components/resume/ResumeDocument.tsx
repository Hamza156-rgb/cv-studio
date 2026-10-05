import type { ResumeData, ResumeTemplateId } from "@shared/resume";
import { AtSign, Globe2, Linkedin, MapPin, Phone } from "lucide-react";
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

  return (
    <article
      className={`resume-document resume-${template} resume-scale-${data.theme.scale} font-${data.theme.font} ${className}`}
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
          </div>}
        </div>
        {photoAllowed && (data.photoUrl ? <img className={`resume-photo photo-${data.theme.photoShape}`} src={data.photoUrl} alt={`${data.fullName || "Resume"} headshot`} /> : (template === "portrait" || template === "modern" || template === "editorial") ? <div className="resume-photo resume-photo-placeholder" aria-label="Headshot placement">{initials}</div> : null)}
      </header>

      <div className="resume-body">
        {data.sectionOrder.map((section) => {
          if (!visible(section)) return null;
          if (section === "summary") return <ResumeSection key={section} title={sectionLabels[section]}><div className="resume-summary"><FormattedText text={summary} /></div></ResumeSection>;
          if (section === "experience" && data.experiences.length) return <ResumeSection key={section} title={sectionLabels[section]}>{data.experiences.map((item) => <div className="resume-entry" key={item.id}><div className="resume-entry-heading"><div><h3>{item.role || "Role title"}</h3><p>{item.company}{item.location ? ` · ${item.location}` : ""}</p></div><DateRange start={item.start} end={item.end} current={item.current} /></div>{item.description && <FormattedText text={item.description} />}{item.highlights.filter(Boolean).length > 0 && <ul>{item.highlights.filter(Boolean).map((line, index) => <li key={`${item.id}-${index}`}>{line}</li>)}</ul>}</div>)}</ResumeSection>;
          if (section === "education" && data.education.length) return <ResumeSection key={section} title={sectionLabels[section]}>{data.education.map((item) => <div className="resume-entry compact-entry" key={item.id}><div className="resume-entry-heading"><div><h3>{item.qualification || "Qualification"}</h3><p>{item.institution}{item.location ? ` · ${item.location}` : ""}</p></div><DateRange start={item.start} end={item.end} /></div>{item.grade && <p>{item.grade}</p>}{item.description && <FormattedText text={item.description} />}</div>)}</ResumeSection>;
          if (section === "skills" && data.skills.length) return <ResumeSection key={section} title={sectionLabels[section]}><div className="resume-skills">{data.skills.map((skill) => <span key={skill.id}>{skill.name}</span>)}</div></ResumeSection>;
          if (section === "projects" && data.projects.length) return <ResumeSection key={section} title={sectionLabels[section]}>{data.projects.map((item) => <div className="resume-entry compact-entry" key={item.id}><div className="resume-entry-heading"><div><h3>{item.name}</h3><p>{item.role}{item.technologies ? ` · ${item.technologies}` : ""}</p></div></div>{item.description && <FormattedText text={item.description} />}</div>)}</ResumeSection>;
          if (section === "certifications" && data.certifications.length) return <ResumeSection key={section} title={sectionLabels[section]}><div className="resume-inline-list">{data.certifications.map((item) => <span key={item.id}><strong>{item.name}</strong> · {item.issuer}{item.date ? `, ${item.date}` : ""}</span>)}</div></ResumeSection>;
          if (section === "languages" && data.languages.length) return <ResumeSection key={section} title={sectionLabels[section]}><div className="resume-inline-list">{data.languages.map((item) => <span key={item.id}><strong>{item.name}</strong> · {item.proficiency}</span>)}</div></ResumeSection>;
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

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={index}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function FormattedText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const content: React.ReactNode[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*[-•]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-•]\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*[-•]\s+/, "")); index += 1; }
      index -= 1;
      content.push(<ul className="resume-rich-list" key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>);
    } else if (line.trim()) content.push(<p className="resume-rich-paragraph" key={`line-${index}`}>{renderInline(line)}</p>);
  }
  return <>{content}</>;
}

export function ResumeThumbnail({ data, template }: Omit<Props, "className">) {
  return <div className="resume-thumbnail"><ResumeDocument data={data} template={template} /></div>;
}
