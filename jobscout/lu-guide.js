// What Lu knows about the dashboard screen: sent to the assistant with every question, so it can tell the user
// where to click. Keep it in line with app.js when buttons, tabs or labels change.
export const GUIDE = `
In alto: saluto con le offerte che aspettano un sì o un no e i CV pronti, e quando parte la prossima ricerca. Accanto,
il pulsante "Valuta le offerte" (o "Vedi i CV pronti") porta alla scheda giusta della lista.
Barra in alto a destra: la freccia circolare aggiorna i dati; l'icona tonda con l'omino apre il menu dell'account con
"Vedi il tuo profilo" (il profilo di ricerca salvato), "Rifai la profilazione" (CV e domande da capo), "Abbonamento"
(oggi il servizio è gratuito), "Apri il foglio Google", il tema (Sistema, Chiaro, Scuro), "Domande frequenti",
"Privacy e termini", "Cambia account" ed "Esci".
Nella profilazione la distanza massima dal centro della città si sceglie con una barra scorrevole, da 5 a 100 km.
Riquadri numerici (cliccabili): Da valutare, CV pronti, Candidature, Risposte (quota di candidature con risposta),
Colloqui. Cliccandoli si apre la scheda corrispondente della lista.
Lista "Offerte e candidature": ricerca per azienda o ruolo, filtro per tipo di ruolo, ordinamento (Più recenti, Match
più alto, Data di invio, Prossimo passo). Schede: Tutte, Da valutare, CV pronti, Inviate, Colloqui, Offerte, Chiuse,
Scartate. Ogni riga mostra il logo dell'azienda (le iniziali se non c'è), ruolo, match colorato e stato; lo stato si cambia anche dal menu nella riga.
Cliccando una riga si apre il dettaglio dell'offerta a destra:
- riquadro "Ti interessa?": "Sì, prepara il CV" (il CV su misura arriva la sera stessa tra le 19 e le 23, con
  un'email) oppure "No" (si sceglie un motivo: ogni motivo spiega sotto cosa impara l'agente; nota facoltativa);
- dopo il sì: "Rimetti da valutare" annulla finché il CV non è pronto; "Cambia in No" (sotto il Sì nella lista) o "Non mi
  interessa più" (nel dettaglio) trasforma il sì in un no con motivo, finché la candidatura non è inviata;
- dopo il no: "Cambia in Sì" (sotto il No nella lista, scheda Scartate) o "Cambia in Sì, prepara il CV" (nel dettaglio)
  rimette il sì, il CV arriva la sera stessa e il motivo del no non conta più;
- con il CV pronto: "Apri il CV" (Google Drive, PDF e Word) e "Vai alla candidatura"; la candidatura si invia
  sempre a mano, poi si segna lo stato "Candidata" e la data di invio;
- "Perché questo match": il dettaglio del punteggio (competenze, requisiti, coerenza del ruolo, esperienza);
- "L'offerta in breve": anni richiesti, RAL (indicata o stimata), area, modalità, date, fonte, requisiti e
  competenze, link all'annuncio;
- "Gestione": stato, data di invio, prossimo passo con data, note, pulsante "Salva le modifiche".
Nelle note di un'offerta "Contraddittorio: ..." è la seconda lettura di un recruiter scettico sulle offerte con match
da 75 in su: conferma, abbassa il match spiegando perché ("match da 88 a 72") o sconsiglia; non cancella mai l'offerta,
decidi tu. "Lettura da recruiter" nelle note del CV dice quanti requisiti chiave il CV mette in evidenza e cosa
preparare a voce per quelli che il tuo CV non copre.
Il follow-up viene proposto 14 giorni dopo l'invio se l'azienda non ha risposto. Le risposte delle aziende lette
dalla Gmail aggiornano lo stato da sole ogni mattina dei giorni feriali.
Colori del match: verde da 70 in su, giallo 50-69, arancio 30-49, rosso sotto 30.
Lu (questo assistente) si apre dal pulsante tondo in basso a destra o dal link "Chiedi a Lu" nel dettaglio offerta.
`;

// Questions shown when the chat is empty: they also teach what the dashboard can do.
export const STARTERS = [
  "Da dove comincio?",
  "Come dico sì o no a un'offerta?",
  "Dove trovo i CV pronti?",
  "Come segno che mi sono candidato?",
  "Cosa vuol dire il match?",
  "Quando arrivano nuove offerte?",
];

export const JOB_STARTERS = (j) => [
  `Perché ${j.company} ha questo match?`,
  "Cosa succede se dico sì?",
  "Questa offerta ha un dato sbagliato",
];
