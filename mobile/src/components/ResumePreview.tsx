import { ResumeDocument } from "@web/components/resume/ResumeDocument";
import type { ResumeData, ResumeTemplateId } from "@shared/resume";
import { useEffect, useMemo, useRef, useState } from "react";
import { absoluteAssetUrl } from "../api/client";

// Page sizes in CSS px (96 dpi): A4 210 × 297 mm, US Letter 8.5 × 11 in.
const PAGE = { a4: { width: 793.7, height: 1122.5 }, letter: { width: 816, height: 1056 } } as const;

/**
 * The website's own ResumeDocument, scaled to fit the screen width. `firstPageOnly` crops it
 * to one A4 page for thumbnails.
 */
export function ResumePreview({ data, template, firstPageOnly = false, lazy = false }: { data: ResumeData; template: ResumeTemplateId; firstPageOnly?: boolean; lazy?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const page = PAGE[data.theme?.pageSize === "letter" ? "letter" : "a4"];
  const [height, setHeight] = useState<number>(page.height);
  const previewData = useMemo(() => ({ ...data, photoUrl: absoluteAssetUrl(data.photoUrl) }), [data]);
  // In long lists, only draw the document once the card scrolls near the screen.
  const [visible, setVisible] = useState(!lazy || typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const element = frame.current;
    if (visible || !element) return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: "300px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setScale(element.clientWidth / page.width);
      if (inner.current) setHeight(inner.current.scrollHeight);
    });
    observer.observe(element);
    if (inner.current) observer.observe(inner.current);
    return () => observer.disconnect();
  }, [visible, page.width]);

  const visibleHeight = (firstPageOnly ? page.height : Math.max(height, page.height)) * scale;
  return (
    <div ref={frame} className="resume-preview-frame" style={{ height: visibleHeight }}>
      {visible ? (
        <div ref={inner} className="resume-preview-inner" style={{ transform: `scale(${scale})`, width: page.width }}>
          <ResumeDocument data={previewData} template={template} />
        </div>
      ) : <div className="preview-placeholder" aria-hidden="true" />}
    </div>
  );
}
