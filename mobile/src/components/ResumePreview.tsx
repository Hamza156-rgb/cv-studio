import { ResumeDocument } from "@web/components/resume/ResumeDocument";
import type { ResumeData, ResumeTemplateId } from "@shared/resume";
import { useEffect, useMemo, useRef, useState } from "react";
import { absoluteAssetUrl } from "../api/client";

const A4_WIDTH_PX = 793.7; // 210mm at 96 dpi
const A4_HEIGHT_PX = 1122.5; // 297mm

/**
 * The website's own ResumeDocument, scaled to fit the screen width. `firstPageOnly` crops it
 * to one A4 page for thumbnails.
 */
export function ResumePreview({ data, template, firstPageOnly = false }: { data: ResumeData; template: ResumeTemplateId; firstPageOnly?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [height, setHeight] = useState(A4_HEIGHT_PX);
  const previewData = useMemo(() => ({ ...data, photoUrl: absoluteAssetUrl(data.photoUrl) }), [data]);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setScale(element.clientWidth / A4_WIDTH_PX);
      if (inner.current) setHeight(inner.current.scrollHeight);
    });
    observer.observe(element);
    if (inner.current) observer.observe(inner.current);
    return () => observer.disconnect();
  }, []);

  const visibleHeight = (firstPageOnly ? A4_HEIGHT_PX : Math.max(height, A4_HEIGHT_PX)) * scale;
  return (
    <div ref={frame} className="resume-preview-frame" style={{ height: visibleHeight }}>
      <div ref={inner} className="resume-preview-inner" style={{ transform: `scale(${scale})` }}>
        <ResumeDocument data={previewData} template={template} />
      </div>
    </div>
  );
}
