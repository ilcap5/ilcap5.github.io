import { CONFIG } from "./config.js";
import { DemoStore, SheetsStore } from "./store.js";
import {
  APPLIED_STATUSES, FINAL, FOLLOWUP_STEP, INTERVIEWING, REJECT_REASONS, RESPONDED, S, STATUSES, STATUS_TONE, TABS,
  addDays, companyDomain, daysBetween, fmtDate, initials, longDate, matchTone, nextRun, parseDate, relDate, shortDate,
  today,
} from "./schema.js";

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SHEET_KEY = "jobscout.sheet";
const store_get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const store_set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } };

const state = {
  store: null, jobs: [], url: "", loadedAt: 0, tab: "all", q: "", fit: "", sort: "found",
  selected: null, rejecting: false, reason: "", busy: false, deepJob: null,
};

// ================================================================ icons (one stroke, one size)
const PATHS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  file: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>',
  question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.5a2.3 2.3 0 0 1 4.4.9c0 1.6-2.2 2-2.2 3.4"/><path d="M12 16.8v.2"/>',
  sheet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/>',
};
const icon = (name, size = 18) => `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;

// ================================================================ boot
function boot() {
  const params = new URLSearchParams(location.search);
  const sheetParam = params.get("sheet");
  if (sheetParam) store_set(SHEET_KEY, sheetParam);
  state.deepJob = params.get("job");
  if (params.get("tab") && TABS.some((t) => t.key === params.get("tab"))) state.tab = params.get("tab");
  if (sheetParam || state.deepJob || params.get("tab")) {
    history.replaceState(null, "", location.pathname + (params.has("demo") ? "?demo=1" : ""));
  }
  if (params.has("demo")) return start(new DemoStore());
  const sheetId = store_get(SHEET_KEY);
  if (!CONFIG.clientId || !sheetId) return showSetup();
  const store = new SheetsStore({ clientId: CONFIG.clientId, scope: CONFIG.scope, sheetId });
  if (store.signedIn) return start(store);
  showLogin(store);
}

function screen(html) {
  $("#app").innerHTML = `<div class="screen"><div class="screen-card">${brand()}${html}</div></div>`;
}

function brand() {
  return `<div class="brand"><img class="brand-mark" src="assets/mark-64.png" width="28" height="28" alt="">
    <span class="brand-name">JobScout<span>.ai</span></span></div>`;
}

function showSetup() {
  const noClient = !CONFIG.clientId;
  screen(`
    <h1>Le tue candidature, in un posto solo</h1>
    <p class="lead">Collega il foglio "Job Agent - Candidature". I dati restano nel tuo Google Drive: questa pagina
      li legge dal tuo browser, con il tuo account.</p>
    ${noClient ? `<div class="note note-amber">L'accesso con Google non è ancora configurato. Intanto puoi provarla con dati di esempio.</div>` : `
    <label class="field"><span>Link del foglio</span>
      <input id="sheet-link" type="url" inputmode="url" placeholder="https://docs.google.com/spreadsheets/d/..." autocomplete="off"></label>
    <button class="btn btn-primary btn-block" data-action="save-sheet">Collega il foglio</button>`}
    <button class="btn btn-quiet btn-block" data-action="demo">Prova con dati di esempio</button>`);
}

function showLogin(store, error = "") {
  screen(`
    <h1>${CONFIG.userName ? `Bentornato, ${esc(CONFIG.userName)}` : "Bentornato"}</h1>
    <p class="lead">Accedi con l'account Google che possiede il foglio delle candidature.</p>
    ${error ? `<div class="note note-red">${esc(error)}</div>` : ""}
    <button class="btn btn-primary btn-block" data-action="login">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      Accedi con Google</button>
    <button class="btn btn-quiet btn-block" data-action="change-sheet">Usa un altro foglio</button>`);
  state.store = store;
  store._gis().catch(() => {}); // loaded now, so the login popup opens straight from the click
}

async function start(store) {
  state.store = store;
  $("#app").innerHTML = shell();
  renderSkeleton();
  await reload(true);
}

async function reload(first = false) {
  document.body.classList.add("is-loading");
  try {
    const { jobs, url } = await state.store.load();
    state.jobs = jobs;
    state.url = url;
    state.loadedAt = Date.now();
    if (state.deepJob && jobs.some((j) => j.id === state.deepJob)) state.selected = state.deepJob;
    state.deepJob = null;
    if (state.selected && !jobs.some((j) => j.id === state.selected)) state.selected = null;
    renderAll();
  } catch (e) {
    if (state.store instanceof SheetsStore && !state.store.signedIn) return showLogin(state.store, e.message);
    if (first) $("#table").innerHTML = emptyState("Non riesco a leggere il foglio", e.message, `<button class="btn btn-quiet" data-action="reload">Riprova</button>`);
    toast(e.message, "error");
  } finally {
    document.body.classList.remove("is-loading");
  }
}

// ================================================================ layout
function shell() {
  return `
  <header class="topbar">
    <div class="topbar-in">
      ${brand()}
      <div class="topbar-actions" id="topbar-actions"></div>
    </div>
  </header>
  <main class="page">
    <section class="hero" id="hero"></section>
    <section class="kpis" id="kpis" aria-label="Indicatori"></section>
    <section class="insights" id="insights"></section>
    <section class="panel list-panel" aria-label="Offerte e candidature">
      <div class="list-head">
        <h2>Offerte e candidature</h2>
        <div class="list-tools">
          <label class="search">${icon("search", 16)}
            <input id="search" type="search" placeholder="Cerca azienda o ruolo" aria-label="Cerca azienda o ruolo"></label>
          <select id="fit" aria-label="Tipo di ruolo"></select>
          <select id="sort" aria-label="Ordina">
            <option value="found">Più recenti</option><option value="score">Match più alto</option>
            <option value="applied">Data di invio</option><option value="next">Prossimo passo</option>
          </select>
        </div>
      </div>
      <nav class="tabs" id="tabs" role="tablist" aria-label="Fasi"></nav>
      <div id="table"></div>
    </section>
    <p class="foot" id="foot"></p>
  </main>
  <div class="drawer-wrap" id="drawer-wrap" hidden>
    <div class="drawer-bg" data-action="close"></div>
    <aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Dettaglio offerta"></aside>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function renderSkeleton() {
  $("#hero").innerHTML = `<div class="sk sk-title"></div><div class="sk sk-line"></div>`;
  $("#kpis").innerHTML = Array.from({ length: 5 }, () => `<div class="kpi"><div class="sk sk-line short"></div><div class="sk sk-num"></div></div>`).join("");
  $("#table").innerHTML = Array.from({ length: 6 }, () => `<div class="sk-row"><div class="sk sk-logo"></div><div class="sk-col"><div class="sk sk-line"></div><div class="sk sk-line short"></div></div></div>`).join("");
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
    ${demo ? `<span class="badge">Dati di esempio</span>` : ""}
    <a class="btn btn-quiet btn-sm" href="profilo.html${demo ? "?demo=1" : ""}">Profilo</a>
    <button class="btn btn-icon" data-action="reload" title="Aggiorna" aria-label="Aggiorna">${icon("refresh")}</button>
    ${state.url ? `<a class="btn btn-icon" href="${esc(state.url)}" target="_blank" rel="noopener" title="Apri il foglio" aria-label="Apri il foglio">${icon("sheet")}</a>` : ""}
    <button class="btn btn-quiet btn-sm" data-action="${demo ? "exit-demo" : "logout"}">${demo ? "Esci dalla prova" : "Esci"}</button>`;
}

function renderHero() {
  const h = new Date().getHours();
  const hello = h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
  const name = CONFIG.userName ? `, ${esc(CONFIG.userName)}` : "";
  const c = counts();
  const parts = [];
  if (c.review.length) parts.push(`<b>${c.review.length}</b> ${c.review.length === 1 ? "offerta aspetta" : "offerte aspettano"} un tuo sì o no`);
  if (c.ready.length) parts.push(`<b>${c.ready.length}</b> ${c.ready.length === 1 ? "CV è pronto" : "CV sono pronti"} da inviare`);
  let line = parts.length ? parts.join(" e ") + "." : "Niente in sospeso: tocca alle aziende.";
  const next = nextRun();
  $("#hero").innerHTML = `
    <p class="hero-date">${esc(longDate())}</p>
    <h1>${hello}${name}</h1>
    <p class="hero-line">${line}${next ? ` <span class="muted">Prossima ricerca ${esc(next)}.</span>` : ""}</p>`;
}

// ================================================================ KPIs and insights
function counts() {
  const J = state.jobs;
  const applied = J.filter((j) => APPLIED_STATUSES.has(j.status));
  const t = today();
  return {
    review: J.filter((j) => j.status === S.NEW && !j.decision),
    reviewHigh: J.filter((j) => j.status === S.NEW && !j.decision && Number(j.score) >= 70),
    ready: J.filter((j) => j.status === S.CV_READY || j.status === S.CV_CHECK),
    preparing: J.filter((j) => j.status === S.NEW && /^y/i.test(j.decision)),
    applied,
    appliedWeek: applied.filter((j) => { const d = parseDate(j.applied_date); return d && daysBetween(d, t) <= 7; }),
    responded: J.filter((j) => RESPONDED.has(j.status)),
    interviewing: J.filter((j) => INTERVIEWING.has(j.status)),
    offers: J.filter((j) => j.status === S.OFFER),
    waiting: J.filter((j) => [S.APPLIED, S.FOLLOWUP_DUE, S.FOLLOWUP_SENT].includes(j.status)),
  };
}

function renderKpis() {
  const c = counts();
  const rate = c.applied.length ? Math.round((c.responded.length / c.applied.length) * 100) : null;
  const tiles = [
    ["Da valutare", c.review.length, c.reviewHigh.length ? `${c.reviewHigh.length} con match 70+` : "nessuna urgente", "review"],
    ["CV pronti", c.ready.length, c.preparing.length ? `${c.preparing.length} in arrivo stasera` : "da inviare", "ready"],
    ["Candidature", c.applied.length, c.appliedWeek.length ? `${c.appliedWeek.length} questa settimana` : "inviate in tutto", "applied"],
    ["Risposte", rate === null ? "-" : `${rate}%`, `${c.responded.length} su ${c.applied.length} candidature`, null],
    ["Colloqui", c.interviewing.length, c.offers.length ? `${c.offers.length} ${c.offers.length === 1 ? "offerta ricevuta" : "offerte ricevute"}` : "in corso", "interview"],
  ];
  $("#kpis").innerHTML = tiles.map(([label, value, sub, tab]) => {
    const tag = tab ? "button" : "div";
    return `<${tag} class="kpi" ${tab ? `data-action="tab" data-tab="${tab}"` : ""}>
      <span class="kpi-label">${label}</span><span class="kpi-value">${value}</span><span class="kpi-sub">${esc(sub)}</span></${tag}>`;
  }).join("");
}

function renderInsights() {
  const J = state.jobs;
  const c = counts();
  const stages = [
    ["Trovate", J.length],
    ["Scelte", J.filter((j) => /^y/i.test(j.decision) || APPLIED_STATUSES.has(j.status) || j.status === S.CV_READY || j.status === S.CV_CHECK).length],
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
      <span class="fn-track"><span class="fn-bar" style="--w:${n ? Math.max(2, (n / max) * 100) : 0}%"></span></span>
      <span class="fn-n">${n}</span><span class="fn-conv">${conv}</span></div>`;
  }).join("");

  const t = today();
  const scored = c.review.filter((j) => j.score !== "" && Number.isFinite(Number(j.score)));
  const avg = scored.length ? Math.round(scored.reduce((s, j) => s + Number(j.score), 0) / scored.length) : "-";
  const week = J.filter((j) => { const d = parseDate(j.found_date); return d && daysBetween(d, t) <= 7; }).length;
  const stats = `<div class="fn-stats">
    <div><b>${week}</b><span>trovate negli ultimi 7 giorni</span></div>
    <div><b>${avg}</b><span>match medio da valutare</span></div>
    <div><b>${c.waiting.length}</b><span>in attesa di risposta</span></div></div>`;

  // To do: grouped decisions first, then dated next steps.
  const todo = [];
  if (c.review.length) todo.push({ tab: "review", ic: "question", tone: "amber", title: c.review.length === 1 ? "Decidi su un'offerta nuova" : `Decidi su ${c.review.length} offerte nuove`, sub: "Sì e il CV arriva in serata, no con il motivo" });
  if (c.ready.length) todo.push({ tab: "ready", ic: "send", tone: "green", title: c.ready.length === 1 ? "Invia una candidatura" : `Invia ${c.ready.length} candidature`, sub: "il CV su misura è pronto" });
  J.filter((j) => j.next_step && !FINAL.has(j.status) && ![S.NEW, S.CV_READY, S.CV_CHECK, S.STANDBY].includes(j.status))
    .map((j) => ({ j, d: parseDate(j.next_step_date) }))
    .filter(({ d }) => d && daysBetween(t, d) <= 3)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .forEach(({ j, d }) => todo.push({ id: j.id, job: j, title: j.next_step, sub: `${j.company}, ${relDate(j.next_step_date)}`, late: d < t }));
  const todoHtml = todo.length ? todo.map((x) => `
    <button class="todo" data-action="${x.id ? "open" : "tab"}" ${x.id ? `data-id="${esc(x.id)}"` : `data-tab="${x.tab}"`}>
      ${x.job ? logo(x.job, 36) : `<span class="todo-ic tone-${x.tone}">${icon(x.ic, 18)}</span>`}
      <span class="todo-txt"><b>${esc(x.title)}</b><span class="${x.late ? "late" : "muted"}">${esc(x.sub)}</span></span>
      <span class="chev">${icon("chevron", 16)}</span></button>`).join("")
    : `<div class="empty-sm">${icon("check", 18)}<span>Niente in scadenza nei prossimi giorni.</span></div>`;

  $("#insights").innerHTML = `
    <div class="panel pad"><div class="panel-h"><h2>Da fare</h2></div><div class="todos">${todoHtml}</div></div>
    <div class="panel pad"><div class="panel-h"><h2>Andamento</h2><span class="muted sm">dalla ricerca all'offerta</span></div><div class="funnel">${funnel}</div>${stats}</div>`;
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

