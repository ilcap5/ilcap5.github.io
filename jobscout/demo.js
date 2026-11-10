// Sample offers to try the dashboard without logging in. Invented data, shown with a "Dati di esempio" badge.
import { addDays, fmtDate, today } from "./schema.js?v=202611101623";

const d = (n) => (n === null ? "" : fmtDate(addDays(today(), n)));

const ROWS = [
  // company, title, domain, score, status, decision, found, applied, next_step, next_date, role_fit, salary, type, years, mode
  ["Amazon", "Program Manager, EU Operations", "amazon.com", 88, "Da valutare", "", 0, null, "Decidere Y/N", 7, "affine", "55-65k", "Stima", "3-5", "Ibrido"],
  ["Glovo", "Operations Excellence Specialist", "glovoapp.com", 84, "Da valutare", "", 0, null, "Decidere Y/N", 7, "core", "45-52k", "Stima", "2-4", "Ibrido"],
  ["Satispay", "Business Operations Associate", "satispay.com", 79, "Da valutare", "Y", 0, null, "Decidere Y/N", 7, "core", "42-48k", "Stima", "2+", "Ibrido"],
  ["Stripe", "Solutions Engineer", "stripe.com", 66, "Da valutare", "", -2, null, "Decidere Y/N", 5, "esplorativo", "60-75k", "Stima", "3+", "Ibrido"],
  ["Scalapay", "Strategy & Operations Analyst", "scalapay.com", 74, "Da valutare", "", -2, null, "Decidere Y/N", 5, "core", "45-55k", "Stima", "2-4", "In sede"],
  ["Revolut", "Business Development Representative", "revolut.com", 52, "Da valutare", "", -4, null, "Decidere Y/N", 3, "esplorativo", "40-46k", "Stima", "1+", "Ibrido"],
  ["McKinsey & Company", "Junior Associate, Operations Practice", "mckinsey.com", 86, "CV pronto", "Y", -5, null, "Inviare la candidatura", -1, "core", "60-70k", "Stima", "2-4", "In sede"],
  ["Flatpay", "Operations Manager Italy", "flatpay.com", 81, "CV da rivedere", "Y", -5, null, "Rivedere il CV e candidarsi", -1, "core", "50-58k", "Stima", "3-5", "Ibrido"],
  ["Google", "Program Manager, Data Center Ops", "google.com", 77, "Candidata", "Y", -12, -9, "Attendere risposta, poi follow-up", 5, "affine", "65-80k", "Stima", "4+", "Ibrido"],
  ["EY-Parthenon", "Consultant, Operations Strategy", "ey.com", 83, "Follow-up da inviare", "Y", -20, -16, "Inviare il follow-up (bozza in Gmail)", 0, "core", "48-55k", "Stima", "2-4", "Ibrido"],
  ["Monitor Deloitte", "Senior Consultant, Supply Chain Strategy", "deloitte.com", 80, "Screening recruiter", "Y", -18, -15, "Rispondere al recruiter", 1, "core", "52-60k", "Stima", "3-5", "Ibrido"],
  ["Bending Spoons", "Product Operations Specialist", "bendingspoons.com", 72, "Colloquio in corso", "Y", -25, -22, "Confermare e preparare il colloquio", 2, "affine", "70-85k", "Dichiarata", "Non indicati", "In sede"],
  ["Casavo", "Operations Lead", "casavo.com", 75, "Scartata dall'azienda", "Y", -30, -27, "", null, "core", "50-60k", "Stima", "4+", "Ibrido"],
  ["Everli", "Supply Planning Specialist", "everli.com", 58, "Nessuna risposta", "Y", -40, -36, "", null, "core", "42-46k", "Stima", "2+", "Ibrido"],
  ["Acme Logistics", "Senior Operations Director", "", 34, "Stand-by", "N", -6, null, "", null, "fuori target", "90-110k", "Stima", "10+", "In sede"],
  ["Fiscozen", "Customer Operations Analyst", "fiscozen.it", 61, "Stand-by", "N", -6, null, "", null, "affine", "38-42k", "Stima", "1-2", "Remoto"],
];

