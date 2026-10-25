import {
  IonAccordion, IonAccordionGroup, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal,
  IonPage, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToggle, IonToolbar, useIonToast, useIonViewWillLeave,
} from "@ionic/react";
import { normalizeResumeData, type ResumeData, type ResumeSectionKey, type ResumeTemplateId } from "@shared/resume";
import { addOutline, arrowDown, arrowUp, checkmarkCircle, cloudDoneOutline, cloudOfflineOutline, downloadOutline, eyeOffOutline, eyeOutline, imageOutline, trashOutline } from "ionicons/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { absoluteAssetUrl, api, ApiError, type Photo, type Template } from "../api/client";
import { RichTextArea } from "../components/RichTextArea";
import { ResumePreview } from "../components/ResumePreview";
import { pickHeadshot, savePdf } from "../lib/files";
import { ACCENT_PRESETS, COLLECTION_FOR_SECTION, COLLECTIONS, PERSONAL_FIELDS, SECTION_LABELS, type CollectionItem, type CollectionKey, type FieldDef } from "./editorConfig";

type SaveState = "saved" | "dirty" | "saving" | "error";
const AUTOSAVE_DELAY_MS = 1200;
const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : "Something went wrong. Please try again.");

export default function ResumeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const resumeId = Number(id);
  const [presentToast] = useIonToast();
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<ResumeTemplateId>("modern");
  const [data, setData] = useState<ResumeData | null>(null);
  const [tab, setTab] = useState<"edit" | "preview" | "design">("edit");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [downloading, setDownloading] = useState<ResumeTemplateId | null>(null);
  const [loadError, setLoadError] = useState("");
  const latest = useRef({ title, template, data });
  latest.current = { title, template, data };
  const saveTimer = useRef<number | undefined>(undefined);

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
  useIonViewWillLeave(() => { if (saveState !== "saved") void save(); });

  const updateData = useCallback((next: (draft: ResumeData) => ResumeData) => { setData((current) => (current ? next(current) : current)); change(); }, [change]);

  const download = async (target: ResumeTemplateId) => {
    setDownloading(target);
    try {
      if (saveState !== "saved") await save();
      await savePdf(await api.downloadPdf(resumeId, target === template ? undefined : target));
    } catch (error) {
      toast(errorMessage(error), "danger");
    } finally {
      setDownloading(null);
    }
  };

  const status = { saved: { icon: cloudDoneOutline, text: "Saved" }, dirty: { icon: cloudDoneOutline, text: "Editing…" }, saving: { icon: cloudDoneOutline, text: "Saving…" }, error: { icon: cloudOfflineOutline, text: "Not saved — tap to retry" } }[saveState];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/resumes" /></IonButtons>
          <IonTitle>{title || "Resume"}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => download(template)} disabled={!data || !!downloading} aria-label="Download PDF">{downloading === template ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={downloadOutline} />}</IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={(event) => setTab(event.detail.value as typeof tab)}>
            <IonSegmentButton value="edit"><IonLabel>Edit</IonLabel></IonSegmentButton>
            <IonSegmentButton value="preview"><IonLabel>Preview</IonLabel></IonSegmentButton>
            <IonSegmentButton value="design"><IonLabel>Design</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {loadError ? <div className="center-state"><p>{loadError}</p></div> : !data ? <div className="center-state"><IonSpinner /></div> : (
          <>
            <button className={`save-status save-${saveState}`} onClick={() => saveState === "error" && save()} disabled={saveState !== "error"}><IonIcon icon={status.icon} />{status.text}</button>
            {tab === "edit" && <EditTab title={title} setTitle={(value) => { setTitle(value); change(); }} data={data} updateData={updateData} toast={toast} />}
            {tab === "preview" && <div className="preview-tab"><ResumePreview data={data} template={template} /></div>}
            {tab === "design" && <DesignTab data={data} template={template} setTemplate={(next) => { setTemplate(next); change(); }} updateData={updateData} onDownload={download} downloading={downloading} />}
          </>
        )}
      </IonContent>
    </IonPage>
  );
}

// ---------------------------------------------------------------- Edit tab

