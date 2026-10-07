// Profile onboarding: CV first, then the questions a good headhunter would ask, then the search profile the agent uses.
// One topic per screen, everything pre-filled from the CV where possible, a draft kept in this browser.

import { CONFIG } from "./config.js";
import { DemoStore, SheetsStore } from "./store.js";

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SHEET_KEY = "jobscout.sheet";
const DRAFT_KEY = "jobscout.profile.draft";
const STATE_KEY = "profile_v1";
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } },
};

// ================================================================ options (headhunter vocabulary, plain Italian)
const MOVES = [
  { id: "same_better", t: "Stesso mestiere, contesto migliore", d: "Un ruolo simile in un'azienda o in un settore più interessante" },
  { id: "step_up", t: "Un passo avanti", d: "Più responsabilità, un perimetro più ampio o persone da guidare" },
  { id: "switch_function", t: "Cambiare funzione", d: "Usare quello che sai fare in un mestiere diverso" },
  { id: "switch_sector", t: "Cambiare settore", d: "Lo stesso tipo di lavoro, in un'industria diversa" },
  { id: "explore", t: "Sto esplorando", d: "Prima di decidere voglio vedere cosa c'è" },
];
const PRIORITY = [
  { id: "core", t: "Principale" }, { id: "adjacent", t: "Interessa" }, { id: "exploratory", t: "Esplora" },
];
const MIXES = [
  { id: "focused", t: "Concentrata", d: "Quasi tutto sull'obiettivo principale", w: [70, 25, 5] },
  { id: "balanced", t: "Bilanciata", d: "Obiettivo principale, con spazio per le alternative", w: [50, 35, 15] },
  { id: "open", t: "Aperta", d: "Più spazio a ruoli nuovi da esplorare", w: [40, 30, 30] },
];
const CITIES = ["Milano", "Roma", "Torino", "Bologna", "Firenze", "Padova", "Londra", "Dublino", "Madrid", "Barcellona",
  "Parigi", "Amsterdam", "Berlino", "Monaco di Baviera", "Zurigo", "Lussemburgo"];
const RADIUS = [10, 20, 35, 50];
const MODES = ["In sede", "Ibrido", "Da remoto"];
const RELOCATION = [{ id: "no", t: "No" }, { id: "italia", t: "In Italia" }, { id: "estero", t: "Anche all'estero" }];
const TRAVEL = [{ id: "0", t: "Nessuna" }, { id: "20", t: "Fino al 20%" }, { id: "50", t: "Fino al 50%" }, { id: "100", t: "Anche di più" }];
// Same list as job_finder_bot/worker/src/profile.js: the API only suggests sectors from here.
const SECTORS = ["Tech e software", "Fintech e pagamenti", "E-commerce e delivery", "Consulenza strategica",
  "Consulenza operations", "Consulenza IT e system integration", "Logistica e trasporti", "Manifatturiero",
  "Automotive e mobilità", "Energia e utilities", "Beni di consumo (FMCG)", "Alimentare e bevande", "Lusso e moda",
  "Beauty e cosmetica", "Farmaceutico e sanità", "Retail", "Telecomunicazioni", "Media e intrattenimento",
  "Banche e assicurazioni", "Pubblica amministrazione"];
// Older answers (and drafts) may carry English names: map them onto the list above.
const SECTOR_ALIASES = {
  "fashion & luxury": "Lusso e moda", "luxury": "Lusso e moda", "fashion": "Lusso e moda",
  "beauty & cosmetics": "Beauty e cosmetica", "consumer goods (fmcg)": "Beni di consumo (FMCG)", "fmcg": "Beni di consumo (FMCG)",
  "consumer goods": "Beni di consumo (FMCG)", "automotive": "Automotive e mobilità", "mobility": "Automotive e mobilità",
  "consulting": "Consulenza strategica", "management consulting": "Consulenza strategica", "manufacturing": "Manifatturiero",
  "retail": "Retail", "pharma & healthcare": "Farmaceutico e sanità", "healthcare": "Farmaceutico e sanità",
  "food & beverage": "Alimentare e bevande", "software / planning solutions": "Tech e software", "software": "Tech e software",
  "tech": "Tech e software", "technology": "Tech e software", "fintech": "Fintech e pagamenti", "e-commerce": "E-commerce e delivery",
  "logistics": "Logistica e trasporti", "energy": "Energia e utilities", "telecommunications": "Telecomunicazioni",
  "media": "Media e intrattenimento", "banking": "Banche e assicurazioni", "insurance": "Banche e assicurazioni",
  "public sector": "Pubblica amministrazione",
};
const canonSector = (s) => (SECTORS.includes(s) ? s : SECTOR_ALIASES[String(s).trim().toLowerCase()] || null);
function normalizeSectors() {
  S.suggestions.sectors = [...new Set((S.suggestions.sectors || []).map(canonSector).filter(Boolean))];
  const map = {};
  for (const [k, v] of Object.entries(S.answers.sectors || {})) { const c = canonSector(k); if (c) map[c] = v; }
  S.answers.sectors = map;
}
const COMPANY_TYPES = ["Multinazionale", "Big tech", "Scale-up", "Startup", "Consulenza strategica", "PMI italiana"];
const LANGS = [{ id: "it", t: "Italiano" }, { id: "en", t: "Inglese" }, { id: "any", t: "Indifferente" }];
const NOTICE = [{ id: "now", t: "Subito" }, { id: "1m", t: "Entro un mese" }, { id: "3m", t: "In 2-3 mesi" }, { id: "later", t: "Più avanti" }];
const MOTIVATORS = ["Crescita professionale", "Stipendio", "Equilibrio vita-lavoro", "Impatto del lavoro", "Ambiente internazionale",
  "Stabilità", "Imparare cose nuove", "Qualità del team e del capo", "Flessibilità"];
