import { CONFIG } from "./config.js";
import { DemoStore, SheetsStore } from "./store.js";
import {
  APPLIED_STATUSES, FINAL, FOLLOWUP_STEP, INTERVIEWING, REJECT_REASONS, RESPONDED, S, STATUSES, STATUS_TONE, TABS,
  addDays, companyDomain, daysBetween, fmtDate, initials, matchTone, parseDate, relDate, shortDate, today,
} from "./schema.js";

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SHEET_KEY = "jobscout.sheet";
const store_get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const store_set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } };

const state = {
  store: null, jobs: [], url: "", loadedAt: 0, tab: "all", q: "", fit: "", sort: "found",
  selected: null, rejecting: false, reason: "", busy: false,
};

// ================================================================ boot
function boot() {
  const params = new URLSearchParams(location.search);
  const sheetParam = params.get("sheet");
  if (sheetParam) {
    store_set(SHEET_KEY, sheetParam);
    history.replaceState(null, "", location.pathname);
  }
  if (params.has("demo")) return start(new DemoStore());
  const sheetId = store_get(SHEET_KEY);
  if (!CONFIG.clientId || !sheetId) return showSetup();
  const store = new SheetsStore({ clientId: CONFIG.clientId, scope: CONFIG.scope, sheetId });
  if (store.signedIn) return start(store);
  showLogin(store);
}

function screen(html) {
  document.body.classList.add("is-screen");
  $("#app").innerHTML = `<div class="screen"><div class="screen-card">${brand()}${html}</div></div>`;
}

function brand(small = false) {
  return `<div class="brand${small ? " brand-sm" : ""}"><span class="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
    </span><span class="brand-name">JobScout<span>.ai</span></span></div>`;
}

function showSetup() {
  const noClient = !CONFIG.clientId;
  screen(`
    <h1>La tua dashboard delle candidature</h1>
    <p class="muted">Collegala al foglio "Job Agent - Candidature": i dati restano nel tuo Google Drive,
      la pagina li legge dal tuo browser con il tuo account.</p>
    ${noClient ? `<div class="note note-amber">Accesso Google non ancora configurato: per ora puoi provarla con dati di esempio.</div>` : `
    <label class="field"><span>Link del foglio Google</span>
      <input id="sheet-link" type="url" placeholder="https://docs.google.com/spreadsheets/d/..." autocomplete="off"></label>
    <button class="btn btn-primary btn-block" data-action="save-sheet">Collega il foglio</button>`}
    <button class="btn btn-ghost btn-block" data-action="demo">Prova con dati di esempio</button>`);
}

function showLogin(store, error = "") {
  screen(`
    <h1>Bentornato</h1>
    <p class="muted">Accedi con l'account Google proprietario del foglio delle candidature.</p>
    ${error ? `<div class="note note-red">${esc(error)}</div>` : ""}
    <button class="btn btn-primary btn-block" data-action="login">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      Accedi con Google</button>
    <button class="btn btn-ghost btn-block" data-action="change-sheet">Usa un altro foglio</button>`);
  state.store = store;
  store._gis().catch(() => {}); // loaded now, so the login popup opens straight from the click
}

async function start(store) {
  state.store = store;
  document.body.classList.remove("is-screen");
  $("#app").innerHTML = shell();
  await reload();
}

