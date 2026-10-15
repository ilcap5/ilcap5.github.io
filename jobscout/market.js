// "Il tuo mercato": the last run's funnel, the market salary and the most frequent gaps, written by the agent in the
// Stato tab (insights_v1, jobagent/insights.py). Only real numbers: salaries stated in the ads, never estimates.

export const INSIGHTS_KEY = "insights_v1";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const k = (v) => `${Math.round(Number(v) / 1000)}k`;
const day = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${m[3]}/${m[2]}` : ""; };

export function parseInsights(raw) {
  try { const d = JSON.parse(raw || "{}"); return d && typeof d === "object" && !Array.isArray(d) ? d : null; } catch { return null; }
}

function funnelPanel(f) {
  if (!f) return `<div class="panel pad"><div class="panel-h"><h2>Ultimo giro</h2></div><p class="muted sm">I numeri arrivano dopo il prossimo giro di ricerca.</p></div>`;
  const steps = [
    ["Guardate", f.lette], ["Nuove", f.nuove], ["Valutate", f.analizzate], ["Nel foglio", f.aggiunte], ["Proposte", f.proposte],
  ];
  const max = Math.max(1, Number(f.lette) || 0);
  const rows = steps.map(([label, n]) => `<div class="fn-row"><span class="fn-label">${label}</span>
    <span class="fn-track"><span class="fn-bar" style="--w:${n ? Math.max(2, (n / max) * 100) : 0}%"></span></span>
    <span class="fn-n">${Number(n) || 0}</span><span class="fn-conv"></span></div>`).join("");
  const reasons = Object.entries(f.motivi || {});
  const total = reasons.reduce((s, [, n]) => s + Number(n || 0), 0);
  const chips = reasons.map(([label, n]) => `<li><span>${esc(label)}</span><b>${Number(n) || 0}</b></li>`).join("");
  const later = f.rimandate ? `<p class="muted sm mk-note">${f.rimandate} ${f.rimandate === 1 ? "offerta rimandata" : "offerte rimandate"} al prossimo giro.</p>` : "";
  return `<div class="panel pad"><div class="panel-h"><h2>Ultimo giro</h2><span class="muted sm">${esc(day(f.data))}</span></div>
    <div class="funnel">${rows}</div>
    ${total ? `<div class="mk-sub">Scartate per motivo <span class="muted">${total}</span></div><ul class="mk-reasons">${chips}</ul>` : ""}${later}</div>`;
}

function salaryPanel(r, days) {
  const n = Number(r?.annunci) || 0;
  let body;
  if (!n) body = `<p class="muted sm">Nessun annuncio in target con la RAL dichiarata negli ultimi ${days} giorni.</p>`;
  else if (!r.forchetta) body = `<p class="mk-big muted">-</p><p class="muted sm">Solo ${n} ${n === 1 ? "annuncio" : "annunci"} con la RAL dichiarata: troppo pochi per una forchetta.</p>`;
  else {
    const lo = Number(r.da), hi = Number(r.a), span = Math.max(1, hi - lo);
    const left = ((Number(r.min) - lo) / span) * 100, width = Math.max(2, ((Number(r.max) - Number(r.min)) / span) * 100);
    const types = Object.entries(r.per_tipo || {}).filter(([, b]) => b.forchetta)
      .map(([fit, b]) => `<li><span>${esc(fit)}</span><b>${esc(b.forchetta)}</b><span class="muted">${b.annunci} annunci</span></li>`).join("");
    body = `<p class="mk-big">${esc(r.forchetta)}</p>
      <p class="muted sm">forchetta tipica su <b>${n}</b> annunci in target</p>
      <div class="mk-range" role="img" aria-label="Da ${k(lo)} a ${k(hi)}, forchetta tipica ${esc(r.forchetta)}">
        <span class="mk-range-bar" style="--l:${left}%;--w:${width}%"></span></div>
      <div class="mk-range-ends"><span>${k(lo)}</span><span>${k(hi)}</span></div>
      ${types ? `<ul class="mk-types">${types}</ul>` : ""}`;
  }
  return `<div class="panel pad"><div class="panel-h"><h2>RAL di mercato</h2><span class="muted sm">ultimi ${days} giorni</span></div>${body}
    <p class="muted xs mk-note">Solo RAL scritte negli annunci, mai stime.</p></div>`;
}

function gapsPanel(items) {
  const list = (items || []).map((m) => `<li class="mk-gap">
      <div class="mk-gap-h"><b>${esc(m.requisito)}</b><span class="mk-count">${Number(m.conteggio) || 0} offerte</span></div>
      <span class="mk-tag ${m.nel_cv ? "tone-green" : "tone-amber"}">${m.nel_cv ? "Già nel CV: mettilo in evidenza" : "Da imparare, o da dire all'agente se lo sai"}</span></li>`).join("");
  return `<div class="panel pad"><div class="panel-h"><h2>Cosa ti manca più spesso</h2></div>
    ${list ? `<ul class="mk-gaps">${list}</ul>` : `<p class="muted sm">Nessun requisito mancante in più di un'offerta.</p>`}
    <p class="muted xs mk-note">Requisiti obbligatori delle offerte in target. Nel CV su misura non li aggiungo mai.</p></div>`;
}

export function marketHtml(data) {
  if (!data) return "";
  const days = Number(data.giorni) || 120;
  return `<div class="market-h"><h2>Il tuo mercato</h2><span class="muted sm">aggiornato il ${esc(day(data.aggiornato))}</span></div>
    <div class="market-grid">${funnelPanel(data.imbuto)}${salaryPanel(data.ral, days)}${gapsPanel(data.mancanti)}</div>`;
}
