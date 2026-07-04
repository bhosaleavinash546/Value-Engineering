/* ════════════════════════════════════════════════════════════
   VAVEhub VE Academy — course engine, exam & certificate
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

  /* ── Gamification: points, ranks, milestone badges ── */
  const RANKS = [[0, "Value Apprentice"], [300, "Value Explorer"], [600, "Value Analyst"], [900, "Value Engineer"], [1200, "Value Champion"], [2000, "Certified Master"]];
  const BADGES = [
    ["🧭", "Foundations", ["m1", "m2"]],
    ["🛠", "Job Plan Master", ["m3", "m4", "m5", "m6", "m7", "m8"]],
    ["📐", "Cost Toolsmith", ["m9", "m10", "m11"]],
    ["🏛", "Programme Leader", ["m12"]],
  ];
  function points() {
    let p = state.done.length * 100;
    if (state.exam && state.exam.passed) p += 800;
    return p;
  }
  function rank(p) { return RANKS.reduce((r, [min, name]) => (p >= min ? name : r), RANKS[0][1]); }

  function refreshProgress() {
    const total = courseMods.length;
    const done = state.done.length;
    const pct = Math.round((done / total) * 100);
    $("#navProgFill").style.width = pct + "%";
    $("#navProgText").textContent = state.exam && state.exam.passed ? "Certified ✓ · " + rank(points()) : pct + "% · " + rank(points());
    $("#sideProgFill").style.width = pct + "%";
    $("#sideProgText").textContent = `${done} / ${total} modules` + (state.exam && state.exam.passed ? " · certified" : "");
    const pts = $("#trPoints");
    if (pts) pts.textContent = points() + " pts · " + rank(points());
    const badgeBox = $("#trBadges");
    if (badgeBox) badgeBox.innerHTML = BADGES.map(([ico, name, req]) =>
      `<span class="tr-badge${req.every((m) => state.done.includes(m)) ? " is-earned" : ""}" title="${name}: complete ${req.join(", ")}">${ico} ${name}</span>`).join("");
    $$(".mod-link", modNav).forEach((l) => {
      const id = l.dataset.target;
      l.classList.toggle("is-done", id === "exam" ? !!(state.exam && state.exam.passed) : state.done.includes(id));
    });
  }

  /* ── Role-based learning paths ── */
  const ROLE_RECS = {
    design: ["m1", "m3", "m4", "m5", "m7", "m10"],
    sourcing: ["m1", "m2", "m9", "m10", "m11"],
    manager: ["m1", "m2", "m6", "m8", "m12"],
    all: [],
  };
  function applyRole(role) {
    state.role = role; save();
    $$(".role-chip").forEach((c) => c.classList.toggle("is-on", c.dataset.role === role));
    const recs = ROLE_RECS[role] || [];
    $$(".mod-link", modNav).forEach((l) => {
      l.classList.toggle("is-rec", recs.includes(l.dataset.target));
      let star = l.querySelector(".mrec");
      if (!star) { star = document.createElement("span"); star.className = "mrec"; star.textContent = "★ for you"; l.appendChild(star); }
    });
  }
  const roleBar = $("#trRoles");
  if (roleBar) {
    roleBar.addEventListener("click", (e) => {
      const c = e.target.closest(".role-chip");
      if (c) applyRole(c.dataset.role);
    });
    if (state.role) applyRole(state.role);
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
    ["By the time concept design is frozen, roughly how much lifecycle cost is committed vs. actually spent?", ["10% committed, 80% spent", "70–80% committed, under 10% spent", "50% committed, 50% spent", "100% committed, 100% spent"], 1],
    ["In the Kano model, a 'reverse' attribute is one that:", ["Everyone loves", "Some customers actively dislike — removing it raises value AND cuts cost", "Works backwards mechanically", "Only engineers notice"], 1],
    ["Kano 'must-be' requirements should be delivered:", ["With maximum excellence at any cost", "At minimum adequate cost — absence enrages, excellence earns nothing", "Only on premium variants", "After attractive features"], 1],
    ["Which verbs should be BANNED from function statements?", ["Transmit, conduct, limit", "Provide, allow, enable — they measure nothing and smuggle solutions", "Heat, cool, contain", "Position, support, seal"], 1],
    ["A 'required secondary' function (e.g. 'suppress interference') is:", ["Optional decoration", "Non-negotiable in existence, fully negotiable in HOW it's achieved", "Always the costliest function", "Outside the scope lines"], 1],
    ["The final validation of a FAST diagram is:", ["Manager sign-off", "Reading it aloud in both directions — a wrong-sounding sentence is a misplaced card", "Counting the boxes", "Colour-coding the functions"], 1],
    ["Which is NOT a valid way to estimate a function's worth?", ["Cheapest existing solution in any industry", "Physics/first-principles floor", "Setting worth equal to the current cost", "Historical best ever achieved"], 2],
    ["In TRIZ, a physical contradiction (something must be X and not-X) is resolved by:", ["Voting", "Separation — in time, space, or condition", "Averaging the two states", "Buying better materials"], 1],
    ["TRIZ's Ideal Final Result asks:", ["What would the most expensive solution look like?", "How would the function perform itself — no part, no cost, no harm?", "Which competitor is best?", "What does the patent office allow?"], 1],
    ["Which company industrialised TRIZ — training 1,000+ engineers a year, with one DVD pick-up project reported to save over $100M?", ["Ford", "Samsung", "Nokia", "Boeing"], 1],
    ["The US federal-aid highway VE programme (2002–2011) averaged implemented savings of about:", ["$1.7 million per year", "$17 million per year", "$1.7 billion per year", "$170 per project"], 2],
    ["The IBM Proprinter DFMA case reduced assembly time from 1,866 seconds to about:", ["930 seconds", "600 seconds", "170 seconds", "1,700 seconds"], 2],
    ["A machine-hour rate is calculated as:", ["Machine price ÷ parts made", "(Depreciation + energy + floorspace + maintenance) ÷ (annual hours × OEE)", "Operator wage × 2", "Supplier quote ÷ cycle time"], 1],
    ["When costing a competitor's torn-down BOM you should assume:", ["Your own region, volumes and processes", "Their likely region, volumes and processes — and trust deltas more than absolutes", "Worst-case costs everywhere", "List prices for all materials"], 1],
    ["Which statement about teardown legality is correct?", ["All reverse engineering is illegal", "Analysing open-market products is lawful; misappropriated confidential data is the bright line, and copying patented solutions needs a licence or design-around", "Patents are secret documents", "Ethics only apply to hardware"], 1],
  ];
  const PASS_MARK = 0.8;
  const EXAM_SIZE = 30;

  /* ── Exam flow ── */
  const mount = $("#examMount");
  let order = [], picks = [], qi = 0;

  function renderExamGate() {
    if (state.exam && state.exam.passed) { renderCertificate(); return; }
    const remaining = courseMods.filter((m) => !state.done.includes(m.dataset.mod)).length;
    mount.innerHTML = `<div class="ex-gate">
      <p>Thirty questions, drawn at random from a 45-question bank spanning all twelve modules — including the case studies and deep-dive material. You need <strong>${Math.round(PASS_MARK * 100)}% (24 of 30)</strong>
      to earn the <strong>VAVEhub VE Practitioner Certificate</strong>. You can retake the exam as many times as you like —
      a fresh random 30 is drawn from the bank on every attempt.</p>
      ${remaining > 0 ? `<p class="ex-warn">Heads up: ${remaining} module${remaining > 1 ? "s" : ""} not yet completed. You can still attempt the exam, but we recommend finishing the course first.</p>` : ""}
      <button class="btn btn-primary btn-lg" id="examStart">Begin the exam →</button>
    </div>`;
    $("#examStart").addEventListener("click", startExam);
    $("#certWrap").hidden = true;
  }

  function startExam() {
    order = BANK.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, EXAM_SIZE);
    picks = new Array(BANK.length).fill(null);
    qi = 0;
    renderQ();
  }

  function renderQ() {
    const bi = order[qi];
    const [q, opts] = BANK[bi];
    mount.innerHTML = `
      <div class="ex-q-head"><span>Question ${qi + 1} / ${EXAM_SIZE}</span><div class="ex-bar"><i style="width:${(qi / EXAM_SIZE) * 100}%"></i></div></div>
      <div class="ex-q">${q}</div>
      <div class="ex-opts">${opts.map((o, i) =>
        `<button class="ex-opt${picks[bi] === i ? " is-picked" : ""}" data-i="${i}"><span class="eo-key">${"ABCD"[i]}</span><span>${o}</span></button>`).join("")}</div>
      <div class="ex-nav">
        <button class="btn btn-ghost" id="exPrev" ${qi === 0 ? "disabled" : ""}>← Previous</button>
        <button class="btn btn-primary" id="exNext" ${picks[bi] === null ? "disabled" : ""}>${qi === EXAM_SIZE - 1 ? "Submit exam ✓" : "Next →"}</button>
      </div>`;
    $$(".ex-opt", mount).forEach((b) => b.addEventListener("click", () => {
      picks[bi] = +b.dataset.i;
      $$(".ex-opt", mount).forEach((o) => o.classList.toggle("is-picked", o === b));
      $("#exNext").disabled = false;
    }));
    $("#exPrev").addEventListener("click", () => { if (qi > 0) { qi--; renderQ(); } });
    $("#exNext").addEventListener("click", () => {
      if (qi < EXAM_SIZE - 1) { qi++; renderQ(); } else finishExam();
    });
  }

  function finishExam() {
    const wrong = [];
    let score = 0;
    order.forEach((bi) => {
      const [q, opts, c] = BANK[bi];
      if (picks[bi] === c) score++;
      else wrong.push([q, opts[picks[bi]] ?? "—", opts[c]]);
    });
    const pct = Math.round((score / EXAM_SIZE) * 100);
    const passed = score >= Math.ceil(EXAM_SIZE * PASS_MARK);
    const color = passed ? "#34d399" : "#f87171";
    mount.innerHTML = `<div class="ex-result">
      <div class="ex-ring"><svg viewBox="0 0 160 160"><circle class="rbg" cx="80" cy="80" r="72"/><circle class="rfg" id="exRing" cx="80" cy="80" r="72" style="stroke:${color}"/></svg>
      <div class="rnum"><b style="color:${color}">${pct}%</b><span>${score} / ${EXAM_SIZE}</span></div></div>
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
      state.exam = { passed: true, score: pct, name, date: new Date().toISOString().slice(0, 10), id: "VH-" + Date.now().toString(36).toUpperCase() };
      save(); refreshProgress(); renderCertificate();
    });
  }

  function certToken(e) {
    const json = JSON.stringify({ n: e.name, s: e.score, d: e.date, id: e.id });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function renderCertificate() {
    const e = state.exam;
    const shareUrl = new URL("certificate.html?c=" + certToken(e), location.href).toString();
    const li = new URL("https://www.linkedin.com/profile/add");
    li.searchParams.set("startTask", "CERTIFICATION_NAME");
    li.searchParams.set("name", "Value Engineering 360° Practitioner — VAVEhub VE Academy");
    li.searchParams.set("organizationName", "VAVEhub VE Academy");
    li.searchParams.set("issueYear", e.date.slice(0, 4));
    li.searchParams.set("issueMonth", String(+e.date.slice(5, 7)));
    li.searchParams.set("certUrl", shareUrl);
    li.searchParams.set("certId", e.id);
    mount.innerHTML = `<div class="ex-gate"><p><strong style="color:#34d399">✓ Certified.</strong> Your VE Practitioner Certificate is below —
      add it to LinkedIn, share the link, or save it as a PDF. It's stored in this browser, so you can come back anytime.</p>
      <div class="ex-actions" style="margin-bottom:.6rem">
        <a class="btn btn-primary" href="${li.toString()}" target="_blank" rel="noopener">in&nbsp; Add to LinkedIn profile</a>
        <button class="btn btn-ghost" id="copyShare">🔗 Copy share link</button>
        <button class="btn btn-ghost" id="exRetake">Retake for a better score</button>
      </div></div>`;
    $("#exRetake").addEventListener("click", startExam);
    $("#copyShare").addEventListener("click", () => {
      (navigator.clipboard ? navigator.clipboard.writeText(shareUrl) : Promise.reject())
        .then(() => { $("#copyShare").textContent = "✓ Link copied"; })
        .catch(() => { prompt("Copy your certificate link:", shareUrl); });
    });
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

/* ════════ Per-module quick checks (gate module completion) ════════ */
(function () {
  "use strict";
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const KEY = "vf-academy";
  const state = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  state.qc = state.qc || {};
  state.done = state.done || [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  const QUICK = {
    m1: [
      ["A product delivers the same function as its rival but costs 20% less to make. Its value is…", ["Lower", "Higher", "The same", "Impossible to say"], 1, "Same function ÷ lower cost = a higher Function/Cost ratio."],
      ["Which of these is NOT one of the four classic types of value?", ["Use value", "Esteem value", "Exchange value", "Discount value"], 3, "The four types: use, esteem, exchange and cost value."],
    ],
    m2: [
      ["The ideal VE workshop team is…", ["Only design engineers", "Cross-functional, 6–10 people, with a trained facilitator", "The entire department", "External consultants only"], 1, "Diversity of functions is where the ideas come from; the facilitator owns process, not content."],
      ["The one non-negotiable data item before the workshop is…", ["The marketing brochure", "A finance-validated costed BOM", "The org chart", "A patent list"], 1, "No trusted cost baseline, no study — everything builds on the costed BOM."],
    ],
    m3: [
      ["Which is one of Miles' founding questions?", ["What is it worth?", "Who approved it?", "Can we outsource it?", "What's the discount?"], 0, "What is it? What does it do? What does it cost? What is it worth? What else could do the job?"],
      ["Pareto thinking in the Information Phase means…", ["Analysing every part equally", "Focusing on the ~20% of parts that carry ~80% of the cost", "Ignoring cheap parts forever", "Sorting the BOM alphabetically"], 1, "Analytical firepower goes where the money is."],
    ],
    m4: [
      ["'Fasten flange' vs. 'join components' — the better function statement is…", ["Fasten flange — it's specific", "Join components — abstraction opens the solution space", "Both are equal", "Neither is valid"], 1, "'Fasten flange' locks you into bolts; 'join components' opens welding, adhesives, snap-fits and integration."],
      ["A function costs €1.00 and its worth is €0.80. Its Value Index is…", ["0.80 — healthy", "1.25 — watch list", "2.00 — attack", "8.00 — attack"], 1, "VI = Cost ÷ Worth = 1.00/0.80 = 1.25, in the 1.2–2.0 watch zone."],
    ],
    m5: [
      ["Mid-brainstorm, a manager says 'that will never work'. The facilitator should…", ["Open a debate", "Defer the judgement — criticism waits for the Evaluation Phase", "Delete the idea", "End the session"], 1, "Osborn's first rule: defer judgement absolutely. Evaluation has its own phase."],
      ["A 6-3-5 brainwriting session produces how many ideas in ~30 minutes?", ["18", "35", "108", "635"], 2, "6 people × 3 ideas × 6 passes = 108 ideas, silently."],
    ],
    m6: [
      ["The Pugh matrix compares candidate concepts against…", ["A theoretical ideal", "The current design (the datum)", "The cheapest competitor", "The cost target"], 1, "Each concept scores +/−/same per criterion versus the datum design."],
      ["Parked ideas should be…", ["Deleted to keep things tidy", "Kept — they seed future waves", "Emailed to everyone", "Patented immediately"], 1, "Today's 'not yet' is next year's scenario — park, don't purge."],
    ],
    m7: [
      ["A change saves €0.30/unit on 300,000 units/yr and costs €45k one-time. Payback?", ["1.5 months", "6 months", "18 months", "3 years"], 1, "Annual saving €90k; 45k ÷ 90k = 0.5 years = 6 months."],
      ["Before shaving a legacy safety factor, you should…", ["Just do it — margins are waste", "Validate with CAE / testing and check the applicable standards", "Ask the supplier's opinion", "Raise the price instead"], 1, "De-risking with simulation and standards is what makes the saving real and safe."],
    ],
    m8: [
      ["The true output of the Presentation Phase is…", ["Applause from management", "Logged go / no-go decisions with owners and dates", "A polished slide deck", "A wall poster"], 1, "A presentation without decisions is a rehearsal."],
      ["Implemented savings are audited against…", ["The current, inflation-adjusted cost", "The frozen baseline", "The competitor's price", "The sales forecast"], 1, "Freezing the baseline stops inflation and mix changes from blurring the result."],
    ],
    m9: [
      ["Most of your product cost sits in purchased materials. Which lever families bite first?", ["Packaging & logistics", "Sourcing + design", "Overhead allocation", "Warranty design"], 1, "Where the cost sits decides the levers: BOM-heavy → should-cost sourcing plus design changes."],
      ["A supplier's plant runs at 60% utilisation. Which should-cost layer inflates?", ["Raw material", "Overhead", "Margin", "Freight"], 1, "Overhead is spread over fewer parts — you're paying for idle air. A negotiable fact."],
    ],
    m10: [
      ["The FIRST step of a teardown is…", ["Disassemble as fast as possible", "Photograph, weigh and measure everything", "Send parts out for quotes", "Scan to CAD"], 1, "Document before disassembly — you only get one first teardown."],
      ["Functional benchmarking compares…", ["Absolute performance only", "Performance per euro (torque/€, lumens/€)", "Brand awareness", "Advertising spend"], 1, "Value ratios, not absolutes — that's the VE lens on benchmarking."],
    ],
    m11: [
      ["The right division of labour with AI in VAVE is…", ["AI replaces the workshop team", "AI diverges and drafts; humans judge, validate and decide", "AI sets the prices", "AI signs supplier contracts"], 1, "AI compresses analysis and idea volume; judgement and validation stay human."],
      ["CT scanning is used in teardowns to…", ["Sterilise components", "See internal structures non-destructively", "Paint-match surfaces", "Estimate freight cost"], 1, "Wall thicknesses, hidden joints and internal architecture — without cutting the part open."],
    ],
    m12: [
      ["The savings funnel should be reviewed…", ["Annually", "Monthly — every idea has an owner, a stage and a date", "Only when savings slip", "Never, it runs itself"], 1, "Monthly cadence is what stops ideas dying quietly."],
      ["The SAVE certification ladder, in order, is…", ["CVS → AVS → VMA", "VMA → AVS → CVS", "AVS → CVS → VMA", "PVA → CVS → VMA"], 1, "Value Methodology Associate → Associate Value Specialist → Certified Value Specialist."],
    ],
  };

  $$(".qcheck").forEach((box) => {
    const id = box.dataset.qc;
    const qs = QUICK[id];
    if (!qs) return;
    const doneBtn = document.querySelector(`.tmod-done[data-done="${id}"]`);
    const solved = new Set();
    const alreadyCleared = state.done.includes(id) || state.qc[id];

    box.innerHTML = `<div class="qcheck-head"><h4>Quick check</h4><span>${alreadyCleared ? "Cleared ✓" : "Answer both correctly to unlock completion"}</span></div>` +
      qs.map(([q, opts, c, expl], qiIdx) => `<div class="qc-item" data-qi="${qiIdx}">
        <div class="qc-q">${qiIdx + 1}. ${q}</div>
        <div class="qc-opts">${opts.map((o, oi) => `<button class="qc-opt" data-oi="${oi}">${o}</button>`).join("")}</div>
        <div class="qc-expl"></div></div>`).join("");

    function gate() {
      if (doneBtn) doneBtn.disabled = !(alreadyCleared || solved.size === qs.length);
    }
    if (!alreadyCleared && doneBtn) doneBtn.disabled = true;

    box.addEventListener("click", (e) => {
      const btn = e.target.closest(".qc-opt");
      if (!btn) return;
      const item = btn.closest(".qc-item");
      const qiIdx = +item.dataset.qi;
      const [, , correct, expl] = qs[qiIdx];
      const expEl = item.querySelector(".qc-expl");
      if (+btn.dataset.oi === correct) {
        btn.classList.add("is-right");
        item.classList.add("is-locked");
        expEl.textContent = "✓ " + expl;
        expEl.className = "qc-expl show-right";
        solved.add(qiIdx);
        if (solved.size === qs.length) {
          state.qc[id] = true; save();
          box.querySelector(".qcheck-head span").textContent = "Cleared ✓";
          gate();
        }
      } else {
        btn.classList.add("is-wrong");
        expEl.textContent = "✗ Not quite — try again. Hint: " + expl;
        expEl.className = "qc-expl show-wrong";
        setTimeout(() => btn.classList.remove("is-wrong"), 700);
      }
    });
    gate();
  });
})();
