import { IonActionSheet, IonContent, IonPage, IonRefresher, IonRefresherContent, useIonAlert, useIonRouter, useIonToast, useIonViewWillEnter } from "@ionic/react";
import { RESUME_TEMPLATES } from "@shared/resume";
import { ArrowRight, FileUp, LayoutTemplate, LoaderCircle, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api, ApiError, type Resume } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { NewResumeSheet } from "../components/NewResumeSheet";
import { ProgressRing } from "../components/ProgressRing";
import { ResumePreview } from "../components/ResumePreview";
import { Tilt } from "../components/Tilt";
import { savePdf } from "../lib/files";
import { completion, greeting, nextTips, relativeTime } from "../lib/resumeMeta";

const templateName = (id: string) => RESUME_TEMPLATES.find((item) => item.id === id)?.name ?? id;
type SortKey = "recent" | "name" | "progress";
const SORTS: { key: SortKey; label: string; compare: (a: Resume, b: Resume) => number }[] = [
  { key: "recent", label: "Recent", compare: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() },
  { key: "name", label: "Name", compare: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }) },
  { key: "progress", label: "Least complete", compare: (a, b) => completion(a.data) - completion(b.data) },
];
// Search and sort appear once the list is long enough to need them.
const TOOLS_FROM = 4;
const COLLAPSED_COUNT = 6;

