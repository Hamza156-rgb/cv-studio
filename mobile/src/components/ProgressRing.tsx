/** Circular completion indicator (percentage 0–100). */
export function ProgressRing({ value, size = 44, stroke = 4, light = false }: { value: number; size?: number; stroke?: number; light?: boolean }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className={`progress-ring ${light ? "light" : ""}`} style={{ width: size, height: size }} role="img" aria-label={`${value}% complete`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="ring-track" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="ring-value" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span>{value}<small>%</small></span>
    </span>
  );
}
