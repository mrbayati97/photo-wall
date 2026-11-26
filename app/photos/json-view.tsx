import type { ReactNode } from "react";

// Strings (optionally followed by ":" when they are keys), literals, numbers, and punctuation.
const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g;

function colour(line: string, prefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of line.matchAll(TOKEN)) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const [whole, str, colon, literal, num, punct] = m;
    const k = `${prefix}-${i++}`;
    if (str && colon) {
      out.push(<span key={k} className="j-key">{str}</span>, <span key={`${k}c`} className="j-punct">{colon}</span>);
    } else if (str) {
      const inner = JSON.parse(str) as string;
      out.push(
        /^https?:\/\//.test(inner) ? (
          <a key={k} className="j-str j-url" href={inner} target="_blank" rel="noopener">{str}</a>
        ) : (
          <span key={k} className="j-str">{str}</span>
        ),
      );
    } else if (literal) {
      out.push(<span key={k} className={literal === "null" ? "j-null" : "j-bool"}>{literal}</span>);
    } else if (num) {
      out.push(<span key={k} className="j-num">{num}</span>);
    } else if (punct) {
      out.push(<span key={k} className="j-punct">{punct}</span>);
    } else {
      out.push(whole);
    }
    last = m.index + whole.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/**
 * Pretty-printed JSON with colour-coded keys, strings, numbers and nulls; http(s) URLs become links.
 * Each line is its own block indented by its depth, so long values wrap under their own field
 * instead of back at the left edge. Copying the text still gives valid JSON.
 */
export default function JsonView({ value }: { value: unknown }) {
  const lines = JSON.stringify(value, null, 2).split("\n");
  return (
    <pre className="json-pre">
      {lines.map((line, n) => {
        const body = line.trimStart();
        const depth = (line.length - body.length) / 2;
        return (
          <span key={n} className="j-line" style={{ ["--d" as string]: depth }}>
            {"  ".repeat(depth)}
            {colour(body, String(n))}
            {"\n"}
          </span>
        );
      })}
    </pre>
  );
}