function statusLabel(job) {
  if (job.status === S.NEW && /^y/i.test(job.decision)) return "CV in arrivo";
  return job.status || "Senza stato";
}

function statusPill(job) {
  return `<span class="pill tone-${STATUS_TONE[job.status] || "grey"}">${esc(statusLabel(job))}</span>`;
}

function statusSelect(job, cls = "") {
  const opts = STATUSES.map((s) => `<option ${s === job.status ? "selected" : ""}>${esc(s)}</option>`).join("");
  return `<select class="status-select tone-${STATUS_TONE[job.status] || "grey"} ${cls}" data-action="status" data-id="${esc(job.id)}" aria-label="Stato di ${esc(job.title)}" ${job.id ? "" : "disabled"}>${opts}</select>`;
}

function matchBadge(score) {
  const tone = matchTone(score);
  return tone ? `<span class="match ${tone}" title="Match">${esc(score)}</span>` : `<span class="muted">-</span>`;
}

function salary(job) {
  if (!job.salary) return `<span class="muted">-</span>`;
  return `${esc(job.salary)}${job.salary_type === "Stima" ? `<span class="est">stima</span>` : ""}`;
}

// Quick decision right in the list: yes is one click, no opens the reasons (the agent learns from them).
function decision(j, compact = false) {
  if (j.status === S.NEW && !j.decision && j.id) {
    return `<div class="decide${compact ? " compact" : ""}">
      <button class="btn-yes" data-action="yes" data-id="${esc(j.id)}" aria-label="Sì, prepara il CV per ${esc(j.title)}">${icon("check", 15)} Sì</button>
      <button class="btn-no" data-action="quick-no" data-id="${esc(j.id)}" aria-label="No, scarta ${esc(j.title)}">${icon("close", 14)} No</button></div>`;
  }
  if (compact) return "";
  if (/^y/i.test(j.decision)) return `<span class="dec dec-yes">${icon("check", 15)} Sì</span>`;
  if (/^n/i.test(j.decision)) return `<span class="dec dec-no">No${j.reject_reason ? `<small>${esc(j.reject_reason)}</small>` : ""}</span>`;
  return `<span class="muted">-</span>`;
}

