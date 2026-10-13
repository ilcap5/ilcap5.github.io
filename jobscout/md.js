// The small Markdown the agent writes (SAL, council reports, roadmap) as HTML. Everything is escaped first: only
// headings, paragraphs, lists, tables, bold, code and http(s) links come out as tags.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function inline(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export function mdToHtml(md, { skipTitle = false } = {}) {
  const out = [];
  let para = [], items = [], ordered = false, table = [];
  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; }
    if (items.length) {
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((i) => `<li>${inline(i)}</li>`).join("")}</${tag}>`);
      items = [];
    }
    if (table.length) {
      const [head, ...body] = table;
      out.push(`<div class="md-table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>
        <tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      table = [];
    }
  };
  for (const raw of String(md || "").split("\n")) {
    const line = raw.trimEnd(), s = line.trim();
    if (!s || s.startsWith("<!--")) { flush(); continue; }
    if (s.startsWith("|")) {
      if (para.length || items.length) flush();
      const cells = s.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) table.push(cells);
      continue;
    }
    if (table.length) flush();
    const h = s.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      if (h[1].length === 1 && skipTitle) continue;
      const level = Math.min(4, h[1].length + 1);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const b = s.match(/^(?:[-*]|(\d+)\.)\s+(.*)$/);
    if (b && (/^[-*\d]/.test(raw) || items.length)) {
      if (para.length) flush();
      if (items.length && ordered !== Boolean(b[1]) && !raw.startsWith(" ")) flush();
      if (!items.length) ordered = Boolean(b[1]);
      items.push(b[2]);
      continue;
    }
    if (items.length && raw.startsWith(" ")) { items[items.length - 1] += " " + s; continue; }
    if (items.length) flush();
    para.push(s);
  }
  flush();
  return out.join("");
}