async function reload(quiet = false) {
  if (!quiet) setLoading(true);
  try {
    const { jobs, url } = await state.store.load();
    state.jobs = jobs;
    state.url = url;
    state.loadedAt = Date.now();
    if (state.selected && !jobs.some((j) => j.id === state.selected)) state.selected = null;
    renderAll();
  } catch (e) {
    if (state.store instanceof SheetsStore && !state.store.signedIn) return showLogin(state.store, e.message);
    toast(e.message, "error");
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  document.body.classList.toggle("is-loading", on);
}

// ================================================================ layout
function shell() {
  return `
  <header class="topbar">
    <div class="topbar-in">
      ${brand(true)}
      <div class="topbar-actions" id="topbar-actions"></div>
    </div>
  </header>
  <main class="page">
    <section class="hero" id="hero"></section>
    <section class="kpis" id="kpis" aria-label="Indicatori"></section>
    <section class="insights" id="insights"></section>
    <section class="card list-card" aria-label="Offerte e candidature">
      <div class="list-head">
        <h2>Le mie offerte</h2>
        <div class="list-tools">
          <label class="search"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <input id="search" type="search" placeholder="Cerca azienda o ruolo" aria-label="Cerca"></label>
          <select id="fit" aria-label="Tipo ruolo"></select>
          <select id="sort" aria-label="Ordina">
            <option value="found">Più recenti</option><option value="score">Match più alto</option>
            <option value="applied">Data candidatura</option><option value="next">Prossimo step</option>
          </select>
        </div>
      </div>
      <nav class="tabs" id="tabs" role="tablist"></nav>
      <div id="table"></div>
    </section>
    <p class="foot muted" id="foot"></p>
  </main>
  <div class="drawer-wrap" id="drawer-wrap" hidden>
    <div class="drawer-bg" data-action="close"></div>
    <aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Dettaglio offerta"></aside>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function renderAll() {
  renderTop();
  renderHero();
  renderKpis();
  renderInsights();
  renderFilters();
  renderTabs();
  renderTable();
  renderDrawer();
}

function renderTop() {
  const demo = state.store instanceof DemoStore;
  $("#topbar-actions").innerHTML = `
    <span class="badge ${demo ? "badge-amber" : "badge-green"}">${demo ? "Dati di esempio" : "Collegata al foglio"}</span>
    <button class="btn btn-icon" data-action="reload" title="Aggiorna" aria-label="Aggiorna">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    ${state.url ? `<a class="btn btn-ghost btn-sm hide-sm" href="${esc(state.url)}" target="_blank" rel="noopener">Apri il foglio</a>` : ""}
    <button class="btn btn-ghost btn-sm" data-action="${demo ? "exit-demo" : "logout"}">${demo ? "Esci dalla prova" : "Esci"}</button>`;
}

function renderHero() {
  const h = new Date().getHours();
  const hello = h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
  const newCount = state.jobs.filter((j) => j.status === S.NEW && !j.decision).length;
  const line = newCount ? `Hai <b>${newCount}</b> ${newCount === 1 ? "offerta da valutare" : "offerte da valutare"}.`
    : "Nessuna offerta in attesa di una tua decisione.";
  $("#hero").innerHTML = `<div><h1>${hello}</h1><p class="muted">${line}</p></div>`;
}

// ================================================================ KPIs and insights
function counts() {
  const J = state.jobs;
  const applied = J.filter((j) => APPLIED_STATUSES.has(j.status));
  const responded = J.filter((j) => RESPONDED.has(j.status));
  const t = today();
  return {
    review: J.filter((j) => j.status === S.NEW && !j.decision),
    reviewHigh: J.filter((j) => j.status === S.NEW && !j.decision && Number(j.score) >= 70),
    ready: J.filter((j) => j.status === S.CV_READY || j.status === S.CV_CHECK),
    preparing: J.filter((j) => j.status === S.NEW && /^y/i.test(j.decision)),
    applied,
    appliedWeek: applied.filter((j) => { const d = parseDate(j.applied_date); return d && daysBetween(d, t) <= 7; }),
    responded,
    interviewing: J.filter((j) => INTERVIEWING.has(j.status)),
    offers: J.filter((j) => j.status === S.OFFER),
  };
}

function renderKpis() {
  const c = counts();
  const rate = c.applied.length ? Math.round((c.responded.length / c.applied.length) * 100) : null;
  const tiles = [
    ["Da valutare", c.review.length, c.reviewHigh.length ? `${c.reviewHigh.length} con match 70+` : "decidi Y o N", "review"],
    ["CV pronti", c.ready.length, c.preparing.length ? `${c.preparing.length} in preparazione` : "da inviare", "ready"],
    ["Candidature inviate", c.applied.length, `${c.appliedWeek.length} negli ultimi 7 giorni`, "applied"],
    ["Tasso di risposta", rate === null ? "-" : `${rate}%`, `${c.responded.length} risposte ricevute`, null],
    ["Colloqui attivi", c.interviewing.length, c.offers.length ? `${c.offers.length} ${c.offers.length === 1 ? "offerta" : "offerte"}` : "nessuna offerta per ora", "interview"],
  ];
  $("#kpis").innerHTML = tiles.map(([label, value, sub, tab]) => `
    <${tab ? `button data-action="tab" data-tab="${tab}"` : "div"} class="kpi">
      <span class="kpi-label">${label}</span><span class="kpi-value">${value}</span><span class="kpi-sub">${esc(sub)}</span>
    </${tab ? "button" : "div"}>`).join("");
}

function renderInsights() {
  const J = state.jobs;
  const c = counts();
  const stages = [
    ["Trovate", J.length],
    ["Approvate (Y)", J.filter((j) => /^y/i.test(j.decision) || APPLIED_STATUSES.has(j.status) || j.status === S.CV_READY || j.status === S.CV_CHECK).length],
    ["Inviate", c.applied.length],
    ["Risposte", c.responded.length],
    ["Colloqui", J.filter((j) => INTERVIEWING.has(j.status) || j.status === S.OFFER).length],
    ["Offerte", c.offers.length],
  ];
  const max = Math.max(1, stages[0][1]);
  const funnel = stages.map(([label, n], i) => {
    const prev = i ? stages[i - 1][1] : null;
    const conv = prev ? `${Math.round((n / prev) * 100)}%` : "";
    return `<div class="fn-row"><span class="fn-label">${label}</span>
      <span class="fn-track"><span class="fn-bar" style="width:${Math.max(n ? 3 : 0, (n / max) * 100)}%"></span></span>
      <span class="fn-n">${n}</span><span class="fn-conv">${conv}</span></div>`;
  }).join("");

  // To-do: grouped decisions first, then dated next steps.
  const t = today();
  const todo = [];
  if (c.review.length) todo.push({ tab: "review", icon: "?", title: `Decidi su ${c.review.length} ${c.review.length === 1 ? "offerta nuova" : "offerte nuove"}`, sub: "Y per avere il CV, N con il motivo", tone: "amber" });
  if (c.ready.length) todo.push({ tab: "ready", icon: "↑", title: `Invia ${c.ready.length} ${c.ready.length === 1 ? "candidatura" : "candidature"}`, sub: "il CV su misura è pronto", tone: "green" });
  J.filter((j) => j.next_step && !FINAL.has(j.status) && ![S.NEW, S.CV_READY, S.CV_CHECK, S.STANDBY].includes(j.status))
    .map((j) => ({ j, d: parseDate(j.next_step_date) }))
    .filter(({ d }) => d && daysBetween(t, d) <= 3)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .forEach(({ j, d }) => todo.push({ id: j.id, job: j, title: j.next_step, sub: `${j.company} · ${relDate(j.next_step_date)}`, late: d < t }));
  const todoHtml = todo.length ? todo.map((x) => `
    <button class="todo" data-action="${x.id ? "open" : "tab"}" ${x.id ? `data-id="${esc(x.id)}"` : `data-tab="${x.tab}"`}>
      ${x.job ? logo(x.job, 34) : `<span class="todo-ic tone-${x.tone}">${x.icon}</span>`}
      <span class="todo-txt"><b>${esc(x.title)}</b><span class="${x.late ? "late" : "muted"}">${esc(x.sub)}</span></span>
      <span class="chev" aria-hidden="true">›</span></button>`).join("")
    : `<div class="empty-sm">Niente in scadenza: tutto in ordine.</div>`;

  const fresh = c.review.filter((j) => Number(j.score) >= 0 && j.score !== "");
  const avg = fresh.length ? Math.round(fresh.reduce((s, j) => s + Number(j.score), 0) / fresh.length) : "-";
  const week = J.filter((j) => { const d = parseDate(j.found_date); return d && daysBetween(d, t) <= 7; }).length;
  const waiting = J.filter((j) => [S.APPLIED, S.FOLLOWUP_DUE, S.FOLLOWUP_SENT].includes(j.status)).length;
  const stats = `<div class="fn-stats"><div><b>${week}</b>trovate in 7 giorni</div><div><b>${avg}</b>match medio da valutare</div>
    <div><b>${waiting}</b>in attesa di risposta</div></div>`;
  $("#insights").innerHTML = `
    <div class="card"><div class="card-h"><h2>Funnel</h2><span class="muted sm">conversione tra le fasi</span></div><div class="funnel">${funnel}</div>${stats}</div>
    <div class="card"><div class="card-h"><h2>Da fare</h2><span class="muted sm">prossimi 3 giorni</span></div><div class="todos">${todoHtml}</div></div>`;
}

// ================================================================ list
function renderFilters() {
  const fits = [...new Set(state.jobs.map((j) => j.role_fit).filter(Boolean))].sort();
  if (state.fit && !fits.includes(state.fit)) state.fit = "";
  $("#fit").innerHTML = `<option value="">Tutti i tipi di ruolo</option>` + fits.map((f) => `<option ${f === state.fit ? "selected" : ""}>${esc(f)}</option>`).join("");
  $("#sort").value = state.sort;
  $("#search").value = state.q;
}

function renderTabs() {
  $("#tabs").innerHTML = TABS.map((t) => {
    const n = state.jobs.filter(t.test).length;
    if (!n && !["all", "review", "applied"].includes(t.key) && state.tab !== t.key) return "";
    return `<button role="tab" aria-selected="${state.tab === t.key}" class="tab${state.tab === t.key ? " on" : ""}" data-action="tab" data-tab="${t.key}">${t.label}<span class="tab-n">${n}</span></button>`;
  }).join("");
}

function visibleJobs() {
  const tab = TABS.find((t) => t.key === state.tab) || TABS[0];
  const q = state.q.trim().toLowerCase();
  const by = {
    found: (j) => parseDate(j.found_date)?.getTime() || 0,
    score: (j) => Number(j.score) || 0,
    applied: (j) => parseDate(j.applied_date)?.getTime() || 0,
    next: (j) => -(parseDate(j.next_step_date)?.getTime() || 9e15),
  }[state.sort];
  return state.jobs
    .filter(tab.test)
    .filter((j) => !state.fit || j.role_fit === state.fit)
    .filter((j) => !q || `${j.company} ${j.title} ${j.city}`.toLowerCase().includes(q))
    .sort((a, b) => by(b) - by(a) || (Number(b.score) || 0) - (Number(a.score) || 0));
}

const failedLogos = new Set();

function logo(job, size = 40) {
  const dom = companyDomain(job);
  const ini = `<span class="logo logo-ini" style="--s:${size}px" aria-hidden="true">${esc(initials(job.company))}</span>`;
  if (!dom || failedLogos.has(dom)) return ini;
  return `<span class="logo" style="--s:${size}px"><img class="logo-img" alt="" loading="lazy" data-ini="${esc(initials(job.company))}"
    data-dom="${esc(dom)}" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(dom)}&sz=128"></span>`;
}