const SENIORITY = [{ id: "junior", t: "Junior" }, { id: "mid", t: "Intermedio" }, { id: "senior", t: "Senior" }, { id: "lead", t: "Responsabile" }];

const STEPS = ["intro", "cv", "facts", "move", "roles", "where", "sectors", "conditions", "motivation", "building", "recap", "saved"];
const NUMBERED = ["cv", "facts", "move", "roles", "where", "sectors", "conditions", "motivation"];

// ================================================================ state
const blankAnswers = () => ({
  move: "", move_note: "", roles: [], avoid_roles: [], mix: "balanced",
  cities: [], radius: 20, modes: ["Ibrido"], relocation: "no", travel: "20",
  sectors: {}, company_types: [], dream_companies: [], blocked_companies: [],
  salary_min: "", salary_target: "", work_language: "any", notice: "3m",
  motivators: [], good_day: "", dealbreakers: "", in_3_years: "",
});
const S = {
  store: null, demo: false, step: "intro", busy: false, error: "",
  facts: null, suggestions: { roles: [], sectors: [] }, recruiter: "", answers: blankAnswers(), search: null,
  saved: null, cvName: "",
};

function saveDraft() {
  if (S.demo) return;
  const { step, facts, suggestions, recruiter, answers, search, cvName } = S;
  ls.set(DRAFT_KEY, JSON.stringify({ step, facts, suggestions, recruiter, answers, search, cvName }));
}
function loadDraft() {
  try { return JSON.parse(ls.get(DRAFT_KEY) || "null"); } catch { return null; }
}

// ================================================================ boot
async function boot() {
  const params = new URLSearchParams(location.search);
  S.demo = params.has("demo");
  if (S.demo) { S.store = new DemoStore(); return render(); }
  const sheetId = ls.get(SHEET_KEY);
  if (!CONFIG.clientId || !sheetId) {
    return screen(`<h1>Prima collega il foglio</h1><p class="lead">Il profilo si salva nel tuo foglio delle candidature.
      Collegalo dalla dashboard, poi torna qui.</p><a class="btn btn-primary btn-block" href="./">Vai alla dashboard</a>`);
  }
  S.store = new SheetsStore({ clientId: CONFIG.clientId, scope: CONFIG.scope, sheetId });
  if (!S.store.signedIn) return showLogin();
  await start();
}

function showLogin(error = "") {
  screen(`<h1>Il tuo profilo di ricerca</h1><p class="lead">Accedi con l'account Google del foglio delle candidature.</p>
    ${error ? `<div class="note note-red">${esc(error)}</div>` : ""}
    <button class="btn btn-primary btn-block" data-act="login">Accedi con Google</button>
    <a class="btn btn-quiet btn-block" href="./">Torna alla dashboard</a>`);
  S.store._gis?.().catch(() => {});
}

async function start() {
  const draft = loadDraft();
  try {
    const raw = await S.store.getState(STATE_KEY);
    S.saved = raw ? JSON.parse(raw) : null;
  } catch (e) {
    if (!S.store.signedIn) return showLogin(e.message);
  }
  if (draft && draft.step && !["intro", "saved", "building"].includes(draft.step)) {
    Object.assign(S, draft, { answers: { ...blankAnswers(), ...draft.answers }, step: "intro" });
    S.resumeStep = draft.step === "cv" || !S.facts ? "cv" : draft.step;
    S.resumed = true;
  }
  render();
}

function screen(html) {
  $("#app").innerHTML = `<div class="screen"><div class="screen-card">${brand()}${html}</div></div>`;
}

function brand() {
  return `<a class="brand" href="./${S.demo ? "?demo=1" : ""}" aria-label="Torna alla dashboard"><img class="brand-mark" src="assets/mark-64.png" width="28" height="28" alt="">
    <span class="brand-name">JobScout<span>.ai</span></span></a>`;
}

// ================================================================ rendering
function go(step) {
  S.step = step;
  S.error = "";
  saveDraft();
  render(true);
}

