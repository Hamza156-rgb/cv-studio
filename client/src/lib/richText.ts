const LINE_PREFIX = /^(\s*(?:[-•]\s+|\d+[.)]\s+)?)/;

/**
 * Wraps each selected line in an inline marker ("**" bold, "*" italic). Whitespace, line
 * breaks and list markers stay outside the marker, because the preview only recognises
 * markers that open and close on the same line. Already-wrapped lines are unwrapped.
 */
export function toggleInlineMarker(selected: string, marker: "**" | "*") {
  const lines = selected.split("\n");
  const cores = lines.map((line) => {
    const prefix = line.match(LINE_PREFIX)?.[1] ?? "";
    const rest = line.slice(prefix.length);
    const core = rest.trim();
    const leading = rest.slice(0, rest.length - rest.trimStart().length);
    return { prefix: prefix + leading, core, suffix: rest.slice(leading.length + core.length) };
  });
  const isWrapped = (core: string) => core.length > marker.length * 2 && core.startsWith(marker) && core.endsWith(marker) && (marker === "**" || !core.startsWith("**"));
  const filled = cores.filter((line) => line.core);
  const unwrap = filled.length > 0 && filled.every((line) => isWrapped(line.core));
  return cores.map(({ prefix, core, suffix }) => {
    if (!core) return prefix + suffix;
    return prefix + (unwrap ? core.slice(marker.length, -marker.length) : `${marker}${core}${marker}`) + suffix;
  }).join("\n");
}
