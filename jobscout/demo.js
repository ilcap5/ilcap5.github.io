// Sample offers to try the dashboard without logging in. Invented data, shown with a "Dati di esempio" badge.
import { addDays, fmtDate, today } from "./schema.js?v=202610281709";

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
      min_qualifications: "Laurea in ingegneria o economia; 2-4 anni in consulenza o operations; inglese fluente; Excel e SQL.",
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

// Sample "Progetto" tab (admin view): invented documents, same shape the agent writes (jobagent/project.py).
export function demoProject() {
  const t = today();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const d0 = iso(t), d1 = iso(addDays(t, -1)), d3 = iso(addDays(t, -3));
  const sal = (d, verdict, line, risk) => `# SAL del ${fmtDate(new Date(d))} - ${verdict}\n\n${line}\n\n## Attività svolte\n- Bene: ricerca del giorno completata, 18 offerte aggiunte\n- Da migliorare: 3 siti carriere non leggibili\n\n## Attività in corso\n- Contraddittorio sulle offerte con match da 75\n\n## Punti aperti e rischi\n- ${risk}\n\n## Next steps\n- Controllare le offerte con match alto prima di venerdì\n\n## Numeri\n- offerte_aggiunte_7g: 41\n- si_su_decise_pct: 18\n- spesa_mese_usd: 2.4`;
  const plan = { fasi: [
    { n: 0, title: "L'agente lavora per te", status: "IN CORSO", detail: "" },
    { n: 1, title: "Quick wins", status: "FATTO", detail: "" },
    { n: 2, title: "Prove a vuoto", status: "FATTO", detail: "" },
    { n: 3, title: "Limiti di ruolo e di zona", status: "IN CORSO", detail: "in osservazione" },
    { n: 4, title: "Prova con altri profili", status: "IN ATTESA", detail: "dei CV" },
    { n: 5, title: "Questionario", status: "DA FARE", detail: "" },
  ], in_corso: ["Prova sul campo dei CV su misura", "Contraddittorio: confronto dei Sì per esito"],
  punti_aperti: ["La ricerca pubblica a volte restituisce meno offerte"], altro: [] };
  const runs = [
    { workflow: "Ricerca offerte", when: "oggi 15:21", at: d0, conclusion: "success", url: "" },
    { workflow: "Riepilogo 18:00", when: "oggi 18:02", at: d0, conclusion: "success", url: "" },
    { workflow: "Tracciamento candidature", when: "oggi 08:11", at: d0, conclusion: "success", url: "" },
    { workflow: "CV su misura", when: "ieri 19:16", at: d1, conclusion: "failure", url: "" },
    { workflow: "Report dei giri", when: "ieri 23:46", at: d1, conclusion: "success", url: "" },
  ];
  return [
    ["ID", "Tipo", "Data", "Titolo", "Sintesi", "Contenuto", "Link"],
    ["roadmap", "roadmap", d0, "Roadmap e piano", JSON.stringify(plan), "# Roadmap\n\n## Piano\n\n**Fase 0 - L'agente lavora per te. IN CORSO**\n- Usare l'agente e misurare.\n\n**Fase 5 - Questionario. DA FARE**\n- Modulo a un campione rappresentativo.", ""],
    [`sal:${d0}`, "sal", d0, `SAL del ${fmtDate(t)} - ok`, "Giornata regolare: ricerca e riepilogo puntuali, un CV in attesa.", sal(d0, "ok", "Giornata regolare: ricerca e riepilogo puntuali, un CV in attesa.", "Un giro CV non riuscito ieri sera: da controllare"), ""],
    [`sal:${d1}`, "sal", d1, `SAL del ${fmtDate(addDays(t, -1))} - attenzione`, "Un giro CV non riuscito, gli altri regolari.", sal(d1, "attenzione", "Un giro CV non riuscito, gli altri regolari.", "Batch lento la sera"), ""],
    [`consiglio:${d3}-settimana`, "consiglio", d3, `Consiglio del ${fmtDate(addDays(t, -3))} - Settimana`, "Sintesi. Nessun rischio nuovo; da decidere la soglia del contraddittorio.", `# Consiglio - Settimana\n\n## Riscontro del giudice\n\n**Sintesi.** Nessun rischio nuovo; da decidere la soglia del contraddittorio.\n\n| Tema | Rischioso | Geniale |\n|---|---|---|\n| Soglia 75 | poche offerte rilette | costo basso |\n\n**Da decidere.**\n1. Abbassare la soglia a 70?\n2. Tenere il report giornaliero fino a fine mese?`, ""],
    ["budget", "budget", d0, "Budget API", JSON.stringify({ monthly_usd: 10, alert_at: 0.8 }), "", ""],
    ["giri", "giri", d0, "Ultimi giri dell'agente", "", JSON.stringify(runs), ""],
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
