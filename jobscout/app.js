import { accountButton, initAccount } from "./account.js?v=202610151626";
import { initAssistant, luMark, openAssistant, showLu } from "./assistant.js?v=202610151626";
import { CONFIG } from "./config.js?v=202610151626";
import { DemoStore, SheetsStore } from "./store.js?v=202610151626";
import { INSIGHTS_KEY, marketHtml, parseInsights } from "./market.js?v=202610151626";
import { bellButton, buildNotifications, initBell, refreshBell } from "./notify.js?v=202610151626";
import { docHtml, drawSpend, parseProject, projectHtml, spendData, spendHtml } from "./project.js?v=202610151626";
import {
  APPLIED_STATUSES, FINAL, FOLLOWUP_STEP, INTERVIEWING, REJECT_EFFECTS, REJECT_REASONS, RESPONDED, S, STATUSES, STATUS_TONE, TABS,
  addDays, companyDomain, daysBetween, fmtDate, initials, longDate, matchTone, nextRun, parseDate, relDate, shortDate,
  today,
} from "./schema.js?v=202610151626";

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SHEET_KEY = "jobscout.sheet";
const store_get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const store_set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } };

const state = {
  store: null, jobs: [], url: "", loadedAt: 0, tab: "all", q: "", fit: "", sort: "found",
  logos: {}, view: "jobs", ptab: "overview", project: null, seen: new Set(), doc: null, selected: null, rejecting: false, reason: "", busy: false, deepJob: null,
};

