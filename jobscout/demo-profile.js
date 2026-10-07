// Sample answers of the profile API, used only with ?demo=1 (an invented candidate).

export function demoInfer() {
  return {
    facts: {
      name: "Chiara Ferretti", current_role: "Business Analyst", current_company: "Società di consulenza",
      years_experience: 3.2, seniority: "mid", city: "Milano", country: "IT",
      education: "Laurea magistrale in Ingegneria Gestionale",
      languages: [{ name: "Italiano", level: "madrelingua" }, { name: "Inglese", level: "C1" }],
      skills: ["Process mapping", "SQL", "Power BI", "S&OP", "Gestione stakeholder", "Excel avanzato", "Project management", "Lean"],
      industries: ["Beni di consumo", "Retail"],
      functions: ["Operations", "Supply chain"],
      achievements: ["Ridotto del 18% lo stock obsoleto di un cliente retail", "Coordinato un team di 4 analisti"],
    },
    suggestions: {
      roles: [
        { title: "Operations Analyst", priority: "core", why: "È il ruolo più vicino a quello che fai oggi." },
        { title: "Supply Chain Planner", priority: "core", why: "Hai esperienza diretta di S&OP." },
        { title: "Strategy & Operations Associate", priority: "adjacent", why: "La consulenza ti dà il taglio giusto." },
        { title: "Project Manager", priority: "adjacent", why: "Hai già coordinato progetti e persone." },
        { title: "Business Operations Manager", priority: "adjacent", why: "Un passo avanti credibile in una scale-up." },
        { title: "Solutions Consultant", priority: "exploratory", why: "Unisce analisi e relazione con il cliente." },
      ],
      sectors: ["Tech e software", "E-commerce e delivery", "Beni di consumo (FMCG)", "Logistica e trasporti", "Consulenza strategica"],
    },
    recruiter_read_it: "Profilo analitico con tre anni di consulenza operations e risultati misurabili. Pronta per ruoli da analyst senior o associate, meno per posizioni di management.",
  };
}

export function demoBuild(body) {
  const mix = body?.answers?.mix_weights || [50, 35, 15];
  return {
    role_families: [
      { name: "operations", fit: "core", weight: mix[0], description: "Ruoli operations e supply chain con taglio analitico, in scale-up e aziende di beni di consumo.", roles: ["Operations Analyst", "Supply Chain Planner", "Business Operations Associate"], title_keywords: ["operations", "supply chain", "s&op", "planning", "business operations"] },
      { name: "strategy", fit: "adjacent", weight: mix[1], description: "Strategy & operations e project management in aziende tech.", roles: ["Strategy & Operations Associate", "Project Manager"], title_keywords: ["strategy", "project manager", "program manager", "pmo"] },
      { name: "presales", fit: "exploratory", weight: mix[2], description: "Ruoli di consulenza commerciale che sfruttano analisi e processi.", roles: ["Solutions Consultant"], title_keywords: ["solutions consultant", "presales", "value consultant"] },
    ],
    avoid: ["Ruoli di magazzino e trasporto operativo", "Pianificazione ripetitiva a livello di codice articolo", "Settore bancario"],
    interests: ["Processi end-to-end", "Prodotti digitali", "Ambienti in crescita"],
    strengths: ["Analisi dei dati", "Coordinamento di progetti", "Comunicazione con il cliente"],
    linkedin_keywords: ["Operations Analyst", "Supply Chain Planner", "Strategy Operations", "Business Operations", "Project Manager", "Solutions Consultant"],
    comment_it: "La ricerca punta su ruoli operations dove l'esperienza in consulenza è già un vantaggio, con una quota su strategy e project management in aziende tech. I ruoli commerciali restano esplorativi. Il rischio principale è la seniority: per posizioni da manager servono di solito cinque anni o più.",
  };
}