function render(animate = false) {
  const i = NUMBERED.indexOf(S.step);
  const progress = i >= 0 ? `<div class="pf-progress" aria-hidden="true"><span style="--p:${((i + 1) / NUMBERED.length) * 100}%"></span></div>` : "";
  const counter = i >= 0 ? `<p class="pf-counter">Passo ${i + 1} di ${NUMBERED.length}</p>` : "";
  const view = VIEWS[S.step]();
  $("#app").innerHTML = `
    <header class="topbar"><div class="topbar-in">${brand()}
      <div class="topbar-actions">${S.demo ? `<span class="badge">Esempio</span>` : ""}
        <a class="btn btn-quiet btn-sm" href="./${S.demo ? "?demo=1" : ""}">Esci</a></div></div>${progress}</header>
    <main class="pf-main${animate ? " pf-enter" : ""}">
      ${counter}
      <h1>${view.title}</h1>
      ${view.lead ? `<p class="pf-lead">${view.lead}</p>` : ""}
      ${S.error ? `<div class="note note-red">${esc(S.error)}</div>` : ""}
      <div class="pf-body-in">${view.body}</div>
    </main>
    ${view.nav === false ? "" : nav(view)}
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  view.after?.();
  if (animate) window.scrollTo({ top: 0 });
}

function nav(view) {
  const i = STEPS.indexOf(S.step);
  const back = view.back !== false && i > 0 ? `<button class="btn btn-quiet" data-act="back">Indietro</button>` : "<span></span>";
  return `<footer class="pf-nav"><div class="pf-nav-in">${back}
    <button class="btn btn-primary" data-act="next" ${view.canNext === false || S.busy ? "disabled" : ""}>${view.nextLabel || "Avanti"}</button></div></footer>`;
}

// ---------- small components
const chip = (label, on, act, data = "", extra = "") =>
  `<button type="button" class="pf-chip${on ? " on" : ""} ${extra}" data-act="${act}" ${data} aria-pressed="${on}">${esc(label)}</button>`;
const seg = (name, options, value) => `<div class="pf-seg" role="radiogroup">${options.map((o) =>
  `<button type="button" role="radio" aria-checked="${String(o.id) === String(value)}" class="${String(o.id) === String(value) ? "on" : ""}" data-act="set" data-k="${name}" data-v="${esc(o.id)}">${esc(o.t)}</button>`).join("")}</div>`;
const tags = (key, list, placeholder) => `<div class="pf-tags" data-tags="${key}">${list.map((t, i) =>
  `<span class="pf-tag">${esc(t)}<button type="button" data-act="untag" data-k="${key}" data-i="${i}" aria-label="Togli ${esc(t)}">&times;</button></span>`).join("")}
  <input type="text" data-addtag="${key}" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"></div>`;
const field = (label, input, hint = "") => `<label class="field pf-field"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ""}</label>`;
const block = (title, help, body) => `<section class="pf-block"><h2>${title}</h2>${help ? `<p class="pf-help">${help}</p>` : ""}${body}</section>`;

// ================================================================ views
const VIEWS = {
  intro() {
    const when = S.saved?.saved_at ? new Date(S.saved.saved_at).toLocaleDateString("it-IT", { day: "numeric", month: "long" }) : "";
    return {
      title: S.saved ? "Il tuo profilo di ricerca" : "Costruiamo il tuo profilo di ricerca",
      lead: S.saved ? `L'ultimo aggiornamento è del ${esc(when)}. Puoi ripartire dal CV o cambiare solo le risposte.`
        : "È la base di tutto: da qui l'agente decide quali offerte cercare, come pesarle e cosa scartare. Servono circa 6 minuti.",
      body: `<ol class="pf-plan">
          <li><b>Il tuo CV</b><span>Lo leggo e ricavo esperienza, ruolo, competenze e settori. Tu correggi quello che non torna.</span></li>
          <li><b>Le domande</b><span>Quelle che farebbe un buon headhunter: dove vuoi andare, cosa eviti, cosa ti muove.</span></li>
          <li><b>Il profilo</b><span>Ti propongo come impostare la ricerca. Lo approvi tu, e da quel momento l'agente lo usa.</span></li>
        </ol>
        ${S.resumed ? `<div class="note note-amber">Avevi lasciato il profilo a metà: riprendi da dove eri.</div>` : ""}
        ${S.saved ? `<button class="btn btn-quiet btn-block" data-act="edit-saved">Cambia solo le risposte</button>` : ""}`,
      nextLabel: S.resumed ? "Riprendi" : S.saved ? "Riparti dal CV" : "Inizia",
      back: false,
    };
  },

  cv() {
    const ready = Boolean(CONFIG.apiUrl) || S.demo;
    return {
      title: "Partiamo dal tuo CV",
      lead: "Carica la versione più aggiornata, in PDF. Lo uso solo per capire il tuo profilo: non lo condivido e non resta salvato da nessuna parte.",
      body: S.busy ? `<div class="pf-reading"><div class="pf-scan"><span></span></div><b>Sto leggendo ${esc(S.cvName || "il CV")}</b>
          <p class="pf-help">Esperienze, anni, competenze e settori. Di solito ci vogliono 10-20 secondi.</p></div>`
        : `<label class="pf-drop" data-drop>
            <input type="file" accept="application/pdf" id="cv-file" hidden>
            <span class="pf-drop-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/><path d="M12 11v6M9.5 13.5 12 11l2.5 2.5"/></svg></span>
            <b>Trascina qui il PDF o sceglilo dal computer</b><span>Massimo 6 MB</span>
          </label>
          ${ready ? "" : `<div class="note note-amber">Il servizio che legge il CV non è ancora attivo. Puoi compilare il profilo a mano.</div>`}
          <button class="btn btn-quiet btn-block" data-act="manual">${ready ? "Preferisco compilarlo a mano" : "Compila a mano"}</button>`,
      canNext: false, nav: S.busy ? false : undefined, nextLabel: "Avanti",
      after() {
        const input = $("#cv-file"), drop = $("[data-drop]");
        if (!input) return;
        input.addEventListener("change", () => input.files[0] && readCv(input.files[0]));
        drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
        drop.addEventListener("dragleave", () => drop.classList.remove("over"));
        drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); e.dataTransfer.files[0] && readCv(e.dataTransfer.files[0]); });
      },
    };
  },

  facts() {
    const f = S.facts;
    return {
      title: "Ecco cosa ho capito",
      lead: "Controlla e correggi: tutto il resto parte da qui.",
      body: `${S.recruiter ? `<blockquote class="pf-quote"><span>Come ti leggerebbe un recruiter</span>${esc(S.recruiter)}</blockquote>` : ""}
        <div class="pf-grid">
          ${field("Ruolo attuale", `<input data-f="current_role" value="${esc(f.current_role)}">`)}
          ${field("Azienda", `<input data-f="current_company" value="${esc(f.current_company)}">`)}
          ${field("Anni di esperienza", `<input data-f="years_experience" type="number" min="0" max="45" step="0.1" inputmode="decimal" value="${esc(f.years_experience)}">`,
            esc(f.years_source || "Solo lavoro a tempo pieno, stage esclusi") + (f.years_counted?.length ? `: ${esc(f.years_counted.join("; "))}` : ""))}
          ${field("Città", `<input data-f="city" value="${esc(f.city)}">`)}
        </div>
        ${block("Livello", "", seg("facts.seniority", SENIORITY, f.seniority))}
        ${field("Formazione", `<input data-f="education" value="${esc(f.education)}">`)}
        ${block("Competenze principali", "Togli quelle che non vuoi usare nel prossimo lavoro, aggiungi quelle che mancano.", tags("facts.skills", f.skills, "Aggiungi una competenza"))}
        ${block("Settori in cui hai lavorato", "", tags("facts.industries", f.industries, "Aggiungi un settore"))}
        ${block("Lingue", "", tags("facts.languages", f.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)), "Es. Spagnolo (B2)"))}`,
      nextLabel: "È corretto",
    };
  },

  move() {
    return {
      title: "Che passo vuoi fare?",
      lead: "È la domanda che cambia di più la ricerca. Scegli quella più vicina a come ti senti oggi.",
      body: `<div class="pf-cards" role="radiogroup">${MOVES.map((m) => `
          <button type="button" role="radio" aria-checked="${S.answers.move === m.id}" class="pf-card${S.answers.move === m.id ? " on" : ""}" data-act="set" data-k="move" data-v="${m.id}">
            <b>${m.t}</b><span>${m.d}</span></button>`).join("")}</div>
        ${field("Vuoi aggiungere qualcosa? (facoltativo)", `<textarea data-a="move_note" rows="2" placeholder="Es. voglio restare in operations ma uscire dalla consulenza">${esc(S.answers.move_note)}</textarea>`)}`,
      canNext: Boolean(S.answers.move),
    };
  },

  roles() {
    const suggested = S.suggestions.roles || [];
    const titles = [...new Set([...suggested.map((r) => r.title), ...S.answers.roles.map((r) => r.title)])];
    const row = (title) => {
      const sel = S.answers.roles.find((r) => r.title === title);
      const why = suggested.find((r) => r.title === title)?.why;
      return `<div class="pf-role${sel ? " on" : ""}"><div class="pf-role-t"><b>${esc(title)}</b>${why ? `<span>${esc(why)}</span>` : ""}</div>
        <div class="pf-seg sm">${PRIORITY.map((p) => `<button type="button" class="${sel?.priority === p.id ? "on" : ""}" data-act="role" data-t="${esc(title)}" data-v="${p.id}">${p.t}</button>`).join("")}
        <button type="button" class="${sel ? "" : "on"} off" data-act="role" data-t="${esc(title)}" data-v="">No</button></div></div>`;
    };
    const counts = PRIORITY.map((p) => S.answers.roles.filter((r) => r.priority === p.id).length);
    return {
      title: "Quali ruoli ti interessano?",
      lead: "Ti propongo quelli in cui il tuo CV è credibile, dal più vicino al più lontano. Per ognuno scegli: obiettivo principale, ti interessa, da esplorare, oppure no.",
      body: `<div class="pf-roles">${titles.map(row).join("")}</div>
        <div class="pf-add"><input type="text" id="new-role" placeholder="Aggiungi un ruolo, es. Program Manager" aria-label="Aggiungi un ruolo">
          <button class="btn btn-quiet" data-act="add-role">Aggiungi</button></div>
        ${block("Quanto spazio dare a ciascuna direzione?", "Decide come l'agente divide le offerte da analizzare a ogni giro.",
          `<div class="pf-cards three">${MIXES.map((m) => `<button type="button" class="pf-card${S.answers.mix === m.id ? " on" : ""}" data-act="set" data-k="mix" data-v="${m.id}">
            <b>${m.t}</b><span>${m.d}</span><span class="pf-mix">${m.w.map((w, i) => `<i style="--w:${w}%" class="m${i}"></i>`).join("")}</span><small>${m.w.join(" / ")}</small></button>`).join("")}</div>`)}
        ${block("Ruoli da non propormi", "Anche se il titolo sembra in linea. Es. ruoli di magazzino, pianificazione ripetitiva.", tags("answers.avoid_roles", S.answers.avoid_roles, "Aggiungi un ruolo da evitare"))}`,
      canNext: counts[0] > 0,
      after() { const i = $("#new-role"); i?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }); },
    };
  },

  where() {
    const a = S.answers;
    const cities = [...new Set([...(S.facts?.city ? [S.facts.city] : []), ...CITIES, ...a.cities.map((c) => c.name)])];
    return {
      title: "Dove e come vuoi lavorare?",
      lead: "",
      body: `${block("Città", "Scegline una o più. Le offerte da remoto passano se sono aperte all'Italia.", `<div class="pf-chips">${cities.map((c) =>
          chip(c, a.cities.some((x) => x.name === c), "city", `data-v="${esc(c)}"`)).join("")}</div>
          <div class="pf-add"><input type="text" id="new-city" placeholder="Un'altra città" aria-label="Aggiungi una città"><button class="btn btn-quiet" data-act="add-city">Aggiungi</button></div>`)}
        ${block("Distanza massima dal centro", "", seg("answers.radius", RADIUS.map((r) => ({ id: r, t: `${r} km` })), a.radius))}
        ${block("Modalità", "Puoi sceglierne più di una.", `<div class="pf-chips">${MODES.map((m) => chip(m, a.modes.includes(m), "mode", `data-v="${m}"`)).join("")}</div>`)}
        ${block("Ti trasferiresti per il lavoro giusto?", "", seg("answers.relocation", RELOCATION, a.relocation))}
        ${block("Trasferte", "", seg("answers.travel", TRAVEL, a.travel))}`,
      canNext: a.cities.length > 0 && a.modes.length > 0,
    };
  },

  sectors() {
    const a = S.answers;
    normalizeSectors();
    const list = [...new Set([...(S.suggestions.sectors || []), ...SECTORS])];
    const state = (s) => a.sectors[s] || "";
    return {
      title: "Settori e aziende",
      lead: "Tocca un settore una volta se ti attira, due volte se vuoi evitarlo.",
      body: `<div class="pf-chips">${list.map((s) => chip(state(s) === "avoid" ? `${s}` : s, Boolean(state(s)), "sector", `data-v="${esc(s)}"`, state(s) === "avoid" ? "avoid" : "")).join("")}</div>
        <p class="pf-legend"><span class="pf-chip on mini">Ti attira</span><span class="pf-chip on avoid mini">Da evitare</span></p>
        ${block("Che tipo di azienda?", "", `<div class="pf-chips">${COMPANY_TYPES.map((t) => chip(t, a.company_types.includes(t), "ctype", `data-v="${t}"`)).join("")}</div>`)}
        ${block("Aziende in cui ti piacerebbe lavorare", "Le segnalo con priorità alta. Il match resta oggettivo.", tags("answers.dream_companies", a.dream_companies, "Es. Stripe"))}
        ${block("Aziende da non propormi", "", tags("answers.blocked_companies", a.blocked_companies, "Es. il tuo datore di lavoro attuale"))}`,
    };
  },

  conditions() {
    const a = S.answers;
    return {
      title: "Le condizioni",
      lead: "Restano tra te e l'agente: servono solo a non farti perdere tempo con offerte sotto le tue aspettative.",
      body: `<div class="pf-grid">
          ${field("RAL minima", `<div class="pf-money"><input data-a="salary_min" type="number" min="0" max="500" inputmode="numeric" value="${esc(a.salary_min)}" placeholder="42"><span>k€ lordi</span></div>`, "Sotto questa cifra l'offerta viene scartata")}
          ${field("RAL che vorresti", `<div class="pf-money"><input data-a="salary_target" type="number" min="0" max="500" inputmode="numeric" value="${esc(a.salary_target)}" placeholder="50"><span>k€ lordi</span></div>`)}
        </div>
        ${block("Lingua di lavoro", "", seg("answers.work_language", LANGS, a.work_language))}
        ${block("Quando potresti iniziare?", "", seg("answers.notice", NOTICE, a.notice))}`,
      canNext: Number(a.salary_min) > 0,
    };
  },

  motivation() {
    const a = S.answers;
    return {
      title: "Cosa ti muove",
      lead: "Le ultime domande, quelle che di solito fanno la differenza. Puoi rispondere in due righe o saltarle.",
      body: `${block("Le tre cose più importanti nel prossimo lavoro", "Scegline tre, in ordine di importanza.", `<div class="pf-chips">${MOTIVATORS.map((m) => {
          const i = a.motivators.indexOf(m);
          return chip(m, i >= 0, "motiv", `data-v="${esc(m)}"`, i >= 0 ? `rank" data-rank="${i + 1}` : "");
        }).join("")}</div>`)}
        ${field("Pensa all'ultima giornata di lavoro che ti ha dato soddisfazione: cosa stavi facendo?", `<textarea data-a="good_day" rows="3" placeholder="Es. ho portato un gruppo di persone a decidere su un problema bloccato da settimane">${esc(a.good_day)}</textarea>`)}
        ${field("Cosa ti farebbe rifiutare un'offerta anche se ben pagata?", `<textarea data-a="dealbreakers" rows="3" placeholder="Es. un lavoro tutto Excel senza contatto con il business">${esc(a.dealbreakers)}</textarea>`)}
        ${field("Fra tre anni, cosa vuoi poter scrivere nel CV che oggi manca?", `<textarea data-a="in_3_years" rows="3" placeholder="Es. aver guidato un team o lanciato un'operazione in un nuovo paese">${esc(a.in_3_years)}</textarea>`)}`,
      nextLabel: "Prepara il profilo",
    };
  },

  building() {
    return {
      title: "Sto preparando il tuo profilo",
      lead: "Metto insieme CV e risposte e decido come impostare la ricerca. Ci vuole circa mezzo minuto.",
      body: `<div class="pf-reading"><div class="pf-scan"><span></span></div>
        <ul class="pf-steps-live"><li class="done">CV e risposte</li><li class="live">Direzioni di ricerca e pesi</li><li>Parole chiave per gli annunci</li><li>Cosa scartare</li></ul></div>`,
      nav: false,
    };
  },

  recap() {
    const s = S.search, a = S.answers;
    const fitName = { core: "Obiettivo principale", adjacent: "Affine", exploratory: "Da esplorare" };
    return {
      title: "Il tuo profilo di ricerca",
      lead: "Ecco come cercherà l'agente. Se qualcosa non torna, torna alle risposte e cambiale.",
      body: `<blockquote class="pf-quote"><span>Come l'ho impostato</span>${esc(s.comment_it)}</blockquote>
        <section class="pf-block"><h2>Direzioni di ricerca</h2><div class="pf-fams">${s.role_families.map((f, i) => `
          <article class="pf-fam"><div class="pf-fam-h"><b>${esc(f.name)}</b><span class="pill tone-line">${fitName[f.fit] || f.fit}</span><span class="pf-w">${f.weight}%</span></div>
            <span class="pf-bar"><i class="m${Math.min(i, 2)}" style="--w:${f.weight}%"></i></span>
            <p>${esc(f.description)}</p>
            <div class="chips">${f.roles.map((r) => `<span class="chip">${esc(r)}</span>`).join("")}</div></article>`).join("")}</div></section>
        <section class="pf-block"><h2>Cosa scarto</h2><ul class="pf-list">${s.avoid.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
        <section class="pf-block"><h2>Dove e a quali condizioni</h2>
          <div class="facts">
            <div class="fact"><span>Città</span><b>${esc(a.cities.map((c) => c.name).join(", "))}</b></div>
            <div class="fact"><span>Distanza</span><b>${a.radius} km</b></div>
            <div class="fact"><span>Modalità</span><b>${esc(a.modes.join(", "))}</b></div>
            <div class="fact"><span>RAL minima</span><b>${esc(a.salary_min)}k€</b></div>
          </div></section>
        <section class="pf-block"><h2>Avvisi LinkedIn</h2><p class="pf-help">L'agente legge le email di avviso di LinkedIn: aggiorna i tuoi avvisi con queste parole, una per avviso.</p>
          <div class="chips">${s.linkedin_keywords.map((k) => `<span class="chip">${esc(k)}</span>`).join("")}</div>
          <button class="btn btn-quiet btn-sm pf-copy" data-act="copy-kw">Copia le parole</button></section>`,
      nextLabel: S.demo ? "Salva (esempio)" : "Salva e usa questo profilo",
      back: true,
    };
  },

  saved() {
    return {
      title: "Profilo salvato",
      lead: "Dal prossimo giro di ricerca l'agente usa queste regole. Puoi tornare qui quando vuoi: ti consiglio di rivederlo ogni tre mesi.",
      body: `<div class="pf-done"><span class="pf-done-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span></div>
        <a class="btn btn-primary btn-block" href="./${S.demo ? "?demo=1" : ""}">Torna alla dashboard</a>`,
      nav: false,
    };
  },
};

