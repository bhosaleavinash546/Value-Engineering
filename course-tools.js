/* ════════════════════════════════════════════════════════════
   VAVEhub — search and glossary tooltips for the short courses run by course.js
   (VAVE for Leaders). The VE Academy has its own copy in training.js.
   · Search: type three letters; results jump to the module and the paragraph.
   · Glossary: the first mention of each term in a module gets a definition
     on hover or keyboard focus.
   ════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const SKIP = ".qcheck, button, .vo-bar, .ve-lab, .concept-viz, .mod-feedback, .tmpl-box, .lc-src, .tvid, .ex-gate";

  /* ── glossary ── */
  const TERMS = [
    ["VAVE", "Value analysis and value engineering: a structured way to cut a product's cost without cutting what customers value."],
    ["value analysis", "The method applied to a product that's already in production."],
    ["value engineering", "The method applied while a product is still being designed, when most of its cost is decided."],
    ["job plan", "The six fixed phases of a value study: information, function analysis, creative, evaluation, development, presentation."],
    ["function analysis", "Describing what each part does in two words, a verb and a noun, and what each of those jobs costs."],
    ["Value Index", "A function's cost divided by its worth. Above 2.0, it costs more than twice what it should."],
    ["should-cost", "A bottom-up estimate of what a part ought to cost: material, machine time, labour, overhead and a fair margin."],
    ["teardown", "Taking a product apart, yours or a rival's, and costing every part to find facts and ideas."],
    ["target costing", "Working back from the market price and the margin needed to set what a product may cost, before it's designed."],
    ["allowable cost", "Net selling price minus the margin the business needs: the most the product can cost to make."],
    ["savings funnel", "The stages every idea passes, from L1 idea to L4 implemented. Only L4 savings count."],
    ["payback", "One-time cost ÷ annual saving, in months. Most changes to products in production should pay back within 12."],
    ["PPAP", "Production Part Approval Process: the customer approval many changes to production parts must pass, especially in automotive."],
    ["design-to-cost", "Managing cost as a design requirement, reviewed at every design review like weight or performance."],
    ["kaizen costing", "Small, continuous cost reductions on a product once it's in production."],
    ["FAST", "Function Analysis System Technique: a diagram of how a product's functions connect, read as HOW and WHY."],
    ["sponsor", "The senior person who sets the target, protects the team's time and decides at the decision meeting."],
  ].map(([t, d]) => [new RegExp("(^|[^\\w-])(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")($|[^\\w-])", "i"), t, d]);

  $$(".tmod").forEach((mod) => {
    if (mod.classList.contains("tmod-exam")) return;
    const used = new Set();
    const walker = document.createTreeWalker(mod, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest("h2, h3, h4, .gloss, .tmod-tag, a, code, figcaption, " + SKIP)) return NodeFilter.FILTER_REJECT;
        return n.data.trim().length > 3 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      for (const [re, term, def] of TERMS) {
        if (used.has(term)) continue;
        const m = node.data.match(re);
        if (!m) continue;
        const start = m.index + m[1].length, word = m[2];
        const after = node.splitText(start);
        after.data = after.data.slice(word.length);
        const span = document.createElement("span");
        span.className = "gloss"; span.tabIndex = 0; span.setAttribute("data-def", def); span.textContent = word;
        // the tooltip is drawn by CSS, so screen readers get the definition from a hidden element
        const d = document.createElement("span"); d.hidden = true; d.id = "gdef-" + used.size; d.textContent = def;
        document.body.appendChild(d); span.setAttribute("aria-describedby", d.id);
        node.parentNode.insertBefore(span, after);
        used.add(term);
        break; // one per text node; later nodes pick up the other terms
      }
    });
  });

  /* ── search ── */
  const input = $("#courseSearch"), results = $("#searchResults");
  if (!input || !results) return;
  const index = [];
  $$(".tmod").filter((m) => !m.classList.contains("tmod-exam")).forEach((mod) => {
    $$("h3, h4, p, li", mod).forEach((el) => {
      if (el.closest(SKIP)) return;
      const text = el.textContent.replace(/\s+/g, " ").trim();
      if (text.length > 8) index.push({ mod: mod.dataset.mod, title: mod.dataset.title, el, text, low: text.toLowerCase() });
    });
  });
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function run(q) {
    q = q.trim().toLowerCase();
    if (q.length < 3) { results.hidden = true; results.innerHTML = ""; return; }
    const hits = index.filter((e) => e.low.includes(q)).slice(0, 8);
    if (!hits.length) { results.innerHTML = '<div class="sr-none">No match. Try a shorter word.</div>'; results.hidden = false; return; }
    results.innerHTML = hits.map((h, i) => {
      const at = h.low.indexOf(q);
      const snippet = esc(h.text.slice(Math.max(0, at - 30), at)) + "<mark>" + esc(h.text.substr(at, q.length)) + "</mark>" + esc(h.text.substr(at + q.length, 46));
      return `<button type="button" class="sr-hit" data-i="${i}"><b>${esc(h.title)}</b><span>…${snippet}…</span></button>`;
    }).join("");
    results.hidden = false;
    $$(".sr-hit", results).forEach((btn) => btn.addEventListener("click", () => {
      const h = hits[+btn.dataset.i];
      results.hidden = true; input.value = "";
      if (window.VHCourse) window.VHCourse.show(h.mod);
      setTimeout(() => {
        try { h.el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
        h.el.classList.add("search-hit"); h.el.setAttribute("tabindex", "-1"); h.el.focus({ preventScroll: true });
        setTimeout(() => h.el.classList.remove("search-hit"), 2600);
      }, 350);
      if (window.vhTrack) window.vhTrack("search/leaders");
    }));
  }
  input.addEventListener("input", () => run(input.value));
  document.addEventListener("click", (e) => { if (!e.target.closest(".course-search-wrap")) results.hidden = true; });
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") { results.hidden = true; input.blur(); } });
})();
