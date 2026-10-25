import DashboardLayout from "@/components/DashboardLayout";
import { LazyVisible } from "@/components/LazyVisible";
import { ResumeThumbnail } from "@/components/resume/ResumeDocument";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { RESUME_TEMPLATES, type ResumeTemplateId } from "@shared/resume";
import { Copy, Download, Ellipsis, FileText, FileUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type ListedResume = { title: string; template: string; updatedAt: Date | string; createdAt: Date | string };
type SortKey = "recent" | "oldest" | "name" | "template";
const PAGE_SIZE = 24;
const SORT_LABELS: Record<SortKey, string> = { recent: "Recently edited", oldest: "Oldest first", name: "Name (A–Z)", template: "Template" };
const time = (value: Date | string) => new Date(value).getTime();
const SORTERS: Record<SortKey, (a: ListedResume, b: ListedResume) => number> = {
  recent: (a, b) => time(b.updatedAt) - time(a.updatedAt),
  oldest: (a, b) => time(a.createdAt) - time(b.createdAt),
  name: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }),
  template: (a, b) => a.template.localeCompare(b.template) || time(b.updatedAt) - time(a.updatedAt),
};

export default function Dashboard() {
  const { data: resumes, isLoading, error } = trpc.resume.list.useQuery();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const duplicate = trpc.resume.duplicate.useMutation({ onSuccess: (resume) => { utils.resume.list.invalidate(); toast.success(`Created “${resume.title}”`); }, onError: () => toast.error("We could not duplicate that resume.") });
  const remove = trpc.resume.delete.useMutation({ onSuccess: () => { utils.resume.list.invalidate(); toast.success("Resume deleted"); }, onError: () => toast.error("We could not delete that resume.") });
  const update = trpc.resume.update.useMutation({ onSuccess: () => { utils.resume.list.invalidate(); setRenaming(null); toast.success("Resume renamed"); }, onError: () => toast.error("We could not rename that resume.") });
  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const templateName = (id: string) => RESUME_TEMPLATES.find((item) => item.id === id)?.name ?? id;
    const found = (resumes ?? []).filter((resume) => !needle || `${resume.title} ${templateName(resume.template)} ${resume.data.fullName} ${resume.data.professionalTitle}`.toLowerCase().includes(needle));
    return [...found].sort(SORTERS[sort]);
  }, [resumes, query, sort]);
  const displayed = matching.slice(0, limit);
  const total = resumes?.length ?? 0;
  const openPrint = (id: number) => setLocation(`/editor/${id}?print=true`);
  const startRename = (id: number, name: string) => { setRenaming(id); setNewName(name); };

  return <DashboardLayout><section className="dashboard-content"><header className="dashboard-title" data-reveal><div><p className="eyebrow">Your workspace</p><h1>My <em>resumes.</em></h1><p>Keep every version of your story close at hand.</p></div><div className="dashboard-title-actions"><Link href="/editor/new?template=modern"><Button size="lg"><Plus size={17} />Create new</Button></Link><Link href="/editor/new?template=modern&import=true"><Button size="lg" variant="outline"><FileUp size={17} />Import resume</Button></Link></div></header><div className="dashboard-toolbar"><div className="template-search"><Search size={18} /><Input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(PAGE_SIZE); }} placeholder="Search by title, name or template" aria-label="Search resumes" /></div><div className="dashboard-toolbar-right"><select className="dashboard-sort" value={sort} onChange={(event) => { setSort(event.target.value as SortKey); setLimit(PAGE_SIZE); }} aria-label="Sort resumes">{Object.entries(SORT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><span>{query ? `${matching.length} of ${total}` : total} {total === 1 ? "resume" : "resumes"}</span></div></div>{isLoading && <div className="resume-card-grid">{[1, 2, 3].map((item) => <div className="resume-card-skeleton" key={item} />)}</div>}{error && <div className="error-state"><h2>We could not load your resumes.</h2><p>Please refresh the page and try again.</p></div>}{!isLoading && !error && displayed.length === 0 && <div className="dashboard-empty"><span><FileText size={28} /></span><h2>{query ? "No matching resumes" : "Your first resume starts here."}</h2><p>{query ? "Try a different search phrase." : "Choose a polished template, add your story, and let the layout do the rest."}</p>{query ? <Button variant="outline" onClick={() => setQuery("")}>Clear search</Button> : <Link href="/templates"><Button>Explore templates</Button></Link>}</div>}{displayed.length > 0 && <div className="resume-card-grid">{displayed.map((resume) => { const template = RESUME_TEMPLATES.find((item) => item.id === resume.template); return <article className="resume-card" key={resume.id} data-reveal data-tilt="6"><Link href={`/editor/${resume.id}`} className="resume-card-preview"><LazyVisible className="lazy-thumbnail"><ResumeThumbnail data={resume.data} template={resume.template as ResumeTemplateId} /></LazyVisible></Link><div className="resume-card-body">{renaming === resume.id ? <form className="rename-form" onSubmit={(event) => { event.preventDefault(); if (newName.trim()) update.mutate({ id: resume.id, title: newName.trim() }); }}><Input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} /><Button type="submit" size="sm">Save</Button><Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(null)}>Cancel</Button></form> : <><div className="resume-card-meta"><Badge variant="secondary">{template?.category ?? "Resume"}</Badge><span>Updated {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div><h2 title={resume.title}>{resume.title}</h2></>}<div className="resume-card-actions"><Link href={`/editor/${resume.id}`}><Button variant="outline" size="sm"><Pencil size={14} />Edit</Button></Link><DropdownMenu><DropdownMenuTrigger asChild><button aria-label={`More actions for ${resume.title}`} className="action-menu-button"><Ellipsis size={18} /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="resume-action-dropdown"><DropdownMenuItem onClick={() => startRename(resume.id, resume.title)}><Pencil size={14} />Rename</DropdownMenuItem><DropdownMenuItem onClick={() => duplicate.mutate({ id: resume.id })}><Copy size={14} />Duplicate</DropdownMenuItem><DropdownMenuItem onClick={() => openPrint(resume.id)}><Download size={14} />Print / save PDF</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="delete-menu-action" onClick={() => window.confirm(`Delete “${resume.title}”? This cannot be undone.`) && remove.mutate({ id: resume.id })}><Trash2 size={14} />Delete resume</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div></article>; })}</div>}{matching.length > displayed.length && <div className="dashboard-more"><Button variant="outline" onClick={() => setLimit((value) => value + PAGE_SIZE)}>Show more resumes</Button><span>Showing {displayed.length} of {matching.length}</span></div>}</section></DashboardLayout>;
}
