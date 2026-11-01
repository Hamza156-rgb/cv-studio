/** Penvita mark (pen nib on a teal tile). The SVG lives in public/brand and also feeds the app icons. */
export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <img className={`logo ${className}`} src="/brand/penvita-icon.svg" alt="Penvita" width={size} height={size} draggable={false} />;
}
