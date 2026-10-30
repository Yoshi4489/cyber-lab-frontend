import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown, parseMarkdown } from "../../src/features/briefing/markdown";

describe("challenge Markdown", () => {
  it("parses the reviewed subset", () => {
    expect(parseMarkdown("## Flaw\n\nOne\ntwo\n\n* a\n* b\n\n1. c\n\n```\nx = 1\n```")).toEqual([
      { type: "heading", text: "Flaw" },
      { type: "paragraph", text: "One two" },
      { type: "ul", items: ["a", "b"] },
      { type: "ol", items: ["c"] },
      { type: "code", text: "x = 1" },
    ]);
  });
  it("renders inline styles and escapes raw HTML", () => {
    const html = renderToStaticMarkup(<Markdown source={"**Scope:** use `id` <img src=x onerror=alert(1)>"} />);
    expect(html).toContain("<strong>Scope:</strong>");
    expect(html).toContain("<code>id</code>");
    expect(html).not.toContain("<img");
  });
});
