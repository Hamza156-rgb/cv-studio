import { toggleInlineMarker } from "@web/lib/richText";
import { Bold, Heading2, Italic, List } from "lucide-react";
import { useRef } from "react";

/**
 * Plain textarea with the website editor's formatting actions. Text is stored as the same
 * light markdown (**bold**, *italic*, "- " bullets) the resume templates render.
 */
export function RichTextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const replaceSelection = (transform: (selected: string, start: number, end: number) => { from: number; to: number; text: string }) => {
    const editor = ref.current;
    if (!editor) return;
    const { from, to, text } = transform(value.slice(editor.selectionStart, editor.selectionEnd), editor.selectionStart, editor.selectionEnd);
    onChange(value.slice(0, from) + text + value.slice(to));
    requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(from, from + text.length); });
  };

  const inline = (marker: "**" | "*") => replaceSelection((selected, start, end) => ({ from: start, to: end, text: selected.trim() ? toggleInlineMarker(selected, marker) : `${marker}${marker === "**" ? "bold text" : "italic text"}${marker}` }));
  const lineAction = (kind: "heading" | "bullet") => replaceSelection((_selected, start, end) => {
    const from = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", Math.max(end - (end > start && value[end - 1] === "\n" ? 1 : 0), from));
    const to = lineEnd === -1 ? value.length : lineEnd;
    const lines = value.slice(from, to).split("\n");
    if (kind === "heading") {
      const plain = lines.map((line) => line.replace(/^\s*(?:[-•]|\d+[.)])\s+/, "")).join("\n");
      return { from, to, text: plain.trim() ? toggleInlineMarker(plain, "**") : "**Project title**" };
    }
    const allBullets = lines.every((line) => !line.trim() || /^\s*-\s+/.test(line));
    return { from, to, text: lines.map((line) => (!line.trim() ? line : allBullets ? line.replace(/^\s*-\s+/, "") : `- ${line.replace(/^\s*(?:[-•]|\d+[.)])\s+/, "")}`)).join("\n") };
  });

  const tool = (labelText: string, icon: React.ReactNode, action: () => void) => (
    <button type="button" className="rich-tool" aria-label={labelText} title={labelText} onMouseDown={(event) => event.preventDefault()} onClick={action}>{icon}</button>
  );

  return (
    <div className="rich-field">
      <div className="rich-field-head">
        <span>{label}</span>
        <div className="rich-tools" role="toolbar" aria-label={`${label} formatting`}>
          {tool("Bold", <Bold size={16} strokeWidth={2.4} />, () => inline("**"))}
          {tool("Italic", <Italic size={16} />, () => inline("*"))}
          {tool("Sub-heading", <Heading2 size={17} />, () => lineAction("heading"))}
          {tool("Bulleted list", <List size={17} />, () => lineAction("bullet"))}
        </div>
      </div>
      <textarea ref={ref} value={value} placeholder={placeholder} rows={5} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
