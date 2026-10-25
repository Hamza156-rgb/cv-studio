import { IonContent, IonModal, IonPage } from "@ionic/react";
import { RESUME_TEMPLATES, sampleResumeData, type ResumeTemplateId } from "@shared/resume";
import { ArrowRight, Camera, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { NewResumeSheet } from "../components/NewResumeSheet";
import { ResumePreview } from "../components/ResumePreview";
import { Tilt } from "../components/Tilt";

type Template = (typeof RESUME_TEMPLATES)[number];
const FILTERS = ["All", "ATS-friendly", "Photo", ...Array.from(new Set(RESUME_TEMPLATES.map((item) => item.category))).filter((category) => category !== "ATS-friendly")];

/** Browse all templates with sample content, then start a resume from one. */
export default function TemplatesPage() {
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Template | null>(null);
  const [startWith, setStartWith] = useState<ResumeTemplateId | null>(null);
  const samples = useMemo(() => Object.fromEntries(RESUME_TEMPLATES.map((item) => [item.id, sampleResumeData(item.id)])), []);
  const items = RESUME_TEMPLATES.filter((item) => filter === "All" || (filter === "ATS-friendly" ? item.ats : filter === "Photo" ? item.supportsPhoto : item.category === filter));

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="page-pad">
          <p className="eyebrow">Template library</p>
          <h1 className="display">Find the layout that <em>fits you.</em></h1>
          <p className="lede gallery-lede">{RESUME_TEMPLATES.length} professional templates. Switch any time — your content stays intact.</p>
          <div className="scroll-row filters">{FILTERS.map((name) => <button key={name} className={`chip ${filter === name ? "active" : ""}`} onClick={() => setFilter(name)}>{name}</button>)}</div>
          <div className="gallery">
            {items.map((item) => (
              <button key={item.id} className="gallery-card" onClick={() => setSelected(item)}>
                <Tilt max={12} className="gallery-tilt"><div className="gallery-art"><div className="paper"><ResumePreview data={samples[item.id]} template={item.id} firstPageOnly lazy /></div></div></Tilt>
                <div className="gallery-meta">
                  <strong>{item.name}</strong>
                  <span>{item.ats ? <><ShieldCheck size={12} />ATS-friendly</> : item.supportsPhoto ? <><Camera size={12} />Photo-ready</> : (item as Template).category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <IonModal isOpen={!!selected} onDidDismiss={() => setSelected(null)} className="sheet scroll-sheet" initialBreakpoint={0.92} breakpoints={[0, 0.92]}>
          {selected && (
            <IonContent><div className="sheet-body template-detail">
              <p className="eyebrow">{selected.category}</p>
              <h2 className="title">{selected.name}</h2>
              <p className="lede">{selected.description}</p>
              <div className="detail-tags">
                {selected.ats && <span className="pill"><ShieldCheck size={12} />ATS-friendly</span>}
                {selected.supportsPhoto && <span className="pill rust"><Camera size={12} />Photo-ready</span>}
              </div>
              <Tilt max={9} className="detail-tilt"><div className="detail-art"><div className="paper"><ResumePreview data={samples[selected.id]} template={selected.id} firstPageOnly /></div></div></Tilt>
              <div className="sticky-cta"><button className="btn btn-primary btn-block" onClick={() => { setStartWith(selected.id); setSelected(null); }}>Use this template<ArrowRight size={18} /></button></div>
            </div></IonContent>
          )}
        </IonModal>
        <NewResumeSheet key={startWith ?? "none"} isOpen={!!startWith} initialTemplate={startWith ?? undefined} onClose={() => setStartWith(null)} />
      </IonContent>
    </IonPage>
  );
}
