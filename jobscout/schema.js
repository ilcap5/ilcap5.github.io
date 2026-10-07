// Same columns, statuses and rules as jobagent/sheets.py: keep the two in sync.

export const HEADERS = {
  "Data candidatura": "applied_date", "Azienda": "company", "Ruolo": "title", "Match": "score",
  "Città": "city", "Link annuncio": "job_url", "RAL indicata": "salary", "Tipo RAL": "salary_type",
  "Priorità": "priority", "Stato": "status", "Data ultimo contatto": "last_contact",
  "Giorni dall'ultimo contatto": "days_since", "Prossimo step": "next_step", "Data prossimo step": "next_step_date",
  "Candidarsi (Y/N)": "decision", "Motivo N": "reject_reason", "Dettaglio match": "score_detail",
  "Tipo ruolo": "role_fit", "Area": "category", "Anni richiesti": "years_required",
  "Requisiti minimi": "min_qualifications", "Competenze chiave": "key_skills", "Nota RAL": "salary_note",
  "Modalità": "work_mode", "CV": "cv_link", "Link candidatura": "apply_url", "Portale": "portal",
  "Registrazione richiesta": "registration", "Canale": "channel", "Referral (nome)": "referral",
  "Pubblicata il": "posted_date", "Trovata il": "found_date", "Fonte": "source", "Esito / Note": "notes",
  "ID": "id", "Paese": "country", "Sito azienda": "company_domain", "Aggiornata il": "updated",
};

export const S = {
  NEW: "Da valutare", STANDBY: "Stand-by", CV_READY: "CV pronto", CV_CHECK: "CV da rivedere",
  APPLIED: "Candidata", FOLLOWUP_DUE: "Follow-up da inviare", FOLLOWUP_SENT: "Follow-up inviato",
  SCREENING: "Screening recruiter", ASSESSMENT: "Assessment / test", INTERVIEW: "Colloquio in corso",
  FINAL_LOOP: "Loop finale", OFFER: "Offerta", REJECTED: "Rifiutata", NO_ANSWER: "Nessuna risposta",
  WITHDRAWN: "Ritirata da me", EXPIRED: "Scaduta",
};
export const STATUSES = Object.values(S);
export const APPLIED_STATUSES = new Set([S.APPLIED, S.FOLLOWUP_DUE, S.FOLLOWUP_SENT, S.SCREENING, S.ASSESSMENT,
  S.INTERVIEW, S.FINAL_LOOP, S.OFFER, S.REJECTED, S.NO_ANSWER, S.WITHDRAWN]);
export const RESPONDED = new Set([S.SCREENING, S.ASSESSMENT, S.INTERVIEW, S.FINAL_LOOP, S.OFFER, S.REJECTED]);
export const INTERVIEWING = new Set([S.SCREENING, S.ASSESSMENT, S.INTERVIEW, S.FINAL_LOOP]);
export const FINAL = new Set([S.OFFER, S.REJECTED, S.NO_ANSWER, S.WITHDRAWN, S.EXPIRED]);
export const PRE_APPLY = new Set([S.NEW, S.STANDBY, S.CV_READY, S.CV_CHECK]);

export const REJECT_REASONS = ["Troppo senior", "Overqualified (troppo junior)", "Ruolo non in linea",
  "Azienda non interessante", "Settore non interessante", "RAL bassa", "Sede / modalità", "Altro"];

export const FOLLOWUP_STEP = "Attendere risposta, poi follow-up";

// Tabs of the job list, like the stages of a pipeline.
export const TABS = [
  { key: "all", label: "Tutte", test: () => true },
  { key: "review", label: "Da valutare", test: (j) => j.status === S.NEW },
  { key: "ready", label: "CV pronti", test: (j) => j.status === S.CV_READY || j.status === S.CV_CHECK },
  { key: "applied", label: "Inviate", test: (j) => [S.APPLIED, S.FOLLOWUP_DUE, S.FOLLOWUP_SENT].includes(j.status) },
  { key: "interview", label: "Colloqui", test: (j) => INTERVIEWING.has(j.status) },
  { key: "offer", label: "Offerte", test: (j) => j.status === S.OFFER },
  { key: "closed", label: "Chiuse", test: (j) => [S.REJECTED, S.NO_ANSWER, S.WITHDRAWN, S.EXPIRED].includes(j.status) },
  { key: "standby", label: "Scartate", test: (j) => j.status === S.STANDBY },
];