export default function HomePage() {
  const router = useIonRouter();
  const { user } = useAuth();
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [menuFor, setMenuFor] = useState<Resume | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [showAll, setShowAll] = useState(false);
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0];

  const toast = (message: string, color: "success" | "danger" = "success") => presentToast({ message, duration: 2200, color, position: "top" });
  const load = async () => {
    try { setResumes(await api.listResumes()); } catch (error) { toast(error instanceof ApiError ? error.message : "Could not load your resumes.", "danger"); setResumes((current) => current ?? []); }
  };
  useIonViewWillEnter(() => { void load(); });

  const run = async (label: string, task: () => Promise<void>) => {
    setBusy(label);
    try { await task(); } catch (error) { toast(error instanceof ApiError ? error.message : "Something went wrong.", "danger"); } finally { setBusy(""); }
  };
  const remove = (resume: Resume) => presentAlert({
    header: "Delete this resume?",
    message: `“${resume.title}” will be removed from the app and the website.`,
    buttons: [{ text: "Cancel", role: "cancel" }, { text: "Delete", role: "destructive", handler: () => { void run("delete", async () => { await api.deleteResume(resume.id); setResumes((list) => list?.filter((item) => item.id !== resume.id) ?? null); toast("Resume deleted"); }); } }],
  });

  const latest = resumes?.[0];
  const listed = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const found = (resumes ?? []).filter((resume) => !needle || `${resume.title} ${templateName(resume.template)} ${resume.data.fullName} ${resume.data.professionalTitle}`.toLowerCase().includes(needle));
    return [...found].sort(SORTS.find((item) => item.key === sort)!.compare);
  }, [resumes, query, sort]);
  const searching = query.trim().length > 0;
  const visible = showAll || searching ? listed : listed.slice(0, COLLAPSED_COUNT);
  const latestProgress = latest ? completion(latest.data) : 0;
  const tip = latest ? nextTips(latest.data)[0] : undefined;

  return (
    <IonPage>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={async (event) => { await load(); event.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        <div className="page-pad home">
          <header className="home-head">
            <div>
              <p className="caption">{greeting()}{firstName ? "," : ""}</p>
              <h1 className="display">{firstName ? <>{firstName}<em>.</em></> : <>Welcome<em>.</em></>}</h1>
            </div>
            <button className="avatar-btn" onClick={() => router.push("/profile")} aria-label="Your profile">{(user?.name ?? user?.email ?? "?").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</button>
          </header>

          {resumes === null ? <div className="center-state"><LoaderCircle className="spin" size={26} /></div> : latest ? (
            <Tilt max={6} className="continue-tilt">
            <button className="continue-card" onClick={() => router.push(`/resumes/${latest.id}`)}>
              <div className="continue-copy">
                <p className="eyebrow eyebrow-light">Continue editing</p>
                <h2>{latest.title}</h2>
                <p className="continue-meta">{templateName(latest.template)} · edited {relativeTime(latest.updatedAt)}</p>
                {tip && <p className="continue-tip">Next: {tip.toLowerCase()}</p>}
                <span className="continue-cta">Open editor <ArrowRight size={16} /></span>
              </div>
              <div className="continue-art">
                <div className="paper continue-paper"><ResumePreview data={latest.data} template={latest.template} firstPageOnly /></div>
                <span className="continue-ring"><ProgressRing value={latestProgress} size={50} light /></span>
              </div>
            </button>
            </Tilt>
          ) : (
            <div className="empty-hero">
              <p className="eyebrow">Your first resume</p>
              <h2 className="title">Let's build something <em>you're proud of.</em></h2>
              <p className="lede">Guided steps, 18 professional templates and a perfect PDF at the end.</p>
              <button className="btn btn-primary btn-block" onClick={() => setCreating(true)}><Plus size={19} />Create a resume</button>
            </div>
          )}

          <div className="quick-actions">
            <button onClick={() => setCreating(true)}><span className="qa-icon ink"><Plus size={20} /></span>New resume</button>
            <button onClick={() => setCreating(true)}><span className="qa-icon rust"><FileUp size={19} /></span>Import</button>
            <button onClick={() => router.push("/templates")}><span className="qa-icon mint"><LayoutTemplate size={19} /></span>Templates</button>
          </div>

          {resumes && resumes.length > 0 && (
            <>
              <div className="section-label"><h2>Your resumes</h2><span className="caption">{searching ? `${listed.length} of ${resumes.length}` : resumes.length}</span></div>
              {resumes.length >= TOOLS_FROM && (
                <div className="list-tools">
                  <label className="search-field">
                    <Search size={17} />
                    <input type="search" placeholder="Search title, name or template" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search resumes" />
                    {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
                  </label>
                  <div className="scroll-row">{SORTS.map((item) => <button key={item.key} className={`chip ${sort === item.key ? "active" : ""}`} onClick={() => setSort(item.key)}>{item.label}</button>)}</div>
                </div>
              )}
              {searching && listed.length === 0 && <div className="list-empty"><p>No resumes match “{query}”.</p><button className="link-btn" onClick={() => setQuery("")}>Clear search</button></div>}
              <div className="resume-list">
                {visible.map((resume) => {
                  const progress = completion(resume.data);
                  return (
                    <article key={resume.id} className="resume-row">
                      <button className="resume-row-main" onClick={() => router.push(`/resumes/${resume.id}`)}>
                        <div className="paper resume-row-thumb"><ResumePreview data={resume.data} template={resume.template} firstPageOnly lazy /></div>
                        <div className="resume-row-copy">
                          <strong>{resume.title}</strong>
                          <span className="pill">{templateName(resume.template)}</span>
                          <div className="row-progress"><i style={{ width: `${progress}%` }} /></div>
                          <small>{progress}% complete · {relativeTime(resume.updatedAt)}</small>
                        </div>
                      </button>
                      <button className="icon-btn plain" onClick={() => setMenuFor(resume)} aria-label={`Actions for ${resume.title}`}><MoreHorizontal size={20} /></button>
                    </article>
                  );
                })}
              </div>
              {!searching && listed.length > COLLAPSED_COUNT && (
                <button className="btn btn-secondary btn-block show-all" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show fewer" : `Show all ${listed.length} resumes`}</button>
              )}
            </>
          )}
        </div>

        <NewResumeSheet isOpen={creating} onClose={() => setCreating(false)} />
        <IonActionSheet
          isOpen={!!menuFor}
          header={menuFor?.title}
          onDidDismiss={() => setMenuFor(null)}
          buttons={menuFor ? [
            { text: "Download PDF", handler: () => { const target = menuFor; void run("pdf", async () => { await savePdf(await api.downloadPdf(target.id)); }); } },
            { text: "Duplicate", handler: () => { const target = menuFor; void run("duplicate", async () => { const copy = await api.duplicateResume(target.id); setResumes((list) => [copy, ...(list ?? [])]); toast("Copy created"); }); } },
            { text: "Delete", role: "destructive", handler: () => { remove(menuFor); } },
            { text: "Cancel", role: "cancel" },
          ] : []}
        />
        {busy === "pdf" && <div className="busy-overlay"><LoaderCircle className="spin" size={26} /><span>Preparing your PDF…</span></div>}
      </IonContent>
    </IonPage>
  );
}
