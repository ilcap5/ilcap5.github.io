// "Progetto" view, only for the owner of the agent (admin): the agent copies SAL, council reports, roadmap and the
// last runs into the "Progetto" tab of the sheet (jobagent/project.py). No tab, no view.

import { mdToHtml } from "./md.js?v=202610140917";
import { parseDate, shortDate } from "./schema.js?v=202610140917";

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
      summary: get(r, "Sintesi"), content: get(r, "Contenuto"), link: get(r, "Link") };
    if (!item.id) continue;
    if (item.type === "roadmap") roadmap = { ...item, plan: json(item.summary, {}) };
    else if (item.type === "giri") runs = json(item.content, []);
    else if (item.type === "budget") budget = json(item.summary, null);
    else docs.push(item);
  }
  docs.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { docs, roadmap, runs, budget };
}

const STATUS_TONE = { "FATTO": "green", "IN CORSO": "brand", "IN ATTESA": "amber", "DA FARE": "grey" };
const RUN_LABEL = { success: "Riuscito", failure: "Non riuscito", cancelled: "Annullato", skipped: "Saltato" };

function openPoints(p) {
  const sal = p.docs.find((d) => d.type === "sal");
  const fromSal = [];
  if (sal) {
    const m = sal.content.split(/\n## /).find((s) => s.startsWith("Punti aperti"));
    if (m) m.split("\n").filter((l) => l.startsWith("- ") && !/^- nessuno/i.test(l)).forEach((l) => fromSal.push(l.slice(2)));
  }
  return [...fromSal, ...(p.roadmap?.plan?.punti_aperti || [])].slice(0, 8);
}

function docRow(d, unread) {
  return `<button class="doc-row${unread ? " unread" : ""}" data-action="doc" data-doc="${esc(d.id)}">
    <span class="doc-date">${esc(shortDate(d.date))}</span>
    <span class="doc-txt"><b>${esc(d.title)}</b>${d.summary ? `<span>${esc(d.summary)}</span>` : ""}</span>
    ${unread ? `<span class="ntf-dot"><span class="sr-only">da leggere</span></span>` : ""}</button>`;
}

function overview(p, unread) {
  const phases = p.roadmap?.plan?.fasi || [];
  const plan = phases.length ? `<ol class="phases">${phases.map((f) => `<li class="phase">
      <span class="phase-n">${f.n}</span>
      <span class="phase-txt"><b>${esc(f.title)}</b>${f.detail ? `<span>${esc(f.detail)}</span>` : ""}</span>
      <span class="pill st tone-${STATUS_TONE[f.status] || "grey"}">${esc(f.status ? f.status.toLowerCase() : "-")}</span></li>`).join("")}</ol>`
    : `<p class="muted">La roadmap non è ancora nella scheda Progetto.</p>`;
  const runs = p.runs.length ? `<ul class="runs">${p.runs.map((r) => `<li>
      <span class="run-dot ${r.conclusion === "success" ? "ok" : r.conclusion === "failure" ? "ko" : ""}" aria-hidden="true"></span>
      <span class="run-txt"><b>${esc(r.workflow)}</b><span>${esc(r.when)} - ${esc(RUN_LABEL[r.conclusion] || r.conclusion || "")}</span></span>
      ${r.url ? `<a class="linkish" href="${esc(r.url)}" target="_blank" rel="noopener">GitHub</a>` : ""}</li>`).join("")}</ul>`
    : `<p class="muted">I giri compaiono dopo il primo report giornaliero.</p>`;
  const points = openPoints(p);
  const inProgress = p.roadmap?.plan?.in_corso || [];
  const toRead = p.docs.filter((d) => unread(d.id));
  const lastSal = p.docs.find((d) => d.type === "sal");
  const lastCouncil = p.docs.find((d) => d.type === "consiglio");
  const latest = [lastSal, lastCouncil].filter(Boolean);
  return `
    ${toRead.length ? `<section class="panel pad pj-read"><div class="panel-h"><h2>Da leggere</h2><span class="muted sm">${toRead.length} ${toRead.length === 1 ? "documento nuovo" : "documenti nuovi"}</span></div>
      <div class="doc-list">${toRead.map((d) => docRow(d, true)).join("")}</div></section>` : ""}
    <section class="panel pad spend" id="spend" aria-label="Spesa API"></section>
    <div class="pj-grid">
      <section class="panel pad"><div class="panel-h"><h2>Piano</h2>${p.roadmap?.link ? `<a class="linkish sm" href="${esc(p.roadmap.link)}" target="_blank" rel="noopener">Su GitHub</a>` : ""}</div>${plan}</section>
      <div class="pj-col">
        <section class="panel pad"><div class="panel-h"><h2>Giri dell'agente</h2><span class="muted sm">ultimo di ogni tipo</span></div>${runs}</section>
        <section class="panel pad"><div class="panel-h"><h2>Punti aperti</h2></div>
          ${points.length ? `<ul class="bul">${points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted">Nessun punto aperto.</p>`}</section>
      </div>
    </div>
    <div class="pj-grid">
      <section class="panel pad"><div class="panel-h"><h2>In corso</h2></div>
        ${inProgress.length ? `<ul class="bul">${inProgress.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted">Niente in corso.</p>`}</section>
      <section class="panel pad"><div class="panel-h"><h2>Ultimi documenti</h2></div>
        ${latest.length ? `<div class="doc-list">${latest.map((d) => docRow(d, unread(d.id))).join("")}</div>` : `<p class="muted">Ancora nessun SAL o verbale.</p>`}</section>
    </div>`;
}

function docList(p, type, unread, empty) {
  const list = p.docs.filter((d) => d.type === type);
  return `<section class="panel">${list.length ? `<div class="doc-list big">${list.map((d) => docRow(d, unread(d.id))).join("")}</div>`
    : `<div class="empty"><b>${esc(empty[0])}</b><span>${esc(empty[1])}</span></div>`}</section>`;
}

export function projectHtml(p, sub, unread) {
  const counts = { sal: p.docs.filter((d) => d.type === "sal" && unread(d.id)).length,
    consiglio: p.docs.filter((d) => d.type === "consiglio" && unread(d.id)).length };
  const tabs = PROJECT_TABS.map((t) => `<button role="tab" aria-selected="${sub === t.key}" class="tab${sub === t.key ? " on" : ""}" data-action="ptab" data-ptab="${t.key}">${t.label}${counts[t.key] ? `<span class="tab-new">${counts[t.key]}</span>` : ""}</button>`).join("");
  let body;
  if (sub === "sal") body = docList(p, "sal", unread, ["Ancora nessun SAL", "Il report giornaliero lo scrive ogni sera dei giorni feriali."]);
  else if (sub === "consiglio") body = docList(p, "consiglio", unread, ["Ancora nessun verbale", "Il consiglio si riunisce il sabato mattina."]);
  else if (sub === "roadmap") body = `<section class="panel pad md">${p.roadmap ? mdToHtml(p.roadmap.content, { skipTitle: true }) : `<p class="muted">Roadmap non disponibile.</p>`}</section>`;
  else body = overview(p, unread);
  const sal = p.docs.find((d) => d.type === "sal");
  return `
    <section class="hero pj-hero"><div class="hero-txt"><p class="hero-date">Solo per te, come amministratore</p><h1>Progetto</h1>
      <p class="hero-line">Avanzamento, giri dell'agente, SAL e consigli. ${sal ? `Ultimo SAL del ${esc(shortDate(sal.date))}.` : ""}</p></div></section>
    <div class="tabs-wrap pj-tabs"><nav class="tabs" role="tablist" aria-label="Sezioni del progetto">${tabs}</nav></div>
    <div class="pj-body">${body}</div>`;
}

export function docHtml(d) {
  const kind = d.type === "sal" ? "SAL" : d.type === "consiglio" ? "Consiglio" : "Documento";
  const date = parseDate(d.date);
  return `
    <div class="dr-head">
      <span class="doc-kind">${kind}</span>
      <div class="dr-title"><h2>${esc(d.title)}</h2><p>${date ? esc(shortDate(d.date)) : ""}</p></div>
      <button class="btn btn-icon" data-action="close" aria-label="Chiudi">
        <svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>
    <div class="md doc-body">${mdToHtml(d.content, { skipTitle: true })}</div>
    ${d.link ? `<p class="doc-foot"><a class="linkish" href="${esc(d.link)}" target="_blank" rel="noopener">Apri su GitHub</a></p>` : ""}`;
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
const usd = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} $`;
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
