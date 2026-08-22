import DashboardLayout from "@/components/DashboardLayout";
import { ResumeThumbnail } from "@/components/resume/ResumeDocument";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { RESUME_TEMPLATES, type ResumeTemplateId } from "@shared/resume";
import { Copy, Download, Ellipsis, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const { data: resumes, isLoading, error } = trpc.resume.list.useQuery();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const duplicate = trpc.resume.duplicate.useMutation({ onSuccess: (resume) => { utils.resume.list.invalidate(); toast.success(`Created “${resume.title}”`); }, onError: () => toast.error("We could not duplicate that resume.") });
  const remove = trpc.resume.delete.useMutation({ onSuccess: () => { utils.resume.list.invalidate(); toast.success("Resume deleted"); }, onError: () => toast.error("We could not delete that resume.") });
  const update = trpc.resume.update.useMutation({ onSuccess: () => { utils.resume.list.invalidate(); setRenaming(null); toast.success("Resume renamed"); }, onError: () => toast.error("We could not rename that resume.") });
  const displayed = useMemo(() => (resumes ?? []).filter((resume) => `${resume.title} ${resume.template}`.toLowerCase().includes(query.toLowerCase())), [resumes, query]);
  const openPrint = (id: number) => setLocation(`/editor/${id}?print=true`);
  const startRename = (id: number, name: string) => { setRenaming(id); setNewName(name); };

  return <DashboardLayout><section className="dashboard-content"><header className="dashboard-title"><div><p className="eyebrow">Your workspace</p><h1>My <em>resumes.</em></h1><p>Keep every version of your story close at hand.</p></div><Link href="/editor/new?template=modern"><Button size="lg"><Plus size={17} />Create new</Button></Link></header><div className="dashboard-toolbar"><div className="template-search"><Search size={18} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resumes" aria-label="Search resumes" /></div><span>{resumes?.length ?? 0} {resumes?.length === 1 ? "resume" : "resumes"}</span></div>{isLoading && <div className="resume-card-grid">{[1, 2, 3].map((item) => <div className="resume-card-skeleton" key={item} />)}</div>}{error && <div className="error-state"><h2>We could not load your resumes.</h2><p>Please refresh the page and try again.</p></div>}{!isLoading && !error && displayed.length === 0 && <div className="dashboard-empty"><span><FileText size={28} /></span><h2>{query ? "No matching resumes" : "Your first resume starts here."}</h2><p>{query ? "Try a different search phrase." : "Choose a polished template, add your story, and let the layout do the rest."}</p>{query ? <Button variant="outline" onClick={() => setQuery("")}>Clear search</Button> : <Link href="/templates"><Button>Explore templates</Button></Link>}</div>}{displayed.length > 0 && <div className="resume-card-grid">{displayed.map((resume) => { const template = RESUME_TEMPLATES.find((item) => item.id === resume.template); return <article className="resume-card" key={resume.id}><Link href={`/editor/${resume.id}`} className="resume-card-preview"><ResumeThumbnail data={resume.data} template={resume.template as ResumeTemplateId} /></Link><div className="resume-card-body">{renaming === resume.id ? <form className="rename-form" onSubmit={(event) => { event.preventDefault(); if (newName.trim()) update.mutate({ id: resume.id, title: newName.trim() }); }}><Input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} /><Button type="submit" size="sm">Save</Button><Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(null)}>Cancel</Button></form> : <><div className="resume-card-meta"><Badge variant="secondary">{template?.category ?? "Resume"}</Badge><span>Updated {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div><h2>{resume.title}</h2></>}<div className="resume-card-actions"><Link href={`/editor/${resume.id}`}><Button variant="outline" size="sm"><Pencil size={14} />Edit</Button></Link><DropdownMenu><DropdownMenuTrigger asChild><button aria-label={`More actions for ${resume.title}`} className="action-menu-button"><Ellipsis size={18} /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="resume-action-dropdown"><DropdownMenuItem onClick={() => startRename(resume.id, resume.title)}><Pencil size={14} />Rename</DropdownMenuItem><DropdownMenuItem onClick={() => duplicate.mutate({ id: resume.id })}><Copy size={14} />Duplicate</DropdownMenuItem><DropdownMenuItem onClick={() => openPrint(resume.id)}><Download size={14} />Print / save PDF</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="delete-menu-action" onClick={() => window.confirm(`Delete “${resume.title}”? This cannot be undone.`) && remove.mutate({ id: resume.id })}><Trash2 size={14} />Delete resume</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div></article>; })}</div>}</section></DashboardLayout>;
}