// ================================================================ icons (one stroke, one size)
const PATHS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.85.85c0 1.7-2.45 2.2-2.45 3.6"/><path d="M12 17h.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  file: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>',
  question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.5a2.3 2.3 0 0 1 4.4.9c0 1.6-2.2 2-2.2 3.4"/><path d="M12 16.8v.2"/>',
  sheet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/>',
  chat: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 9.5h8M8 12.5h5"/>',
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
  showLu(false);
  $("#app").innerHTML = `<main class="screen"><div class="screen-card">${brand()}${html}</div>
    <nav class="legal" aria-label="Informazioni legali"><a href="faq.html">Domande frequenti</a><a href="../privacy.html">Privacy</a><a href="../cookie.html">Cookie</a><a href="../termini.html">Termini</a></nav></main>`;
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
  if (first) state.logos = readLogos();
  document.body.classList.add("is-loading");
  try {
    const [{ jobs, url }, projectRows, seen, market] = await Promise.all([
      state.store.load(),
      state.store.loadProject().catch(() => null),
      first ? state.store.getState(SEEN_KEY).catch(() => "") : Promise.resolve(null),
      state.store.getState(INSIGHTS_KEY).catch(() => ""),
    ]);
    state.jobs = jobs;
    state.market = parseInsights(market);
    state.project = parseProject(projectRows);
    if (!state.project && state.view === "project") state.view = "jobs";
    if (seen !== null) { try { state.seen = new Set(JSON.parse(seen || "[]")); } catch { state.seen = new Set(); } }
    state.url = url;
    state.loadedAt = Date.now();
    if (state.deepJob && jobs.some((j) => j.id === state.deepJob)) state.selected = state.deepJob;
    state.deepJob = null;
    if (state.selected && !jobs.some((j) => j.id === state.selected)) state.selected = null;
    renderAll();
    loadLogos();
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
      <nav class="views" id="views" aria-label="Viste" hidden></nav>
      <div class="topbar-actions" id="topbar-actions"></div>
    </div>
  </header>
  <main class="page" id="view-project" hidden></main>
  <main class="page" id="view-jobs">
    <section class="hero" id="hero"></section>
    <section class="kpis" id="kpis" aria-label="Indicatori"></section>
    <section class="insights" id="insights"></section>
    <section class="market" id="market" aria-label="Il tuo mercato" hidden></section>
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
      <div class="tabs-wrap"><nav class="tabs" id="tabs" role="tablist" aria-label="Fasi"></nav><span class="tab-ind" id="tab-ind" aria-hidden="true"></span></div>
      <div id="table"></div>
    </section>
    <p class="foot" id="foot"></p>
    <nav class="legal" aria-label="Informazioni legali"><a href="faq.html">Domande frequenti</a><a href="../privacy.html">Privacy</a><a href="../cookie.html">Cookie</a><a href="../termini.html">Termini</a></nav>
  </main>
  <div class="drawer-wrap" id="drawer-wrap" hidden>
    <div class="drawer-bg" data-action="close"></div>
    <div class="drawer" id="drawer" role="dialog" aria-label="Dettaglio offerta"></div>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function renderSkeleton() {
  $("#hero").innerHTML = `<div class="sk sk-title"></div><div class="sk sk-line"></div>`;
  $("#kpis").innerHTML = Array.from({ length: 5 }, () => `<div class="kpi"><div class="sk sk-line short"></div><div class="sk sk-num"></div></div>`).join("");
  $("#table").innerHTML = Array.from({ length: 6 }, () => `<div class="sk-row"><div class="sk sk-logo"></div><div class="sk-col"><div class="sk sk-line"></div><div class="sk sk-line short"></div></div></div>`).join("");
}

function renderAll() {
  showLu(true);
  renderTop();
  renderViews();
  if (state.view === "project") { renderProject(); renderDrawer(); return; }
  renderHero();
  renderKpis();
  renderInsights();
  renderMarket();
  renderFilters();
  renderTabs();
  renderTable();
  renderDrawer();
}

function renderTop() {
  const demo = state.store instanceof DemoStore;
  $("#topbar-actions").innerHTML = `
    ${demo ? `<span class="badge">Dati di esempio</span>` : ""}
    ${bellButton(unreadCount())}
    <button class="btn btn-icon" data-action="reload" title="Aggiorna" aria-label="Aggiorna">${icon("refresh")}</button>
    ${accountButton()}`;
  initBell({ items: notifications, seen: (id) => state.seen.has(id), onPick: pickNotification, onMarkAll: markAllSeen });
  initAccount({
    store: state.store, demo, sheetUrl: state.url, here: "dashboard",
    onExitDemo: () => { location.href = location.pathname; },
    onSignOut: () => { state.store.signOut(); showLogin(state.store); },
    onSwitch: async () => {
      try { await state.store.signIn("select_account"); await start(state.store); } catch (err) { toast(err.message, "error"); }
    },
  });
}

// ================================================================ views, project, notifications
const SEEN_KEY = "notif_seen_v1";
let seenTimer = null;

function notifications() { return buildNotifications(state.jobs, state.project); }
function unreadCount() { return notifications().filter((n) => !state.seen.has(n.id)).length; }

// Read notifications are kept in the sheet (Stato), so they stay read on every device.
function markSeen(ids) {
  let changed = false;
  for (const id of ids) if (!state.seen.has(id)) { state.seen.add(id); changed = true; }
  if (!changed) return;
  clearTimeout(seenTimer);
  seenTimer = setTimeout(() => {
    state.store.setState(SEEN_KEY, JSON.stringify([...state.seen].slice(-500))).catch(() => { /* retried at the next change */ });
  }, 700);
  renderTop();
  refreshBell();
  if (state.view === "project") renderProject();
}
function markAllSeen() { markSeen(notifications().map((n) => n.id)); }
function markJobSeen(jobId) { markSeen(notifications().filter((n) => n.go.job === jobId).map((n) => n.id)); }

function pickNotification(n) {
  markSeen([n.id]);
  if (n.go.url) { window.open(n.go.url, "_blank", "noopener"); return; }
  if (n.go.doc) { state.doc = n.go.doc; state.selected = null; if (state.view !== "project") setView("project"); renderDrawer(); return; }
  if (state.view !== "jobs") setView("jobs");
  if (n.go.job) { state.selected = n.go.job; state.rejecting = false; state.reason = ""; renderTable(); renderDrawer(); return; }
  if (n.go.tab) { state.tab = n.go.tab; renderTabs(); renderTable(); $(".list-panel").scrollIntoView({ behavior: "smooth", block: "start" }); }
}

function renderViews() {
  const nav = $("#views");
  nav.hidden = !state.project;
  if (!state.project) return;
  const docsNew = state.project.docs.some((d) => !state.seen.has(`doc:${d.id}`) && notifications().some((n) => n.id === `doc:${d.id}`));
  nav.innerHTML = [["jobs", "Candidature"], ["project", "Progetto"]].map(([k, label]) =>
    `<button class="view-btn${state.view === k ? " on" : ""}" data-action="view" data-view="${k}" aria-pressed="${state.view === k}">${label}${k === "project" && docsNew ? `<span class="view-dot" aria-hidden="true"></span>` : ""}</button>`).join("");
}

function setView(v) {
  state.view = v;
  $("#view-jobs").hidden = v !== "jobs";
  $("#view-project").hidden = v !== "project";
  if (v === "jobs") { state.doc = null; renderAll(); } else { state.selected = null; renderAll(); }
  window.scrollTo({ top: 0 });
}

function renderProject() {
  $("#view-jobs").hidden = true;
  $("#view-project").hidden = false;
  $("#view-project").innerHTML = projectHtml(state.project, state.ptab, (docId) =>
    notifications().some((n) => n.id === `doc:${docId}`) && !state.seen.has(`doc:${docId}`));
  renderSpend();
}

// Spend chart of the overview: the "Costi" tab is read when the project view is first opened.
async function renderSpend() {
  const box = $("#spend");
  if (!box) return;
  if (!state.costs) {
    box.innerHTML = `<div class="panel-h"><h2>Spesa API</h2></div><div class="sk sk-line"></div>`;
    state.costs = await state.store.loadCosts().catch(() => []);
    if (!$("#spend")) return;
  }
  const data = spendData(state.costs, state.project?.budget);
  $("#spend").innerHTML = spendHtml(data);
  drawSpend($("#sp-chart"), data);
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
  const cta = c.review.length
    ? `<button class="btn btn-primary hero-cta" data-action="tab" data-tab="review">Valuta le offerte${icon("chevron", 16)}</button>`
    : c.ready.length ? `<button class="btn btn-primary hero-cta" data-action="tab" data-tab="ready">Vedi i CV pronti${icon("chevron", 16)}</button>` : "";
  $("#hero").innerHTML = `
    <div class="hero-txt">
      <p class="hero-date">${esc(longDate())}</p>
      <h1>${hello}${name}</h1>
      <p class="hero-line">${line}${next ? ` <span class="muted">Prossima ricerca ${esc(next)}.</span>` : ""}</p>
    </div>${cta}`;
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

// Funnel of the last run, market salary, most frequent gaps (Stato > insights_v1): hidden until the agent writes them.
function renderMarket() {
  const el = $("#market");
  el.innerHTML = marketHtml(state.market);
  el.hidden = !state.market;
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
  placeTabIndicator();
}

// One underline that slides to the selected tab: it shows where you moved from and to.
function placeTabIndicator() {
  const on = $("#tabs .tab.on"), ind = $("#tab-ind");
  if (!on || !ind) return;
  const x = on.offsetLeft - $("#tabs").scrollLeft + 9;
  ind.style.width = `${Math.max(0, on.offsetWidth - 18)}px`;
  ind.style.transform = `translateX(${x}px)`;
  if (!ind.classList.contains("ready")) requestAnimationFrame(() => ind.classList.add("ready"));
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

// Company logo: the icon comes from our API (it fetches it from the company website, the page never calls a logo
// service), the initials stay while it loads or when the company has none.
function logo(job, size = 40) {
  const dom = companyDomain(job);
  const url = dom && state.logos[dom]?.u;
  if (url) return `<span class="logo" style="--s:${size}px" aria-hidden="true"><img src="${esc(url)}" alt=""></span>`;
  return `<span class="logo logo-ini" style="--s:${size}px" aria-hidden="true"${dom ? ` data-dom="${esc(dom)}"` : ""}>${esc(initials(job.company))}</span>`;
}

// ================================================================ logos
const LOGO_KEY = "jobscout.logos.v1";
const LOGO_DAYS = 14;   // a found icon is asked again after two weeks
const NOLOGO_DAYS = 3;  // a company without icon is asked again after three days

function readLogos() {
  try {
    const all = JSON.parse(localStorage.getItem(LOGO_KEY) || "{}");
    const now = Date.now();
    return Object.fromEntries(Object.entries(all).filter(([, v]) => v && now - v.t < (v.u ? LOGO_DAYS : NOLOGO_DAYS) * 864e5));
  } catch { return {}; }
}

function writeLogos() {
  try { localStorage.setItem(LOGO_KEY, JSON.stringify(state.logos)); } catch { /* full or blocked: they stay in memory */ }
}

async function loadLogos() {
  if (!CONFIG.apiUrl && !(state.store instanceof DemoStore)) return;
  const missing = [...new Set(state.jobs.map(companyDomain).filter((d) => d && !state.logos[d]))].slice(0, 80);
  if (!missing.length) return;
  try {
    const { logos = {} } = await state.store.api(CONFIG.apiUrl, "/v1/logos", { domains: missing }, false);
    const t = Date.now();
    for (const d of missing) state.logos[d] = { u: typeof logos[d] === "string" && logos[d].startsWith("data:image/") ? logos[d] : "", t };
    writeLogos();
    paintLogos();
  } catch { /* initials stay: the logos are a nicety */ }
}

// Swap the initials already on screen for the icons just arrived, without redrawing (keeps focus and typing).
function paintLogos() {
  document.querySelectorAll(".logo-ini[data-dom]").forEach((el) => {
    const url = state.logos[el.dataset.dom]?.u;
    if (!url) return;
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    el.classList.remove("logo-ini");
    el.removeAttribute("data-dom");
    el.replaceChildren(img);
  });
}

function statusLabel(job) {
  if (job.status === S.NEW && /^y/i.test(job.decision)) return "CV in arrivo";
  return job.status || "Senza stato";
}

function statusPill(job) {
  return `<span class="pill st tone-${STATUS_TONE[job.status] || "grey"}">${esc(statusLabel(job))}</span>`;
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
  const tog = decisionToggle(j);
  if (tog) return tog;
  if (compact) return "";
  if (/^y/i.test(j.decision)) return `<span class="dec dec-yes">${icon("check", 15)} Sì</span>`;
  if (/^n/i.test(j.decision)) return `<span class="dec dec-no">No${j.reject_reason ? `<small>${esc(j.reject_reason)}</small>` : ""}</span>`;
  return `<span class="muted">-</span>`;
}

// Sì / No switch, same in the list and in the detail: the chosen answer is filled (green yes, red no) and a click on
// the other one changes it. A no always asks for the reason; a yes can change until the application is sent.
function decisionToggle(j, big = false) {
  const open = j.status === S.NEW && !j.decision;
  if (!j.id || !(open || canSwitchToNo(j) || canSwitchToYes(j))) return "";
  const pending = big && state.rejecting;
  const yes = /^y/i.test(j.decision) && !pending;
  const no = /^n/i.test(j.decision) || pending;
  const yesAction = open ? "yes" : /^n/i.test(j.decision) ? "to-yes" : pending ? "cancel-no" : "";
  const noAction = no ? "" : big ? "no" : "quick-no";
  const who = big ? "" : `: ${esc(j.title)}`;
  return `<div class="decide${big ? " big" : ""}" role="group" aria-label="Ti interessa${who}?">
    <button class="btn-yes" ${yesAction ? `data-action="${yesAction}" data-id="${esc(j.id)}"` : ""} aria-pressed="${yes}" aria-label="Sì${who}">${icon("check", big ? 17 : 15)} Sì</button>
    <button class="btn-no" ${noAction ? `data-action="${noAction}" data-id="${esc(j.id)}"` : ""} aria-pressed="${no}" aria-label="No${who}${j.reject_reason && /^n/i.test(j.decision) ? `, motivo: ${esc(j.reject_reason)}` : ""}"${j.reject_reason && /^n/i.test(j.decision) ? ` title="Motivo: ${esc(j.reject_reason)}"` : ""}>${icon("close", big ? 16 : 14)} No</button></div>`;
}

// A yes can still become a no until the application is sent (then the status is "Ritirata da me").
function canSwitchToNo(j) {
  return Boolean(j.id) && /^y/i.test(j.decision) && [S.NEW, S.CV_READY, S.CV_CHECK].includes(j.status);
}

// A no can become a yes while the offer is still open (not expired or closed).
function canSwitchToYes(j) {
  return Boolean(j.id) && /^n/i.test(j.decision) && [S.NEW, S.STANDBY].includes(j.status);
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
  const doc = state.doc && state.project?.docs.find((d) => d.id === state.doc);
  if (doc) {
    const opening = wrap.hidden;
    wrap.hidden = false;
    document.body.classList.add("no-scroll");
    $("#drawer").setAttribute("aria-label", "Documento del progetto");
    $("#drawer").innerHTML = docHtml(doc);
    markSeen([`doc:${doc.id}`]);
    if (opening) {
      wrap.classList.add("opening");
      requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.remove("opening")));
      $("#drawer").scrollTop = 0;
      $("#drawer [data-action=close]")?.focus({ preventScroll: true });
    }
    return;
  }
  $("#drawer").setAttribute("aria-label", "Dettaglio offerta");
  const j = state.jobs.find((x) => x.id === state.selected);
  if (!j) {
    if (!wrap.hidden) {
      wrap.classList.add("closing");
      setTimeout(() => { wrap.hidden = true; wrap.classList.remove("closing"); }, 180);
      // Back to the row the detail was opened from, so keyboard users keep their place.
      const row = state.returnFocus && document.querySelector(`tr[data-id="${CSS.escape(state.returnFocus)}"]`);
      row?.focus({ preventScroll: true });
      state.returnFocus = null;
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
    <p class="small dr-ask"><button class="linkish" data-action="assistant" data-id="${esc(j.id)}"><span class="lu-mini">${luMark(16)}</span>Dubbi su questa offerta? Chiedi a Lu</button></p>

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
    state.returnFocus = j.id;
    $("#drawer [data-action=close]")?.focus({ preventScroll: true });
    $("#drawer").focus({ preventScroll: true });
  } else {
    $("#drawer").scrollTop = scrollTop;
  }
}

// The reasons for a no: same for a first no and for a yes that becomes a no.
function rejectFields(j) {
  const was = /^y/i.test(j.decision);
  return `<p class="small muted">${was ? `Cosa è cambiato? Il motivo decide cosa impara l'agente${j.cv_link ? "; il CV già pronto resta su Drive" : ""}.` : "Cosa non ti convince? Il motivo decide cosa impara l'agente."}</p>
    <div class="chips pick">${REJECT_REASONS.map((r) => `<button class="chip${state.reason === r ? " on" : ""}" data-action="reason" data-reason="${esc(r)}" aria-pressed="${state.reason === r}">${esc(r)}</button>`).join("")}</div>
    <p class="small muted" id="reject-effect" aria-live="polite">${state.reason ? esc(REJECT_EFFECTS[state.reason] || "") : "Scegli un motivo."}</p>
    <textarea id="f-reject-note" rows="2" aria-label="Nota per l'agente" placeholder="Una riga per l'agente, se vuoi"></textarea>
    <div class="row-btns"><button class="btn btn-primary" data-action="confirm-no" data-id="${esc(j.id)}" ${state.reason ? "" : "disabled"}>${was ? "Cambia in No" : "Scarta l'offerta"}</button>
    <button class="btn btn-quiet" data-action="cancel-no">Annulla</button></div>`;
}

function actionBox(j) {
  if (!j.id) return "";
  const reg = /^s[iì]/i.test(j.registration) ? `<p class="small amber">Per candidarti serve un account su ${esc(j.portal || "questo portale")}.</p>` : "";
  const tog = decisionToggle(j, true);
  let head = "";
  if (tog) {
    let body;
    if (state.rejecting) body = rejectFields(j);
    else if (j.status === S.NEW && !j.decision) body = `<p class="small muted">Con un sì l'agente prepara il CV su misura stasera, tra le 19 e le 23.</p>`;
    else if (/^n/i.test(j.decision)) body = `<p class="small muted">${j.reject_reason ? `Scartata: ${esc(j.reject_reason)}. ` : ""}Se ci ripensi, con un sì l'agente prepara il CV su misura stasera e il motivo del no non conta più.</p>`;
    else if (j.status === S.NEW) body = `<p class="small">Il CV è in preparazione: arriva stasera tra le 19 e le 23, insieme a un'email.</p>
      <div class="row-btns"><button class="btn btn-quiet btn-sm" data-action="undo" data-id="${esc(j.id)}">Rimetti da valutare</button></div>`;
    else body = "";
    head = `<div class="action-box decide-box"><div class="decide-row"><b>Ti interessa?</b>${tog}</div>${body}</div>`;
    if (state.rejecting || j.status === S.NEW || /^n/i.test(j.decision)) return head;
  }
  if (j.status === S.CV_READY || j.status === S.CV_CHECK) {
    return head + `<div class="action-box"><b>${j.status === S.CV_CHECK ? "Ricontrolla il CV prima di inviarlo" : "Il CV è pronto: puoi candidarti"}</b>
      ${j.status === S.CV_CHECK ? `<p class="small red">Una frase non torna con il CV originale: il dettaglio è nelle note qui sotto.</p>` : ""}${reg}
      <p class="small muted">CV preparato con l'AI a partire dal tuo CV: rileggilo prima di inviarlo, il contenuto resta tuo.</p>
      <div class="row-btns">
        ${j.cv_link ? `<a class="btn btn-quiet" href="${esc(j.cv_link)}" target="_blank" rel="noopener">${icon("file", 17)} Apri il CV</a>` : ""}
        ${j.apply_url || j.job_url ? `<a class="btn btn-quiet" href="${esc(j.apply_url || j.job_url)}" target="_blank" rel="noopener">Vai alla candidatura ${icon("external", 15)}</a>` : ""}
        <button class="btn btn-primary" data-action="applied" data-id="${esc(j.id)}">${icon("send", 17)} Ho inviato la candidatura</button></div></div>`;
  }
  if (j.next_step && !FINAL.has(j.status)) {
    const d = parseDate(j.next_step_date);
    return head + `<div class="action-box soft"><b>Prossimo passo: ${esc(j.next_step)}</b>
      ${d ? `<p class="small ${d < today() ? "red" : "muted"}">${esc(relDate(j.next_step_date))}, ${esc(j.next_step_date)}</p>` : ""}</div>`;
  }
  return head;
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
  if (a === "reload") { state.costs = null; return reload(); }
  if (a === "assistant") return openAssistant(id || null);
  if (a === "clear-filters") { state.q = ""; state.fit = ""; renderFilters(); renderTable(); return; }
  if (a === "tab") {
    state.tab = el.dataset.tab;
    renderTabs();
    renderTable();
    if (["kpi", "todo", "hero-cta"].some((c) => el.classList.contains(c))) $(".list-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (a === "open") { state.selected = id; state.rejecting = false; state.reason = ""; markJobSeen(id); renderTable(); renderDrawer(); return; }
  if (a === "close") { state.selected = null; state.doc = null; if (state.view === "jobs") renderTable(); renderDrawer(); return; }
  if (a === "view") return setView(el.dataset.view);
  if (a === "ptab") { state.ptab = el.dataset.ptab; return renderProject(); }
  if (a === "doc") { state.doc = el.dataset.doc; return renderDrawer(); }
  if (a === "yes") return save(id, { decision: "Y" }, "Fatto: il CV su misura arriva stasera.");
  if (a === "to-yes") {
    const job = state.jobs.find((j) => j.id === id);
    const fields = { decision: "Y", reject_reason: "", status: S.NEW,
      notes: [job.notes, `Cambiata da No a Sì il ${fmtDate(today())}.`].filter(Boolean).join(" ") };
    return save(id, fields, "Fatto: ora è un Sì. Il CV su misura arriva stasera.");
  }
  if (a === "undo") return save(id, { decision: "" }, "Va bene, l'offerta torna da valutare.");
  if (a === "no") { state.rejecting = true; return renderDrawer(); }
  if (a === "quick-no") { state.selected = id; state.rejecting = true; state.reason = ""; renderTable(); renderDrawer(); return; }
  if (a === "cancel-no") { state.rejecting = false; state.reason = ""; return renderDrawer(); }
  if (a === "reason") {
    state.reason = el.dataset.reason;
    $("#drawer").querySelectorAll(".pick .chip").forEach((c) => {
      c.classList.toggle("on", c === el);
      c.setAttribute("aria-pressed", String(c === el));
    });
    $("#reject-effect").textContent = REJECT_EFFECTS[state.reason] || "";
    $("[data-action=confirm-no]").disabled = false;
    return;
  }
  if (a === "confirm-no") {
    const job = state.jobs.find((j) => j.id === id);
    const note = ($("#f-reject-note")?.value || "").trim();
    const fields = { decision: "N", reject_reason: state.reason, status: S.STANDBY, next_step: "", next_step_date: "" };
    const was = /^y/i.test(job.decision);
    const extra = [was ? `Cambiata da Sì a No il ${fmtDate(today())}.` : "", note ? `Nota: ${note}` : ""].filter(Boolean).join(" ");
    if (extra) fields.notes = [job.notes, extra].filter(Boolean).join(" ");
    state.rejecting = false;
    state.reason = "";
    return save(id, fields, was ? "Fatto: ora è un No. Me lo ricordo per le prossime ricerche." : "Scartata. Me lo ricordo per le prossime ricerche.");
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
  if (e.key === "Escape" && state.doc) { state.doc = null; renderDrawer(); return; }
  if (e.key === "Escape" && state.selected) { state.selected = null; renderTable(); renderDrawer(); }
  if (e.key === "Enter" && e.target.matches("tr[data-action=open]")) e.target.click();
});


// Back on the tab after a while: fresh data.
let spendTimer = null;
window.addEventListener("resize", () => {
  placeTabIndicator();
  if (state.view === "project" && $("#spend")) { clearTimeout(spendTimer); spendTimer = setTimeout(renderSpend, 120); }
});
document.addEventListener("scroll", (e) => { if (e.target.id === "tabs") placeTabIndicator(); }, true);
document.fonts?.ready.then(() => placeTabIndicator());

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

initAssistant({
  getStore: () => state.store, getJobs: () => state.jobs, getSelected: () => state.selected, icon, esc, toast,
});
boot();
