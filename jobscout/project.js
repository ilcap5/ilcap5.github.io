// "Progetto" view, only for the owner of the agent (admin): the agent copies SAL, council reports, roadmap and the
// last runs into the "Progetto" tab of the sheet (jobagent/project.py). No tab, no view.

import { mdToHtml } from "./md.js?v=202610132004";
import { parseDate, shortDate } from "./schema.js?v=202610132004";

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
  let roadmap = null, runs = [];
  for (const r of values.slice(1)) {
    const item = { id: get(r, "ID"), type: get(r, "Tipo"), date: get(r, "Data"), title: get(r, "Titolo"),
      summary: get(r, "Sintesi"), content: get(r, "Contenuto"), link: get(r, "Link") };
    if (!item.id) continue;
    if (item.type === "roadmap") roadmap = { ...item, plan: json(item.summary, {}) };
    else if (item.type === "giri") runs = json(item.content, []);
    else docs.push(item);
  }
  docs.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { docs, roadmap, runs };
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
