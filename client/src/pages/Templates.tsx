import { ResumeThumbnail } from "@/components/resume/ResumeDocument";
import { StudioNav } from "@/components/StudioNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RESUME_TEMPLATES, sampleResumeData, type ResumeTemplateId } from "@shared/resume";
import { ArrowRight, Check, Image, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

export default function Templates() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const categories = ["All", ...Array.from(new Set(RESUME_TEMPLATES.map((template) => template.category)))];
  const items = useMemo(() => RESUME_TEMPLATES.filter((template) => (filter === "All" || template.category === filter) && `${template.name} ${template.category}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  return <div className="site-shell template-page"><StudioNav /><main><section className="templates-hero"><p className="eyebrow">Designed for the next step</p><h1>Find the layout that<br /><em>lets your work lead.</em></h1><p>Every template is thoughtfully structured, professionally typeset, and free to use. Switch styles at any time without losing a word.</p></section><section className="templates-controls container"><div className="template-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates" aria-label="Search templates" /></div><div className="template-filters" aria-label="Template categories"><SlidersHorizontal size={16} />{categories.map((category) => <button key={category} onClick={() => setFilter(category)} className={filter === category ? "selected" : ""}>{category}</button>)}</div></section><section className="template-grid container">{items.map((template) => <article className={`template-card ${template.supportsPhoto ? "template-card-photo" : ""}`} key={template.id}><div className="template-preview"><ResumeThumbnail data={sampleResumeData(template.id)} template={template.id} /></div><div className="template-card-content"><div className="template-card-top"><div><h2>{template.name}</h2><p>{template.description}</p></div><div className="template-badges">{template.supportsPhoto && <Badge className="photo-template-badge"><Image size={12} />Photo-ready</Badge>}{template.ats && <Badge variant="secondary"><Check size={12} />ATS-friendly</Badge>}</div></div><div className="template-card-footer"><span>{template.category}</span><Link href={`/editor/new?template=${template.id}`}><Button variant="outline">Use template <ArrowRight size={15} /></Button></Link></div></div></article>)}</section>{items.length === 0 && <div className="empty-gallery"><p>No templates matched that search.</p><button onClick={() => { setFilter("All"); setQuery(""); }}>Reset filters</button></div>}</main><footer className="simple-footer"><p>CV Studio · Professional resumes, without the pressure.</p></footer></div>;
}