function EditTab({ title, setTitle, data, updateData, toast }: { title: string; setTitle: (value: string) => void; data: ResumeData; updateData: (next: (draft: ResumeData) => ResumeData) => void; toast: (message: string, color?: "success" | "danger") => void }) {
  const toggleHidden = (section: ResumeSectionKey) => updateData((draft) => ({ ...draft, hiddenSections: draft.hiddenSections.includes(section) ? draft.hiddenSections.filter((key) => key !== section) : [...draft.hiddenSections, section] }));
  const move = (section: ResumeSectionKey, offset: -1 | 1) => updateData((draft) => {
    const order = [...draft.sectionOrder];
    const from = order.indexOf(section);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= order.length) return draft;
    [order[from], order[to]] = [order[to], order[from]];
    return { ...draft, sectionOrder: order };
  });

  const [openSections, setOpenSections] = useState<string[]>(["personal"]);

  return (
    <div className="edit-tab">
      <IonList inset className="field-card">
        <IonItem><IonInput label="Resume name" labelPlacement="stacked" value={title} onIonInput={(event) => setTitle(event.detail.value ?? "")} /></IonItem>
      </IonList>
      <IonAccordionGroup multiple expand="inset" value={openSections} onIonChange={(event) => { if (event.target === event.currentTarget) setOpenSections(([] as string[]).concat(event.detail.value ?? [])); }}>
        <IonAccordion value="personal">
          <IonItem slot="header"><IonLabel>Personal details</IonLabel>{data.fullName && data.email && <IonIcon icon={checkmarkCircle} color="success" slot="end" />}</IonItem>
          <div slot="content" className="accordion-body">
            <PhotoPicker data={data} updateData={updateData} toast={toast} />
            <div className="field-grid">
              {PERSONAL_FIELDS.map((field) => (
                <div key={field.key} className={field.half ? "half" : ""}>
                  <IonInput className="boxed" label={field.label} labelPlacement="stacked" type={field.type ?? "text"} value={data[field.key]} onIonInput={(event) => updateData((draft) => ({ ...draft, [field.key]: event.detail.value ?? "" }))} />
                </div>
              ))}
            </div>
          </div>
        </IonAccordion>
        {data.sectionOrder.map((section, index) => {
          const hidden = data.hiddenSections.includes(section);
          const collection = COLLECTION_FOR_SECTION[section];
          return (
            <IonAccordion key={section} value={section}>
              <IonItem slot="header"><IonLabel className={hidden ? "section-hidden" : ""}>{SECTION_LABELS[section]}{hidden && <small> · hidden</small>}</IonLabel></IonItem>
              <div slot="content" className="accordion-body">
                <div className="section-tools">
                  <IonButton size="small" fill="clear" onClick={() => toggleHidden(section)}><IonIcon slot="start" icon={hidden ? eyeOutline : eyeOffOutline} />{hidden ? "Show on resume" : "Hide from resume"}</IonButton>
                  <span>
                    <IonButton size="small" fill="clear" disabled={index === 0} onClick={() => move(section, -1)} aria-label={`Move ${SECTION_LABELS[section]} up`}><IonIcon slot="icon-only" icon={arrowUp} /></IonButton>
                    <IonButton size="small" fill="clear" disabled={index === data.sectionOrder.length - 1} onClick={() => move(section, 1)} aria-label={`Move ${SECTION_LABELS[section]} down`}><IonIcon slot="icon-only" icon={arrowDown} /></IonButton>
                  </span>
                </div>
                {section === "summary" && <RichTextArea label="Professional summary" value={data.summary} onChange={(summary) => updateData((draft) => ({ ...draft, summary }))} placeholder="2–4 sentences about your specialty and the impact you make." />}
                {section === "interests" && <IonInput className="boxed" label="Interests (comma separated)" labelPlacement="stacked" value={data.interests.join(", ")} onIonChange={(event) => updateData((draft) => ({ ...draft, interests: (event.detail.value ?? "").split(",").map((item) => item.trim()).filter(Boolean) }))} />}
                {collection && <CollectionEditor collection={collection} items={data[collection] as unknown as CollectionItem[]} onChange={(items) => updateData((draft) => ({ ...draft, [collection]: items }))} onReorder={collection === "experiences" ? () => updateData((draft) => ({ ...draft, theme: { ...draft.theme, experienceOrderMode: "manual" } })) : undefined} />}
                {collection === "experiences" && data.theme.experienceOrderMode === "manual" && <IonButton size="small" fill="clear" onClick={() => updateData((draft) => ({ ...draft, theme: { ...draft.theme, experienceOrderMode: "auto" } }))}>Manual order · Sort by newest instead</IonButton>}
              </div>
            </IonAccordion>
          );
        })}
      </IonAccordionGroup>
    </div>
  );
}

