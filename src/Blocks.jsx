/* The playbook's text blocks: paragraphs, headings, lists and tables, with
   **bold** and `code` inside. */
const INLINE = /(\*\*[^*]+?\*\*|`[^`]+`)/g;

export function Inline({ x }) {
  if (!x) return null;
  return String(x).split(INLINE).map((s, i) => {
    if (s.startsWith("**") && s.endsWith("**") && s.length > 4) return <b key={i}>{s.slice(2, -2)}</b>;
    if (s.startsWith("`") && s.endsWith("`") && s.length > 2) return <code key={i}>{s.slice(1, -1)}</code>;
    return s;
  });
}

function Block({ b }) {
  if (b.t === "p") return <p><Inline x={b.x} /></p>;
  if (b.t === "h") return b.l <= 1 ? <h3><Inline x={b.x} /></h3> : <h4><Inline x={b.x} /></h4>;
  if (b.t === "hr") return <hr />;
  if (b.t === "ul" || b.t === "ol") {
    const Tag = b.t;
    return <Tag>{b.items.map((it, i) => <li key={i}><Inline x={it.x} />{it.items && <Blocks blocks={[{ t: "ul", items: it.items }]} />}</li>)}</Tag>;
  }
  if (b.t === "table") {
    const [head, ...rows] = b.rows;
    return (
      <div className="tablewrap">
        <table>
          <thead><tr>{head.map((c, i) => <th key={i}><Inline x={c} /></th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Inline x={c} /></td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  return null;
}

export default function Blocks({ blocks }) {
  if (!blocks) return null;
  return <div className="blocks">{blocks.map((b, i) => <Block key={i} b={b} />)}</div>;
}
