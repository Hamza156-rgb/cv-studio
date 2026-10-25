import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders `children` only once the placeholder scrolls near the viewport. Resume thumbnails
 * are full documents, so a long list stays fast by drawing only the cards the user can see.
 */
export function LazyVisible({ children, className = "", rootMargin = "400px" }: { children: ReactNode; className?: string; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const element = ref.current;
    if (visible || !element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return <div ref={ref} className={className}>{visible ? children : <div className="lazy-placeholder" aria-hidden="true" />}</div>;
}
