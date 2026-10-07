/* Question text from the banks. Guidely is shown as stored; the other banks
   carry **bold**, __underline__, [img:path] and "| a | b |" table rows. */
const MARK = /(\[img:[^\]\n]+\]|\*\*[\s\S]+?\*\*|__[\s\S]+?__)/g;
const ROWLINE = /^\|.*\|$/;

function parts(s, bank, key = "") {
  return s.split(MARK).map((part, i) => {
    if (!part) return null;
    const k = key + i;
    if (part.startsWith("[img:")) return <img key={k} className="inl" src={"/data/" + bank + "/" + part.slice(5, -1)} alt="" loading="lazy" />;
    for (const [m, Tag] of [["**", "b"], ["__", "u"]])
      if (part.length >= 4 && part.startsWith(m) && part.endsWith(m)) return <Tag key={k}>{parts(part.slice(2, -2), bank, k + ".")}</Tag>;
    return part;
  });
}

export default function Rich({ text, bank }) {
  if (!text) return null;
  const s = String(text);
  if (bank === "guidely" || !/\[img:|\*\*|__|^\|.*\|$/m.test(s)) return s;
  const out = [];
  let buf = [], rows = [];
  const flushText = () => { if (buf.length) out.push(<span key={"t" + out.length}>{parts(buf.join("\n"), bank, "t" + out.length)}</span>); buf = []; };
  const flushRows = () => {
    if (rows.length >= 2) {
      const cells = rows.map((r) => r.slice(1, -1).split(" | ").map((c) => c.trim()));
      out.push(
        <div className="tablewrap" key={"g" + out.length}><table>
          <thead><tr>{cells[0].map((c, i) => <th key={i}>{parts(c, bank)}</th>)}</tr></thead>
          <tbody>{cells.slice(1).map((r, ri) => <tr key={ri}>{r.map((c, i) => <td key={i}>{parts(c, bank)}</td>)}</tr>)}</tbody>
        </table></div>
      );
    } else buf.push(...rows);
    rows = [];
  };
  for (const line of s.split("\n")) {
    if (ROWLINE.test(line.trim())) { flushText(); rows.push(line.trim()); }
    else { flushRows(); buf.push(line); }
  }
  flushRows();
  flushText();
  return out;
}