function emptyState(title, text, action = "") {
  return `<div class="empty"><b>${esc(title)}</b><span>${esc(text)}</span>${action}</div>`;
}

function renderTable() {
  const jobs = visibleJobs();
  if (!state.jobs.length) {
    $("#table").innerHTML = emptyState("Ancora nessuna offerta", `Le prime arrivano con la ricerca di ${nextRun() || "lunedì, mercoledì e venerdì"}.`);
    $("#foot").textContent = "";
    return;
  }
  if (!jobs.length) {
    const filtered = state.q || state.fit;
    $("#table").innerHTML = filtered
      ? emptyState("Nessun risultato", "Nessuna offerta corrisponde alla ricerca o al filtro.", `<button class="btn btn-quiet btn-sm" data-action="clear-filters">Togli i filtri</button>`)
      : emptyState("Qui non c'è niente", "Le offerte compaiono in questa scheda quando arrivano a questa fase.");
    return;
  }
  const rows = jobs.map((j) => {
    const prep = j.status === S.NEW && /^y/i.test(j.decision);
    return `<tr data-action="open" data-id="${esc(j.id)}" tabindex="0" class="${state.selected === j.id ? "sel" : ""}">
      <td class="c-job"><div class="job">${logo(j)}<div class="job-txt"><b>${esc(j.title)}</b><span>${esc(j.company)}</span>
        <span class="show-sm">${decision(j, true) || statusPill(j)}</span></div></div></td>
      <td class="c-dec hide-sm">${decision(j)}</td>
      <td class="c-status hide-sm">${statusSelect(j)}${prep ? `<span class="sub-tag">CV in arrivo stasera</span>` : ""}</td>
      <td class="c-match">${matchBadge(j.score)}</td>
      <td class="c-city hide-md">${esc(j.city)}${j.work_mode ? `<span class="muted block">${esc(j.work_mode)}</span>` : ""}</td>
      <td class="c-ral hide-md">${salary(j)}</td>
      <td class="c-date hide-sm">${esc(shortDate(j.found_date)) || `<span class="muted">-</span>`}</td>
      <td class="c-date hide-sm">${esc(shortDate(j.applied_date)) || `<span class="muted">-</span>`}</td>
    </tr>`;
  }).join("");
  $("#table").innerHTML = `<table class="jobs">
    <thead><tr><th>Offerta</th><th class="hide-sm">Ti interessa?</th><th class="hide-sm">Stato</th><th>Match</th><th class="hide-md">Città</th><th class="hide-md">RAL</th>
      <th class="hide-sm">Trovata</th><th class="hide-sm">Inviata</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
  const time = new Date(state.loadedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  $("#foot").textContent = `${jobs.length} di ${state.jobs.length} offerte. Aggiornato alle ${time}.`;
}

// ================================================================ drawer
const toISO = (s) => { const d = parseDate(s); return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : ""; };
const fromISO = (s) => (s ? fmtDate(parseDate(s)) : "");

function renderDrawer() {
  const wrap = $("#drawer-wrap");
  const j = state.jobs.find((x) => x.id === state.selected);
  if (!j) {
    if (!wrap.hidden) {
      wrap.classList.add("closing");
      setTimeout(() => { wrap.hidden = true; wrap.classList.remove("closing"); }, 180);
    }
    document.body.classList.remove("no-scroll");
    return;
  }
  const opening = wrap.hidden;
  wrap.hidden = false;
  document.body.classList.add("no-scroll");
  const where = [j.company, j.city, j.work_mode].filter(Boolean).map(esc).join(", ");
  const fact = (label, value) => (value ? `<div class="fact"><span>${label}</span><b>${value}</b></div>` : "");
  const skills = (j.key_skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const detail = (j.score_detail || "").split(" · ").filter(Boolean);
  const scrollTop = $("#drawer").scrollTop;

  $("#drawer").innerHTML = `
    <div class="dr-head">
      ${logo(j, 52)}
      <div class="dr-title"><h2>${esc(j.title)}</h2><p>${where}</p></div>
      <button class="btn btn-icon" data-action="close" aria-label="Chiudi">${icon("close")}</button>
    </div>
    <div class="dr-pills">${statusPill(j)}${j.role_fit ? `<span class="pill tone-line">${esc(j.role_fit)}</span>` : ""}
      ${j.priority === "Alta" ? `<span class="pill tone-line strong">Priorità alta</span>` : ""}</div>
    ${actionBox(j)}

    <section class="dr-sec">
      <div class="score-row"><span class="score-big ${matchTone(j.score)}">${esc(j.score || "-")}</span>
        <div><h3>Perché questo match</h3>
        <ul class="detail">${detail.map((d) => `<li>${esc(d)}</li>`).join("") || `<li class="muted">Dettaglio non disponibile</li>`}</ul></div></div>
    </section>

    <section class="dr-sec"><h3>L'offerta in breve</h3>
      <div class="facts">
        ${fact("Anni richiesti", esc(j.years_required))}
        ${fact("RAL", j.salary ? `${esc(j.salary)}${j.salary_type === "Stima" ? ` <span class="muted">stimata</span>` : ""}` : "")}
        ${fact("Area", esc(j.category))}
        ${fact("Modalità", esc(j.work_mode))}
        ${fact("Pubblicata il", esc(j.posted_date))}
        ${fact("Trovata il", esc(j.found_date))}
        ${fact("Fonte", esc(j.source))}
        ${fact("Portale", esc(j.portal))}
      </div>
      ${j.salary_note ? `<p class="small muted">${esc(j.salary_note)}</p>` : ""}
      ${j.min_qualifications ? `<h4>Requisiti minimi</h4><p class="prose">${esc(j.min_qualifications)}</p>` : ""}
      ${skills.length ? `<h4>Competenze chiave</h4><div class="chips">${skills.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : ""}
      <div class="dr-links">
        ${j.job_url ? `<a class="link" href="${esc(j.job_url)}" target="_blank" rel="noopener">Leggi l'annuncio ${icon("external", 15)}</a>` : ""}
        ${j.cv_link ? `<a class="link" href="${esc(j.cv_link)}" target="_blank" rel="noopener">Apri il CV ${icon("external", 15)}</a>` : ""}
      </div>
    </section>

    <section class="dr-sec"><h3>Gestione</h3>
      ${j.id ? `
      <div class="form-grid">
        <label class="field"><span>Stato</span>${statusSelect(j, "full")}</label>
        <label class="field"><span>Data di invio</span><input type="date" id="f-applied" value="${toISO(j.applied_date)}"></label>
        <label class="field"><span>Prossimo passo</span><input type="text" id="f-next" value="${esc(j.next_step)}"></label>
        <label class="field"><span>Entro il</span><input type="date" id="f-next-date" value="${toISO(j.next_step_date)}"></label>
      </div>
      <label class="field"><span>Note</span><textarea id="f-notes" rows="4">${esc(j.notes)}</textarea></label>
      <button class="btn btn-quiet" data-action="save" data-id="${esc(j.id)}">Salva le modifiche</button>`
      : `<p class="muted">Riga aggiunta a mano: diventa modificabile da qui dopo il prossimo giro dell'agente.</p>`}
    </section>`;
  if (opening) {
    wrap.classList.add("opening");
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.remove("opening")));
    $("#drawer").scrollTop = 0;
    $("#drawer").focus({ preventScroll: true });
  } else {
    $("#drawer").scrollTop = scrollTop;
  }
}

function actionBox(j) {
  if (!j.id) return "";
  const reg = /^s[iì]/i.test(j.registration) ? `<p class="small amber">Per candidarti serve un account su ${esc(j.portal || "questo portale")}.</p>` : "";
  if (j.status === S.NEW && !j.decision) {
    if (state.rejecting) {
      return `<div class="action-box"><b>Cosa non ti convince?</b><p class="small muted">Il motivo insegna all'agente cosa non proporti più.</p>
        <div class="chips pick">${REJECT_REASONS.map((r) => `<button class="chip${state.reason === r ? " on" : ""}" data-action="reason" data-reason="${esc(r)}">${esc(r)}</button>`).join("")}</div>
        <textarea id="f-reject-note" rows="2" aria-label="Nota per l'agente" placeholder="Una riga per l'agente, se vuoi"></textarea>
        <div class="row-btns"><button class="btn btn-primary" data-action="confirm-no" data-id="${esc(j.id)}" ${state.reason ? "" : "disabled"}>Scarta l'offerta</button>
        <button class="btn btn-quiet" data-action="cancel-no">Annulla</button></div></div>`;
    }
    return `<div class="action-box"><b>Ti interessa?</b><p class="small muted">Con un sì l'agente prepara il CV su misura stasera, tra le 19 e le 23.</p>
      <div class="row-btns"><button class="btn btn-primary" data-action="yes" data-id="${esc(j.id)}">${icon("check", 17)} Sì, prepara il CV</button>
      <button class="btn btn-quiet" data-action="no">No</button></div></div>`;
  }
  if (j.status === S.NEW && /^y/i.test(j.decision)) {
    return `<div class="action-box soft"><b>Il CV è in preparazione</b><p class="small">Arriva stasera tra le 19 e le 23, insieme a un'email.</p>
      <div class="row-btns"><button class="btn btn-quiet btn-sm" data-action="undo" data-id="${esc(j.id)}">Ho cambiato idea</button></div></div>`;
  }
  if (j.status === S.CV_READY || j.status === S.CV_CHECK) {
    return `<div class="action-box"><b>${j.status === S.CV_CHECK ? "Ricontrolla il CV prima di inviarlo" : "Il CV è pronto: puoi candidarti"}</b>
      ${j.status === S.CV_CHECK ? `<p class="small red">Una frase non torna con il CV originale: il dettaglio è nelle note qui sotto.</p>` : ""}${reg}
      <div class="row-btns">
        ${j.cv_link ? `<a class="btn btn-quiet" href="${esc(j.cv_link)}" target="_blank" rel="noopener">${icon("file", 17)} Apri il CV</a>` : ""}
        ${j.apply_url || j.job_url ? `<a class="btn btn-quiet" href="${esc(j.apply_url || j.job_url)}" target="_blank" rel="noopener">Vai alla candidatura ${icon("external", 15)}</a>` : ""}
        <button class="btn btn-primary" data-action="applied" data-id="${esc(j.id)}">${icon("send", 17)} Ho inviato la candidatura</button></div></div>`;
  }
  if (j.next_step && !FINAL.has(j.status)) {
    const d = parseDate(j.next_step_date);
    return `<div class="action-box soft"><b>Prossimo passo: ${esc(j.next_step)}</b>
      ${d ? `<p class="small ${d < today() ? "red" : "muted"}">${esc(relDate(j.next_step_date))}, ${esc(j.next_step_date)}</p>` : ""}</div>`;
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
    toast(message || "Salvato.");
  } catch (e) {
    Object.assign(job, before);
    renderAll();
    toast(`Non salvato: ${e.message}`, "error");
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
    const v = $("#sheet-link").value || "";
    const m = v.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || v.match(/^([a-zA-Z0-9_-]{30,})$/);
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
  if (a === "clear-filters") { state.q = ""; state.fit = ""; renderFilters(); renderTable(); return; }
  if (a === "tab") {
    state.tab = el.dataset.tab;
    renderTabs();
    renderTable();
    if (el.classList.contains("kpi") || el.classList.contains("todo")) $(".list-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (a === "open") { state.selected = id; state.rejecting = false; state.reason = ""; renderTable(); renderDrawer(); return; }
  if (a === "close") { state.selected = null; renderTable(); renderDrawer(); return; }
  if (a === "yes") return save(id, { decision: "Y" }, "Fatto: il CV su misura arriva stasera.");
  if (a === "undo") return save(id, { decision: "" }, "Va bene, l'offerta torna da valutare.");
  if (a === "no") { state.rejecting = true; return renderDrawer(); }
  if (a === "quick-no") { state.selected = id; state.rejecting = true; state.reason = ""; renderTable(); renderDrawer(); return; }
  if (a === "cancel-no") { state.rejecting = false; state.reason = ""; return renderDrawer(); }
  if (a === "reason") {
    state.reason = el.dataset.reason;
    $("#drawer").querySelectorAll(".pick .chip").forEach((c) => c.classList.toggle("on", c === el));
    $("[data-action=confirm-no]").disabled = false;
    return;
  }
  if (a === "confirm-no") {
    const job = state.jobs.find((j) => j.id === id);
    const note = ($("#f-reject-note")?.value || "").trim();
    const fields = { decision: "N", reject_reason: state.reason, status: S.STANDBY, next_step: "", next_step_date: "" };
    if (note) fields.notes = [job.notes, `Nota: ${note}`].filter(Boolean).join(" ");
    state.rejecting = false;
    state.reason = "";
    return save(id, fields, "Scartata. Me lo ricordo per le prossime ricerche.");
  }
  if (a === "applied") return save(id, appliedFields(), `Segnata come inviata. Il follow-up è fra ${CONFIG.followupDays} giorni.`);
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
    if (!Object.keys(fields).length) return toast("Non c'è niente di nuovo da salvare.");
    return save(id, fields, "Modifiche salvate.");
  }
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.action === "status") {
    const job = state.jobs.find((j) => j.id === el.dataset.id);
    if (job && el.value !== job.status) save(job.id, statusFields(job, el.value), `Stato aggiornato: ${el.value}.`);
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
  if (document.visibilityState === "visible" && state.loadedAt && Date.now() - state.loadedAt > 5 * 60000 && !state.selected) reload();
});

let toastTimer;
function toast(msg, kind = "ok") {
  const t = $("#toast");
  if (!t) return alert(msg);
  t.innerHTML = `${kind === "error" ? "" : icon("check", 17)}<span>${esc(msg)}</span>`;
  t.className = `toast show ${kind === "error" ? "toast-err" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), kind === "error" ? 6000 : 3200);
}

boot();
