// Lu, the assistant of the dashboard: questions on how JobScout.ai works and how to use the dashboard, help with simple
// problems, and corrections the agent can learn from. It opens from the round button at the bottom right (or from the
// offer detail). Answers come from the Cloudflare service (POST /v1/chat, Haiku). Every question is logged in the
// "Assistente" tab of the sheet; a correction is saved only when you press its button:
//   company category -> Stato "company_overrides_v1", search / CV preference or bug -> Stato "assistant_notes_v1".
import { CONFIG } from "./config.js";
import { FAQ } from "./faq-data.js";
import { GUIDE, JOB_STARTERS, STARTERS } from "./lu-guide.js";

const TIER_LABEL = {
  multinational: "multinazionale", large_company: "grande azienda", tech_scaleup: "scale-up tech",
  tech_startup: "startup tech", sme: "PMI", unknown: "azienda poco nota",
};
const SAVE_LABEL = {
  company_tier: (f) => `Segna ${f.company} come ${TIER_LABEL[f.tier] || f.tier}`,
  search: () => "Salva come preferenza di ricerca",
  cv: () => "Salva come preferenza per i CV",
  bug: () => "Segnala nel report",
};

// Lu's mark: a rounded head with a dark visor and two green eyes. Drawn here (not a stock icon) so it is the same
// everywhere: round button, chat header, next to Lu's messages and in the offer detail. Colours come from CSS.
export const luMark = (size = 24) => `<svg class="lu-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
  <path class="lu-mark-ant" d="M16 9V5.6" stroke-width="1.8" stroke-linecap="round"/><circle class="lu-mark-eye" cx="16" cy="4.2" r="2"/>
  <rect class="lu-mark-ear" x="2.6" y="15" width="3" height="7" rx="1.5"/><rect class="lu-mark-ear" x="26.4" y="15" width="3" height="7" rx="1.5"/>
  <rect class="lu-mark-head" x="5" y="8.6" width="22" height="19" rx="7.5"/>
  <rect class="lu-mark-visor" x="8.4" y="13.4" width="15.2" height="8.6" rx="4.3"/>
  <g class="lu-mark-eyes"><rect class="lu-mark-eye" x="11.4" y="15.9" width="3.1" height="3.6" rx="1.55"/>
  <rect class="lu-mark-eye" x="17.5" y="15.9" width="3.1" height="3.6" rx="1.55"/></g></svg>`;

let ctx = null; // { getStore, getJobs, getSelected, icon, esc, toast }
const chat = { open: false, jobId: null, messages: [], busy: false, returnFocus: null };

const parse = (s, fallback) => { try { const v = JSON.parse(s || "null"); return v ?? fallback; } catch { return fallback; } };
const pad = (n) => String(n).padStart(2, "0");
const nowStamp = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const todayIso = () => nowStamp().slice(0, 10);
const $id = (id) => document.getElementById(id);

