// Assistant panel of the dashboard: questions on how JobScout.ai works, help with simple problems, and corrections
// the agent can learn from. Answers come from the Cloudflare service (POST /v1/chat, Haiku). Every question is logged
// in the "Assistente" tab of the sheet; a correction is saved only when you press its button:
//   company category -> Stato "company_overrides_v1", search / CV preference or bug -> Stato "assistant_notes_v1".
import { CONFIG } from "./config.js";
import { FAQ } from "./faq-data.js";

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

let ctx = null; // { getStore, getJobs, getSelected, icon, esc, toast }
const chat = { open: false, jobId: null, messages: [], busy: false, returnFocus: null };

const parse = (s, fallback) => { try { const v = JSON.parse(s || "null"); return v ?? fallback; } catch { return fallback; } };
const pad = (n) => String(n).padStart(2, "0");
const nowStamp = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const todayIso = () => nowStamp().slice(0, 10);

export function initAssistant(deps) {
  ctx = deps;
  if (document.getElementById("asst-wrap")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="drawer-wrap asst-wrap" id="asst-wrap" hidden>
      <div class="drawer-bg" data-asst="close"></div>
      <section class="drawer asst" id="asst" role="dialog" aria-modal="true" aria-labelledby="asst-title" tabindex="-1"></section>
    </div>`);
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chat.open) close();
    if (e.key === "Enter" && !e.shiftKey && e.target.id === "asst-input") { e.preventDefault(); send(); }
  });
}

export function openAssistant(jobId = null) {
  chat.returnFocus = document.activeElement;
  if (jobId !== chat.jobId) chat.messages = [];
  chat.jobId = jobId;
  chat.open = true;
  const wrap = document.getElementById("asst-wrap");
  wrap.hidden = false;
  wrap.classList.add("opening");
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.remove("opening")));
  document.body.classList.add("no-scroll");
  render();
  document.getElementById("asst-input")?.focus();
}

function close() {
  chat.open = false;
  const wrap = document.getElementById("asst-wrap");
  wrap.classList.add("closing");
  setTimeout(() => { wrap.hidden = true; wrap.classList.remove("closing"); }, 180);
  if (!ctx.getSelected()) document.body.classList.remove("no-scroll");
  chat.returnFocus?.focus?.({ preventScroll: true });
}

function job() { return ctx.getJobs().find((j) => j.id === chat.jobId) || null; }

function suggestions() {
  const j = job();
  if (j) {
    return [`Perché ${j.company} ha questo match?`, "Questa offerta ha un dato sbagliato", "Cosa succede se dico sì?"];
  }
  return ["Quando cerca nuove offerte?", "Come scelgo il motivo quando dico no?", "Voglio segnalare un errore"];
}

function render() {
  const { esc, icon } = ctx;
  const j = job();
  const msgs = chat.messages.map((m, i) => {
    if (m.role === "user") return `<div class="msg msg-user"><p>${esc(m.content)}</p></div>`;
    const f = m.feedback;
    const canSave = f && f.type !== "none" && !m.saved && SAVE_LABEL[f.type] && (f.type !== "company_tier" || (f.company && f.tier));
    return `<div class="msg msg-bot"><p>${esc(m.content)}</p>
      ${canSave ? `<button class="btn btn-quiet btn-sm" data-asst="save" data-i="${i}">${esc(SAVE_LABEL[f.type](f))}</button>` : ""}
      ${m.saved ? `<p class="small muted">Salvato: l'agente ne terrà conto dai prossimi giri.</p>` : ""}</div>`;
  }).join("");
  document.getElementById("asst").innerHTML = `
    <div class="dr-head">
      <div class="dr-title"><h2 id="asst-title">Assistente</h2>
        <p>${j ? `Su: ${esc(j.title)}, ${esc(j.company)}` : "Come funziona JobScout.ai, dati che non tornano, errori."}</p></div>
      <button class="btn btn-icon" data-asst="close" aria-label="Chiudi">${icon("close")}</button>
    </div>
    <div class="asst-log" id="asst-log" role="log" aria-live="polite">
      ${msgs || `<p class="small muted">Chiedi pure: rispondo sulle funzioni dell'app e sui dati che vedi. Se qualcosa non torna, posso salvare la correzione per le prossime ricerche.</p>
        <div class="asst-sugg">${suggestions().map((s) => `<button class="btn btn-quiet btn-sm" data-asst="ask" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div>`}
      ${chat.busy ? `<div class="msg msg-bot"><p class="muted">Sto scrivendo...</p></div>` : ""}
    </div>
    <div class="asst-form">
      <textarea id="asst-input" rows="2" placeholder="Scrivi una domanda o una segnalazione" aria-label="Messaggio per l'assistente" ${chat.busy ? "disabled" : ""}></textarea>
      <button class="btn btn-primary" data-asst="send" ${chat.busy ? "disabled" : ""}>${icon("send", 16)}<span>Invia</span></button>
    </div>
    <p class="small muted asst-note">Le domande restano nel tuo foglio Google, scheda "Assistente". Le risposte sono generate dall'AI: per le scelte importanti controlla i dati dell'offerta.</p>`;
  const log = document.getElementById("asst-log");
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
  const input = document.getElementById("asst-input");
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
    });
    chat.messages.push({ role: "assistant", content: res.answer || "Non ho una risposta.", feedback: res.feedback, kind: res.kind });
    log(store, content, res);
  } catch (e) {
    chat.messages.push({ role: "assistant", content: `Non riesco a rispondere ora (${e.message}). Riprova tra poco.` });
  } finally {
    chat.busy = false;
    render();
    document.getElementById("asst-input")?.focus();
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
  if (a === "close") close();
  else if (a === "send") send();
  else if (a === "ask") send(el.dataset.q);
  else if (a === "save") save(Number(el.dataset.i));
}
