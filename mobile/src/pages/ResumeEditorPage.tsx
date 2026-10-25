import { IonContent, IonFooter, IonHeader, IonModal, IonPage, IonToggle, useIonRouter, useIonToast, useIonViewWillEnter, useIonViewWillLeave } from "@ionic/react";
import { normalizeResumeData, RESUME_TEMPLATES, type ResumeData, type ResumeTemplateId } from "@shared/resume";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, CloudOff, Download, Eye, EyeOff, ImagePlus, Images, LoaderCircle, Palette, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { absoluteAssetUrl, api, ApiError, type Photo } from "../api/client";
import { RichTextArea } from "../components/RichTextArea";
import { ResumePreview } from "../components/ResumePreview";
import { pickHeadshot, savePdf } from "../lib/files";
import { completion, isStepDone, STEPS, stepOrder, type StepKey } from "../lib/resumeMeta";
import { ACCENT_PRESETS, COLLECTION_FOR_SECTION, COLLECTIONS, PERSONAL_FIELDS, type CollectionItem, type CollectionKey, type FieldDef } from "./editorConfig";

type SaveState = "saved" | "dirty" | "saving" | "error";
type Update = (next: (draft: ResumeData) => ResumeData) => void;
const AUTOSAVE_DELAY_MS = 1200;
const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : "Something went wrong. Please try again.");

