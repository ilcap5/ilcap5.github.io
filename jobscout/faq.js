import { FAQ, FAQ_UPDATED } from "./faq-data.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function render(query = "") {
  const words = norm(query).split(/\s+/).filter(Boolean);
  let shown = 0;
  const html = FAQ.map((group) => {
    const items = group.items.filter((it) => words.every((w) => norm(`${it.q} ${it.a}`).includes(w)));
    shown += items.length;
    if (!items.length) return "";
    return `<section class="panel faq-group" aria-labelledby="g-${esc(group.section)}">
      <h2 id="g-${esc(group.section)}">${esc(group.section)}</h2>
      ${items.map((it) => `<details class="faq-item"${words.length ? " open" : ""}>
        <summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join("")}
    </section>`;
  }).join("");
  document.getElementById("faq").innerHTML = html;
  document.getElementById("faq-empty").hidden = shown > 0;
}

const [y, m, d] = FAQ_UPDATED.split("-");
document.getElementById("faq-intro").textContent += ` Aggiornate il ${d}/${m}/${y}.`;
const input = document.getElementById("faq-q");
input.addEventListener("input", () => render(input.value));
render(new URLSearchParams(location.search).get("q") || "");
