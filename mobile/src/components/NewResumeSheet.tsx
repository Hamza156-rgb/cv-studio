import { IonModal, useIonRouter } from "@ionic/react";
import { newResumeData, RESUME_TEMPLATES, sampleResumeData, type ResumeData, type ResumeTemplateId } from "@shared/resume";
import { ArrowLeft, Check, FileUp, LoaderCircle, PenLine, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import { blobToDataUrl, pickFile } from "../lib/files";
import { ResumePreview } from "./ResumePreview";

type Start = { kind: "blank" | "sample" | "import"; data?: ResumeData; title: string };

/** "How would you like to begin?" then "Choose a template" — the website's new-resume flow. */
export function NewResumeSheet({ isOpen, onClose, initialTemplate }: { isOpen: boolean; onClose: () => void; initialTemplate?: ResumeTemplateId }) {
  const router = useIonRouter();
  const [start, setStart] = useState<Start | null>(null);
  const [template, setTemplate] = useState<ResumeTemplateId>(initialTemplate ?? "modern");
  const [busy, setBusy] = useState<"" | "import" | "create">("");
  const [error, setError] = useState("");
  const previewData = useMemo(() => start?.data ?? sampleResumeData(template), [start, template]);

  const reset = () => { setStart(null); setError(""); setBusy(""); setTemplate(initialTemplate ?? "modern"); };

  const importFile = async () => {
    setError("");
    const file = await pickFile("application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx");
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("Choose a PDF or DOCX smaller than 8 MB."); return; }
    setBusy("import");
    try {
      const imported = await api.importResume({ fileName: file.name, dataUrl: await blobToDataUrl(file) });
      setStart({ kind: "import", data: imported.data, title: file.name.replace(/\.(pdf|docx)$/i, "").slice(0, 160) || "Imported resume" });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not read that file.");
    } finally {
      setBusy("");
    }
  };

  const create = async () => {
    if (!start) return;
    setBusy("create");
    setError("");
    try {
      const data = start.kind === "sample" ? sampleResumeData(template) : start.data ?? newResumeData(template);
      const resume = await api.createResume({ title: start.title, template, data });
      onClose();
      router.push(`/resumes/${resume.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not create the resume.");
      setBusy("");
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={() => { onClose(); reset(); }} className="sheet" initialBreakpoint={1} breakpoints={[0, 1]}>
      <div className="sheet-body new-resume">
        {!start ? (
          <>
            <p className="eyebrow">New resume</p>
            <h2 className="title">How would you like <em>to begin?</em></h2>
            <p className="lede">Start fresh, explore a finished example, or bring in the resume you already have.</p>
            <div className="start-options">
              <button className="start-option" onClick={() => setStart({ kind: "blank", title: "Untitled resume" })}>
                <span className="start-icon"><PenLine size={20} /></span>
                <span><strong>Start from scratch</strong><small>A clean page with guided steps</small></span>
              </button>
              <button className="start-option" onClick={() => setStart({ kind: "sample", title: "Sample resume" })}>
                <span className="start-icon rust"><Sparkles size={20} /></span>
                <span><strong>Start with a sample CV</strong><small>See a finished resume, then make it yours</small></span>
              </button>
              <button className="start-option" onClick={importFile} disabled={busy === "import"}>
                <span className="start-icon">{busy === "import" ? <LoaderCircle size={20} className="spin" /> : <FileUp size={20} />}</span>
                <span><strong>{busy === "import" ? "Reading your resume…" : "Import PDF or DOCX"}</strong><small>Up to 8 MB · opens straight in the editor</small></span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="sheet-nav"><button className="icon-btn" onClick={() => setStart(null)} aria-label="Back"><ArrowLeft size={18} /></button><span className="caption">Step 2 of 2</span></div>
            <p className="eyebrow">{start.kind === "import" ? "Imported" : "Design"}</p>
            <h2 className="title">Choose a <em>template.</em></h2>
            <p className="lede">You can switch any time — your content stays intact.</p>
            <div className="template-carousel">
              {RESUME_TEMPLATES.map((item) => (
                <button key={item.id} className={`template-option ${item.id === template ? "active" : ""}`} onClick={() => setTemplate(item.id)} aria-pressed={item.id === template}>
                  <div className="paper"><ResumePreview data={start.kind === "sample" ? sampleResumeData(item.id) : previewData} template={item.id} firstPageOnly /></div>
                  <span className="template-option-name">{item.id === template && <Check size={14} />}{item.name}</span>
                  <small>{item.ats ? "ATS-friendly" : item.category}</small>
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-block" onClick={create} disabled={busy === "create"}>{busy === "create" ? <LoaderCircle size={20} className="spin" /> : `Create with ${RESUME_TEMPLATES.find((item) => item.id === template)?.name}`}</button>
          </>
        )}
        {error && <p className="toast-error sheet-error" role="alert">{error}</p>}
      </div>
    </IonModal>
  );
}