// Experiences are shown newest-first unless the user reorders them, which switches the resume to manual order (as on the website).
function CollectionEditor({ collection, items, onChange, onReorder }: { collection: CollectionKey; items: CollectionItem[]; onChange: (items: CollectionItem[]) => void; onReorder?: () => void }) {
  const def = COLLECTIONS[collection];
  const update = (id: string, patch: Record<string, unknown>) => onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const move = (index: number, offset: -1 | 1) => { const next = [...items]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; onChange(next); onReorder?.(); };

  return (
    <div className="collection">
      {items.map((item, index) => (
        <details key={item.id} className="collection-item" open={items.length === 1 || !def.itemTitle(item).startsWith("New")}>
          <summary><strong>{def.itemTitle(item)}</strong></summary>
          <div className="field-grid">
            {def.fields.filter((field) => !(field.hiddenWhen && item[field.hiddenWhen])).map((field) => <Field key={field.key} field={field} value={item[field.key]} onChange={(value) => update(item.id, field.key === "current" && value ? { current: true, end: "" } : { [field.key]: value })} />)}
          </div>
          <div className="collection-item-actions">
            <IonButton size="small" fill="clear" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up"><IonIcon slot="icon-only" icon={arrowUp} /></IonButton>
            <IonButton size="small" fill="clear" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><IonIcon slot="icon-only" icon={arrowDown} /></IonButton>
            <IonButton size="small" fill="clear" color="danger" onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}><IonIcon slot="start" icon={trashOutline} />Remove</IonButton>
          </div>
        </details>
      ))}
      <IonButton expand="block" fill="outline" onClick={() => onChange([...items, def.create()])}><IonIcon slot="start" icon={addOutline} />{def.addLabel}</IonButton>
    </div>
  );
}

function Field({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (value: unknown) => void }) {
  const className = field.half ? "half" : "";
  if (field.kind === "rich") return <div className={className}><RichTextArea label={field.label} value={typeof value === "string" ? value : ""} onChange={onChange} placeholder={field.placeholder} /></div>;
  if (field.kind === "toggle") return <div className={className}><IonToggle checked={Boolean(value)} onIonChange={(event) => onChange(event.detail.checked)} labelPlacement="end">{field.label}</IonToggle></div>;
  if (field.kind === "select") return <div className={className}><IonSelect className="boxed" label={field.label} labelPlacement="stacked" interface="popover" value={value} onIonChange={(event) => onChange(event.detail.value)}>{field.options?.map((option) => <IonSelectOption key={option} value={option}>{option}</IonSelectOption>)}</IonSelect></div>;
  if (field.kind === "lines") {
    const lines = Array.isArray(value) ? (value as string[]) : [];
    return <div className={className}><label className="lines-field"><span>{field.label}</span><textarea rows={3} defaultValue={lines.join("\n")} onBlur={(event) => onChange(event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))} /></label></div>;
  }
  return <div className={className}><IonInput className="boxed" label={field.label} labelPlacement="stacked" placeholder={field.placeholder} value={typeof value === "string" ? value : ""} onIonInput={(event) => onChange(event.detail.value ?? "")} /></div>;
}

function PhotoPicker({ data, updateData, toast }: { data: ResumeData; updateData: (next: (draft: ResumeData) => ResumeData) => void; toast: (message: string, color?: "success" | "danger") => void }) {
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState<Photo[] | null>(null);
  const setPhoto = (photoUrl: string) => updateData((draft) => ({ ...draft, photoUrl }));

  const upload = async () => {
    setBusy(true);
    try {
      const picked = await pickHeadshot();
      if (!picked) return;
      const photo = await api.uploadPhoto(picked);
      setPhoto(photo.storageUrl);
      toast("Headshot added");
    } catch (error) {
      toast(errorMessage(error), "danger");
    } finally {
      setBusy(false);
    }
  };
  const openLibrary = async () => {
    try { setLibrary(await api.listPhotos()); } catch (error) { toast(errorMessage(error), "danger"); }
  };

  return (
    <div className="photo-picker">
      <div className="photo-circle-preview">{data.photoUrl ? <img src={absoluteAssetUrl(data.photoUrl)} alt="Headshot" /> : <IonIcon icon={imageOutline} />}</div>
      <div className="photo-actions">
        <IonButton size="small" onClick={upload} disabled={busy}>{busy ? <IonSpinner name="crescent" /> : "Upload photo"}</IonButton>
        <IonButton size="small" fill="outline" onClick={openLibrary}>Previous uploads</IonButton>
        {data.photoUrl && <IonButton size="small" fill="clear" color="danger" onClick={() => setPhoto("")}>Remove</IonButton>}
        <small>Shown on photo-friendly templates only.</small>
      </div>
      <IonModal isOpen={library !== null} onDidDismiss={() => setLibrary(null)} initialBreakpoint={0.6} breakpoints={[0, 0.6, 0.95]}>
        <IonContent className="ion-padding">
          <h2 className="sheet-title">Your uploaded photos</h2>
          {library?.length === 0 && <p>No uploads yet.</p>}
          <div className="photo-library">
            {library?.map((photo) => <button key={photo.id} onClick={() => { setPhoto(photo.storageUrl); setLibrary(null); }} aria-label={`Use ${photo.fileName}`}><img src={photo.url} alt="" /></button>)}
          </div>
        </IonContent>
      </IonModal>
    </div>
  );
}

