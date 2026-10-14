// Account menu shared by the dashboard and the profile page: a person icon in the top bar that opens the usual
// account choices (profile, subscription, theme, help, change account, sign out).
// The page passes what it can do: { store, demo, sheetUrl, onSwitch, onSignOut, onExitDemo, here }.
import { CONFIG } from "./config.js?v=202610140917";

const THEME_KEY = "jobscout.theme";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } },
};
const svg = (paths, size = 18) => `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const IC = {
  person: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c1.2-3.3 3.9-5 7-5s5.8 1.7 7 5"/>',
  profile: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="10" r="2.6"/><path d="M7.5 17c.9-1.8 2.5-2.7 4.5-2.7s3.6.9 4.5 2.7"/>',
  redo: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
  sheet: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M4 9h16M4 14.5h16M10 9v11.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.85.85c0 1.7-2.45 2.2-2.45 3.6"/><path d="M12 17h.01"/>',
  shield: '<path d="M12 3.5 5 6v5.5c0 4.2 3 7.5 7 9 4-1.5 7-4.8 7-9V6z"/>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  out: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  dash: '<rect x="3.5" y="3.5" width="7" height="8" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="14.5" width="7" height="6" rx="1.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};
export const personIcon = (size = 20) => svg(IC.person, size);

// ---------------------------------------------------------------- theme (system, light, dark)
export function applyTheme(value = ls.get(THEME_KEY) || "system") {
  if (value === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", value);
}
applyTheme();

let opts = null;
let hasProfile = null; // null = not checked yet
let checking = false;

export function accountButton() {
  return `<div class="acct">
    <button class="acct-btn" id="acct-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="acct-menu" title="Account e impostazioni">
      ${personIcon(20)}<span class="sr-only">Account e impostazioni</span></button>
    <div class="acct-menu" id="acct-menu" role="menu" aria-labelledby="acct-btn" hidden></div></div>`;
}

export function initAccount(o) {
  if (opts?.store !== o.store) hasProfile = null;
  opts = o;
  checkProfile(); // ask once in the background, so the menu opens already knowing
  if (!document.body.dataset.acct) {
    document.body.dataset.acct = "1";
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
  }
}

function menuHtml() {
  const demo = opts.demo;
  const q = demo ? "?demo=1" : "";
  const item = (ic, label, attrs) => `<${attrs.startsWith("href") ? "a" : "button"} class="acct-item" role="menuitem" tabindex="-1" ${attrs}>${svg(IC[ic])}<span>${label}</span></${attrs.startsWith("href") ? "a" : "button"}>`;
  const name = CONFIG.userName || "Il tuo account";
  const theme = ls.get(THEME_KEY) || "system";
  const themeBtn = (v, t) => `<button role="menuitemradio" tabindex="-1" aria-checked="${theme === v}" class="acct-theme${theme === v ? " on" : ""}" data-acct="theme" data-v="${v}">${t}</button>`;
  return `
    <div class="acct-head"><span class="acct-avatar" aria-hidden="true">${esc((name[0] || "?").toUpperCase())}</span>
      <div><b>${esc(name)}</b><span>${demo ? "Prova con dati di esempio" : "Account Google collegato"}</span></div></div>
    <div class="acct-group" role="group" aria-label="Profilo">
      ${opts.here === "profile" ? item("dash", "Torna alla dashboard", `href="./${q}"`) : ""}
      ${hasProfile ? item("profile", "Vedi il tuo profilo", `href="profilo.html?vista=profilo${demo ? "&demo=1" : ""}"`) : ""}
      ${item("redo", hasProfile ? "Rifai la profilazione" : "Crea il tuo profilo", `href="profilo.html?rifai=1${demo ? "&demo=1" : ""}"`)}
      ${item("card", "Abbonamento", `data-acct="plan"`)}
      ${opts.sheetUrl ? item("sheet", "Apri il foglio Google", `href="${esc(opts.sheetUrl)}" target="_blank" rel="noopener"`) : ""}
    </div>
    <div class="acct-group" role="group" aria-label="Tema">
      <p class="acct-label" aria-hidden="true">Tema</p>
      <div class="acct-themes">${themeBtn("system", "Sistema")}${themeBtn("light", "Chiaro")}${themeBtn("dark", "Scuro")}</div>
    </div>
    <div class="acct-group" role="group" aria-label="Aiuto">
      ${item("help", "Domande frequenti", `href="faq.html"`)}
      ${item("shield", "Privacy e termini", `href="../privacy.html"`)}
    </div>
    <div class="acct-group" role="group" aria-label="Sessione">
      ${demo ? item("out", "Esci dalla prova", `data-acct="exit-demo"`)
        : `${item("swap", "Cambia account", `data-acct="switch"`)}${item("out", "Esci", `data-acct="signout"`)}`}
    </div>`;
}

async function checkProfile() {
  if (hasProfile !== null || checking) return;
  if (opts.demo) { hasProfile = true; return; }
  checking = true;
  try { hasProfile = Boolean(await opts.store?.getState?.("profile_v1")); } catch { hasProfile = false; } finally { checking = false; }
  if (isOpen()) { const i = items().indexOf(document.activeElement); $menu().innerHTML = menuHtml(); focusItem(Math.max(0, i)); }
}

const $menu = () => document.getElementById("acct-menu");
const $btn = () => document.getElementById("acct-btn");
const isOpen = () => $menu() && !$menu().hidden;

function open() {
  const m = $menu();
  m.innerHTML = menuHtml();
  m.hidden = false;
  m.classList.add("opening");
  requestAnimationFrame(() => requestAnimationFrame(() => m.classList.remove("opening")));
  $btn().setAttribute("aria-expanded", "true");
  focusItem(0);
}

function close(focusBtn = true) {
  const m = $menu();
  if (!m || m.hidden) return;
  m.hidden = true;
  $btn()?.setAttribute("aria-expanded", "false");
  if (focusBtn) $btn()?.focus({ preventScroll: true });
}

const items = () => [...$menu().querySelectorAll('[role^="menuitem"]')];
function focusItem(i) {
  const list = items();
  if (!list.length) return;
  list[(i + list.length) % list.length].focus({ preventScroll: true });
}

function onKey(e) {
  if (!isOpen()) return;
  const list = items(), i = list.indexOf(document.activeElement);
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); focusItem(i + 1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(i - 1); }
  else if (e.key === "Home") { e.preventDefault(); focusItem(0); }
  else if (e.key === "End") { e.preventDefault(); focusItem(list.length - 1); }
  else if (e.key === "Tab") close(false);
}

function onClick(e) {
  if (e.target.closest("#acct-btn")) { isOpen() ? close() : open(); return; }
  const el = e.target.closest("[data-acct]");
  if (!el) { if (isOpen() && !e.target.closest("#acct-menu")) close(false); return; }
  const a = el.dataset.acct;
  if (a === "theme") {
    ls.set(THEME_KEY, el.dataset.v === "system" ? null : el.dataset.v);
    applyTheme(el.dataset.v);
    $menu().innerHTML = menuHtml();
    $menu().querySelector(`[data-v="${el.dataset.v}"]`)?.focus();
    return;
  }
  close(false);
  if (a === "plan") return showPlan();
  if (a === "switch") return opts.onSwitch?.();
  if (a === "signout") return opts.onSignOut?.();
  if (a === "exit-demo") return opts.onExitDemo?.();
  if (a === "plan-close") return closePlan();
}

// ---------------------------------------------------------------- subscription dialog (facts from termini.html)
function showPlan() {
  let d = document.getElementById("plan-dlg");
  if (!d) {
    document.body.insertAdjacentHTML("beforeend", `<dialog class="plan-dlg" id="plan-dlg" aria-labelledby="plan-title"></dialog>`);
    d = document.getElementById("plan-dlg");
    d.addEventListener("click", (e) => { if (e.target === d) closePlan(); });
  }
  d.innerHTML = `
    <div class="plan-head"><h2 id="plan-title">Abbonamento</h2>
      <button class="btn btn-icon" data-acct="plan-close" aria-label="Chiudi">${svg(IC.close)}</button></div>
    <div class="plan-card"><span class="plan-name">Gratuito</span><b>0 €</b><span class="muted">Nessun pagamento attivo</span></div>
    <ul class="plan-list">
      <li>Ricerca e valutazione delle offerte tre volte a settimana</li>
      <li>CV su misura per le offerte che approvi</li>
      <li>Tracciamento delle candidature e promemoria</li>
    </ul>
    <p class="small muted">Se in futuro il servizio diventasse a pagamento, prezzi, rimborsi e recesso saranno pubblicati nei
      <a href="../termini.html">termini</a> prima di qualsiasi addebito.</p>`;
  d.showModal();
  d.querySelector("[data-acct=plan-close]").focus();
}
function closePlan() { document.getElementById("plan-dlg")?.close(); $btn()?.focus({ preventScroll: true }); }