export function demoJobs() {
  return ROWS.map((r, i) => {
    const [company, title, domain, score, status, decision, found, applied, next_step, next_date, role_fit, salary,
      salary_type, years, work_mode] = r;
    return {
      id: `demo:${i}`, company, title, company_domain: domain, score: String(score), status, decision,
      reject_reason: decision === "N" ? (score < 40 ? "Troppo senior" : "RAL bassa") : "",
      found_date: d(found), posted_date: d(found - 3), applied_date: d(applied), last_contact: d(applied),
      next_step, next_step_date: d(next_date), role_fit, salary, salary_type, years_required: years, work_mode,
      city: "Milano", country: "IT", priority: score >= 80 ? "Alta" : score >= 60 ? "Media" : "Bassa",
      category: role_fit === "esplorativo" ? "Sales" : "Operations",
      score_detail: `Competenze ${Math.round(score / 12)}/8 · Requisiti formali ok · Esperienza 2.6 vs ${parseInt(years) || 3} anni`,
      // the last rows keep the old plain sentence, to show how offers analysed before the checklist look
      min_qualifications: i < 12
        ? [...(/\d/.test(years) ? ["✓ Esperienza: " + years + " anni (ne hai 2.6)"] : []), "✓ Laurea in ingegneria o economia", "✓ Inglese fluente",
          (score >= 80 ? "✓" : "?") + " Gestione di progetti con più funzioni aziendali", (score >= 75 ? "✓" : "✗") + " SQL per analisi dei dati",
          (score >= 85 ? "?" : "✗") + " Esperienza in un'azienda tech o in una scale-up"].join("\n")
        : "Laurea in ingegneria o economia; 2-4 anni in consulenza o operations; inglese fluente; Excel e SQL.",
      key_skills: "process improvement, stakeholder management, SQL, project management, data analysis",
      salary_note: salary_type === "Stima" ? "Stima, affidabilità media: ruoli analoghi a Milano" : "",
      job_url: "https://www.linkedin.com/jobs/", apply_url: "https://www.linkedin.com/jobs/",
      cv_link: ["CV pronto", "CV da rivedere"].includes(status) || applied !== null ? "https://drive.google.com/" : "",
      portal: "Workday", registration: i % 3 === 0 ? "Sì (Workday)" : "No", source: i % 2 ? "LinkedIn" : "Sito carriere",
      channel: "Candidatura diretta", notes: status === "CV da rivedere"
        ? "Controllo fatti non superato: una frase non torna con il CV originale." : "",
    };
  });
}