/** Guided, step-by-step resume editor — the website editor's sections as mobile steps. */
export default function ResumeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const resumeId = Number(id);
  const router = useIonRouter();
  const [presentToast] = useIonToast();
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<ResumeTemplateId>("modern");
  const [data, setData] = useState<ResumeData | null>(null);
  const [step, setStep] = useState<StepKey>("personal");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [sheet, setSheet] = useState<"" | "preview" | "style">("");
  const [downloading, setDownloading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const latest = useRef({ title, template, data });
  latest.current = { title, template, data };
  const saveTimer = useRef<number | undefined>(undefined);
  const rail = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLIonContentElement>(null);

  const toast = useCallback((message: string, color: "success" | "danger" = "success") => presentToast({ message, duration: 2200, color, position: "top" }), [presentToast]);

  useEffect(() => {
    api.getResume(resumeId).then((resume) => {
      setTitle(resume.title);
      setTemplate(resume.template);
      setData(normalizeResumeData(resume.data, resume.template));
    }).catch((error) => setLoadError(errorMessage(error)));
  }, [resumeId]);

  const save = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    const current = latest.current;
    if (!current.data) return;
    setSaveState("saving");
    try {
      await api.updateResume(resumeId, { title: current.title.trim() || "Untitled resume", template: current.template, data: current.data });
      // Only mark saved if nothing changed while the request was in flight.
      setSaveState(latest.current === current ? "saved" : "dirty");
    } catch {
      setSaveState("error");
    }
  }, [resumeId]);

  // Autosave shortly after the last change.
  const change = useCallback(() => {
    setSaveState("dirty");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { void save(); }, AUTOSAVE_DELAY_MS);
  }, [save]);
  useIonViewWillEnter(() => document.body.classList.add("hide-tabs"));
  useIonViewWillLeave(() => { document.body.classList.remove("hide-tabs"); if (saveState !== "saved") void save(); });
  useEffect(() => () => document.body.classList.remove("hide-tabs"), []);
  const updateData: Update = useCallback((next) => { setData((current) => (current ? next(current) : current)); change(); }, [change]);

  const steps = data ? stepOrder(data) : [];
  const index = Math.max(0, steps.indexOf(step));
  const progress = data ? completion(data) : 0;

  const goTo = (next: StepKey) => {
    setStep(next);
    void content.current?.scrollToTop(250);
    requestAnimationFrame(() => rail.current?.querySelector(`[data-step="${next}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }));
  };

  const download = async () => {
    setDownloading(true);
    try {
      if (saveState !== "saved") await save();
      await savePdf(await api.downloadPdf(resumeId));
    } catch (error) {
      toast(errorMessage(error), "danger");
    } finally {
      setDownloading(false);
    }
  };

  if (loadError || !data) {
    return (
      <IonPage>
        <IonContent fullscreen><div className="center-state">{loadError ? <><p className="lede">{loadError}</p><button className="btn btn-secondary" onClick={() => router.push("/home", "back")}>Back to resumes</button></> : <LoaderCircle className="spin" size={26} />}</div></IonContent>
      </IonPage>
    );
  }

  const info = STEPS[step];
  const nextStep = steps[index + 1];
  const hidden = step !== "personal" && data.hiddenSections.includes(step);

  return (
    <IonPage>
      <IonHeader className="editor-header">
        <div className="editor-bar">
          <button className="icon-btn" onClick={() => (router.canGoBack() ? router.goBack() : router.push("/home", "back"))} aria-label="Back to resumes"><ArrowLeft size={19} /></button>
          <div className="editor-bar-title">
            <strong>{title || "Untitled resume"}</strong>
            <SaveStatus state={saveState} onRetry={save} />
          </div>
          <button className="icon-btn" onClick={() => setSheet("style")} aria-label="Style and template"><Palette size={19} /></button>
        </div>
        <div className="step-rail" ref={rail}>
          {steps.map((key, position) => {
            const Icon = STEPS[key].icon;
            return (
              <button key={key} data-step={key} className={`step-chip ${key === step ? "active" : ""} ${key !== "personal" && data.hiddenSections.includes(key) ? "muted" : ""}`} onClick={() => goTo(key)} aria-current={key === step ? "step" : undefined}>
                <span className="step-tile"><Icon size={17} strokeWidth={1.9} />{isStepDone(data, key) && <i><Check size={8} strokeWidth={3.6} /></i>}</span>
                <span className="step-label">{position + 1}. {STEPS[key].label}</span>
              </button>
            );
          })}
        </div>
        <div className="editor-progress" aria-label={`${progress}% complete`}><i style={{ width: `${progress}%` }} /></div>
      </IonHeader>

      <IonContent ref={content} className="editor-content">
        <section className="step-card" key={step}>
          <div className="step-head">
            <p className="eyebrow">{info.eyebrow} · Step {index + 1} of {steps.length}</p>
            <h1 className="title">{info.title}</h1>
            <p className="lede">{info.text}</p>
          </div>

          {step !== "personal" && (
            <div className="section-options">
              <button className={`chip ${hidden ? "" : "active"}`} onClick={() => updateData((draft) => ({ ...draft, hiddenSections: hidden ? draft.hiddenSections.filter((key) => key !== step) : [...draft.hiddenSections, step] }))}>
                {hidden ? <EyeOff size={14} /> : <Eye size={14} />}{hidden ? "Hidden from resume" : "Shown on resume"}
              </button>
              <span className="section-move">
                <button className="icon-btn plain" disabled={index <= 1} onClick={() => updateData((draft) => moveSection(draft, step, -1))} aria-label="Move section earlier"><ArrowUp size={17} /></button>
                <button className="icon-btn plain" disabled={index === steps.length - 1} onClick={() => updateData((draft) => moveSection(draft, step, 1))} aria-label="Move section later"><ArrowDown size={17} /></button>
              </span>
            </div>
          )}

          <StepForm step={step} title={title} setTitle={(value) => { setTitle(value); change(); }} data={data} updateData={updateData} toast={toast} />
        </section>
      </IonContent>

      <IonFooter className="editor-footer">
        <div className="editor-actions">
          <button className="icon-btn" onClick={() => goTo(steps[index - 1])} disabled={index === 0} aria-label="Previous step"><ArrowLeft size={19} /></button>
          <button className="btn btn-secondary" onClick={() => setSheet("preview")}><Eye size={18} />Preview</button>
          {nextStep
            ? <button className="btn btn-primary grow" onClick={() => goTo(nextStep)}>{STEPS[nextStep].label}<ArrowRight size={18} /></button>
            : <button className="btn btn-primary grow" onClick={() => setSheet("preview")}>Finish<ArrowRight size={18} /></button>}
        </div>
      </IonFooter>

      <PreviewModal isOpen={sheet === "preview"} onClose={() => setSheet("")} data={data} template={template} setTemplate={(next) => { setTemplate(next); change(); }} onDownload={download} downloading={downloading} progress={progress} />
      <StyleSheet isOpen={sheet === "style"} onClose={() => setSheet("")} data={data} updateData={updateData} template={template} setTemplate={(next) => { setTemplate(next); change(); }} />
    </IonPage>
  );
}

function moveSection(draft: ResumeData, section: StepKey, offset: -1 | 1): ResumeData {
  const order = [...draft.sectionOrder];
  const from = order.indexOf(section as ResumeData["sectionOrder"][number]);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= order.length) return draft;
  [order[from], order[to]] = [order[to], order[from]];
  return { ...draft, sectionOrder: order };
}

function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "error") return <button className="save-status error" onClick={onRetry}><CloudOff size={12} />Not saved · retry</button>;
  return <span className={`save-status ${state}`}>{state === "saved" ? <><Check size={12} />Saved</> : <><LoaderCircle size={12} className="spin" />Saving</>}</span>;
}

// ---------------------------------------------------------------- Step forms

function StepForm({ step, title, setTitle, data, updateData, toast }: { step: StepKey; title: string; setTitle: (value: string) => void; data: ResumeData; updateData: Update; toast: (message: string, color?: "success" | "danger") => void }) {
  if (step === "personal") {
    return (
      <div className="form-stack">
        <PhotoPicker data={data} updateData={updateData} toast={toast} />
        <div className="form-grid">
          {PERSONAL_FIELDS.map((field) => (
            <label key={field.key} className={`field ${field.half ? "half" : ""}`}>
              <span>{field.label}</span>
              <input type={field.type ?? "text"} inputMode={field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : undefined} autoCapitalize={field.type ? "none" : "words"} value={data[field.key]} onChange={(event) => updateData((draft) => ({ ...draft, [field.key]: event.target.value }))} />
            </label>
          ))}
          <label className="field"><span>Resume name · only you see this</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        </div>
      </div>
    );
  }
  if (step === "summary") return <RichTextArea label="Summary" value={data.summary} onChange={(summary) => updateData((draft) => ({ ...draft, summary }))} placeholder="e.g. Full-stack engineer with 5 years building SaaS products. I turn complex workflows into fast, reliable tools." />;
  if (step === "interests") {
    return <label className="field"><span>Interests</span><input placeholder="Photography, hiking, open source" defaultValue={data.interests.join(", ")} onBlur={(event) => updateData((draft) => ({ ...draft, interests: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /><small className="field-hint">Separate with commas.</small></label>;
  }
  const collection = COLLECTION_FOR_SECTION[step];
  if (!collection) return null;
  return (
    <>
      <CollectionEditor
        collection={collection}
        items={data[collection] as unknown as CollectionItem[]}
        onChange={(items) => updateData((draft) => ({ ...draft, [collection]: items }))}
        onReorder={collection === "experiences" ? () => updateData((draft) => ({ ...draft, theme: { ...draft.theme, experienceOrderMode: "manual" } })) : undefined}
      />
      {collection === "experiences" && data.theme.experienceOrderMode === "manual" && (
        <button className="link-btn order-reset" onClick={() => updateData((draft) => ({ ...draft, theme: { ...draft.theme, experienceOrderMode: "auto" } }))}>Manual order active · sort newest first</button>
      )}
    </>
  );
}

// Experiences are shown newest-first unless the user reorders them, which switches to manual order (as on the website).
function CollectionEditor({ collection, items, onChange, onReorder }: { collection: CollectionKey; items: CollectionItem[]; onChange: (items: CollectionItem[]) => void; onReorder?: () => void }) {
  const def = COLLECTIONS[collection];
  const [openId, setOpenId] = useState<string | null>(items.length === 1 ? items[0].id : null);
  const update = (id: string, patch: Record<string, unknown>) => onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const move = (index: number, offset: -1 | 1) => { const next = [...items]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; onChange(next); onReorder?.(); };
  const add = () => { const item = def.create(); onChange([...items, item]); setOpenId(item.id); };

  return (
    <div className="collection">
      {items.map((item, index) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className={`entry ${open ? "open" : ""}`}>
            <button className="entry-head" onClick={() => setOpenId(open ? null : item.id)} aria-expanded={open}>
              <span className="entry-index">{index + 1}</span>
              <span className="entry-title">{def.itemTitle(item)}</span>
              <ChevronDown size={18} className="entry-chevron" />
            </button>
            {open && (
              <div className="entry-body">
                <div className="form-grid">
                  {def.fields.filter((field) => !(field.hiddenWhen && item[field.hiddenWhen])).map((field) => <Field key={field.key} field={field} value={item[field.key]} onChange={(value) => update(item.id, field.key === "current" && value ? { current: true, end: "" } : { [field.key]: value })} />)}
                </div>
                <div className="entry-actions">
                  <button className="icon-btn plain" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp size={17} /></button>
                  <button className="icon-btn plain" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown size={17} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}><Trash2 size={15} />Remove</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button className="add-entry" onClick={add}><Plus size={18} />{def.addLabel}</button>
    </div>
  );
}

function Field({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (value: unknown) => void }) {
  const className = `field ${field.half ? "half" : ""}`;
  if (field.kind === "rich") return <div className={field.half ? "half" : ""}><RichTextArea label={field.label} value={typeof value === "string" ? value : ""} onChange={onChange} placeholder={field.placeholder} /></div>;
  if (field.kind === "toggle") return <label className="switch-row"><span>{field.label}</span><IonToggle checked={Boolean(value)} onIonChange={(event) => onChange(event.detail.checked)} aria-label={field.label} /></label>;
  if (field.kind === "select") return <label className={className}><span>{field.label}</span><select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  if (field.kind === "lines") {
    const lines = Array.isArray(value) ? (value as string[]) : [];
    return <label className={className}><span>{field.label}</span><textarea rows={3} defaultValue={lines.join("\n")} placeholder="Improved activation by 28%" onBlur={(event) => onChange(event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))} /></label>;
  }
  return <label className={className}><span>{field.label}</span><input placeholder={field.placeholder} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} /></label>;
}

function PhotoPicker({ data, updateData, toast }: { data: ResumeData; updateData: Update; toast: (message: string, color?: "success" | "danger") => void }) {
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState<Photo[] | null>(null);
  const setPhoto = (photoUrl: string) => updateData((draft) => ({ ...draft, photoUrl }));

  const upload = async () => {
    setBusy(true);
    try {
      const picked = await pickHeadshot();
      if (!picked) return;
      setPhoto((await api.uploadPhoto(picked)).storageUrl);
      toast("Headshot added");
    } catch (error) {
      toast(errorMessage(error), "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photo-card">
      <div className="photo-avatar">{data.photoUrl ? <img src={absoluteAssetUrl(data.photoUrl)} alt="Your headshot" /> : <ImagePlus size={24} />}</div>
      <div className="photo-copy">
        <strong>Professional headshot <span className="pill rust">Optional</span></strong>
        <small>Shown on photo-ready templates. Large photos are resized automatically.</small>
        <div className="photo-buttons">
          <button className="btn btn-secondary btn-sm" onClick={upload} disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : <ImagePlus size={15} />}{data.photoUrl ? "Replace" : "Add photo"}</button>
          <button className="btn btn-ghost btn-sm" onClick={async () => { try { setLibrary(await api.listPhotos()); } catch (error) { toast(errorMessage(error), "danger"); } }}><Images size={15} />Library</button>
          {data.photoUrl && <button className="icon-btn plain" onClick={() => setPhoto("")} aria-label="Remove photo"><Trash2 size={16} /></button>}
        </div>
      </div>
      <IonModal isOpen={library !== null} onDidDismiss={() => setLibrary(null)} className="sheet scroll-sheet" initialBreakpoint={0.6} breakpoints={[0, 0.6, 0.95]}>
        <IonContent><div className="sheet-body">
          <p className="eyebrow">Your uploads</p>
          <h2 className="title">Choose a <em>headshot.</em></h2>
          {library?.length === 0 && <p className="lede">No uploads yet — add one with “Add photo”.</p>}
          <div className="photo-grid">{library?.map((photo) => <button key={photo.id} onClick={() => { setPhoto(photo.storageUrl); setLibrary(null); }} aria-label={`Use ${photo.fileName}`}><img src={photo.url} alt="" /></button>)}</div>
        </div></IonContent>
      </IonModal>
    </div>
  );
}

// ---------------------------------------------------------------- Preview & style

function TemplateStrip({ data, template, setTemplate }: { data: ResumeData; template: ResumeTemplateId; setTemplate: (template: ResumeTemplateId) => void }) {
  return (
    <div className="template-strip">
      {RESUME_TEMPLATES.map((item) => (
        <button key={item.id} className={`strip-item ${item.id === template ? "active" : ""}`} onClick={() => setTemplate(item.id)} aria-pressed={item.id === template} aria-label={`Use ${item.name}`}>
          <div className="paper"><ResumePreview data={data} template={item.id} firstPageOnly /></div>
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  );
}

function PreviewModal({ isOpen, onClose, data, template, setTemplate, onDownload, downloading, progress }: { isOpen: boolean; onClose: () => void; data: ResumeData; template: ResumeTemplateId; setTemplate: (template: ResumeTemplateId) => void; onDownload: () => void; downloading: boolean; progress: number }) {
  const info = RESUME_TEMPLATES.find((item) => item.id === template);
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="fullscreen">
      <div className="preview-shell">
        <div className="preview-top">
          <button className="icon-btn" onClick={onClose} aria-label="Close preview"><X size={19} /></button>
          <div><strong>{info?.name}</strong><small>{info?.ats ? "ATS-friendly" : info?.category} · {progress}% complete</small></div>
          <span className="spacer" />
        </div>
        <div className="preview-page"><div className="paper"><ResumePreview data={data} template={template} /></div></div>
        <div className="preview-dock">
          <TemplateStrip data={data} template={template} setTemplate={setTemplate} />
          <button className="btn btn-primary btn-block" onClick={onDownload} disabled={downloading}>{downloading ? <LoaderCircle size={20} className="spin" /> : <Download size={19} />}{downloading ? "Preparing PDF…" : "Download PDF"}</button>
        </div>
      </div>
    </IonModal>
  );
}

function StyleSheet({ isOpen, onClose, data, updateData, template, setTemplate }: { isOpen: boolean; onClose: () => void; data: ResumeData; updateData: Update; template: ResumeTemplateId; setTemplate: (template: ResumeTemplateId) => void }) {
  const theme = (patch: Partial<ResumeData["theme"]>) => updateData((draft) => ({ ...draft, theme: { ...draft.theme, ...patch } }));
  const options = <T extends string>(values: readonly T[], current: T, onPick: (value: T) => void) => (
    <div className="segmented">{values.map((value) => <button key={value} className={value === current ? "active" : ""} onClick={() => onPick(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
  );
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="sheet scroll-sheet" initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]}>
      <IonContent><div className="sheet-body style-sheet">
        <p className="eyebrow">Personalize</p>
        <h2 className="title">Style & <em>layout.</em></h2>
        <h3 className="style-label">Template</h3>
        <TemplateStrip data={data} template={template} setTemplate={setTemplate} />
        <h3 className="style-label">Accent colour</h3>
        <div className="swatches">
          {ACCENT_PRESETS.map((color) => <button key={color} className={data.theme.accent.toLowerCase() === color.toLowerCase() ? "active" : ""} style={{ background: color }} onClick={() => theme({ accent: color })} aria-label={`Accent ${color}`} />)}
          <label className="swatch-custom" aria-label="Custom accent colour"><input type="color" value={data.theme.accent} onChange={(event) => theme({ accent: event.target.value })} /></label>
        </div>
        <h3 className="style-label">Typography</h3>
        {options(["modern", "serif", "classic"] as const, data.theme.font, (font) => theme({ font }))}
        <h3 className="style-label">Density</h3>
        {options(["compact", "comfortable", "airy"] as const, data.theme.scale, (scale) => theme({ scale }))}
        <h3 className="style-label">Photo shape</h3>
        {options(["circle", "rounded", "square"] as const, data.theme.photoShape, (photoShape) => theme({ photoShape }))}
        <label className="switch-row ats-row"><span>Plain ATS mode<small>Removes colour and photos for applicant tracking systems</small></span><IonToggle checked={data.theme.atsMode} onIonChange={(event) => theme({ atsMode: event.detail.checked })} aria-label="Plain ATS mode" /></label>
      </div></IonContent>
    </IonModal>
  );
}