// ---------------------------------------------------------------- Design tab

function DesignTab({ data, template, setTemplate, updateData, onDownload, downloading }: { data: ResumeData; template: ResumeTemplateId; setTemplate: (template: ResumeTemplateId) => void; updateData: (next: (draft: ResumeData) => ResumeData) => void; onDownload: (template: ResumeTemplateId) => void; downloading: ResumeTemplateId | null }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  useEffect(() => { api.templates().then(setTemplates).catch(() => setTemplates([])); }, []);
  const theme = (patch: Partial<ResumeData["theme"]>) => updateData((draft) => ({ ...draft, theme: { ...draft.theme, ...patch } }));
  const thumbnailData = useMemo(() => data, [data]);

  return (
    <div className="design-tab">
      <section className="design-group">
        <h3>Accent colour</h3>
        <div className="accent-row">
          {ACCENT_PRESETS.map((color) => <button key={color} className={data.theme.accent.toLowerCase() === color.toLowerCase() ? "selected" : ""} style={{ background: color }} onClick={() => theme({ accent: color })} aria-label={`Accent ${color}`} />)}
          <input type="color" value={data.theme.accent} onChange={(event) => theme({ accent: event.target.value })} aria-label="Custom accent colour" />
        </div>
      </section>
      <section className="design-group design-options">
        <IonSelect className="boxed" label="Typography" labelPlacement="stacked" interface="popover" value={data.theme.font} onIonChange={(event) => theme({ font: event.detail.value })}>{["modern", "serif", "classic"].map((font) => <IonSelectOption key={font} value={font}>{font[0].toUpperCase() + font.slice(1)}</IonSelectOption>)}</IonSelect>
        <IonSelect className="boxed" label="Density" labelPlacement="stacked" interface="popover" value={data.theme.scale} onIonChange={(event) => theme({ scale: event.detail.value })}>{["compact", "comfortable", "airy"].map((scale) => <IonSelectOption key={scale} value={scale}>{scale[0].toUpperCase() + scale.slice(1)}</IonSelectOption>)}</IonSelect>
        <IonSelect className="boxed" label="Photo shape" labelPlacement="stacked" interface="popover" value={data.theme.photoShape} onIonChange={(event) => theme({ photoShape: event.detail.value })}>{["circle", "rounded", "square"].map((shape) => <IonSelectOption key={shape} value={shape}>{shape[0].toUpperCase() + shape.slice(1)}</IonSelectOption>)}</IonSelect>
        <IonToggle checked={data.theme.atsMode} onIonChange={(event) => theme({ atsMode: event.detail.checked })}>Plain ATS mode</IonToggle>
      </section>
      <h3 className="design-heading">Templates</h3>
      <div className="template-grid">
        {templates.map((item) => (
          <article key={item.id} className={`template-tile ${item.id === template ? "active" : ""}`}>
            <button className="template-tile-preview" onClick={() => setTemplate(item.id)} aria-pressed={item.id === template} aria-label={`Use ${item.name}`}><ResumePreview data={thumbnailData} template={item.id} firstPageOnly /></button>
            <div className="template-tile-meta">
              <div><strong>{item.name}</strong><span>{item.ats ? "ATS-friendly" : item.category}</span></div>
              <IonButton fill="clear" size="small" onClick={() => onDownload(item.id)} disabled={!!downloading} aria-label={`Download as ${item.name}`}>{downloading === item.id ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={downloadOutline} />}</IonButton>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