function statusPill(job) {
  return `<span class="pill tone-${STATUS_TONE[job.status] || "grey"}">${esc(job.status || "Senza stato")}</span>`;
}

function statusSelect(job, cls = "") {
  const opts = STATUSES.map((s) => `<option ${s === job.status ? "selected" : ""}>${esc(s)}</option>`).join("");
  return `<select class="status-select tone-${STATUS_TONE[job.status] || "grey"} ${cls}" data-action="status" data-id="${esc(job.id)}" aria-label="Stato" ${job.id ? "" : "disabled"}>${opts}</select>`;
}

function matchPill(score) {
  const tone = matchTone(score);
  return tone ? `<span class="match ${tone}">${esc(score)}</span>` : `<span class="muted">-</span>`;
}

function salary(job) {
  if (!job.salary) return `<span class="muted">-</span>`;
  return `${esc(job.salary)}${job.salary_type === "Stima" ? `<span class="est">stima</span>` : ""}`;
}

function renderTable() {
  const jobs = visibleJobs();
  if (!state.jobs.length) {
    $("#table").innerHTML = `<div class="empty"><b>Ancora nessuna offerta</b><span class="muted">Le prime arrivano con la ricerca di lunedì, mercoledì e venerdì alle 15:20.</span></div>`;
    return;
  }
  if (!jobs.length) {
    $("#table").innerHTML = `<div class="empty"><b>Nessuna offerta qui</b><span class="muted">Prova un'altra scheda o togli i filtri.</span></div>`;
    return;
  }
  const rows = jobs.map((j) => {
    const prep = j.status === S.NEW && /^y/i.test(j.decision);
    const no = j.status === S.NEW && /^n/i.test(j.decision);
    return `<tr data-action="open" data-id="${esc(j.id)}" tabindex="0" class="${state.selected === j.id ? "sel" : ""}">
      <td class="c-job"><div class="job">${logo(j)}<div class="job-txt"><b>${esc(j.title)}</b><span class="muted">${esc(j.company)}</span>
        <span class="pill show-sm tone-${STATUS_TONE[j.status] || "grey"}">${esc(prep ? "CV in arrivo" : j.status)}</span></div></div></td>
      <td class="c-status hide-sm">${statusSelect(j)}${prep ? `<span class="sub-tag">CV in arrivo stasera</span>` : ""}${no ? `<span class="sub-tag">Scartata, in attesa del giro</span>` : ""}</td>
      <td class="c-match">${matchPill(j.score)}</td>
      <td class="c-city hide-md">${esc(j.city)}${j.work_mode ? `<span class="muted block">${esc(j.work_mode)}</span>` : ""}</td>
      <td class="c-ral hide-md">${salary(j)}</td>
      <td class="c-date hide-sm">${esc(shortDate(j.found_date)) || "-"}</td>
      <td class="c-date hide-sm">${esc(shortDate(j.applied_date)) || "-"}</td>
    </tr>`;
  }).join("");
  $("#table").innerHTML = `<table class="jobs">
    <thead><tr><th>Offerta</th><th class="hide-sm">Stato</th><th>Match</th><th class="hide-md">Città</th><th class="hide-md">RAL</th>
      <th class="hide-sm">Trovata</th><th class="hide-sm">Inviata</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
  $("#foot").textContent = `${jobs.length} di ${state.jobs.length} offerte · aggiornato alle ${new Date(state.loadedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
}

// ================================================================ drawer
const toISO = (s) => { const d = parseDate(s); return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : ""; };
const fromISO = (s) => (s ? fmtDate(parseDate(s)) : "");

function renderDrawer() {
  const wrap = $("#drawer-wrap");
  const j = state.jobs.find((x) => x.id === state.selected);
  if (!j) {
    wrap.hidden = true;
    document.body.classList.remove("no-scroll");
    return;
  }
  wrap.hidden = false;
  document.body.classList.add("no-scroll");
  const sub = [j.company, j.city, j.work_mode].filter(Boolean).map(esc).join(" · ");
  const fact = (label, value) => (value ? `<div class="fact"><span>${label}</span><b>${value}</b></div>` : "");
  const skills = (j.key_skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const detail = (j.score_detail || "").split(" · ").filter(Boolean);

  $("#drawer").innerHTML = `
    <div class="dr-head">
      ${logo(j, 52)}
      <div class="dr-title"><h2>${esc(j.title)}</h2><span class="muted">${sub}</span></div>
      <button class="btn btn-icon" data-action="close" aria-label="Chiudi">✕</button>
    </div>
    <div class="dr-pills">${statusPill(j)}${matchTone(j.score) ? `<span class="pill tone-outline">Match ${esc(j.score)}</span>` : ""}
      ${j.role_fit ? `<span class="pill tone-outline">${esc(j.role_fit)}</span>` : ""}
      ${j.priority === "Alta" ? `<span class="pill tone-brand">Priorità alta</span>` : ""}</div>
    ${actionBox(j)}
    <div class="dr-links">
      ${j.job_url ? `<a class="btn btn-ghost btn-sm" href="${esc(j.job_url)}" target="_blank" rel="noopener">Vedi annuncio ↗</a>` : ""}
      ${j.cv_link ? `<a class="btn btn-ghost btn-sm" href="${esc(j.cv_link)}" target="_blank" rel="noopener">Apri il CV ↗</a>` : ""}
      ${j.apply_url && j.apply_url !== j.job_url ? `<a class="btn btn-ghost btn-sm" href="${esc(j.apply_url)}" target="_blank" rel="noopener">Pagina di candidatura ↗</a>` : ""}
    </div>

    <section class="dr-sec"><h3>Perché questo match</h3>
      <div class="score-row"><span class="score-big ${matchTone(j.score)}">${esc(j.score || "-")}</span>
      <ul class="detail">${detail.map((d) => `<li>${esc(d)}</li>`).join("") || `<li class="muted">Dettaglio non disponibile</li>`}</ul></div>
    </section>

    <section class="dr-sec"><h3>L'offerta in breve</h3>
      <div class="facts">
        ${fact("Anni richiesti", esc(j.years_required))}
        ${fact("RAL", j.salary ? `${esc(j.salary)} <span class="muted">(${esc(j.salary_type)})</span>` : "")}
        ${fact("Area", esc(j.category))}
        ${fact("Modalità", esc(j.work_mode))}
        ${fact("Pubblicata", esc(j.posted_date))}
        ${fact("Trovata", esc(j.found_date))}
        ${fact("Fonte", esc(j.source))}
        ${fact("Portale", esc(j.portal))}
      </div>
      ${j.salary_note ? `<p class="muted sm">${esc(j.salary_note)}</p>` : ""}
      ${j.min_qualifications ? `<h4>Requisiti minimi</h4><p>${esc(j.min_qualifications)}</p>` : ""}
      ${skills.length ? `<h4>Competenze chiave</h4><div class="chips">${skills.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : ""}
    </section>

    <section class="dr-sec"><h3>Gestione</h3>
      ${j.id ? `
      <div class="form-grid">
        <label class="field"><span>Stato</span>${statusSelect(j, "full")}</label>
        <label class="field"><span>Data candidatura</span><input type="date" id="f-applied" value="${toISO(j.applied_date)}"></label>
        <label class="field"><span>Prossimo step</span><input type="text" id="f-next" value="${esc(j.next_step)}"></label>
        <label class="field"><span>Data prossimo step</span><input type="date" id="f-next-date" value="${toISO(j.next_step_date)}"></label>
      </div>
      <label class="field"><span>Note</span><textarea id="f-notes" rows="4">${esc(j.notes)}</textarea></label>
      <button class="btn btn-primary" data-action="save" data-id="${esc(j.id)}">Salva modifiche</button>`
      : `<p class="muted">Riga aggiunta a mano: diventa modificabile da qui dopo il prossimo giro dell'agente.</p>`}
    </section>`;
}

function actionBox(j) {
  if (!j.id) return "";
  const reg = /^s[iì]/i.test(j.registration) ? `<div class="note note-amber">Serve un account su ${esc(j.portal || "questo portale")} per candidarti.</div>` : "";
  if (j.status === S.NEW && !j.decision) {
    if (state.rejecting) {
      return `<div class="action-box"><b>Perché no?</b><span class="muted sm">Il motivo insegna all'agente cosa non proporti.</span>
        <div class="chips pick">${REJECT_REASONS.map((r) => `<button class="chip${state.reason === r ? " on" : ""}" data-action="reason" data-reason="${esc(r)}">${esc(r)}</button>`).join("")}</div>
        <textarea id="f-reject-note" rows="2" placeholder="Nota per l'agente (facoltativa): cosa non ti convince"></textarea>
        <div class="row-btns"><button class="btn btn-primary" data-action="confirm-no" data-id="${esc(j.id)}" ${state.reason ? "" : "disabled"}>Scarta l'offerta</button>
        <button class="btn btn-ghost" data-action="cancel-no">Annulla</button></div></div>`;
    }
    return `<div class="action-box"><b>Ti interessa?</b><span class="muted sm">Con Y l'agente prepara il CV su misura stasera tra le 19 e le 23.</span>
      <div class="row-btns"><button class="btn btn-primary" data-action="yes" data-id="${esc(j.id)}">Sì, prepara il CV</button>
      <button class="btn btn-ghost" data-action="no">No</button></div></div>`;
  }
  if (j.status === S.NEW && /^y/i.test(j.decision)) {
    return `<div class="action-box tone-soft"><b>CV in preparazione</b><span class="muted sm">Arriva stasera tra le 19 e le 23, con un'email.</span>
      <div class="row-btns"><button class="btn btn-ghost btn-sm" data-action="undo" data-id="${esc(j.id)}">Annulla la Y</button></div></div>`;
  }
  if (j.status === S.CV_READY || j.status === S.CV_CHECK) {
    return `<div class="action-box"><b>${j.status === S.CV_CHECK ? "CV da ricontrollare prima dell'invio" : "Pronta da inviare"}</b>
      ${j.status === S.CV_CHECK ? `<div class="note note-red">Una frase non torna con il CV originale: il dettaglio è nelle note.</div>` : ""}${reg}
      <div class="row-btns">
        ${j.cv_link ? `<a class="btn btn-ghost" href="${esc(j.cv_link)}" target="_blank" rel="noopener">Scarica il CV</a>` : ""}
        ${j.apply_url || j.job_url ? `<a class="btn btn-ghost" href="${esc(j.apply_url || j.job_url)}" target="_blank" rel="noopener">Vai alla candidatura ↗</a>` : ""}
        <button class="btn btn-primary" data-action="applied" data-id="${esc(j.id)}">Ho inviato la candidatura</button></div></div>`;
  }
  if (j.next_step && !FINAL.has(j.status)) {
    const d = parseDate(j.next_step_date);
    return `<div class="action-box tone-soft"><b>Prossimo step: ${esc(j.next_step)}</b>
      ${d ? `<span class="${d < today() ? "late" : "muted"} sm">${esc(j.next_step_date)} · ${esc(relDate(j.next_step_date))}</span>` : ""}</div>`;
  }
  return "";
}

// ================================================================ writes
function appliedFields() {
  const t = today();
  return { status: S.APPLIED, applied_date: fmtDate(t), last_contact: fmtDate(t), next_step: FOLLOWUP_STEP,
    next_step_date: fmtDate(addDays(t, CONFIG.followupDays)) };
}

async function save(id, fields, message) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job || state.busy) return;
  const before = { ...job };
  Object.assign(job, fields);
  state.busy = true;
  renderAll();
  try {
    await state.store.update(id, fields);
    toast(message || "Salvato nel foglio.");
  } catch (e) {
    Object.assign(job, before);
    renderAll();
    toast(e.message, "error");
  } finally {
    state.busy = false;
  }
}

function statusFields(job, status) {
  if (status === S.APPLIED && !job.applied_date) return appliedFields();
  const f = { status };
  if (FINAL.has(status) || status === S.STANDBY) Object.assign(f, { next_step: "", next_step_date: "" });
  return f;
}

// ================================================================ events
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.tagName === "SELECT") return;
  const a = el.dataset.action;
  const id = el.dataset.id;
  if (a === "demo") return start(new DemoStore());
  if (a === "exit-demo") { location.href = location.pathname; return; }
  if (a === "save-sheet") {
    const m = ($("#sheet-link").value || "").match(/\/d\/([a-zA-Z0-9_-]{20,})/) || ($("#sheet-link").value || "").match(/^([a-zA-Z0-9_-]{30,})$/);
    if (!m) return toast("Incolla il link completo del foglio Google.", "error");
    store_set(SHEET_KEY, m[1]);
    return boot();
  }
  if (a === "change-sheet") { store_set(SHEET_KEY, null); return showSetup(); }
  if (a === "login") {
    try { await state.store.signIn("select_account"); await start(state.store); } catch (err) { showLogin(state.store, err.message); }
    return;
  }
  if (a === "logout") { state.store.signOut(); return showLogin(state.store); }
  if (a === "reload") return reload();
  if (a === "tab") {
    state.tab = el.dataset.tab;
    renderTabs();
    renderTable();
    if (el.classList.contains("kpi") || el.classList.contains("todo")) $(".list-card").scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (a === "open") { state.selected = id; state.rejecting = false; state.reason = ""; renderTable(); renderDrawer(); return; }
  if (a === "close") { state.selected = null; renderTable(); renderDrawer(); return; }
  if (a === "yes") return save(id, { decision: "Y" }, "Fatto: il CV su misura arriva stasera.");
  if (a === "undo") return save(id, { decision: "" }, "Y annullata.");
  if (a === "no") { state.rejecting = true; return renderDrawer(); }
  if (a === "cancel-no") { state.rejecting = false; state.reason = ""; return renderDrawer(); }
  if (a === "reason") { state.reason = el.dataset.reason; $("#drawer").querySelectorAll(".pick .chip").forEach((c) => c.classList.toggle("on", c === el)); $("[data-action=confirm-no]").disabled = false; return; }
  if (a === "confirm-no") {
    const job = state.jobs.find((j) => j.id === id);
    const note = ($("#f-reject-note")?.value || "").trim();
    const fields = { decision: "N", reject_reason: state.reason, status: S.STANDBY, next_step: "", next_step_date: "" };
    if (note) fields.notes = [job.notes, `Nota: ${note}`].filter(Boolean).join(" ");
    state.rejecting = false;
    state.reason = "";
    return save(id, fields, "Scartata. L'agente terrà conto del motivo.");
  }
  if (a === "applied") return save(id, appliedFields(), `Candidatura segnata: follow-up fra ${CONFIG.followupDays} giorni.`);
  if (a === "save") {
    const job = state.jobs.find((j) => j.id === id);
    const fields = {};
    const applied = fromISO($("#f-applied").value);
    const next = $("#f-next").value.trim();
    const nextDate = fromISO($("#f-next-date").value);
    const notes = $("#f-notes").value;
    if (applied !== (job.applied_date || "")) fields.applied_date = applied;
    if (next !== (job.next_step || "")) fields.next_step = next;
    if (nextDate !== (job.next_step_date || "")) fields.next_step_date = nextDate;
    if (notes !== (job.notes || "")) fields.notes = notes;
    if (!Object.keys(fields).length) return toast("Nessuna modifica da salvare.");
    return save(id, fields);
  }
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.action === "status") {
    const job = state.jobs.find((j) => j.id === el.dataset.id);
    if (job && el.value !== job.status) save(job.id, statusFields(job, el.value), `Stato: ${el.value}.`);
  } else if (el.id === "fit") { state.fit = el.value; renderTable(); }
  else if (el.id === "sort") { state.sort = el.value; renderTable(); }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "search") { state.q = e.target.value; renderTable(); }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.selected) { state.selected = null; renderTable(); renderDrawer(); }
  if (e.key === "Enter" && e.target.matches("tr[data-action=open]")) e.target.click();
});

// Logos that fail to load fall back to initials.
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.classList?.contains("logo-img")) {
    failedLogos.add(img.dataset.dom);
    const span = img.parentElement;
    span.classList.add("logo-ini");
    span.textContent = img.dataset.ini;
  }
}, true);

// Back on the tab after a while: fresh data.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.loadedAt && Date.now() - state.loadedAt > 5 * 60000 && !state.selected) reload(true);
});

let toastTimer;
function toast(msg, kind = "ok") {
  const t = $("#toast");
  if (!t) return alert(msg);
  t.textContent = msg;
  t.className = `toast show ${kind === "error" ? "toast-err" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), kind === "error" ? 6000 : 3000);
}

boot();