export function initAssistant(deps) {
  ctx = deps;
  if ($id("lu")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <button class="lu-fab" id="lu-fab" data-asst="open" hidden aria-label="Apri Lu, l'assistente" aria-controls="lu" aria-expanded="false"
      title="Chiedi a Lu">${luMark(40)}</button>
    <section class="lu" id="lu" role="dialog" aria-labelledby="lu-title" tabindex="-1" hidden></section>`);
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chat.open && $id("lu").contains(e.target)) { e.stopPropagation(); close(); }
    if (e.key === "Enter" && !e.shiftKey && e.target.id === "lu-input") { e.preventDefault(); send(); }
  }, true);
}

// The round button shows only on the dashboard, not on the login and setup screens.
export function showLu(visible) {
  const fab = $id("lu-fab");
  if (fab) fab.hidden = !visible;
  if (!visible && chat.open) close();
}

export function openAssistant(jobId = null) {
  if (!chat.open) chat.returnFocus = document.activeElement;
  if (jobId !== chat.jobId) chat.messages = [];
  chat.jobId = jobId;
  chat.open = true;
  const panel = $id("lu");
  panel.hidden = false;
  panel.classList.add("opening");
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove("opening")));
  document.body.classList.add("lu-open");
  $id("lu-fab").setAttribute("aria-expanded", "true");
  render();
  $id("lu-input")?.focus();
}

function close() {
  chat.open = false;
  const panel = $id("lu");
  panel.classList.add("closing");
  setTimeout(() => { if (!chat.open) { panel.hidden = true; } panel.classList.remove("closing"); }, 160);
  document.body.classList.remove("lu-open");
  $id("lu-fab").setAttribute("aria-expanded", "false");
  const back = chat.returnFocus;
  (back && document.body.contains(back) ? back : $id("lu-fab"))?.focus?.({ preventScroll: true });
}

function job() { return ctx.getJobs().find((j) => j.id === chat.jobId) || null; }

function chips(list) {
  const { esc } = ctx;
  return `<div class="lu-sugg">${list.map((q) => `<button class="lu-chip" data-asst="ask" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>`;
}

function render() {
  const { esc, icon } = ctx;
  const j = job();
  const hello = j
    ? `Ciao, sono Lu, l'assistente AI di JobScout. Stai guardando ${j.title} di ${j.company}: chiedimi pure, anche se qualcosa non ti torna.`
    : "Ciao, sono Lu, l'assistente AI di JobScout. Ti aiuto a muoverti nella dashboard e a capire le offerte. Se vedi qualcosa che non torna dimmelo, lo faccio sapere all'agente.";
  const last = chat.messages.length - 1;
  const avatar = `<span class="lu-mini">${luMark(16)}</span>`;
  const msgs = chat.messages.map((m, i) => {
    if (m.role === "user") return `<div class="msg msg-user"><p>${esc(m.content)}</p></div>`;
    const f = m.feedback;
    const canSave = f && f.type !== "none" && !m.saved && SAVE_LABEL[f.type] && (f.type !== "company_tier" || (f.company && f.tier));
    const follow = i === last && !chat.busy && m.followUps?.length ? chips(m.followUps) : "";
    return `<div class="lu-row">${avatar}<div class="msg msg-bot"><p>${esc(m.content)}</p>
      ${canSave ? `<button class="btn btn-quiet btn-sm" data-asst="save" data-i="${i}">${esc(SAVE_LABEL[f.type](f))}</button>` : ""}
      ${m.saved ? `<p class="small muted">Fatto, l'agente ne terrà conto dalla prossima ricerca.</p>` : ""}</div></div>${follow}`;
  }).join("");
  $id("lu").innerHTML = `
    <header class="lu-head">
      <span class="lu-avatar">${luMark(30)}</span>
      <div class="lu-who"><h2 id="lu-title">Lu</h2>
        <p>${j ? `Sull'offerta di ${esc(j.company)}` : "Il tuo assistente su JobScout.ai"}</p></div>
      <button class="btn btn-icon" data-asst="close" aria-label="Chiudi Lu">${icon("close")}</button>
    </header>
    <div class="lu-log" id="lu-log" role="log" aria-live="polite">
      <div class="lu-row">${avatar}<div class="msg msg-bot"><p>${esc(hello)}</p></div></div>
      ${chat.messages.length ? "" : chips(j ? JOB_STARTERS(j) : STARTERS)}
      ${msgs}
      ${chat.busy ? `<div class="lu-row">${avatar}<div class="msg msg-bot lu-typing" role="status" aria-label="Lu sta scrivendo"><span></span><span></span><span></span></div></div>` : ""}
    </div>
    <div class="lu-form">
      <textarea id="lu-input" rows="1" placeholder="Scrivi a Lu" aria-label="Messaggio per Lu" ${chat.busy ? "disabled" : ""}></textarea>
      <button class="btn btn-primary btn-icon lu-send" data-asst="send" aria-label="Invia" ${chat.busy ? "disabled" : ""}>${icon("send", 17)}</button>
    </div>
    <p class="lu-note">Lu è un'intelligenza artificiale e può sbagliare: per le scelte importanti controlla l'annuncio. <a href="faq.html">Domande frequenti</a></p>`;
  const log = $id("lu-log");
  log.scrollTop = log.scrollHeight;
}

function context() {
  const jobs = ctx.getJobs();
  const count = (st) => jobs.filter((x) => x.status === st).length;
  const j = job();
  const pick = (x, keys) => Object.fromEntries(keys.filter((k) => x[k]).map((k) => [k, String(x[k]).slice(0, 400)]));
  return {
    oggi: todayIso(),
    offerte: { totali: jobs.length, da_valutare: count("Da valutare"), cv_pronti: count("CV pronto"),
      candidature_inviate: jobs.filter((x) => x.applied_date).length },
    offerta_aperta: j ? pick(j, ["title", "company", "city", "work_mode", "status", "score", "score_detail", "salary",
      "salary_type", "priority", "role_fit", "category", "years_required", "decision", "reject_reason", "found_date",
      "source", "notes", "min_qualifications"]) : null,
  };
}

async function send(text) {
  const input = $id("lu-input");
  const content = (text ?? input?.value ?? "").trim();
  if (!content || chat.busy) return;
  chat.messages.push({ role: "user", content });
  chat.busy = true;
  render();
  const store = ctx.getStore();
  try {
    const res = await store.api(CONFIG.apiUrl, "/v1/chat", {
      messages: chat.messages.map((m) => ({ role: m.role, content: m.content })),
      context: context(),
      faq: FAQ.flatMap((g) => g.items),
      guide: GUIDE,
    });
    const followUps = (Array.isArray(res.follow_ups) ? res.follow_ups : []).map(String).filter(Boolean).slice(0, 3);
    chat.messages.push({ role: "assistant", content: res.answer || "Qui non so aiutarti, scusa.", feedback: res.feedback, kind: res.kind, followUps });
    log(store, content, res);
  } catch (e) {
    chat.messages.push({ role: "assistant", content: `Non riesco a risponderti adesso (${e.message}). Riprova tra un attimo.` });
  } finally {
    chat.busy = false;
    render();
    $id("lu-input")?.focus();
  }
}

function log(store, question, res) {
  const j = job();
  const where = j ? `Offerta: ${j.title} - ${j.company}` : "Dashboard";
  const proposed = res.feedback && res.feedback.type !== "none" ? `proposta: ${res.feedback.type}` : "";
  const u = res.usage || {};
  // Logging is best effort: a failed write must not hide the answer.
  store.appendRows("Assistente", [[nowStamp(), where, question.slice(0, 1000), res.kind || "", res.faq_topic || "",
    (res.answer || "").slice(0, 300), proposed]]).catch(() => {});
  if (u.usd) {
    store.appendRows("Costi", [[todayIso(), "assistente", u.model, u.input, u.output, u.cache_read, u.cache_write, "no", u.usd]])
      .catch(() => {});
  }
}

async function save(i) {
  const m = chat.messages[i];
  const f = m?.feedback;
  if (!f) return;
  const store = ctx.getStore();
  try {
    if (f.type === "company_tier") {
      const cur = parse(await store.getState("company_overrides_v1"), {});
      cur[f.company] = f.tier;
      await store.setState("company_overrides_v1", JSON.stringify(cur));
    } else {
      const cur = [].concat(parse(await store.getState("assistant_notes_v1"), []));
      cur.push({ type: f.type, note: f.note || m.content, date: todayIso() });
      await store.setState("assistant_notes_v1", JSON.stringify(cur.slice(-60)));
    }
    m.saved = true;
    render();
    ctx.toast("Salvato. L'agente lo usa dalla prossima ricerca.");
  } catch (e) {
    ctx.toast(`Non sono riuscito a salvare: ${e.message}`, "error");
  }
}

function onClick(e) {
  const el = e.target.closest("[data-asst]");
  if (!el) return;
  const a = el.dataset.asst;
  if (a === "open") chat.open ? close() : openAssistant(ctx.getSelected() || null);
  else if (a === "close") close();
  else if (a === "send") send();
  else if (a === "ask") send(el.dataset.q);
  else if (a === "save") save(Number(el.dataset.i));
}
