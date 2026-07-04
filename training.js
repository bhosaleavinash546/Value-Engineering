/* ════════════════════════════════════════════════════════════
   ValueForge VE Academy — course engine, exam & certificate
   ════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── State (localStorage) ── */
  const KEY = "vf-academy";
  const state = (() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  })();
  state.done = state.done || [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  /* ── Modules & sidebar ── */
  const mods = $$(".tmod");
  const modNav = $("#modNav");
  const courseMods = mods.filter((m) => m.dataset.mod !== "exam");

  modNav.innerHTML = mods.map((m) => {
    const id = m.dataset.mod, isExam = id === "exam";
    return `<button class="mod-link${isExam ? " mod-exam" : ""}" data-target="${id}">
      <span class="mchk">✓</span>
      <span class="mtxt"><b>${isExam ? "🎓 " : ""}${m.dataset.title}</b><span>${m.dataset.time}</span></span></button>`;
  }).join("");

  function show(id, scroll) {
    mods.forEach((m) => m.classList.toggle("is-visible", m.dataset.mod === id));
    $$(".mod-link", modNav).forEach((l) => l.classList.toggle("is-active", l.dataset.target === id));
    if (id === "exam") renderExamGate();
    if (scroll !== false) $("#trLayout").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function refreshProgress() {
    const total = courseMods.length;
    const done = state.done.length;
    const pct = Math.round((done / total) * 100);
    $("#navProgFill").style.width = pct + "%";
    $("#navProgText").textContent = state.exam && state.exam.passed ? "Certified ✓" : pct + "% complete";
    $("#sideProgFill").style.width = pct + "%";
    $("#sideProgText").textContent = `${done} / ${total} modules` + (state.exam && state.exam.passed ? " · certified" : "");
    $$(".mod-link", modNav).forEach((l) => {
      const id = l.dataset.target;
      l.classList.toggle("is-done", id === "exam" ? !!(state.exam && state.exam.passed) : state.done.includes(id));
    });
  }

  modNav.addEventListener("click", (e) => {
    const l = e.target.closest(".mod-link");
    if (l) show(l.dataset.target);
  });

  $$(".tmod-done").forEach((btn) => btn.addEventListener("click", () => {
    const id = btn.dataset.done;
    if (!state.done.includes(id)) state.done.push(id);
    save(); refreshProgress();
    const order = mods.map((m) => m.dataset.mod);
    const next = order[order.indexOf(id) + 1];
    show(next || "exam");
  }));

  $("#startBtn").addEventListener("click", () => {
    const firstUnread = courseMods.find((m) => !state.done.includes(m.dataset.mod));
    show(firstUnread ? firstUnread.dataset.mod : "exam");
  });

  /* ── Exam bank: 30 questions, [question, [options], correctIndex] ── */
  const BANK = [
    ["Value, in Value Engineering, is defined as:", ["Price minus discount", "Function ÷ Cost", "Cost ÷ Weight", "Quality × Speed"], 1],
    ["Who created Value Analysis, and where?", ["Henry Ford at Ford", "Lawrence D. Miles at General Electric", "Taiichi Ohno at Toyota", "Genrich Altshuller at the Soviet patent office"], 1],
    ["The key difference between VE and VA is:", ["VE is for services, VA for products", "VE applies during design; VA applies to products already in production", "VE is done by suppliers, VA by engineers", "There is no difference"], 1],
    ["How many phases are in the SAVE job plan?", ["4", "5", "6", "8"], 2],
    ["Which is the correct order of the SAVE phases?", ["Creative → Information → Evaluation → Function Analysis → Development → Presentation", "Information → Function Analysis → Creative → Evaluation → Development → Presentation", "Information → Creative → Function Analysis → Development → Evaluation → Presentation", "Function Analysis → Information → Creative → Development → Evaluation → Presentation"], 1],
    ["In function analysis, every function is expressed as:", ["A full sentence", "A verb + noun pair", "A noun + adjective pair", "A cost code"], 1],
    ["The basic function of an electric kettle is:", ["Indicate status", "Contain water", "Heat water", "Convey esteem"], 2],
    ["On a FAST diagram, moving to the right answers which question?", ["WHY?", "WHEN?", "HOW?", "WHO?"], 2],
    ["A function has cost €2.00 and worth €0.50. Its Value Index is:", ["0.25 — healthy", "1.0 — balanced", "2.5 — watch list", "4.0 — a prime creative-phase target"], 3],
    ["'Worth' of a function is best defined as:", ["What the customer says they'd pay", "The lowest cost that could still reliably achieve the function", "The supplier's quoted price", "The competitor's retail price"], 1],
    ["During the Creative Phase, judgement of ideas must be:", ["Applied immediately to save time", "Deferred — evaluation has its own phase", "Left to the most senior engineer", "Done by the finance representative"], 1],
    ["Brainwriting 6-3-5 means:", ["6 rounds, 3 hours, 5 breaks", "6 people write 3 ideas in 5 minutes, then pass the sheet", "6 ideas ranked on 3 criteria by 5 judges", "6 functions, 3 costs, 5 worths"], 1],
    ["TRIZ resolves design contradictions using:", ["Random trial and error", "40 inventive principles distilled from patent analysis", "Supplier negotiations", "Monte Carlo simulation"], 1],
    ["In SCAMPER, the letter E stands for:", ["Evaluate", "Estimate", "Eliminate", "Expand"], 2],
    ["The Pugh matrix evaluates concepts by:", ["Comparing each against the current design (datum) with +/−/same scores", "Calculating exact NPV per concept", "Voting by seniority", "Ranking by patent count"], 0],
    ["Approximately what share of a product's lifecycle cost is committed during design?", ["20%", "50%", "80%", "99%"], 2],
    ["A should-cost model is built primarily from:", ["Last year's price plus inflation", "Material, cycle time, machine rates, labour, overhead and a fair margin", "The average of three supplier quotes", "The sales team's target price"], 1],
    ["The main purpose of a cleansheet model is:", ["Marketing benchmarks", "Fact-based supplier negotiation, layer by layer", "Tax optimisation", "Warranty forecasting"], 1],
    ["Linear Performance Pricing (LPP) identifies savings by:", ["Regressing price against a cost driver across a part family and challenging outliers", "Reducing all prices linearly by 5%", "Indexing prices to inflation", "Comparing prices to retail"], 0],
    ["A buy-to-fly ratio of 8:1 means:", ["8 parts made per machine per day", "8 kg of raw material bought for every 1 kg in the finished part", "8 suppliers for 1 part", "Cost is 8× the target"], 1],
    ["The FIRST step of a competitive teardown is:", ["Disassemble as fast as possible", "Document, photograph and weigh everything before disassembly", "Send parts to suppliers for quotes", "Reverse-engineer the CAD"], 1],
    ["Most removable cost hides in which function type?", ["Basic functions", "Secondary functions — they are design choices, not requirements", "All-time functions", "Higher-order functions"], 1],
    ["The four classic types of value are:", ["Use, esteem, exchange, cost", "Price, quality, speed, service", "Design, material, labour, overhead", "Basic, secondary, tertiary, hidden"], 0],
    ["DFMA primarily aims to:", ["Increase part count for flexibility", "Reduce part count and assembly time", "Improve paint finish", "Extend certification life"], 1],
    ["Which of these is NOT a legitimate way to improve value?", ["Same function at lower cost", "More function at the same cost", "Cutting a function customers value to reduce cost", "Trimming unvalued function while cutting cost"], 2],
    ["Target costing sets the allowable cost as:", ["Supplier quote minus 10%", "Market price minus required margin", "Last generation's cost plus features", "Engineering estimate plus contingency"], 1],
    ["In a governed savings funnel, savings officially 'count' when:", ["The idea is generated", "The business case is drafted", "Implemented in production and audited against the frozen baseline", "The workshop ends"], 2],
    ["A typical first structured VAVE wave on an unworked product yields about:", ["1–2%", "8–15%", "30–40%", "50%+"], 1],
    ["SAVE International's entry-level certification is:", ["CVS", "AVS", "VMA", "PVA"], 2],
    ["The Development Phase's key deliverable is:", ["A list of raw ideas", "A validated value proposal with savings, one-time cost, risk and timeline", "A press release", "A supplier contract"], 1],
  ];
  const PASS_MARK = 0.8;

  /* ── Exam flow ── */
  const mount = $("#examMount");
  let order = [], picks = [], qi = 0;

  function renderExamGate() {
    if (state.exam && state.exam.passed) { renderCertificate(); return; }
    const remaining = courseMods.filter((m) => !state.done.includes(m.dataset.mod)).length;
    mount.innerHTML = `<div class="ex-gate">
      <p>Thirty multiple-choice questions drawn from all twelve modules. You need <strong>${Math.round(PASS_MARK * 100)}% (24 of 30)</strong>
      to earn the <strong>ValueForge VE Practitioner Certificate</strong>. You can retake the exam as many times as you like —
      questions are shuffled on every attempt.</p>
      ${remaining > 0 ? `<p class="ex-warn">Heads up: ${remaining} module${remaining > 1 ? "s" : ""} not yet completed. You can still attempt the exam, but we recommend finishing the course first.</p>` : ""}
      <button class="btn btn-primary btn-lg" id="examStart">Begin the exam →</button>
    </div>`;
    $("#examStart").addEventListener("click", startExam);
    $("#certWrap").hidden = true;
  }

  function startExam() {
    order = BANK.map((_, i) => i).sort(() => Math.random() - 0.5);
    picks = new Array(BANK.length).fill(null);
    qi = 0;
    renderQ();
  }

  function renderQ() {
    const bi = order[qi];
    const [q, opts] = BANK[bi];
    mount.innerHTML = `
      <div class="ex-q-head"><span>Question ${qi + 1} / ${BANK.length}</span><div class="ex-bar"><i style="width:${(qi / BANK.length) * 100}%"></i></div></div>
      <div class="ex-q">${q}</div>
      <div class="ex-opts">${opts.map((o, i) =>
        `<button class="ex-opt${picks[bi] === i ? " is-picked" : ""}" data-i="${i}"><span class="eo-key">${"ABCD"[i]}</span><span>${o}</span></button>`).join("")}</div>
      <div class="ex-nav">
        <button class="btn btn-ghost" id="exPrev" ${qi === 0 ? "disabled" : ""}>← Previous</button>
        <button class="btn btn-primary" id="exNext" ${picks[bi] === null ? "disabled" : ""}>${qi === BANK.length - 1 ? "Submit exam ✓" : "Next →"}</button>
      </div>`;
    $$(".ex-opt", mount).forEach((b) => b.addEventListener("click", () => {
      picks[bi] = +b.dataset.i;
      $$(".ex-opt", mount).forEach((o) => o.classList.toggle("is-picked", o === b));
      $("#exNext").disabled = false;
    }));
    $("#exPrev").addEventListener("click", () => { if (qi > 0) { qi--; renderQ(); } });
    $("#exNext").addEventListener("click", () => {
      if (qi < BANK.length - 1) { qi++; renderQ(); } else finishExam();
    });
  }

  function finishExam() {
    const wrong = [];
    let score = 0;
    BANK.forEach(([q, opts, c], i) => {
      if (picks[i] === c) score++;
      else wrong.push([q, opts[picks[i]] ?? "—", opts[c]]);
    });
    const pct = Math.round((score / BANK.length) * 100);
    const passed = score >= Math.ceil(BANK.length * PASS_MARK);
    const color = passed ? "#34d399" : "#f87171";
    mount.innerHTML = `<div class="ex-result">
      <div class="ex-ring"><svg viewBox="0 0 160 160"><circle class="rbg" cx="80" cy="80" r="72"/><circle class="rfg" id="exRing" cx="80" cy="80" r="72" style="stroke:${color}"/></svg>
      <div class="rnum"><b style="color:${color}">${pct}%</b><span>${score} / ${BANK.length}</span></div></div>
      <div class="ex-verdict ${passed ? "pass" : "fail"}">${passed ? "Congratulations — you passed!" : "Not this time — " + Math.round(PASS_MARK * 100) + "% needed"}</div>
      <p class="ex-note">${passed
        ? "You've demonstrated a working command of the value methodology across all six phases and the modern cost-engineering toolkit. Enter your name to generate your certificate."
        : `You scored ${pct}%; the pass mark is ${Math.round(PASS_MARK * 100)}% (24 of 30). Review the corrections below — questions reshuffle on every attempt.`}</p>
      ${wrong.length && !passed ? `<div class="ex-review"><h4>Where you lost marks (${wrong.length})</h4>${wrong.map(([q, y, r]) =>
        `<div class="ex-review-item"><b>${q}</b><span class="wrong">✗ ${y}</span> &nbsp;→&nbsp; <span class="right">✓ ${r}</span></div>`).join("")}</div>` : ""}
      ${passed ? `<div class="ex-name"><input id="certNameInput" maxlength="60" placeholder="Your full name, as it should appear" value="${(state.exam && state.exam.name) || ""}" /></div>` : ""}
      <div class="ex-actions">
        ${passed ? '<button class="btn btn-primary" id="genCert">🎓 Generate my certificate</button>' : ""}
        <button class="btn btn-ghost" id="exRetake">${passed ? "Retake for a better score" : "↻ Retake the exam"}</button>
        ${!passed ? '<button class="btn btn-ghost" id="exReview2">Revisit the modules</button>' : ""}
      </div></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { $("#exRing").style.strokeDashoffset = String(452 * (1 - pct / 100)); }));
    $("#exRetake").addEventListener("click", startExam);
    const rev = $("#exReview2");
    if (rev) rev.addEventListener("click", () => show("m1"));
    const gen = $("#genCert");
    if (gen) gen.addEventListener("click", () => {
      const name = ($("#certNameInput").value || "").trim();
      if (!name) { $("#certNameInput").focus(); $("#certNameInput").placeholder = "Please enter your name first"; return; }
      state.exam = { passed: true, score: pct, name, date: new Date().toISOString().slice(0, 10), id: "VF-" + Date.now().toString(36).toUpperCase() };
      save(); refreshProgress(); renderCertificate();
    });
  }

  function renderCertificate() {
    const e = state.exam;
    mount.innerHTML = `<div class="ex-gate"><p><strong style="color:#34d399">✓ Certified.</strong> Your VE Practitioner Certificate is below —
      print it or save it as a PDF. It's stored in this browser, so you can come back anytime.</p>
      <button class="btn btn-ghost" id="exRetake">Retake the exam for a better score</button></div>`;
    $("#exRetake").addEventListener("click", startExam);
    $("#certName").textContent = e.name;
    $("#certScore").textContent = e.score + "%";
    $("#certDate").textContent = new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    $("#certId").textContent = e.id;
    $("#certWrap").hidden = false;
  }

  /* ── Init ── */
  refreshProgress();
  const firstUnread = courseMods.find((m) => !state.done.includes(m.dataset.mod));
  show(state.exam && state.exam.passed ? "exam" : (firstUnread ? firstUnread.dataset.mod : "exam"), false);
})();
