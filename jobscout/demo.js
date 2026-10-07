// Sample offers to try the dashboard without logging in. Invented data, shown with a "Dati di esempio" badge.
import { addDays, fmtDate, today } from "./schema.js";

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
  ["Casavo", "Operations Lead", "casavo.com", 75, "Rifiutata", "Y", -30, -27, "", null, "core", "50-60k", "Stima", "4+", "Ibrido"],
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
