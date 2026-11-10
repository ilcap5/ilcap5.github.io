// "Progetto" view, only for the owner of the agent (admin): the agent copies SAL, council reports, roadmap and the
// last runs into the "Progetto" tab of the sheet (jobagent/project.py). No tab, no view.
// Each document also comes already broken into pieces (column "Dati"): the view draws them as boxes, chips and tables to
// be read at a glance (scelta del 28/10). Without "Dati" (older sheet) it falls back to the Markdown text.

import { mdToHtml } from "./md.js?v=202611101623";
import { parseDate, shortDate } from "./schema.js?v=202611101623";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const json = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

export const PROJECT_TABS = [
  { key: "overview", label: "Panoramica" },
  { key: "sal", label: "SAL" },
  { key: "consiglio", label: "Consiglio" },
  { key: "roadmap", label: "Roadmap" },
];

// Rows of the tab (header first) -> { docs, roadmap, runs }
export function parseProject(values) {
  if (!values || values.length < 2) return null;
  const head = values[0].map((h) => String(h).trim());
  const col = (name) => head.indexOf(name);
  const get = (r, name) => (col(name) >= 0 ? r[col(name)] || "" : "");
  const docs = [];
  let roadmap = null, runs = [], budget = null;
  for (const r of values.slice(1)) {
    const item = { id: get(r, "ID"), type: get(r, "Tipo"), date: get(r, "Data"), title: get(r, "Titolo"),
      summary: get(r, "Sintesi"), content: get(r, "Contenuto"), link: get(r, "Link"), data: json(get(r, "Dati"), null) };
    if (!item.id) continue;
    if (item.type === "roadmap") roadmap = { ...item, plan: json(item.summary, {}) };
    else if (item.type === "giri") runs = json(item.content, []);
    else if (item.type === "budget") budget = json(item.summary, null);
    else docs.push(item);
  }
  docs.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { docs, roadmap, runs, budget };
}

// ---------------------------------------------------------------- icons and tones
// Same stroke and size as the other icons of the dashboard. Colour always comes with a word: never colour alone.
const PATHS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M7 7l10 10M17 7 7 17"/>',
  play: '<path d="M8.5 6v12l9.5-6z"/>',
  pause: '<path d="M9.5 6.5v11M14.5 6.5v11"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  circle: '<circle cx="12" cy="12" r="7.5"/>',
  alert: '<path d="M12 4 3 19h18z"/><path d="M12 10v4M12 16.5v.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  flag: '<path d="M6 21V4M6 4h11l-2.5 4 2.5 4H6"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.5 3.9-5.3 7-5.3s5.8 1.8 7 5.3"/>',
  code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
  gauge: '<path d="M4.5 16a8 8 0 1 1 15 0"/><path d="M12 15l3.5-4.5"/>',
  star: '<path d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 20 20"/>',
  ban: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
  scale: '<path d="M12 4v16M8 20h8M5 7h14"/><path d="M7 7l-3 6.5h6zM17 7l-3 6.5h6z"/>',
  file: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5"/>',
};
const ic = (name, size = 16) => `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ""}</svg>`;
const tag = (tone, icon, label, extra = "") => `<span class="pj-tag tone-${tone}${extra}">${icon ? ic(icon, 13) : ""}${esc(label)}</span>`;

const VERDICT = { ok: ["green", "check", "Tutto ok"], attenzione: ["amber", "alert", "Attenzione"], problemi: ["red", "x", "Problemi"] };
const LEVEL = { alto: ["red", "alert", "Alto"], medio: ["amber", "alert", "Medio"], basso: ["grey", "circle", "Basso"] };
const STATUS = { "Fatto": ["green", "check"], "In corso": ["brand", "play"], "In attesa": ["amber", "pause"], "Da fare": ["grey", "circle"] };
const JUDGE = [["Geniale", "deep", "star"], ["Da fare", "green", "check"], ["Da approfondire", "amber", "search"],
  ["Rischioso", "red", "alert"], ["Da scartare", "grey", "ban"]];
const OWNER = { Federico: ["user", "Federico"], Claude: ["code", "Claude"], Agente: ["gauge", "Agente"] };
const RUN_LABEL = { success: "Riuscito", failure: "Non riuscito", cancelled: "Annullato", skipped: "Saltato" };

const verdictTag = (v) => { const [t, i, l] = VERDICT[v] || ["grey", "file", v || "SAL"]; return tag(t, i, l); };
const judgeOf = (v) => JUDGE.find(([k]) => String(v).toLowerCase().startsWith(k.toLowerCase())) || [v || "-", "grey", "circle"];
const ownerTag = (o) => { if (!o) return ""; const [i, l] = OWNER[o.split(/[ ,+]/)[0]] || ["user", o]; return `<span class="pj-owner">${ic(i, 13)}${esc(o === l ? l : o)}</span>`; };

