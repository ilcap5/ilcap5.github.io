// Notifications: the bell in the top bar. Each notification has a stable id; the ids already seen are kept in the
// sheet (Stato > notif_seen_v1), so a notification read on the phone is read on the computer too.
// Jobs: CV ready, replies from companies, follow-ups due, new offers of the last search. Admin only (scheda Progetto):
// new SAL, council reports, failed runs.

import { RESPONDED, S, daysBetween, parseDate, shortDate, today } from "./schema.js?v=202610281709";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const svg = (p, size = 18) => `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const P = {
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  file: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/>',
  people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.6a3 3 0 0 1 0 5.8M17.5 14a5.5 5.5 0 0 1 3 5"/>',
  alert: '<path d="M12 4 3 19h18z"/><path d="M12 10v4M12 16.5v.01"/>',
  reply: '<path d="M10 8 5 12l5 4"/><path d="M5 12h9a5 5 0 0 1 5 5v1"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>',
  spark: '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5"/>',
};

const STATUS_NEWS = {
  [S.SCREENING]: "Risposta dal recruiter", [S.ASSESSMENT]: "Test o assessment da fare", [S.INTERVIEW]: "Colloquio in corso",
  [S.FINAL_LOOP]: "Loop finale", [S.OFFER]: "Offerta ricevuta", [S.REJECTED]: "Candidatura non andata avanti",
};

const within = (d, days) => !d || daysBetween(d, today()) <= days;

// Every notification: { id, title, sub, date, icon, tone, go: {job|tab|doc|url} }
export function buildNotifications(jobs, project) {
  const out = [];
  for (const j of jobs) {
    if (!j.id) continue;
    if (j.status === S.CV_READY || j.status === S.CV_CHECK) {
      const d = parseDate(j.updated);
      if (within(d, 14)) out.push({ id: `cv:${j.id}:${j.status}`, date: d, icon: "file", tone: j.status === S.CV_CHECK ? "red" : "green",
        title: j.status === S.CV_CHECK ? "CV da ricontrollare" : "CV pronto da inviare", sub: `${j.title} - ${j.company}`, go: { job: j.id } });
    }
    if (RESPONDED.has(j.status)) {
      const d = parseDate(j.last_contact) || parseDate(j.updated);
      if (within(d, 14)) out.push({ id: `st:${j.id}:${j.status}`, date: d, icon: "reply", tone: j.status === S.REJECTED ? "grey" : "deep",
        title: `${STATUS_NEWS[j.status]}: ${j.company}`, sub: j.title, go: { job: j.id } });
    }
    if (j.status === S.FOLLOWUP_DUE) {
      const d = parseDate(j.next_step_date);
      out.push({ id: `fu:${j.id}:${j.next_step_date}`, date: d, icon: "send", tone: "amber",
        title: `Follow-up da inviare: ${j.company}`, sub: "La bozza è in Gmail", go: { job: j.id } });
    }
  }
  // New offers of the last search, as one notification.
  const fresh = jobs.filter((j) => j.status === S.NEW && !j.decision && parseDate(j.found_date));
  const last = fresh.map((j) => parseDate(j.found_date)).sort((a, b) => b - a)[0];
  if (last && within(last, 7)) {
    const n = fresh.filter((j) => +parseDate(j.found_date) === +last).length;
    const key = `${last.getFullYear()}-${last.getMonth() + 1}-${last.getDate()}`;
    out.push({ id: `new:${key}`, date: last, icon: "spark", tone: "brand", go: { tab: "review" },
      title: n === 1 ? "Un'offerta nuova da valutare" : `${n} offerte nuove da valutare`, sub: `Ricerca del ${shortDate(key)}` });
  }
  if (project) {
    for (const d of project.docs) {
      const date = parseDate(d.date);
      if (d.type === "sal" && within(date, 14)) {
        out.push({ id: `doc:${d.id}`, date, icon: "file", tone: "brand", title: `Nuovo SAL del ${shortDate(d.date)}`, sub: d.summary, go: { doc: d.id } });
      }
      if (d.type === "consiglio" && within(date, 30)) {
        out.push({ id: `doc:${d.id}`, date, icon: "people", tone: "deep", title: "Verbale del consiglio", sub: d.title, go: { doc: d.id } });
      }
    }
    for (const r of project.runs) {
      const date = parseDate(r.at);
      if (r.conclusion === "failure" && within(date, 7)) {
        out.push({ id: `run:${r.workflow}:${r.at}`, date, icon: "alert", tone: "red", title: `Giro non riuscito: ${r.workflow}`, sub: r.when, go: { url: r.url } });
      }
    }
  }
  return out.sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 40);
}

// ---------------------------------------------------------------- bell and panel
let opts = null;
const $btn = () => document.getElementById("bell-btn");
const $panel = () => document.getElementById("bell-panel");
const isOpen = () => $panel() && !$panel().hidden;

export function bellButton(unread) {
  const label = unread ? `Notifiche, ${unread} da leggere` : "Notifiche";
  return `<div class="bell">
    <button class="btn btn-icon bell-btn" id="bell-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="bell-panel" aria-label="${label}" title="Notifiche">
      ${svg(P.bell)}${unread ? `<span class="bell-n" aria-hidden="true">${unread > 9 ? "9+" : unread}</span>` : ""}</button>
    <div class="bell-panel" id="bell-panel" role="dialog" aria-label="Notifiche" hidden></div></div>`;
}

// o: { items(): list, seen(id): bool, onPick(item), onMarkAll() }
export function initBell(o) {
  const first = !opts;
  opts = o;
  if (!first) return;
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) { e.preventDefault(); e.stopPropagation(); close(); }
  }, true);
}

function panelHtml() {
  const list = opts.items();
  const unread = list.filter((n) => !opts.seen(n.id)).length;
  const rows = list.length ? list.map((n) => {
    const isNew = !opts.seen(n.id);
    return `<button class="ntf${isNew ? " unread" : ""}" data-ntf="${esc(n.id)}">
      <span class="ntf-ic tone-${n.tone}">${svg(P[n.icon] || P.bell, 16)}</span>
      <span class="ntf-txt"><b>${esc(n.title)}</b>${n.sub ? `<span>${esc(n.sub)}</span>` : ""}</span>
      ${n.date ? `<span class="ntf-when">${esc(shortDate(`${n.date.getFullYear()}-${String(n.date.getMonth() + 1).padStart(2, "0")}-${String(n.date.getDate()).padStart(2, "0")}`))}</span>` : ""}
      ${isNew ? `<span class="ntf-dot"><span class="sr-only">da leggere</span></span>` : ""}</button>`;
  }).join("") : `<p class="ntf-empty">Nessuna novità.</p>`;
  return `<div class="ntf-head"><b>Notifiche</b>${unread ? `<button class="linkish" data-ntf-all>Segna tutto come letto</button>` : ""}</div>
    <div class="ntf-list">${rows}</div>`;
}

export function refreshBell() {
  if (isOpen()) $panel().innerHTML = panelHtml();
}

function open() {
  const p = $panel();
  p.innerHTML = panelHtml();
  p.hidden = false;
  p.classList.add("opening");
  requestAnimationFrame(() => requestAnimationFrame(() => p.classList.remove("opening")));
  $btn().setAttribute("aria-expanded", "true");
  p.querySelector("button")?.focus({ preventScroll: true });
}

function close(focusBtn = true) {
  const p = $panel();
  if (!p || p.hidden) return;
  p.hidden = true;
  $btn()?.setAttribute("aria-expanded", "false");
  if (focusBtn) $btn()?.focus({ preventScroll: true });
}

function onClick(e) {
  if (!opts) return;
  if (e.target.closest("#bell-btn")) { isOpen() ? close() : open(); return; }
  if (e.target.closest("[data-ntf-all]")) { opts.onMarkAll(); $panel().innerHTML = panelHtml(); return; }
  const el = e.target.closest("[data-ntf]");
  if (el) {
    const item = opts.items().find((n) => n.id === el.dataset.ntf);
    close(false);
    if (item) opts.onPick(item);
    return;
  }
  if (isOpen() && !e.target.closest("#bell-panel")) close(false);
}
