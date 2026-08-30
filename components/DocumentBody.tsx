// Draws the text of a stored document.
//
// The bodies live in the database as plain text with a very small amount of
// markup, so that an owner can edit a policy later in a textarea without
// needing to know HTML, and so that nothing we store can inject markup into
// the page. Four things are understood and nothing else:
//
//   ## Heading
//   - bullet
//   **bold**
//   *italic*
//
// Everything else is a paragraph.

type Piece = { t: string; b?: boolean; i?: boolean };

function inline(text: string): Piece[] {
  const out: Piece[] = [];
  // Bold first, then italics inside whatever is left, so **a *b* c** works.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      out.push({ t: part.slice(2, -2), b: true });
      continue;
    }
    const sub = part.split(/(\*[^*]+\*)/g);
    for (const s of sub) {
      if (!s) continue;
      if (s.startsWith("*") && s.endsWith("*") && s.length > 2) {
        out.push({ t: s.slice(1, -1), i: true });
      } else {
        out.push({ t: s });
      }
    }
  }
  return out;
}

function Line({ text }: { text: string }) {
  return (
    <>
      {inline(text).map((p, i) => {
        if (p.b) return <strong key={i} className="font-semibold text-slate-900">{p.t}</strong>;
        if (p.i) return <em key={i}>{p.t}</em>;
        return <span key={i}>{p.t}</span>;
      })}
    </>
  );
}

export default function DocumentBody({ body }: { body: string }) {
  // Blank lines separate blocks. Inside a block, single newlines are just the
  // way the text was wrapped when it was written and mean nothing.
  const blocks = body.replace(/\r\n/g, "\n").split(/\n\s*\n/);

  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-slate-700">
      {blocks.map((raw, bi) => {
        const block = raw.trim();
        if (!block) return null;

        if (block.startsWith("## ")) {
          return (
            <h2 key={bi} className="pt-3 text-base font-bold text-slate-900">
              {block.slice(3).trim()}
            </h2>
          );
        }

        const lines = block.split("\n").map((l) => l.trim());
        if (lines.every((l) => l.startsWith("- ") || l.startsWith("  "))) {
          // Continuation lines (indented) belong to the bullet above them.
          const items: string[] = [];
          for (const l of lines) {
            if (l.startsWith("- ")) items.push(l.slice(2));
            else if (items.length) items[items.length - 1] += " " + l.trim();
          }
          return (
            <ul key={bi} className="space-y-1.5 pl-1">
              {items.map((it, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="mt-[2px] flex-none text-slate-400">
                    &bull;
                  </span>
                  <span className="min-w-0">
                    <Line text={it} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={bi}>
            <Line text={lines.join(" ")} />
          </p>
        );
      })}
    </div>
  );
}
