import { useEffect, useRef } from "react";

/*
 * Site-wide motion, opted into with data attributes:
 *   data-tilt="8"   3D tilt + glare that follows the pointer (max degrees)
 *   data-reveal     fades/tilts the element in when it scrolls into view
 *                   (stagger with style={{ "--reveal-delay": "120ms" }})
 * Tilt only runs for precise hover pointers; nothing animates when the
 * visitor prefers reduced motion.
 */

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export function MotionEffects() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const cleanups: Array<() => void> = [];

    if ("IntersectionObserver" in window) {
      const root = document.documentElement;
      root.classList.add("reveal-ready");
      const observer = new IntersectionObserver(
        (entries) => entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          element.classList.add("is-revealed");
          observer.unobserve(element);
          // Drop the stagger once revealed so later hover/tilt transitions start instantly.
          if (element.style.getPropertyValue("--reveal-delay")) window.setTimeout(() => element.style.removeProperty("--reveal-delay"), 1400);
        }),
        { rootMargin: "0px 0px -6% 0px", threshold: 0 },
      );
      let scheduled = 0;
      const scan = () => {
        scheduled = 0;
        document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((element) => observer.observe(element));
      };
      const scheduleScan = () => { if (!scheduled) scheduled = requestAnimationFrame(scan); };
      scan();
      const mutations = new MutationObserver(scheduleScan);
      mutations.observe(document.body, { childList: true, subtree: true });
      cleanups.push(() => { observer.disconnect(); mutations.disconnect(); cancelAnimationFrame(scheduled); root.classList.remove("reveal-ready"); });
    }

    if (hasFinePointer()) {
      let active: HTMLElement | null = null;
      let frame = 0;
      const reset = (element: HTMLElement) => {
        element.classList.remove("is-tilting");
        ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y"].forEach((name) => element.style.removeProperty(name));
      };
      const onMove = (event: PointerEvent) => {
        const target = (event.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
        if (active && active !== target) reset(active);
        active = target;
        if (!target) return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rect = target.getBoundingClientRect();
          const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
          const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
          const max = Number(target.dataset.tilt) || 8;
          target.style.setProperty("--tilt-x", `${((0.5 - y) * max * 2).toFixed(2)}deg`);
          target.style.setProperty("--tilt-y", `${((x - 0.5) * max * 2).toFixed(2)}deg`);
          target.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
          target.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
          target.classList.add("is-tilting");
        });
      };
      const onLeaveWindow = () => { cancelAnimationFrame(frame); if (active) reset(active); active = null; };
      document.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeaveWindow);
      cleanups.push(() => {
        document.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
        onLeaveWindow();
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
  return null;
}

/** Exposes the pointer position over an element as --px / --py (-1…1) for parallax scenes. */
export function usePointerParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion() || !hasFinePointer()) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--px", (((event.clientX - rect.left) / rect.width) * 2 - 1).toFixed(3));
        element.style.setProperty("--py", (((event.clientY - rect.top) / rect.height) * 2 - 1).toFixed(3));
        element.classList.add("is-parallax");
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty("--px", "0");
      element.style.setProperty("--py", "0");
      element.classList.remove("is-parallax");
    };
    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave);
    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}