// ================================================================ actions
function emptyFacts() {
  return { name: "", current_role: "", current_company: "", years_experience: "", seniority: "mid", city: "", country: "IT",
    education: "", languages: [], skills: [], industries: [], functions: [], achievements: [] };
}

async function readCv(file) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { S.error = "Serve il CV in PDF."; return render(); }
  if (file.size > 6 * 1024 * 1024) { S.error = "Il PDF supera i 6 MB: esportalo di nuovo con una qualità più bassa."; return render(); }
  S.busy = true; S.cvName = file.name; S.error = ""; render();
  try {
    const b64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = () => reject(new Error("Non riesco a leggere il file."));
      r.readAsDataURL(file);
    });
    const out = await S.store.api(CONFIG.apiUrl, "/v1/profile/infer", { cv_pdf_base64: b64 });
    S.facts = { ...emptyFacts(), ...out.facts };
    S.suggestions = out.suggestions || { roles: [], sectors: [] };
    S.recruiter = out.recruiter_read_it || "";
    // Pre-fill: suggested core roles selected, the CV city chosen.
    if (!S.answers.roles.length) S.answers.roles = S.suggestions.roles.filter((r) => r.priority === "core").map((r) => ({ title: r.title, priority: "core" }));
    if (!S.answers.cities.length && S.facts.city) S.answers.cities = [{ name: S.facts.city }];
    S.busy = false;
    go("facts");
  } catch (e) {
    S.busy = false;
    S.error = `${e.message} Riprova, oppure compila a mano.`;
    render();
  }
}