function dayDiff(iso) {
  const d = parseDate(iso);
  if (!d) return null;
  const now = new Date();
  return Math.round((d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}
const isLate = (r) => r.status !== "Fatto" && (dayDiff(r.due) ?? 1) < 0;

// Deadline: the date, and how far it is in words; red when past, amber in the next 3 days.
function dueTag(iso, label, done = false) {
  const n = dayDiff(iso);
  if (n === null) return label && label !== "-" ? `<span class="pj-due">${esc(label)}</span>` : `<span class="pj-due none">-</span>`;
  const date = esc(label || shortDate(iso));
  if (done) return `<span class="pj-due">${date}</span>`;
  const rel = n < 0 ? `${-n} ${n === -1 ? "giorno" : "giorni"} di ritardo` : n === 0 ? "oggi" : n === 1 ? "domani" : `tra ${n} giorni`;
  const tone = n < 0 ? "late" : n <= 3 ? "soon" : "";
  return `<span class="pj-due ${tone}">${n < 0 ? ic("alert", 13) : ic("calendar", 13)}<span><b>${date}</b><small>${rel}</small></span></span>`;
}
function statusTag(r) {
  if (isLate(r)) return tag("red", "alert", `${r.status} - in ritardo`);
  const [t, i] = STATUS[r.status] || ["grey", "circle"];
  return tag(t, i, r.status || "-");
}

const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : "");
// The first sentences up to n characters: old documents were written before the short format (28/10).
function brief(text, n = 170) {
  const t = cap(String(text || "").trim());
  let out = "";
  for (const part of t.split(/(?<=[.;])\s+(?=[A-ZÀ-Ý"(])/)) {
    if ((out + " " + part).trim().length > n) break;
    out = (out + " " + part).trim();
  }
  return out || (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "..." : t);
}
// A long item shows its first sentence; the rest opens on demand.
function more(short, full) {
  if (!full || full === short) return `<span class="pj-txt">${esc(short || full)}</span>`;
  return `<details class="pj-more"><summary>${esc(short)}</summary><p>${esc(full)}</p></details>`;
}
const fullText = (d, label) => d.content ? `<details class="pj-full"><summary>${ic("file", 15)}${label}</summary><div class="md">${mdToHtml(d.content, { skipTitle: true })}</div>
  ${d.link ? `<p class="doc-foot"><a class="linkish" href="${esc(d.link)}" target="_blank" rel="noopener">Apri su GitHub</a></p>` : ""}</details>` : "";
const empty = (b, s) => `<section class="panel"><div class="empty"><b>${esc(b)}</b><span>${esc(s)}</span></div></section>`;

function docRow(d, unread) {
  const v = d.type === "sal" ? d.data?.verdict : "";
  return `<button class="doc-row${unread ? " unread" : ""}" data-action="doc" data-doc="${esc(d.id)}">
    <span class="doc-date">${esc(shortDate(d.date))}</span>
    <span class="doc-txt"><b class="doc-t">${esc(d.type === "sal" ? "SAL" : "Consiglio")}${v ? ` ${verdictTag(v)}` : ""}</b>${d.summary ? `<span>${esc(d.summary)}</span>` : ""}</span>
    ${unread ? `<span class="ntf-dot"><span class="sr-only">da leggere</span></span>` : ""}</button>`;
}

// ---------------------------------------------------------------- SAL: verdict, numbers, the four boxes
const pct = (v) => (typeof v === "number" ? `${v}%` : "-");
const usd = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} $`;

function salNumbers(n = {}) {
  const tiles = [];
  if (n.si_su_decise_pct !== undefined) {
    const v = n.si_su_decise_pct, tone = v >= 15 ? "green" : v >= 10 ? "amber" : "red";
    tiles.push(["Quota di Sì", pct(v), "obiettivo 15%", tone]);
  }
  if (n.offerte_aggiunte_7g !== undefined) tiles.push(["Offerte in 7 giorni", n.offerte_aggiunte_7g, n.match_medio_aggiunte_7g ? `match medio ${n.match_medio_aggiunte_7g}` : "aggiunte al foglio", ""]);
  if (n.da_valutare !== undefined) tiles.push(["Da valutare", n.da_valutare, "offerte in attesa del tuo Sì o No", n.da_valutare > 10 ? "amber" : ""]);
  if (n.cv_pronti_da_inviare !== undefined) tiles.push(["CV pronti", n.cv_pronti_da_inviare, "da inviare", ""]);
  if (n.spesa_mese_usd !== undefined) tiles.push(["Spesa del mese", usd(n.spesa_mese_usd), n.proiezione_fine_mese_usd !== undefined ? `proiezione ${usd(n.proiezione_fine_mese_usd)}` : "", n.proiezione_fine_mese_usd > 8 ? "amber" : ""]);
  return tiles.length ? `<div class="pj-kpis">${tiles.map(([l, v, s, t]) => `<div class="pj-kpi${t ? ` k-${t}` : ""}"><span>${esc(l)}</span><b>${esc(v)}</b><small>${esc(s)}</small></div>`).join("")}</div>` : "";
}

function box(cls, icon, title, items, row, emptyTxt) {
  return `<section class="pj-box ${cls}"><h3>${ic(icon, 16)}${esc(title)}<span class="pj-count">${items.length}</span></h3>
    ${items.length ? `<ul class="pj-items">${items.map(row).join("")}</ul>` : `<p class="muted sm">${esc(emptyTxt)}</p>`}</section>`;
}

function salBody(d) {
  const s = d.data;
  if (!s) return `<section class="panel pad md">${mdToHtml(d.content, { skipTitle: true })}</section>`;
  const order = { alto: 0, medio: 1, "": 2, basso: 3 };
  const risks = [...s.risks].sort((a, b) => order[a.level] - order[b.level]);
  return `
    <section class="panel pad pj-verdict v-${esc(s.verdict)}">
      <div class="pj-verdict-h">${verdictTag(s.verdict)}<span class="muted sm">SAL del ${esc(shortDate(d.date))}</span></div>
      <div class="pj-headline">${more(brief(s.headline, 220), s.headline)}</div>
      ${salNumbers(s.numbers)}
    </section>
    <div class="pj-boxes">
      ${box("b-done", "check", "Attività svolte", s.done, (x) => `<li class="${x.ok ? "ok" : "ko"}"><span class="pj-mark">${ic(x.ok ? "check" : "x", 14)}<span class="sr-only">${x.ok ? "Bene" : "Da migliorare"}</span></span>${more(x.short, x.text)}</li>`, "Nessun giro nel periodo.")}
      ${box("b-doing", "play", "Attività in corso", s.doing, (x) => `<li><span class="pj-mark">${ic("clock", 14)}</span>${more(x.short, x.text)}</li>`, "Niente in corso.")}
      ${box("b-risk", "alert", "Punti aperti e rischi", risks, (x) => { const [t, i, l] = LEVEL[x.level] || ["amber", "alert", "Da valutare"]; return `<li class="lv-${esc(x.level || "na")}">${tag(t, i, l, " sm")}${more(x.short, x.text)}</li>`; }, "Nessun rischio aperto.")}
      ${box("b-next", "arrow", "Next steps", s.next, (x) => `<li><span class="pj-meta">${ownerTag(x.owner)}${x.due ? dueTag(x.due, x.due_label) : ""}</span>${more(x.short, x.text)}</li>`, "Nessun passo segnato.")}
    </div>
    ${s.proposals?.length ? `<section class="panel pad"><div class="panel-h"><h2>Proposte degli utenti da valutare</h2><span class="muted sm">decidi nella scheda "Proposte degli utenti"</span></div>
      <ul class="bul">${s.proposals.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
    <section class="panel pad">${fullText(d, "Testo completo del SAL")}</section>`;
}

// ---------------------------------------------------------------- Consiglio: decisions first, then the points
function decisionCard(x, i, compact = false) {
  const due = x.due ? dueTag(x.due, x.due_label) : "";
  if (compact) return `<button class="pj-dec mini" data-action="ptab" data-ptab="consiglio">
      <span class="pj-dec-n">${i + 1}</span><span class="pj-dec-t"><b>${esc(x.title)}</b>${x.rec ? `<span class="pj-clamp">${ic("check", 13)}${esc(brief(x.rec, 110))}</span>` : ""}</span>${due}</button>`;
  return `<article class="pj-dec">
    <header><span class="pj-dec-n">${i + 1}</span><div><h3>${esc(x.title)}</h3>${x.note ? `<span class="muted sm">${esc(x.note)}</span>` : ""}</div>${due}</header>
    ${x.why ? `<p class="pj-why">${esc(cap(x.why))}</p>` : ""}
    <div class="pj-options">
      ${x.rec ? `<div class="pj-opt rec"><span class="pj-opt-l">${ic("check", 14)}Raccomandazione</span>${more(brief(x.rec), cap(x.rec))}</div>` : ""}
      ${x.alt ? `<div class="pj-opt alt"><span class="pj-opt-l">${ic("scale", 14)}Alternativa prudente</span>${more(brief(x.alt), cap(x.alt))}</div>` : ""}
    </div>
    ${x.if_not ? `<p class="pj-ifnot">${ic("alert", 14)}<span><b>Se non decidi:</b> ${esc(cap(x.if_not))}</span></p>` : ""}
  </article>`;
}

function councilBody(d) {
  const c = d.data;
  if (!c) return `<section class="panel pad md">${mdToHtml(d.content, { skipTitle: true })}</section>`;
  const counts = JUDGE.map(([k, t, i]) => [k, t, i, c.points.filter((p) => judgeOf(p.verdict)[0] === k).length]).filter((x) => x[3]);
  return `
    <section class="panel pad pj-verdict">
      <div class="pj-verdict-h">${tag("brand", "scale", "Consiglio")}<span class="muted sm">verbale del ${esc(shortDate(d.date))}</span></div>
      ${c.plan ? `<p class="pj-plan">${ic("flag", 15)}<span><b>Stato del piano.</b> ${more(brief(c.plan), cap(c.plan))}</span></p>` : ""}
      ${c.summary ? `<div class="pj-headline">${more(brief(c.summary, 220), cap(c.summary))}</div>` : ""}
    </section>
    ${c.decisions.length ? `<section class="pj-sec"><h2 class="pj-h2">${ic("scale", 17)}Da decidere<span class="muted sm">decidi tu: rispondi nella issue del consiglio o in una sessione di Claude Code</span></h2>
      <div class="pj-decs">${c.decisions.map((x, i) => decisionCard(x, i)).join("")}</div></section>` : ""}
    ${c.points.length ? `<section class="panel pad"><div class="panel-h"><h2>Punti del consiglio</h2>
        <span class="pj-legend">${counts.map(([k, t, i, n]) => tag(t, i, `${k} ${n}`, " sm")).join("")}</span></div>
      <ul class="pj-points">${c.points.map((p) => { const [k, t, i] = judgeOf(p.verdict); return `<li>
        <span class="pj-pt-v">${tag(t, i, k)}</span>
        <div class="pj-pt-t"><b>${esc(p.text)}</b>${more(p.why_short, p.why)}${p.who ? `<small>Proposto da ${esc(p.who)}</small>` : ""}</div></li>`; }).join("")}</ul></section>` : ""}
    ${c.later?.length ? `<section class="panel pad"><details class="pj-full"><summary>${ic("pause", 15)}Non serve decidere ora (${c.later.length})</summary>
      <ul class="bul">${c.later.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details></section>` : ""}
    <section class="panel pad">${fullText(d, "Verbale completo, con i contributi dei consulenti")}</section>`;
}

// Picker of the documents of one type: the latest is open, the older ones one click away.
function picker(list, current, tab) {
  return `<div class="pj-pick" role="group" aria-label="Scegli il documento">${list.slice(0, 10).map((d) => {
    const v = d.type === "sal" ? VERDICT[d.data?.verdict] : null;
    return `<button class="pj-pick-b${d.id === current.id ? " on" : ""}" aria-pressed="${d.id === current.id}" data-action="ptab" data-ptab="${tab}@${esc(d.id)}">
      ${v ? `<span class="pj-sq tone-${v[0]}">${ic(v[1], 11)}</span>` : ""}${esc(shortDate(d.date))}</button>`;
  }).join("")}</div>`;
}

function docTab(p, type, sel, emptyTxt) {
  const list = p.docs.filter((d) => d.type === type);
  if (!list.length) return empty(...emptyTxt);
  const cur = list.find((d) => d.id === sel) || list[0];
  return `${picker(list, cur, type)}${type === "sal" ? salBody(cur) : councilBody(cur)}`;
}

// ---------------------------------------------------------------- Roadmap: deadline, owner, status per row
const rmRows = (r) => [...(r?.fasi || []), ...(r?.punti || []), ...(r?.altro || [])];
const FILTERS = [["open", "Aperti"], ["late", "In ritardo"], ["wait", "In attesa"], ["done", "Chiusi"], ["all", "Tutti"]];
const keep = (f, owner) => (r) => (owner === "all" || r.owner.startsWith(owner)) && (
  f === "all" ? true : f === "done" ? r.status === "Fatto" : f === "late" ? isLate(r) : f === "wait" ? r.status === "In attesa" : r.status !== "Fatto");

function rmTable(title, rows, label) {
  if (!rows.length) return "";
  return `<section class="panel pj-rm"><h2 class="pj-rm-h">${esc(title)}<span class="muted sm">${rows.length}</span></h2>
    <table class="pj-table"><thead><tr><th>${esc(label)}</th><th>Scadenza</th><th>Owner</th><th>Stato</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="${isLate(r) ? "late" : r.status === "Fatto" ? "done" : ""}">
      <td class="c-txt"><div><span class="pj-id">${esc(r.id.replace("Fase ", "F"))}</span>${r.detail ? `<details class="pj-more"><summary>${esc(r.text)}</summary><p>${esc(r.detail)}</p></details>` : `<span class="pj-txt">${esc(r.text)}</span>`}</div></td>
      <td data-l="Scadenza">${dueTag(r.due, r.due_label, r.status === "Fatto")}</td>
      <td data-l="Owner">${ownerTag(r.owner) || `<span class="muted">-</span>`}</td>
      <td data-l="Stato">${statusTag(r)}</td></tr>`).join("")}
    </tbody></table></section>`;
}

// Open items per owner, split by status: where the work is stuck.
function bottlenecks(rows) {
  const open = rows.filter((r) => r.status !== "Fatto");
  if (!open.length) return "";
  const owners = [...new Set(open.map((r) => r.owner.split(/[ ,+]/)[0] || "-"))].sort((a, b) =>
    open.filter((r) => r.owner.startsWith(b)).length - open.filter((r) => r.owner.startsWith(a)).length);
  const segs = [["late", "In ritardo", (r) => isLate(r)], ["wait", "In attesa", (r) => !isLate(r) && r.status === "In attesa"],
    ["doing", "In corso", (r) => !isLate(r) && r.status === "In corso"], ["todo", "Da fare", (r) => !isLate(r) && r.status === "Da fare"]];
  const max = Math.max(...owners.map((o) => open.filter((r) => r.owner.startsWith(o)).length));
  return `<div class="pj-neck">${owners.map((o) => {
    const mine = open.filter((r) => r.owner.startsWith(o));
    const parts = segs.map(([k, l, f]) => [k, l, mine.filter(f).length]).filter((x) => x[2]);
    return `<div class="pj-neck-r"><span class="pj-neck-o">${ownerTag(o)}</span>
      <span class="pj-bar" style="--w:${(mine.length / max) * 100}%" role="img" aria-label="${esc(o)}: ${parts.map(([, l, n]) => `${n} ${l.toLowerCase()}`).join(", ")}">${parts.map(([k, , n]) => `<span class="seg s-${k}" style="flex:${n}"></span>`).join("")}</span>
      <span class="pj-neck-n">${parts.map(([k, l, n]) => `<span class="n-${k}" title="${esc(l)}">${n} ${esc(l.toLowerCase())}</span>`).join("")}</span></div>`;
  }).join("")}</div>`;
}

function roadmapTab(p, sel) {
  const r = p.roadmap?.data;
  if (!r) return p.roadmap ? `<section class="panel pad md">${mdToHtml(p.roadmap.content, { skipTitle: true })}</section>` : empty("Roadmap non disponibile", "Compare dopo il primo report.");
  const [f0, o0] = (sel || "").split("~");
  const f = f0 || "open", owner = o0 || "all";
  const all = rmRows(r);
  const n = { open: all.filter((x) => x.status !== "Fatto").length, late: all.filter(isLate).length,
    wait: all.filter((x) => x.status === "In attesa").length, done: all.filter((x) => x.status === "Fatto").length, all: all.length };
  const owners = ["all", ...new Set(all.map((x) => x.owner.split(/[ ,+]/)[0]).filter(Boolean))];
  const fbtn = (k, l) => `<button class="pj-pick-b${f === k ? " on" : ""}${k === "late" && n.late ? " warn" : ""}" aria-pressed="${f === k}" data-action="ptab" data-ptab="roadmap@${k}~${owner}">${esc(l)} <span>${n[k]}</span></button>`;
  const obtn = (o) => `<button class="pj-pick-b${owner === o ? " on" : ""}" aria-pressed="${owner === o}" data-action="ptab" data-ptab="roadmap@${f}~${o}">${o === "all" ? "Tutti" : esc(o)}</button>`;
  const flt = keep(f, owner);
  const body = rmTable("Piano a fasi", r.fasi.filter(flt), "Fase e obiettivo") + rmTable("Punti aperti", r.punti.filter(flt), "Punto")
    + rmTable("Altro da fare", r.altro.filter(flt), "Punto");
  return `
    <section class="panel pad">
      <div class="panel-h"><h2>Dove si blocca il lavoro</h2><span class="muted sm">${r.aggiornata ? `roadmap aggiornata il ${esc(r.aggiornata)}` : ""}</span></div>
      ${bottlenecks(all)}
      <p class="pj-legend-l"><span class="seg s-late"></span>in ritardo<span class="seg s-wait"></span>in attesa<span class="seg s-doing"></span>in corso<span class="seg s-todo"></span>da fare</p>
    </section>
    <div class="pj-filters"><div class="pj-pick" role="group" aria-label="Filtra per stato">${FILTERS.map(([k, l]) => fbtn(k, l)).join("")}</div>
      <div class="pj-pick" role="group" aria-label="Filtra per owner">${owners.map(obtn).join("")}</div></div>
    ${body || empty("Nessun punto con questo filtro", "Prova un altro filtro.")}
    ${r.rischi?.length ? `<section class="panel pad"><div class="panel-h"><h2>Rischi noti</h2></div><ul class="pj-items">${r.rischi.map((x) => `<li>${tag("amber", "alert", "Rischio", " sm")}<span class="pj-txt">${esc(x)}</span></li>`).join("")}</ul></section>` : ""}
    <section class="panel pad">${fullText(p.roadmap, "Roadmap completa con i dettagli tecnici")}</section>`;
}

// ---------------------------------------------------------------- Panoramica: the answer first
function phasesStrip(fasi) {
  if (!fasi.length) return "";
  return `<ol class="pj-steps">${fasi.map((x) => {
    const late = isLate(x), [t] = late ? ["red"] : STATUS[x.status] || ["grey"];
    return `<li class="pj-step s-${t}${x.status === "In corso" ? " now" : ""}">
      <span class="pj-step-n">${x.status === "Fatto" ? ic("check", 13) : esc(x.id.replace("Fase ", ""))}</span>
      <b>${esc(x.text.split(":")[0])}</b>
      <span class="pj-step-s">${esc(late ? "In ritardo" : x.status)}${x.due_label && x.status !== "Fatto" ? ` - ${esc(x.due_label)}` : ""}</span></li>`;
  }).join("")}</ol>`;
}

function overview(p, unread) {
  const sal = p.docs.find((d) => d.type === "sal");
  const council = p.docs.find((d) => d.type === "consiglio");
  const s = sal?.data, c = council?.data, r = p.roadmap?.data;
  const rows = rmRows(r);
  const late = rows.filter(isLate).sort((a, b) => a.due.localeCompare(b.due));
  const waitingMe = rows.filter((x) => x.status !== "Fatto" && x.owner.startsWith("Federico"));
  const toRead = p.docs.filter((d) => unread(d.id));
  const order = { alto: 0, medio: 1, "": 2, basso: 3 };
  const risks = s ? [...s.risks].sort((a, b) => order[a.level] - order[b.level]).slice(0, 4) : [];
  const n = s?.numbers || {};
  const kpis = [
    n.si_su_decise_pct !== undefined && ["Quota di Sì", pct(n.si_su_decise_pct), "obiettivo 15%", n.si_su_decise_pct >= 15 ? "green" : n.si_su_decise_pct >= 10 ? "amber" : "red"],
    n.offerte_aggiunte_7g !== undefined && ["Offerte in 7 giorni", n.offerte_aggiunte_7g, n.match_medio_aggiunte_7g ? `match medio ${n.match_medio_aggiunte_7g}` : "", ""],
    c && ["Decisioni aperte", c.decisions.length, `consiglio del ${shortDate(council.date)}`, c.decisions.length ? "amber" : "green"],
    r && ["Punti in ritardo", late.length, `su ${rows.filter((x) => x.status !== "Fatto").length} aperti`, late.length ? "red" : "green"],
    r && ["In mano a te", waitingMe.length, "punti con owner Federico", ""],
  ].filter(Boolean);
  const runs = p.runs.length ? `<ul class="runs">${p.runs.map((x) => `<li>
      <span class="pj-sq tone-${x.conclusion === "success" ? "green" : x.conclusion === "failure" ? "red" : "grey"}">${ic(x.conclusion === "success" ? "check" : x.conclusion === "failure" ? "x" : "circle", 11)}</span>
      <span class="run-txt"><b>${esc(x.workflow)}</b><span>${esc(x.when)} - ${esc(RUN_LABEL[x.conclusion] || x.conclusion || "")}</span></span>
      ${x.url ? `<a class="linkish" href="${esc(x.url)}" target="_blank" rel="noopener">GitHub</a>` : ""}</li>`).join("")}</ul>`
    : `<p class="muted">I giri compaiono dopo il primo report.</p>`;
  return `
    ${toRead.length ? `<section class="panel pad pj-read"><div class="panel-h"><h2>Da leggere</h2><span class="muted sm">${toRead.length} ${toRead.length === 1 ? "documento nuovo" : "documenti nuovi"}</span></div>
      <div class="doc-list">${toRead.map((d) => docRow(d, true)).join("")}</div></section>` : ""}
    ${s ? `<section class="panel pad pj-verdict v-${esc(s.verdict)}">
      <div class="pj-verdict-h">${verdictTag(s.verdict)}<span class="muted sm">dall'ultimo SAL, ${esc(shortDate(sal.date))}</span>
        <button class="linkish sm" data-action="ptab" data-ptab="sal">Apri il SAL ${ic("arrow", 14)}</button></div>
      <div class="pj-headline">${more(brief(s.headline, 220), s.headline)}</div>
      ${kpis.length ? `<div class="pj-kpis">${kpis.map(([l, v, sub, t]) => `<div class="pj-kpi${t ? ` k-${t}` : ""}"><span>${esc(l)}</span><b>${esc(v)}</b><small>${esc(sub)}</small></div>`).join("")}</div>` : ""}
    </section>` : ""}
    <div class="pj-grid">
      <section class="panel pad"><div class="panel-h"><h2>${ic("scale", 16)} Da decidere</h2>${council ? `<button class="linkish sm" data-action="ptab" data-ptab="consiglio">Consiglio del ${esc(shortDate(council.date))}</button>` : ""}</div>
        ${c?.decisions.length ? `<div class="pj-decs mini">${c.decisions.map((x, i) => decisionCard(x, i, true)).join("")}</div>` : `<p class="muted">Nessuna decisione aperta.</p>`}</section>
      <section class="panel pad"><div class="panel-h"><h2>${ic("alert", 16)} Rischi e scadenze</h2></div>
        ${risks.length || late.length ? `<ul class="pj-items">
          ${risks.map((x) => { const [t, i, l] = LEVEL[x.level] || ["amber", "alert", "Da valutare"]; return `<li>${tag(t, i, l, " sm")}${more(x.short, x.text)}</li>`; }).join("")}
          ${late.slice(0, 4).map((x) => `<li>${dueTag(x.due, x.due_label)}<span class="pj-txt">${esc(x.text)} ${ownerTag(x.owner)}</span></li>`).join("")}</ul>`
          : `<p class="muted">Nessun rischio aperto e nessuna scadenza superata.</p>`}</section>
    </div>
    ${r ? `<section class="panel pad"><div class="panel-h"><h2>Piano</h2><button class="linkish sm" data-action="ptab" data-ptab="roadmap">Roadmap ${ic("arrow", 14)}</button></div>${phasesStrip(r.fasi)}</section>` : ""}
    <div class="pj-grid">
      ${r ? `<section class="panel pad"><div class="panel-h"><h2>Dove si blocca il lavoro</h2><span class="muted sm">punti aperti per owner</span></div>${bottlenecks(rows)}
        <p class="pj-legend-l"><span class="seg s-late"></span>in ritardo<span class="seg s-wait"></span>in attesa<span class="seg s-doing"></span>in corso<span class="seg s-todo"></span>da fare</p></section>` : ""}
      <section class="panel pad"><div class="panel-h"><h2>Giri dell'agente</h2><span class="muted sm">ultimo di ogni tipo</span></div>${runs}</section>
    </div>
    <section class="panel pad spend" id="spend" aria-label="Spesa API"></section>`;
}

export function projectHtml(p, sub, unread) {
  const [tab, sel] = String(sub || "overview").split("@");
  const counts = { sal: p.docs.filter((d) => d.type === "sal" && unread(d.id)).length,
    consiglio: p.docs.filter((d) => d.type === "consiglio" && unread(d.id)).length };
  const tabs = PROJECT_TABS.map((t) => `<button role="tab" aria-selected="${tab === t.key}" class="tab${tab === t.key ? " on" : ""}" data-action="ptab" data-ptab="${t.key}">${t.label}${counts[t.key] ? `<span class="tab-new">${counts[t.key]}</span>` : ""}</button>`).join("");
  let body;
  if (tab === "sal") body = docTab(p, "sal", sel, ["Ancora nessun SAL", "Arriva il martedì, il giovedì e il sabato mattina."]);
  else if (tab === "consiglio") body = docTab(p, "consiglio", sel, ["Ancora nessun verbale", "Il consiglio si riunisce il sabato mattina."]);
  else if (tab === "roadmap") body = roadmapTab(p, sel);
  else body = overview(p, unread);
  const sal = p.docs.find((d) => d.type === "sal");
  return `
    <section class="hero pj-hero"><div class="hero-txt"><p class="hero-date">Solo per te, come amministratore</p><h1>Progetto</h1>
      <p class="hero-line">Cosa decidere, cosa rischia di slittare, chi ha in mano cosa. ${sal ? `Ultimo SAL del ${esc(shortDate(sal.date))}.` : ""}</p></div></section>
    <div class="tabs-wrap pj-tabs"><nav class="tabs" role="tablist" aria-label="Sezioni del progetto">${tabs}</nav></div>
    <div class="pj-body">${body}</div>`;
}

export function docHtml(d) {
  const kind = d.type === "sal" ? "SAL" : d.type === "consiglio" ? "Consiglio" : "Documento";
  const date = parseDate(d.date);
  const body = d.data && d.type === "sal" ? salBody(d) : d.data && d.type === "consiglio" ? councilBody(d)
    : `<div class="md doc-body">${mdToHtml(d.content, { skipTitle: true })}</div>
      ${d.link ? `<p class="doc-foot"><a class="linkish" href="${esc(d.link)}" target="_blank" rel="noopener">Apri su GitHub</a></p>` : ""}`;
  return `
    <div class="dr-head">
      <span class="doc-kind">${kind}</span>
      <div class="dr-title"><h2>${esc(d.title)}</h2><p>${date ? esc(shortDate(d.date)) : ""}</p></div>
      <button class="btn btn-icon" data-action="close" aria-label="Chiudi">
        <svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>
    <div class="pj-body pj-in-drawer">${body}</div>`;
}

// ---------------------------------------------------------------- API spend (scheda Costi)
const GROUPS = [
  ["Ricerca offerte", ["analisi offerte", "contraddittorio offerte"]],
  ["CV su misura", ["CV su misura", "verifica CV", "contraddittorio CV"]],
  ["Candidature", ["classifica email", "bozza follow-up", "siti aziende"]],
  ["Report", ["report giornaliero"]],
  ["Lu", ["assistente"]],
  ["Profilo", ["profilo lettura CV", "profilo costruzione"]],
];
const groupOf = (task) => (GROUPS.find(([, tasks]) => tasks.includes(task)) || ["Altro"])[0];
const pad2 = (n) => String(n).padStart(2, "0");
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export function spendData(rows, budget, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  const key = `${y}-${pad2(m + 1)}`;
  const prev = new Date(y, m - 1, 1);
  const prevKey = `${prev.getFullYear()}-${pad2(prev.getMonth() + 1)}`;
  const days = new Date(y, m + 1, 0).getDate();
  const today = now.getDate();
  const daily = Array(days + 1).fill(0);
  const groups = {};
  let last = 0;
  for (const r of rows || []) {
    const date = String(r[0] || ""), v = Number(r[8]);
    if (!Number.isFinite(v)) continue;
    if (date.startsWith(prevKey)) last += v;
    if (!date.startsWith(key)) continue;
    const d = Number(date.slice(8, 10));
    if (d >= 1 && d <= days) daily[d] += v;
    const g = groupOf(String(r[1] || ""));
    groups[g] = (groups[g] || 0) + v;
  }
  const cum = [0];
  for (let d = 1; d <= days; d++) cum[d] = cum[d - 1] + daily[d];
  const spent = cum[today];
  const projection = spent + (spent / Math.max(1, today)) * (days - today);
  const limit = Number(budget?.monthly_usd) || 10;
  return { month: MONTHS[m], days, today, daily, cum, spent, projection, limit, alert: Number(budget?.alert_at) || 0.8, last,
    groups: Object.entries(groups).sort((a, b) => b[1] - a[1]) };
}

export function spendHtml(s) {
  const pct = Math.round((s.spent / s.limit) * 100);
  const over = s.projection > s.limit, near = !over && s.projection > s.limit * s.alert;
  const projNote = over ? `oltre il budget di ${usd(s.limit)}` : near ? `vicina al budget di ${usd(s.limit)}` : "al ritmo di questo mese";
  const total = s.groups.reduce((a, [, v]) => a + v, 0) || 1;
  const bars = s.groups.length ? s.groups.map(([g, v]) => `<li class="sp-bar" title="${esc(g)}: ${usd(v)}, ${Math.round((v / total) * 100)}% del mese">
      <span class="sp-bar-l">${esc(g)}</span>
      <span class="sp-track"><span class="sp-fill" style="--w:${Math.max(1.5, (v / s.groups[0][1]) * 100)}%"></span></span>
      <span class="sp-bar-v">${usd(v)}</span></li>`).join("") : `<li class="muted">Nessuna spesa questo mese.</li>`;
  const rows = s.daily.map((v, d) => (d && v ? `<tr><td>${d} ${s.month}</td><td>${usd(v)}</td><td>${usd(s.cum[d])}</td></tr>` : "")).join("");
  return `
    <div class="panel-h"><h2>Spesa API</h2><span class="muted sm">${esc(s.month)}, budget ${usd(s.limit)} al mese</span></div>
    <div class="sp-stats">
      <div><span>Speso finora</span><b>${usd(s.spent)}</b><small>${pct}% del budget</small></div>
      <div><span>Proiezione a fine mese</span><b>${usd(s.projection)}</b><small class="${over ? "red" : near ? "amber" : ""}">${over || near ? `<svg class="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 4 3 19h18z"/><path d="M12 10v4M12 16.5v.01"/></svg>` : ""}${projNote}</small></div>
      <div><span>Mese scorso</span><b>${s.last ? usd(s.last) : "-"}</b><small>${s.last ? "totale" : "nessun dato"}</small></div>
    </div>
    <div class="sp-grid">
      <figure class="sp-chart" id="sp-chart" role="img" aria-label="Spesa cumulata di ${esc(s.month)}: ${usd(s.spent)} al giorno ${s.today}, proiezione ${usd(s.projection)}, budget ${usd(s.limit)}"></figure>
      <div><p class="sp-sub">Per attività</p><ul class="sp-bars">${bars}</ul></div>
    </div>
    ${rows ? `<details class="sp-data"><summary>Spesa giorno per giorno</summary><div class="md-table"><table><thead><tr><th>Giorno</th><th>Spesa</th><th>Dal 1°</th></tr></thead><tbody>${rows}</tbody></table></div></details>` : ""}`;
}

// Cumulative spend of the month as a line, the projection dashed, the budget as a reference line. Drawn at the real
// width of its box (text stays readable on the phone), with a crosshair and a tooltip on hover or touch.
export function drawSpend(fig, s) {
  if (!fig) return;
  const W = Math.max(260, fig.clientWidth), H = 210;
  const M = { l: 38, r: 14, t: 16, b: 26 };
  const top = Math.max(s.limit, s.projection) * 1.1;
  const x = (d) => M.l + ((d - 1) / (s.days - 1)) * (W - M.l - M.r);
  const y = (v) => H - M.b - (v / top) * (H - M.t - M.b);
  const step = top > 16 ? 5 : top > 6 ? 2.5 : 1;
  let grid = "";
  for (let v = 0; v <= top; v += step) {
    grid += `<line x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}" class="sp-grid-l"/><text x="${M.l - 8}" y="${y(v) + 4}" class="sp-ax" text-anchor="end">${v % 1 ? v.toFixed(1).replace(".", ",") : v}</text>`;
  }
  const ticks = [1, 8, 15, 22, s.days].map((d) => `<text x="${x(d)}" y="${H - 6}" class="sp-ax" text-anchor="${d === 1 ? "start" : d === s.days ? "end" : "middle"}">${d}</text>`).join("");
  const line = Array.from({ length: s.today }, (_, i) => `${i ? "L" : "M"}${x(i + 1).toFixed(1)},${y(s.cum[i + 1]).toFixed(1)}`).join("");
  const proj = s.today < s.days ? `<path d="M${x(s.today)},${y(s.spent)}L${x(s.days)},${y(s.projection)}" class="sp-proj"/>
    <text x="${x(s.days)}" y="${y(s.projection) - 8}" class="sp-lab" text-anchor="end">proiezione ${usd(s.projection)}</text>` : "";
  const budgetY = y(s.limit);
  fig.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    ${grid}${ticks}
    <line x1="${M.l}" x2="${W - M.r}" y1="${budgetY}" y2="${budgetY}" class="sp-budget"/>
    <text x="${M.l + 6}" y="${budgetY - 6}" class="sp-lab">budget ${usd(s.limit)}</text>
    ${proj}
    <path d="${line}" class="sp-line"/>
    <circle cx="${x(s.today)}" cy="${y(s.spent)}" r="4.5" class="sp-dot"/>
    <text x="${Math.min(x(s.today) + 9, W - M.r - 4)}" y="${y(s.spent) + 18}" class="sp-lab strong" text-anchor="${x(s.today) > W - 90 ? "end" : "start"}">${usd(s.spent)}</text>
    <g class="sp-hover" style="display:none"><line class="sp-cross" y1="${M.t}" y2="${H - M.b}"/><circle r="4.5" class="sp-dot"/></g>
    <rect x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}" fill="transparent" class="sp-hit"/>
  </svg><div class="sp-tip" hidden></div>`;
  const svg = fig.querySelector("svg"), hover = fig.querySelector(".sp-hover"), tip = fig.querySelector(".sp-tip");
  const show = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ev.clientX - r.left;
    const d = Math.min(s.today, Math.max(1, Math.round(1 + ((px - M.l) / (W - M.l - M.r)) * (s.days - 1))));
    hover.style.display = "";
    hover.querySelector("line").setAttribute("x1", x(d));
    hover.querySelector("line").setAttribute("x2", x(d));
    hover.querySelector("circle").setAttribute("cx", x(d));
    hover.querySelector("circle").setAttribute("cy", y(s.cum[d]));
    tip.hidden = false;
    tip.innerHTML = `<b>${d} ${esc(s.month)}</b><span>${usd(s.daily[d])} nel giorno</span><span>${usd(s.cum[d])} dal 1°</span>`;
    const tx = Math.min(Math.max(x(d) - tip.offsetWidth / 2, 0), W - tip.offsetWidth);
    tip.style.transform = `translate(${tx}px, ${Math.max(0, y(s.cum[d]) - tip.offsetHeight - 12)}px)`;
  };
  const hide = () => { hover.style.display = "none"; tip.hidden = true; };
  const hit = fig.querySelector(".sp-hit");
  hit.addEventListener("pointermove", show);
  hit.addEventListener("pointerdown", show);
  hit.addEventListener("pointerleave", hide);
}