// Sample "Progetto" tab (admin view): invented documents, same shape the agent writes (jobagent/project.py),
// "Dati" column included.
export function demoProject() {
  const t = today();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dm = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const d0 = iso(t), d1 = iso(addDays(t, -2)), d3 = iso(addDays(t, -3));
  const due = (n) => ({ due: iso(addDays(t, n)), due_label: dm(addDays(t, n)) });
  const it = (text, extra = {}) => ({ text, short: text.split(". ")[0], ...extra });
  const salData = (verdict, headline, risk) => ({ verdict, headline,
    done: [it("Ricerca offerte: 3 giri riusciti, 18 offerte aggiunte", { ok: true }), it("Riepilogo delle 18 inviato puntuale", { ok: true }),
      it("CV della sera: un giro non riuscito per un errore del servizio AI", { ok: false })],
    doing: [it("Fase 3: si osserva se la ricerca senza limiti fissi regge"), it("In attesa di te: 8 offerte da valutare")],
    risks: [it(risk, { level: "alto" }), it("Offerte aggiunte in calo: 14 in 7 giorni contro 41", { level: "medio" }),
      it("3 siti carriere non leggibili, si correggono nella scheda Siti carriere", { level: "basso" })],
    next: [it("Rileggere il contratto PwC", { owner: "Federico", ...due(2) }), it("Rifare il giro dei CV non riuscito", { owner: "Claude", ...due(1) }),
      it("Contare le offerte per giorno prima di cambiare le regole", { owner: "Agente", due: "", due_label: "" })],
    numbers: { si_su_decise_pct: 9, offerte_aggiunte_7g: 14, match_medio_aggiunte_7g: 72, da_valutare: 8, cv_pronti_da_inviare: 1,
      spesa_mese_usd: 2.4, proiezione_fine_mese_usd: 4.9 }, proposals: [] });
  const council = { plan: "Fase 3 oltre la scadenza, fasi 4 e 6 ferme in attesa di te; spesa sotto il budget.",
    summary: "Giri regolari ma nessun Sì nuovo. I consulenti concordano: prezzo e lancio restano fermi finché non ci sono dati.",
    points: [
      { text: "Contare le offerte per giorno prima di toccare le regole", who: "Avvocato del diavolo", verdict: "Geniale", why: "Costa una lettura del foglio. Evita di annullare una scelta su un dato gonfiato.", why_short: "Costa una lettura del foglio" },
      { text: "Tre numeri per ogni giro nel SAL", who: "Analista finanziario", verdict: "Da fare", why: "Nessun costo AI, rende misurabile il calo.", why_short: "Nessun costo AI, rende misurabile il calo." },
      { text: "Questionario anonimo entro fine mese", who: "Marketing", verdict: "Da approfondire", why: "Unica fonte sulla domanda prima di novembre.", why_short: "Unica fonte sulla domanda prima di novembre." },
      { text: "Leggere i siti difficili con il browser", who: "SAL", verdict: "Rischioso", why: "Senza un tetto costa circa un terzo del budget.", why_short: "Senza un tetto costa circa un terzo del budget." },
    ],
    decisions: [
      { title: "Calo delle offerte", note: "", why: "Senza numeri per giro ogni lettura del calo resta un'opinione.", rec: "Non tornare indietro: prima si contano le offerte per giorno.", alt: "Lasciare tutto com'è per una settimana.", ...due(1), if_not: "Si rischia di annullare la fase 3 su un dato sbagliato." },
      { title: "Contratto e questionario", note: "", why: "Senza contratto chiarito non esiste una strada commerciale.", rec: "Rileggere il contratto e far partire il questionario anonimo.", alt: "Solo la rilettura del contratto.", ...due(4), if_not: "Le fasi 5 e 6 restano ferme." },
    ], later: ["Prezzo e prova gratuita", "Testi della pagina pubblica"] };
  const row = (id, text, n, owner, status, detail = "") => ({ id, text, ...(n === null ? { due: "", due_label: "" } : due(n)), owner, status, detail });
  const roadmap = { aggiornata: dm(t), rischi: ["LinkedIn a volte limita le richieste: la ricerca pubblica può portare meno offerte."],
    fasi: [row("Fase 0", "L'agente lavora per te: almeno 1 colloquio e più del 15% di Sì", 8, "Federico", "In corso"),
      row("Fase 1", "Migliorie rapide dei consulenti", -20, "Claude", "Fatto"), row("Fase 2", "Prove a vuoto", -19, "Claude", "Fatto"),
      row("Fase 3", "Ricerca senza limiti fissi: capire se regge", -8, "Claude", "In corso", "Da leggere: offerte arrivate all'AI e quota di Sì."),
      row("Fase 4", "Prova con i CV di due amici", 3, "Federico", "In attesa"), row("Fase 5", "Questionario a un campione", 10, "Federico", "Da fare")],
    punti: [row("R1", "Contare le offerte per giorno prima di toccare la fase 3", 1, "Federico", "In attesa"),
      row("R2", "Tre numeri per ogni giro nel SAL", 6, "Claude", "In attesa"),
      row("R3", "Verifiche dei giri di due settimane fa mai chiuse", -9, "Claude", "In corso", "Siti carriere e scarti nuovi nel log."),
      row("R4", "Soglia del contraddittorio: tenerla o cambiarla", -1, "Federico", "In attesa"),
      row("R5", "Risposte alle candidature con i nuovi CV", 8, "Agente", "In corso"),
      row("R6", "Pulsante On/Off dell'agente", -2, "Claude", "Fatto")],
    altro: [row("A1", "\"Perché sì\" nella scheda di ogni offerta", null, "Claude", "Da fare")] };
  const runs = [
    { workflow: "Ricerca offerte", when: "oggi 15:21", at: d0, conclusion: "success", url: "" },
    { workflow: "Riepilogo 18:00", when: "oggi 18:02", at: d0, conclusion: "success", url: "" },
    { workflow: "Tracciamento candidature", when: "oggi 08:11", at: d0, conclusion: "success", url: "" },
    { workflow: "CV su misura", when: "ieri 19:16", at: d1, conclusion: "failure", url: "" },
    { workflow: "Report dei giri", when: "ieri 23:46", at: d1, conclusion: "success", url: "" },
  ];
  const plan = { fasi: [], in_corso: [], punti_aperti: [], altro: [] };
  const salMd = (h) => `# SAL\n\n${h}\n\n## Attività svolte\n- Bene: ricerca del giorno completata\n\n## Numeri\n- si_su_decise_pct: 9`;
  const s0 = salData("attenzione", "Giri regolari, ma un CV non è partito e la quota di Sì resta sotto l'obiettivo.", "Quota di Sì al 9% contro l'obiettivo del 15%");
  const s1 = salData("ok", "Tutti i giri riusciti, 18 offerte aggiunte, spesa nella media.", "Nessun colloquio ancora dalle candidature");
  return [
    ["ID", "Tipo", "Data", "Titolo", "Sintesi", "Contenuto", "Link", "Dati"],
    ["roadmap", "roadmap", d0, "Roadmap e piano", JSON.stringify(plan), "# Roadmap\n\n## Piano\n\nTabelle con scadenza, owner e stato.", "", JSON.stringify(roadmap)],
    [`sal:${d0}`, "sal", d0, `SAL del ${fmtDate(t)} - attenzione`, s0.headline, salMd(s0.headline), "", JSON.stringify(s0)],
    [`sal:${d1}`, "sal", d1, `SAL del ${fmtDate(addDays(t, -2))} - ok`, s1.headline, salMd(s1.headline), "", JSON.stringify(s1)],
    [`consiglio:${d3}`, "consiglio", d3, `Consiglio del ${fmtDate(addDays(t, -3))}`, council.summary, "# Consiglio\n\n## Riscontro del giudice\n\nVerbale di esempio.", "", JSON.stringify(council)],
    ["budget", "budget", d0, "Budget API", JSON.stringify({ monthly_usd: 10, alert_at: 0.8 }), "", "", ""],
    ["giri", "giri", d0, "Ultimi giri dell'agente", "", JSON.stringify(runs), "", ""],
  ];
}

