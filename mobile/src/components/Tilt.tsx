import { useEffect, useRef, type ReactNode } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 3D "touch" tilt: the element leans toward the finger (or mouse) with a soft light glare,
 * then springs back on release. It only changes CSS custom properties, so React never
 * re-renders while you drag. Disabled when the user prefers reduced motion.
 */
export function Tilt({ children, max = 10, className = "", glare = true }: { children: ReactNode; max?: number; className?: string; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion()) return;
    let frame = 0;

    const apply = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
        element.style.setProperty("--ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
        element.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
        element.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
        element.classList.add("tilting");
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      element.classList.remove("tilting");
      element.style.setProperty("--rx", "0deg");
      element.style.setProperty("--ry", "0deg");
    };
    const onPointerDown = (event: PointerEvent) => apply(event.clientX, event.clientY);
    const onPointerMove = (event: PointerEvent) => { if (event.pointerType === "mouse" || event.buttons) apply(event.clientX, event.clientY); };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", reset);
    element.addEventListener("pointerleave", reset);
    element.addEventListener("pointercancel", reset);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", reset);
      element.removeEventListener("pointerleave", reset);
      element.removeEventListener("pointercancel", reset);
    };
  }, [max]);

  return (
    <div ref={ref} className={`tilt ${className}`}>
      <div className="tilt-inner">
        {children}
        {glare && <span className="tilt-glare" aria-hidden="true" />}
      </div>
    </div>
  );
}
