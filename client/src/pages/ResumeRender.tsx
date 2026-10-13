import { ResumeDocument } from "@/components/resume/ResumeDocument";
import { normalizeResumeData, RESUME_TEMPLATES, type ResumeTemplateId } from "@shared/resume";
import { useEffect } from "react";

type RenderWindow = Window & { __CV_RENDER__?: { data: unknown; template: string }; __CV_READY__?: boolean };

/** Bare page the server's headless Chrome prints to PDF; it renders exactly what the live preview shows. */
export default function ResumeRender() {
  const payload = (window as RenderWindow).__CV_RENDER__;
  const template = (RESUME_TEMPLATES.some((item) => item.id === payload?.template) ? payload!.template : "modern") as ResumeTemplateId;
  const data = normalizeResumeData(payload?.data ?? {}, template);

  useEffect(() => {
    document.documentElement.classList.add("pdf-render");
    const images = Array.from(document.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.onload = image.onerror = () => resolve(); }));
    Promise.all([document.fonts.ready, ...images]).then(() => { (window as RenderWindow).__CV_READY__ = true; });
  }, []);

  if (!payload) return <p style={{ padding: 24 }}>Nothing to render.</p>;
  return <ResumeDocument data={data} template={template} />;
}
