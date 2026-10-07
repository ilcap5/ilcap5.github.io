// Data layer. The interface is the same for every source, so the interface code never knows where the data
// lives: today the Google Sheet (read and written from the browser with your own Google login),
// tomorrow a database.
//   load()              -> { jobs: [...], url }
//   update(id, fields)  -> writes the fields of one job

import { HEADERS } from "./schema.js";
import { demoJobs } from "./demo.js";

const TAB = "Candidature";
const API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_KEY = "jobscout.token";

function colLetter(n) {
  let s = "";
  while (n) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function rowsToJobs(values) {
  const [header = [], ...rows] = values;
  const keys = header.map((h) => HEADERS[String(h).trim()] || null);
  const jobs = [];
  rows.forEach((row, i) => {
    const job = { _row: i + 2 };
    keys.forEach((k, c) => { if (k) job[k] = row[c] ?? ""; });
    for (const k of Object.values(HEADERS)) if (!(k in job)) job[k] = "";
    if (job.company || job.title) jobs.push(job);
  });
  return { jobs, keys };
}

// Free text that starts like a formula is written as text.
function cellValue(v) {
  const s = v == null ? "" : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// ---------------------------------------------------------------- Google Sheets
export class SheetsStore {
  constructor({ clientId, scope, sheetId }) {
    this.clientId = clientId;
    this.scope = scope;
    this.sheetId = sheetId;
    this.label = "Foglio Google";
    this.url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    this.token = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null");
      if (saved && saved.exp > Date.now() + 60000) this.token = saved.value;
    } catch { /* private mode: login again */ }
  }

  async _gis() {
    if (window.google?.accounts?.oauth2) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Non riesco a caricare il login Google."));
      document.head.appendChild(s);
    });
  }

  async signIn(prompt = "") {
    await this._gis();
    this.token = await new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: this.scope,
        prompt,
        callback: (r) => {
          if (r.error) return reject(new Error(r.error_description || r.error));
          try {
            sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ value: r.access_token, exp: Date.now() + r.expires_in * 1000 }));
          } catch { /* ignore */ }
          resolve(r.access_token);
        },
        error_callback: (e) => reject(new Error(e?.message || "Accesso annullato.")),
      });
      client.requestAccessToken();
    });
  }

  signOut() {
    if (this.token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(this.token, () => {});
    this.token = null;
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  }

  get signedIn() { return Boolean(this.token); }

  async _fetch(path, options = {}, retry = true) {
    if (!this.token) await this.signIn();
    const res = await fetch(`${API}/${this.sheetId}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
    });
    if (res.status === 401 && retry) {
      this.token = null;
      await this.signIn();
      return this._fetch(path, options, false);
    }
    if (!res.ok) {
      let msg = `Errore ${res.status}`;
      try { msg = (await res.json()).error.message || msg; } catch { /* ignore */ }
      if (res.status === 404) msg = "Foglio non trovato: controlla il link.";
      if (res.status === 403) msg = "Questo account Google non ha accesso al foglio.";
      throw new Error(msg);
    }
    return res.json();
  }

  async load() {
    const data = await this._fetch(`/values/${encodeURIComponent(TAB)}?valueRenderOption=FORMATTED_VALUE`);
    const { jobs } = rowsToJobs(data.values || []);
    return { jobs, url: this.url };
  }

  // The agent may have added or removed rows since the page was loaded: the row is found again by ID
  // and the columns by name, right before writing.
  async update(id, fields) {
    const head = await this._fetch(`/values/${encodeURIComponent(TAB + "!1:1")}`);
    const keys = (head.values?.[0] || []).map((h) => HEADERS[String(h).trim()] || null);
    const idCol = keys.indexOf("id");
    if (idCol < 0) throw new Error("Colonna ID non trovata nel foglio.");
    const L = colLetter(idCol + 1);
    const ids = await this._fetch(`/values/${encodeURIComponent(`${TAB}!${L}:${L}`)}`);
    const row = (ids.values || []).findIndex((r) => r[0] === id) + 1;
    if (row < 2) throw new Error("Offerta non trovata nel foglio: aggiorna la pagina.");
    const data = Object.entries(fields).map(([k, v]) => {
      const c = keys.indexOf(k);
      if (c < 0) throw new Error(`Colonna mancante: ${k}`);
      return { range: `${TAB}!${colLetter(c + 1)}${row}`, values: [[cellValue(v)]] };
    });
    await this._fetch("/values:batchUpdate", {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
    });
  }
}

// ---------------------------------------------------------------- agent memory (hidden Stato tab) and profile API
SheetsStore.prototype.getState = async function (key) {
  const data = await this._fetch(`/values/${encodeURIComponent("Stato!A:B")}`);
  const row = (data.values || []).find((r) => r[0] === key);
  return row ? row[1] || "" : "";
};

SheetsStore.prototype.setState = async function (key, value) {
  const data = await this._fetch(`/values/${encodeURIComponent("Stato!A:A")}`);
  const idx = (data.values || []).findIndex((r) => r[0] === key);
  if (idx >= 0) {
    await this._fetch(`/values/${encodeURIComponent(`Stato!B${idx + 1}`)}?valueInputOption=RAW`, {
      method: "PUT", body: JSON.stringify({ values: [[value]] }),
    });
  } else {
    await this._fetch(`/values/${encodeURIComponent("Stato!A:B")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST", body: JSON.stringify({ values: [[key, value]] }),
    });
  }
};

SheetsStore.prototype.api = async function (baseUrl, path, body, retry = true) {
  if (!baseUrl) throw new Error("Il servizio che legge il CV non è ancora attivo.");
  if (!this.token) await this.signIn();
  const res = await fetch(baseUrl.replace(/\/$/, "") + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && retry) {
    // Older sessions miss the email permission: ask Google again once.
    await this.signIn("consent");
    return this.api(baseUrl, path, body, false);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
  return data;
};

// ---------------------------------------------------------------- sample data (no login)
export class DemoStore {
  constructor() {
    this.label = "Dati di esempio";
    this.url = "";
    this.jobs = demoJobs();
  }
  get signedIn() { return true; }
  async load() { return { jobs: structuredClone(this.jobs), url: "" }; }
  async update(id, fields) {
    const job = this.jobs.find((j) => j.id === id);
    if (job) Object.assign(job, fields);
  }
  async getState(key) { return this.state?.[key] || ""; }
  async setState(key, value) { this.state = { ...(this.state || {}), [key]: value }; }
  async api(_base, path, body) {
    const { demoInfer, demoBuild } = await import("./demo-profile.js");
    await new Promise((r) => setTimeout(r, path.endsWith("infer") ? 1800 : 2200));
    return path.endsWith("infer") ? demoInfer() : demoBuild(body);
  }
}
