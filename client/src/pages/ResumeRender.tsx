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
    paintPageBackground();
    const images = Array.from(document.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.onload = image.onerror = () => resolve(); }));
    Promise.all([document.fonts.ready, ...images]).then(() => { (window as RenderWindow).__CV_READY__ = true; });
  }, []);

  if (!payload) return <p style={{ padding: 24 }}>Nothing to render.</p>;
  return <ResumeDocument data={data} template={template} />;
}

/**
 * In Chrome's PDF output only the @page box reaches the page margins and the space below the
 * last line, so a template's page tint and its side stripes (left accent bars, Meridian's side
 * panel) are painted there instead of on the document.
 */
function paintPageBackground() {
  const doc = document.querySelector<HTMLElement>(".resume-document");
  if (!doc) return;
  const style = getComputedStyle(doc);
  const tint = style.backgroundColor === "rgba(0, 0, 0, 0)" ? "#fff" : style.backgroundColor;
  const stripes = (["left", "right"] as const).flatMap((side) => {
    const width = style.getPropertyValue(`border-${side}-width`);
    if (!(parseFloat(width) > 0) || style.getPropertyValue(`border-${side}-style`) === "none") return [];
    const color = style.getPropertyValue(`border-${side}-color`);
    doc.style.setProperty(`border-${side}-color`, "transparent");
    // Chrome ignores gradients on @page, but paints a repeated image across the full page height.
    return [{ side, width, image: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="${color}"/></svg>`)}")` }];
  });
  const images = stripes.length ? `background-image: ${stripes.map((item) => item.image).join(", ")}; background-repeat: repeat-y; background-position: ${stripes.map((item) => `${item.side} top`).join(", ")}; background-size: ${stripes.map((item) => `${item.width} 10px`).join(", ")};` : "";
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page cv-export { background-color: ${tint}; ${images} }`;
  document.head.appendChild(pageStyle);
  // !important: the print stylesheet forces white html/body backgrounds for the browser Print button.
  document.documentElement.style.setProperty("background", "transparent", "important");
  document.body.style.setProperty("background", "transparent", "important");
  doc.style.backgroundColor = "transparent";
}
