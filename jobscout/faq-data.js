// Domande frequenti di JobScout.ai. Contenuto pubblico: niente dati personali.
// Aggiornato a mano per ora; con il chatbot si aggiornerà ogni settimana dalle domande più frequenti.
export const FAQ_UPDATED = "2026-10-13";

export const FAQ = [
  {
    section: "Come funziona",
    items: [
      {
        q: "Cosa fa JobScout.ai?",
        a: "Cerca offerte di lavoro per te, le valuta rispetto al tuo CV e a quello che cerchi e ti propone le più adatte. Per quelle a cui dici sì prepara un CV su misura, poi segue le candidature: legge le risposte delle aziende e ti ricorda i follow-up. L'invio della candidatura resta sempre a te.",
      },
      {
        q: "Quando cerca nuove offerte?",
        a: "Il lunedì, il mercoledì e il venerdì verso le 15:20. Alle 18 ricevi un'email con le offerte nuove. Se un giro non parte all'orario previsto, ce n'è uno di riserva un'ora dopo.",
      },
      {
        q: "Da dove prende le offerte?",
        a: "Dagli avvisi di LinkedIn che arrivano nella tua email, dalla ricerca pubblica di LinkedIn e dai siti carriere delle aziende. Legge solo pagine pubbliche: non entra mai con il tuo account su LinkedIn o sui siti delle aziende.",
      },
      {
        q: "Posso aggiungere un'azienda da seguire?",
        a: "Sì. Nel foglio Google c'è la scheda \"Siti carriere\": scrivi il nome dell'azienda e, se lo conosci, il link alla pagina con le offerte. A ogni ricerca l'agente scrive accanto se è riuscito a leggerla e quante offerte ha trovato nella tua zona. Se il sito non è leggibile, lo trovi segnalato e si può preparare un lettore dedicato.",
      },
    ],
  },
  {
    section: "Valutazione delle offerte",
    items: [
      {
        q: "Come si calcola il match?",
        a: "Pesa quattro cose: competenze richieste (50%), requisiti formali come titolo di studio e lingue (25%), coerenza con i ruoli che cerchi (15%) ed esperienza richiesta (10%). Da 85 in su il colore è verde pieno, tra 70 e 84 verde chiaro, tra 50 e 69 giallo, sotto arancio e rosso.",
      },
      {
        q: "Perché accanto alla RAL c'è scritto \"stima\"?",
        a: "L'annuncio non dichiara la retribuzione, quindi l'agente la stima su ruoli simili nella stessa città. Le offerte con un massimo, dichiarato o stimato, sotto la tua soglia vengono scartate.",
      },
      {
        q: "Cosa vuol dire priorità Bassa o \"in fondo alla lista\"?",
        a: "L'offerta resta tra le proposte ma viene mostrata dopo le altre: succede per gli annunci di agenzie, per le PMI tradizionali e per le aziende poco note. Multinazionali, grandi aziende, scale-up e startup tech restano in ordine di match.",
      },
      {
        q: "Ho trovato un'offerta interessante che l'agente non mi ha proposto. Perché?",
        a: "Di solito per un filtro: sede fuori dalla tua zona, troppi o troppo pochi anni di esperienza richiesti, un settore escluso o un ruolo simile a quelli che hai scartato. Segnalala: si può controllare in quale passaggio è stata esclusa e correggere la regola.",
      },
    ],
  },
  {
    section: "Sì, no e motivi",
    items: [
      {
        q: "Cosa succede quando dico sì a un'offerta?",
        a: "La sera stessa, tra le 19 e le 23, l'agente prepara il CV su misura per quell'offerta e ti manda un'email quando è pronto. Lo stato passa a \"CV pronto\".",
      },
      {
        q: "Quale motivo scelgo quando dico no?",
        a: "Il motivo decide cosa impara l'agente. \"Ruolo non interessante\", \"Settore non interessante\", \"Troppo senior\" e \"Troppo junior\" fanno evitare offerte simili. \"Azienda non interessante\" esclude quell'azienda. \"Azienda ok, ruolo non in linea\", \"RAL bassa\" e \"Sede / modalità\" scartano solo quell'offerta. \"Altro\" vale come esempio solo se scrivi una nota.",
      },
      {
        q: "Ho scartato un'offerta per sbaglio, posso tornare indietro?",
        a: "Sì: nel foglio Google cambia la colonna \"Candidarsi (Y/N)\" e, se serve, \"Motivo N\". Al giro successivo l'agente ne tiene conto.",
      },
    ],
  },
  {
    section: "CV su misura",
    items: [
      {
        q: "Il CV su misura può inventare esperienze?",
        a: "No. Riformula solo il tuo CV di riferimento e sceglie i punti più adatti all'offerta. Un controllo automatico confronta ogni frase con l'originale: se trova qualcosa di non verificato, il CV va in \"CV da rivedere\" con il motivo nelle note.",
      },
      {
        q: "Dove trovo i CV?",
        a: "Su Google Drive, nella cartella \"Job Agent - CV\", in PDF e in Word. Il link è anche nella scheda dell'offerta e nell'email che ti avvisa.",
      },
      {
        q: "Posso aggiornare il mio CV di riferimento?",
        a: "Sì, dal menu dell'account (icona con l'omino in alto a destra): "Vedi il tuo profilo" per cambiare le risposte, "Rifai la profilazione" per ripartire dal CV. Dopo la modifica si possono rifare i CV delle offerte non ancora inviate.",
      },
    ],
  },
  {
    section: "Candidature e risposte",
    items: [
      {
        q: "Come segno che mi sono candidato?",
        a: "Nella dashboard porta lo stato a \"Candidata\". Da lì parte il conto per il follow-up: dopo 14 giorni senza risposta l'agente te lo ricorda.",
      },
      {
        q: "Come capisce le risposte delle aziende?",
        a: "Ogni mattina dei giorni feriali legge le email delle aziende a cui ti sei candidato, aggiorna lo stato (colloquio, test, rifiuto...) e, quando serve, prepara una bozza di follow-up nelle bozze di Gmail. Non invia mai nulla al posto tuo.",
      },
    ],
  },
  {
    section: "Email, costi e dati",
    items: [
      {
        q: "Quali email ricevo?",
        a: "Il riepilogo delle 18 nei giorni di ricerca, l'avviso quando un CV è pronto e un'email al mattino se ci sono novità sulle candidature. Le email arrivano dal tuo indirizzo Gmail a te stesso, con mittente JobScout.ai.",
      },
      {
        q: "Quanto costa l'uso dell'AI?",
        a: "C'è un tetto mensile di spesa per l'AI, controllato a ogni passaggio: se viene raggiunto, l'analisi si ferma fino al mese successivo invece di superarlo. Prezzi e condizioni sono nei Termini.",
      },
      {
        q: "Dove sono i miei dati?",
        a: "Nel tuo foglio Google e nella tua cartella Drive. Il CV e le risposte al profilo passano dai servizi di AI solo per l'analisi. I dettagli sono nell'informativa privacy.",
      },
      {
        q: "La dashboard non carica o mi chiede di nuovo l'accesso. Cosa faccio?",
        a: "Ricarica la pagina e rifai l'accesso con lo stesso account Google. Se la finestra di accesso non si apre, consenti i popup per questo sito. Se il problema resta, segnalalo.",
      },
    ],
  },
];