function addRole() {
  const input = $("#new-role");
  const t = (input?.value || "").trim();
  if (!t) return;
  if (!S.answers.roles.some((r) => r.title.toLowerCase() === t.toLowerCase())) S.answers.roles.push({ title: t, priority: "adjacent" });
  saveDraft(); render();
  $("#new-role")?.focus();
}

function setPath(path, value) {
  const [root, key] = path.split(".");
  const target = root === "facts" ? S.facts : root === "answers" ? S.answers : null;
  if (target && key) target[key] = value; else S.answers[path] = value;
}

function getList(path) {
  const [root, key] = path.split(".");
  return (root === "facts" ? S.facts : S.answers)[key];
}

function readInputs() {
  document.querySelectorAll("[data-f]").forEach((el) => { S.facts[el.dataset.f] = el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value.trim(); });
  document.querySelectorAll("[data-a]").forEach((el) => { S.answers[el.dataset.a] = el.value; });
}

function answersPayload() {
  const mix = MIXES.find((m) => m.id === S.answers.mix) || MIXES[1];
  return {
    ...S.answers,
    move: MOVES.find((m) => m.id === S.answers.move)?.t || S.answers.move,
    mix_weights: mix.w,
    sectors_like: Object.entries(S.answers.sectors).filter(([, v]) => v === "like").map(([k]) => k),
    sectors_avoid: Object.entries(S.answers.sectors).filter(([, v]) => v === "avoid").map(([k]) => k),
    roles: S.answers.roles.map((r) => ({ title: r.title, priority: r.priority })),
  };
}