// Sample "Costi" rows for the spend chart: invented amounts, the shape the agent writes.
export function demoCosts() {
  const t = today();
  const rows = [];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  for (let day = 1; day <= t.getDate(); day++) {
    const d = new Date(t.getFullYear(), t.getMonth(), day);
    const wd = d.getDay();
    if ([1, 3, 5].includes(wd)) rows.push([iso(d), "analisi offerte", "claude-sonnet-5-5", 0, 0, 0, 0, "sì", 0.18 + (day % 3) * 0.04]);
    if ([1, 3, 5].includes(wd)) rows.push([iso(d), "contraddittorio offerte", "claude-sonnet-5-5", 0, 0, 0, 0, "sì", 0.03]);
    if (wd >= 1 && wd <= 5) {
      rows.push([iso(d), "classifica email", "claude-haiku-4-5", 0, 0, 0, 0, "no", 0.01]);
      rows.push([iso(d), "report giornaliero", "claude-sonnet-5-5", 0, 0, 0, 0, "no", 0.03]);
      if (day % 2) rows.push([iso(d), "CV su misura", "claude-opus-5-5", 0, 0, 0, 0, "sì", 0.09]);
    }
    if (day % 4 === 0) rows.push([iso(d), "assistente", "claude-haiku-4-5", 0, 0, 0, 0, "no", 0.004]);
  }
  return rows;
}

// Sample "insights_v1" (Stato tab): invented numbers, the shape jobagent/insights.py writes.
export function demoInsights() {
  const t = today();
  const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  return {
    aggiornato: iso, giorni: 120, offerte_in_target: 64,
    ral: { annunci: 14, min: 41500, max: 52000, da: 36000, a: 70000, forchetta: "42-52k",
      per_tipo: { Core: { annunci: 8, forchetta: "44-55k" }, Affine: { annunci: 4, forchetta: "40-50k" } } },
    mancanti: [
      { requisito: "SQL", conteggio: 6, nel_cv: true },
      { requisito: "Tedesco fluente", conteggio: 4, nel_cv: false },
      { requisito: "Esperienza in startup", conteggio: 3, nel_cv: false },
    ],
    imbuto: { data: iso, lette: 212, nuove: 83, analizzate: 40, aggiunte: 14, proposte: 9, rimandate: 15,
      motivi: { "Fuori zona": 20, "Ruolo non in target": 15, "Livello o esperienza": 12, "RAL sotto soglia": 4, "Doppioni": 3 } },
  };
}
