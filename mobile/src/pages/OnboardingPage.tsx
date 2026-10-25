import { IonContent, IonPage, useIonRouter } from "@ionic/react";
import { sampleResumeData, type ResumeTemplateId } from "@shared/resume";
import { ArrowRight, Cloud, FileDown, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ResumePreview } from "../components/ResumePreview";
import { Tilt } from "../components/Tilt";
import { markOnboarded } from "../lib/onboarding";

const SLIDES = [
  { eyebrow: "CV Studio", title: <>A resume that <em>lets your work lead.</em></>, text: "Write it once, polish it anywhere, and send a PDF that looks exactly as designed." },
  { eyebrow: "18 templates", title: <>Professional layouts, <em>one tap</em> apart.</>, text: "ATS-friendly classics, two-column designs and photo-ready layouts — switch any time, your content stays put." },
  { eyebrow: "Always in sync", title: <>Edit on your phone. <em>Finish</em> on the web.</>, text: "Your resumes, photos and templates sync with the CV Studio website on every device." },
];

export default function OnboardingPage() {
  const router = useIonRouter();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const samples = useMemo(() => (["editorial", "harvard", "modern"] as ResumeTemplateId[]).map((template) => ({ template, data: sampleResumeData(template) })), []);
  const gallery = useMemo(() => (["meridian", "summit", "chronicle", "portrait", "precision", "executive"] as ResumeTemplateId[]).map((template) => ({ template, data: sampleResumeData(template) })), []);

  const go = (next: number) => track.current?.scrollTo({ left: next * track.current.clientWidth, behavior: "smooth" });
  const finish = async (path: "/signup" | "/login") => { await markOnboarded(); router.push(path, "forward", "replace"); };
  const last = index === SLIDES.length - 1;

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="onboarding">
        <div className="onboarding-top">
          <div className="brand-row light"><span className="brand-mark light">cv</span><strong>CV Studio</strong></div>
          {!last && <button className="link-light" onClick={() => go(SLIDES.length - 1)}>Skip</button>}
        </div>

        <div className="onboarding-track" ref={track} onScroll={(event) => setIndex(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}>
          {/* Slide 1: a fan of real templates */}
          <section className="onboarding-slide">
            <Tilt max={9} glare={false} className="art-tilt"><div className="art art-fan">
              {samples.map((sample, position) => <div key={sample.template} className={`fan-card fan-${position}`}><div className="paper"><ResumePreview data={sample.data} template={sample.template} firstPageOnly /></div></div>)}
              <span className="float-badge badge-a"><Sparkles size={14} />Recruiter-ready</span>
            </div></Tilt>
          </section>
          {/* Slide 2: template wall */}
          <section className="onboarding-slide">
            <Tilt max={9} glare={false} className="art-tilt"><div className="art art-wall">
              {gallery.map((sample) => <div key={sample.template} className="wall-card paper"><ResumePreview data={sample.data} template={sample.template} firstPageOnly /></div>)}
            </div></Tilt>
          </section>
          {/* Slide 3: sync + PDF */}
          <section className="onboarding-slide">
            <Tilt max={9} glare={false} className="art-tilt"><div className="art art-sync">
              <div className="sync-card paper"><ResumePreview data={samples[0].data} template="meridian" firstPageOnly /></div>
              <span className="float-badge badge-b"><Cloud size={14} />Synced with the website</span>
              <span className="float-badge badge-c"><FileDown size={14} />PDF ready</span>
            </div></Tilt>
          </section>
        </div>

        <div className="onboarding-copy">
          <p className="eyebrow eyebrow-light">{SLIDES[index].eyebrow}</p>
          <h1 className="onboarding-title">{SLIDES[index].title}</h1>
          <p className="onboarding-text">{SLIDES[index].text}</p>
          <div className="dots" role="tablist" aria-label="Onboarding progress">
            {SLIDES.map((_, dot) => <button key={dot} className={dot === index ? "active" : ""} onClick={() => go(dot)} aria-label={`Slide ${dot + 1}`} aria-selected={dot === index} role="tab" />)}
          </div>
          <button className="btn btn-light btn-block" onClick={() => (last ? finish("/signup") : go(index + 1))}>
            {last ? "Create your free account" : "Continue"}<ArrowRight size={18} />
          </button>
          <button className="btn btn-ghost-light btn-block" onClick={() => finish("/login")}>I already have an account</button>
        </div>
      </IonContent>
    </IonPage>
  );
}