async function build() {
  go("building");
  try {
    S.search = await S.store.api(CONFIG.apiUrl, "/v1/profile/build", { facts: S.facts, answers: answersPayload() });
    go("recap");
  } catch (e) {
    S.step = "motivation";
    S.error = `Non sono riuscito a preparare il profilo: ${e.message}`;
    render();
  }
}

async function save() {
  const data = { version: 1, saved_at: new Date().toISOString().slice(0, 10), facts: S.facts, answers: answersPayload(), search: S.search };
  S.busy = true; render();
  try {
    await S.store.setState(STATE_KEY, JSON.stringify(data));
    S.saved = data;
    S.busy = false;
    ls.set(DRAFT_KEY, null);
    go("saved");
  } catch (e) {
    S.busy = false;
    S.error = `Non salvato: ${e.message}`;
    render();
  }
}

const ORDER = STEPS;
function next() {
  readInputs();
  const i = ORDER.indexOf(S.step);
  if (S.step === "intro") {
    if (S.resumed) { S.resumed = false; return go(S.resumeStep); }
    return go("cv");
  }
  if (S.step === "motivation") return build();
  if (S.step === "recap") return save();
  go(ORDER[i + 1]);
}

function back() {
  readInputs();
  const i = ORDER.indexOf(S.step);
  if (S.step === "recap") return go("motivation");
  if (S.step === "facts") return go("cv");
  go(ORDER[Math.max(0, i - 1)]);
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (act !== "next" && act !== "back") readInputs();
  if (act === "login") {
    try { await S.store.signIn("select_account"); await start(); } catch (err) { showLogin(err.message); }
    return;
  }
  if (act === "next") return next();
  if (act === "back") return back();
  if (act === "manual") { S.facts = S.facts || emptyFacts(); return go("facts"); }
  if (act === "edit-saved") {
    Object.assign(S, { facts: S.saved.facts, answers: { ...blankAnswers(), ...S.saved.answers }, search: S.saved.search });
    // Saved answers carry sector lists: rebuild the tri-state map.
    S.answers.sectors = {};
    (S.saved.answers.sectors_like || []).forEach((s) => { S.answers.sectors[s] = "like"; });
    (S.saved.answers.sectors_avoid || []).forEach((s) => { S.answers.sectors[s] = "avoid"; });
    S.answers.move = MOVES.find((m) => m.t === S.saved.answers.move)?.id || S.answers.move;
    return go("facts");
  }
  if (act === "set") {
    const v = el.dataset.v;
    setPath(el.dataset.k, /^\d+$/.test(v) && el.dataset.k.endsWith("radius") ? Number(v) : v);
    saveDraft(); return render();
  }
  if (act === "role") {
    const t = el.dataset.t, v = el.dataset.v;
    S.answers.roles = S.answers.roles.filter((r) => r.title !== t);
    if (v) S.answers.roles.push({ title: t, priority: v });
    saveDraft(); return render();
  }
  if (act === "add-role") return addRole();
  if (act === "city") {
    const v = el.dataset.v;
    S.answers.cities = S.answers.cities.some((c) => c.name === v) ? S.answers.cities.filter((c) => c.name !== v) : [...S.answers.cities, { name: v }];
    saveDraft(); return render();
  }
  if (act === "add-city") {
    const v = ($("#new-city")?.value || "").trim();
    if (v && !S.answers.cities.some((c) => c.name.toLowerCase() === v.toLowerCase())) S.answers.cities.push({ name: v });
    saveDraft(); return render();
  }
  if (act === "mode" || act === "ctype") {
    const key = act === "mode" ? "modes" : "company_types", v = el.dataset.v;
    S.answers[key] = S.answers[key].includes(v) ? S.answers[key].filter((x) => x !== v) : [...S.answers[key], v];
    saveDraft(); return render();
  }
  if (act === "sector") {
    const v = el.dataset.v, cur = S.answers.sectors[v];
    if (!cur) S.answers.sectors[v] = "like"; else if (cur === "like") S.answers.sectors[v] = "avoid"; else delete S.answers.sectors[v];
    saveDraft(); return render();
  }
  if (act === "motiv") {
    const v = el.dataset.v, list = S.answers.motivators;
    S.answers.motivators = list.includes(v) ? list.filter((x) => x !== v) : list.length < 3 ? [...list, v] : list;
    if (!list.includes(v) && list.length >= 3) toast("Ne bastano tre: togline una per cambiarla.");
    saveDraft(); return render();
  }
  if (act === "untag") {
    const list = getList(el.dataset.k);
    list.splice(Number(el.dataset.i), 1);
    if (el.dataset.k === "facts.languages") S.facts.languages = list;
    saveDraft(); return render();
  }
  if (act === "copy-kw") {
    try { await navigator.clipboard.writeText(S.search.linkedin_keywords.join("\n")); toast("Parole copiate."); } catch { toast("Copia non riuscita: selezionale a mano."); }
  }
});

// Typing updates the state at once, so "Avanti" turns on as soon as the answer is there.
document.addEventListener("input", (e) => {
  if (!e.target.dataset?.a && !e.target.dataset?.f) return;
  readInputs();
  const btn = document.querySelector("[data-act=next]");
  if (btn) btn.disabled = VIEWS[S.step]().canNext === false || S.busy;
  saveDraft();
});

// Tag inputs: Enter or comma adds the tag.
document.addEventListener("keydown", (e) => {
  const el = e.target;
  if (!el.dataset?.addtag || (e.key !== "Enter" && e.key !== ",")) return;
  e.preventDefault();
  const v = el.value.trim().replace(/,$/, "");
  if (!v) return;
  readInputs();
  const key = el.dataset.addtag;
  if (key === "facts.languages") {
    const m = v.match(/^(.*?)\s*\((.*)\)$/);
    S.facts.languages.push(m ? { name: m[1], level: m[2] } : { name: v, level: "" });
  } else if (!getList(key).some((x) => x.toLowerCase() === v.toLowerCase())) {
    getList(key).push(v);
  }
  saveDraft(); render();
  document.querySelector(`[data-addtag="${key}"]`)?.focus();
});

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

boot();