// Status -> colour family (CSS classes in styles.css). Few families, each with a meaning:
// amber = tocca a te, green = in corso, deep = colloqui, brand = offerta, red = problema o no, grey = chiusa.
export const STATUS_TONE = {
  [S.NEW]: "amber", [S.CV_READY]: "amber", [S.FOLLOWUP_DUE]: "amber", [S.CV_CHECK]: "red",
  [S.APPLIED]: "green", [S.FOLLOWUP_SENT]: "green",
  [S.SCREENING]: "deep", [S.ASSESSMENT]: "deep", [S.INTERVIEW]: "deep", [S.FINAL_LOOP]: "deep",
  [S.OFFER]: "brand", [S.REJECTED]: "red",
  [S.STANDBY]: "grey", [S.NO_ANSWER]: "grey", [S.WITHDRAWN]: "grey", [S.EXPIRED]: "grey",
};

// Search days (screening.yml): Monday, Wednesday, Friday at 15:20.
const RUN_DAYS = [1, 3, 5];
const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre",
  "ottobre", "novembre", "dicembre"];
export function longDate(d = new Date()) {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export function nextRun(now = new Date()) {
  for (let i = 0; i < 8; i++) {
    const d = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), i);
    const at = new Date(d); at.setHours(15, 20);
    if (RUN_DAYS.includes(d.getDay()) && at > now) {
      return i === 0 ? "oggi alle 15:20" : i === 1 ? "domani alle 15:20" : `${WEEKDAYS[d.getDay()]} alle 15:20`;
    }
  }
  return "";
}

export function matchTone(score) {
  const n = Number(score);
  if (!Number.isFinite(n) || score === "") return "";
  if (n >= 85) return "m85";
  if (n >= 70) return "m70";
  if (n >= 50) return "m50";
  if (n >= 30) return "m30";
  return "m0";
}

// ---------------------------------------------------------------- dates (sheet: dd/mm/yyyy, locale en_GB)
export function parseDate(s) {
  if (!s) return null;
  let m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}
export const pad = (n) => String(n).padStart(2, "0");
export function fmtDate(d) {
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : "";
}
export function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}
export function shortDate(s) {
  const d = parseDate(s);
  if (!d) return "";
  const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
export function relDate(s) {
  const d = parseDate(s);
  if (!d) return "";
  const n = daysBetween(today(), d);
  if (n === 0) return "oggi";
  if (n === 1) return "domani";
  if (n === -1) return "ieri";
  if (n < 0) return `${-n} giorni fa`;
  return `fra ${n} giorni`;
}

// ---------------------------------------------------------------- company logos (as in emails.py)
const KNOWN_DOMAINS = {
  "amazon web services": "aws.amazon.com", "aws": "aws.amazon.com", "amazon": "amazon.com", "google": "google.com",
  "revolut": "revolut.com", "stripe": "stripe.com", "mckinsey": "mckinsey.com", "ey-parthenon": "ey.com",
  "monitor deloitte": "deloitte.com", "deloitte": "deloitte.com", "glovo": "glovoapp.com", "satispay": "satispay.com",
  "bending spoons": "bendingspoons.com", "scalapay": "scalapay.com", "flatpay": "flatpay.com",
};
export function companyDomain(job) {
  const raw = (job.company_domain || "").trim().toLowerCase();
  if (raw) return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const name = (job.company || "").toLowerCase();
  const key = Object.keys(KNOWN_DOMAINS).sort((a, b) => b.length - a.length).find((k) => name.includes(k));
  return key ? KNOWN_DOMAINS[key] : "";
}
export function initials(name) {
  const words = String(name || "?").replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  return ((words[0] || "?")[0] + (words[1] ? words[1][0] : "")).toUpperCase();
}
