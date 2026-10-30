import type { ReactNode } from "react";

type Block = { type: "heading" | "paragraph" | "code"; text: string } | { type: "ul" | "ol"; items: string[] };
const LIST_ITEM = /^(\* |- |\d+\. )/;

/** Parses the small Markdown subset reviewed challenge content uses. Output is React text, never raw HTML. */
export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line.trim()) continue;
    if (line.startsWith("```")) {
      const code: string[] = [];
      for (index += 1; index < lines.length && !lines[index]?.startsWith("```"); index += 1) code.push(lines[index] ?? "");
      blocks.push({ type: "code", text: code.join("\n") });
    } else if (line.startsWith("#")) {
      blocks.push({ type: "heading", text: line.replace(/^#+\s*/, "") });
    } else if (LIST_ITEM.test(line)) {
      const items: string[] = [];
      for (; index < lines.length && LIST_ITEM.test(lines[index] ?? ""); index += 1) items.push((lines[index] ?? "").replace(LIST_ITEM, ""));
      index -= 1;
      blocks.push({ type: /^\d/.test(line) ? "ol" : "ul", items });
    } else {
      const text = [line];
      while (index + 1 < lines.length && (lines[index + 1] ?? "").trim() && !/^(```|#|\* |- |\d+\. )/.test(lines[index + 1] ?? "")) {
        index += 1;
        text.push(lines[index] ?? "");
      }
      blocks.push({ type: "paragraph", text: text.join(" ") });
    }
  }
  return blocks;
}

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).filter(Boolean).map((part, index) =>
    part.startsWith("`") ? <code key={index}>{part.slice(1, -1)}</code>
    : part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong>
    : part);
}

export function Markdown({ source }: { source: string }) {
  return <>{parseMarkdown(source).map((block, index) => {
    if (block.type === "heading") return <h3 key={index}>{inline(block.text)}</h3>;
    if (block.type === "code") return <pre key={index}><code>{block.text}</code></pre>;
    if (block.type === "paragraph") return <p key={index}>{inline(block.text)}</p>;
    if (!("items" in block)) return null;
    const items = block.items.map((item, position) => <li key={position}>{inline(item)}</li>);
    return block.type === "ul" ? <ul key={index}>{items}</ul> : <ol key={index}>{items}</ol>;
  })}</>;
}
