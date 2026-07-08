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
  let acctName = "";
  // Visit streak — consecutive days the learner showed up.
  (function trackStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const v = state.visits || {};
    if (v.last !== today) {
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      v.streak = v.last === yesterday ? (v.streak || 0) + 1 : 1;
      v.last = today;
      state.visits = v;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    }
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} if (window.VHCloud) VHCloud.saveProgress(state); };
  // Pull cloud progress on load (cross-device); merge completed modules & keep best exam.
  if (window.VHCloud && VHCloud.live) VHCloud.loadProgress().then((cloud) => {
    if (!cloud) return;
    let changed = false;
    (cloud.done || []).forEach((m) => { if (!state.done.includes(m)) { state.done.push(m); changed = true; } });
    if (cloud.qc) { state.qc = Object.assign({}, cloud.qc, state.qc); }
    if (cloud.exam && (!state.exam || (cloud.exam.score || 0) > (state.exam.score || 0))) { state.exam = cloud.exam; changed = true; }
    if (cloud.role && !state.role) state.role = cloud.role;
    if (changed) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} refreshProgress(); toast("✓ Progress restored from your account"); }
  });

  function toast(msg) {
    let t = $("#vhToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "vhToast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 4200);
  }

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

  /* ── Access gate: Module 1 is a free preview; the rest of the Academy
        (Modules 2–13, the exam and the certificate) requires an account. ── */
  const FREE = new Set(["m1"]);
  function gated(id) { return (id === "exam" || /^m\d+$/.test(id)) && !FREE.has(id); }
  let currentId = null, gateEl = null;

  function renderGate(id, scroll) {
    currentId = id;
    mods.forEach((m) => m.classList.remove("is-visible"));
    $$(".mod-link", modNav).forEach((l) => l.classList.toggle("is-active", l.dataset.target === id));
    const mod = mods.find((m) => m.dataset.mod === id);
    const what = id === "exam" ? "the final exam &amp; certificate"
      : (mod ? "Module " + id.slice(1) + " — " + mod.dataset.title : "this module");
    const next = encodeURIComponent("training.html?open=" + id);
    if (!gateEl) { gateEl = document.createElement("section"); gateEl.className = "tmod auth-gate"; gateEl.id = "authGate"; $("#trMain").appendChild(gateEl); }
    gateEl.innerHTML = `
      <div class="gate-card">
        <div class="gate-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <h2>Sign in to unlock ${what}</h2>
        <p>Module&nbsp;1 is a free preview. Create your free account to open the rest of the VE Academy — your progress, quick-checks, exam attempts and certificate all save to your account and sync across devices.</p>
        <ul class="gate-list">
          <li>All 13 modules &amp; the full 48-question exam bank</li>
          <li>Your VE Practitioner Certificate, shareable on LinkedIn</li>
          <li>Progress, points, streak &amp; badges saved to your account</li>
        </ul>
        <div class="gate-actions">
          <a class="btn btn-primary btn-lg" href="auth.html?view=signup&amp;next=${next}">Create a free account →</a>
          <a class="btn btn-ghost" href="auth.html?view=signin&amp;next=${next}">I already have an account</a>
        </div>
        <p class="gate-foot">Free forever · no card required · <a href="index.html">explore the public site</a></p>
      </div>`;
    gateEl.classList.add("is-visible");
    if (scroll !== false) $("#trLayout").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function show(id, scroll) {
    if (gated(id) && !acctName) { renderGate(id, scroll); return; }
    currentId = id;
    if (gateEl) gateEl.classList.remove("is-visible");
    mods.forEach((m) => m.classList.toggle("is-visible", m.dataset.mod === id));
    $$(".mod-link", modNav).forEach((l) => l.classList.toggle("is-active", l.dataset.target === id));
    if (id === "exam") renderExamGate();
    if (scroll !== false) $("#trLayout").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateLocks() {
    $$(".mod-link", modNav).forEach((l) => l.classList.toggle("is-locked", !acctName && gated(l.dataset.target)));
  }

  /* ── Gamification: points, ranks, milestone badges ── */
  const RANKS = [[0, "Value Apprentice"], [300, "Value Explorer"], [600, "Value Analyst"], [900, "Value Engineer"], [1200, "Value Champion"], [2000, "Certified Master"]];
  const BADGES = [
    ["🧭", "Foundations", ["m1", "m2"]],
    ["🛠", "Job Plan Master", ["m3", "m4", "m5", "m6", "m7", "m8"]],
    ["📐", "Cost Toolsmith", ["m9", "m10", "m11"]],
    ["🏛", "Programme Leader", ["m12"]],
    ["🎯", "Cost Preventer", ["m13"]],
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
    if (acctName) renderMyLearn();
  }

  /* ── Role-based learning paths ── */
  const ROLE_RECS = {
    design: ["m1", "m3", "m4", "m5", "m7", "m10", "m13"],
    sourcing: ["m1", "m2", "m9", "m10", "m11"],
    manager: ["m1", "m2", "m6", "m8", "m12", "m13"],
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

  /* ── Signed-in state: My Learning banner + cert name prefill ── */
  function renderMyLearn() {
    if (!acctName) return;
    let box = $("#myLearn");
    if (!box) {
      box = document.createElement("div");
      box.id = "myLearn"; box.className = "my-learn";
      const anchor = $("#trRoles");
      anchor.parentNode.insertBefore(box, anchor);
    }
    const total = courseMods.length, done = state.done.length;
    const pct = Math.round((done / total) * 100);
    const next = courseMods.find((m) => !state.done.includes(m.dataset.mod));
    const streak = (state.visits && state.visits.streak) || 1;
    const certified = state.exam && state.exam.passed;
    const first = acctName.trim().split(/\s+/)[0].replace(/[<>&"]/g, "");
    box.innerHTML = `
      <div class="ml-ring"><svg viewBox="0 0 60 60"><circle class="mlr-bg" cx="30" cy="30" r="26"/><circle class="mlr-fg" cx="30" cy="30" r="26" style="stroke-dashoffset:${Math.round(163.4 * (1 - pct / 100))}"/></svg><b>${pct}%</b></div>
      <div class="ml-txt">
        <b>Welcome back, ${first} 👋</b>
        <span>${done} of ${total} modules · ${points()} pts · ${rank(points())}${streak > 1 ? " · 🔥 " + streak + "-day streak" : ""}${certified ? " · 🎓 Certified" : ""}</span>
      </div>
      <button class="btn btn-primary ml-btn" id="mlGo">${certified ? "View your certificate →" : next ? (done ? "Continue: " + next.dataset.title + " →" : "Start learning →") : "Take the exam →"}</button>`;
    $("#mlGo").addEventListener("click", () => show(certified || !next ? "exam" : next.dataset.mod));
  }
  function onAccount(user) {
    if (user && user.name) {
      acctName = user.name; renderMyLearn();
      const ss = $("#sideSync"); if (ss) ss.remove();
    } else {
      acctName = "";
      const ml = $("#myLearn"); if (ml) ml.remove();
      const foot = $(".tr-side-foot");
      if (foot && !$("#sideSync")) {
        const n = document.createElement("p");
        n.id = "sideSync"; n.className = "side-sync";
        n.innerHTML = '<a href="auth.html">Sign in</a> to unlock the full Academy &amp; sync across devices.';
        foot.appendChild(n);
      }
    }
    updateLocks();
    if (currentId) show(currentId, false); // re-gate or reveal now that auth changed
  }
  document.addEventListener("vh-account", (e) => onAccount(e.detail));
  if (window.VHAccount && VHAccount.user) onAccount(VHAccount.user);

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
    ["A function has cost £2.00 and worth £0.50. Its Value Index is:", ["0.25 — healthy", "1.0 — balanced", "2.5 — watch list", "4.0 — a prime creative-phase target"], 3],
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
    ["The 'value gap' in target costing is:", ["Market price minus list price", "The difference between the drifting (current-estimate) cost and the allowable cost", "Profit minus overhead", "The warranty reserve"], 1],
    ["Kaizen costing is:", ["Setting cost targets before design begins", "Continuous incremental cost reduction after production starts — the handoff from target costing", "A European auditing standard", "A supplier penalty clause"], 1],
    ["In design-to-cost, cost status at each design gate should be treated like:", ["A finance-only report", "Mass/weight status — a tracked engineering property with a named owner and a recovery plan when exceeded", "A marketing forecast", "An optional appendix"], 1],
  ];
  const PASS_MARK = 0.8;
  const EXAM_SIZE = 30;
  window.VH_BANK = BANK; // read-only handle for the review engine

  /* ── Exam flow ── */
  const mount = $("#examMount");
  let order = [], picks = [], qi = 0;

  function renderExamGate() {
    if (state.exam && state.exam.passed) { renderCertificate(); return; }
    const remaining = courseMods.filter((m) => !state.done.includes(m.dataset.mod)).length;
    mount.innerHTML = `<div class="ex-gate">
      <p>Thirty questions, drawn at random from a 48-question bank spanning all thirteen modules — including the case studies and deep-dive material. You need <strong>${Math.round(PASS_MARK * 100)}% (24 of 30)</strong>
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
    const missedIdx = [];
    let score = 0;
    order.forEach((bi) => {
      const [q, opts, c] = BANK[bi];
      if (picks[bi] === c) score++;
      else { wrong.push([q, opts[picks[bi]] ?? "—", opts[c]]); missedIdx.push(bi); }
    });
    state.review = missedIdx; save(); // feed the review-mistakes mode
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
      ${passed ? `<div class="ex-name"><input id="certNameInput" maxlength="60" placeholder="Your full name, as it should appear" value="${((state.exam && state.exam.name) || acctName || "").replace(/"/g, "&quot;")}" /></div>` : ""}
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
      save(); if (window.VHCloud) VHCloud.registerCertificate(state.exam); refreshProgress(); renderCertificate();
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

  /* ── Printable one-page module summaries ── */
  courseMods.forEach((mod) => {
    const head = $(".tmod-head", mod);
    if (!head) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tmod-print";
    btn.textContent = "🖨 Module summary";
    btn.title = "Print a one-page recap of this module";
    btn.addEventListener("click", () => printSummary(mod));
    head.appendChild(btn);
  });

  function printSummary(mod) {
    const title = mod.dataset.title;
    const tag = ($(".tmod-tag", mod) || {}).textContent || "";
    const obj = $(".tmod-obj ul", mod), keys = $(".tkey ul", mod), doEl = $(".tdo p", mod);
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title} — module summary · VAVEhub VE Academy</title>
      <style>
        body{font-family:'Segoe UI',system-ui,sans-serif;color:#1a2233;max-width:760px;margin:2rem auto;padding:0 1.2rem;line-height:1.55}
        .brand{font-weight:800;font-size:.95rem}.brand b{color:#2563eb}
        .tag{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#5a6785;margin:.9rem 0 .2rem}
        h1{font-size:1.5rem;margin:0 0 1rem;border-bottom:2px solid #1a2233;padding-bottom:.7rem}
        h2{font-size:.95rem;color:#2563eb;margin:1.3rem 0 .4rem}
        ul{margin:.2rem 0 .2rem 1.2rem}li{margin-bottom:.3rem;font-size:.9rem}
        p{font-size:.9rem}
        .foot{margin-top:2rem;padding-top:.8rem;border-top:1px solid #dde3f0;font-size:.72rem;color:#5a6785}
        @media print{body{margin:0 auto}}
      </style></head><body>
      <div class="brand">VAVE<b>hub</b> · VE Academy — module summary</div>
      <div class="tag">${tag}</div><h1>${title}</h1>
      ${obj ? "<h2>What this module covers</h2><ul>" + obj.innerHTML + "</ul>" : ""}
      ${keys ? "<h2>Key takeaways</h2><ul>" + keys.innerHTML + "</ul>" : ""}
      ${doEl ? "<h2>Hands-on assignment</h2><p>" + doEl.innerHTML + "</p>" : ""}
      <div class="foot">© Avinash Bhosale · VAVEhub VE Academy — free educational summary, personal &amp; internal use with attribution. Full lesson, worked examples and case studies: the free course at VAVEhub.</div>
      <script>window.print()<\/script></body></html>`);
    w.document.close();
  }

  /* ── Init ── */
  refreshProgress();
  updateLocks();
  const firstUnread = courseMods.find((m) => !state.done.includes(m.dataset.mod));
  const startId = acctName
    ? (state.exam && state.exam.passed ? "exam" : (firstUnread ? firstUnread.dataset.mod : "exam"))
    : "m1";
  const openParam = new URLSearchParams(location.search).get("open");
  show(openParam || startId, false);
})();

/* ════════ Per-module quick checks (gate module completion) ════════ */
(function () {
  "use strict";
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const KEY = "vf-academy";
  const state = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  state.qc = state.qc || {};
  state.done = state.done || [];
  let acctName = "";
  // Visit streak — consecutive days the learner showed up.
  (function trackStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const v = state.visits || {};
    if (v.last !== today) {
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      v.streak = v.last === yesterday ? (v.streak || 0) + 1 : 1;
      v.last = today;
      state.visits = v;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    }
  })();
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
      ["A function costs £1.00 and its worth is £0.80. Its Value Index is…", ["0.80 — healthy", "1.25 — watch list", "2.00 — attack", "8.00 — attack"], 1, "VI = Cost ÷ Worth = 1.00/0.80 = 1.25, in the 1.2–2.0 watch zone."],
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
      ["A change saves £0.30/unit on 300,000 units/yr and costs £45k one-time. Payback?", ["1.5 months", "6 months", "18 months", "3 years"], 1, "Annual saving £90k; 45k ÷ 90k = 0.5 years = 6 months."],
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
      ["Functional benchmarking compares…", ["Absolute performance only", "Performance per pound (torque/£, lumens/£)", "Brand awareness", "Advertising spend"], 1, "Value ratios, not absolutes — that's the VE lens on benchmarking."],
    ],
    m11: [
      ["The right division of labour with AI in VAVE is…", ["AI replaces the workshop team", "AI diverges and drafts; humans judge, validate and decide", "AI sets the prices", "AI signs supplier contracts"], 1, "AI compresses analysis and idea volume; judgement and validation stay human."],
      ["CT scanning is used in teardowns to…", ["Sterilise components", "See internal structures non-destructively", "Paint-match surfaces", "Estimate freight cost"], 1, "Wall thicknesses, hidden joints and internal architecture — without cutting the part open."],
    ],
    m12: [
      ["The savings funnel should be reviewed…", ["Annually", "Monthly — every idea has an owner, a stage and a date", "Only when savings slip", "Never, it runs itself"], 1, "Monthly cadence is what stops ideas dying quietly."],
      ["The SAVE certification ladder, in order, is…", ["CVS → AVS → VMA", "VMA → AVS → CVS", "AVS → CVS → VMA", "PVA → CVS → VMA"], 1, "Value Methodology Associate → Associate Value Specialist → Certified Value Specialist."],
    ],
    m13: [
      ["A product will sell at £400 and the business needs a 25% margin. Its allowable cost is…", ["£100", "£300", "£375", "£500"], 1, "Allowable cost = price − margin = 400 × (1 − 0.25) = £300 — set before design, not after."],
      ["The 'cardinal rule' of target costing says…", ["If costs drift up, raise the price", "The target cost may never be exceeded — content trades elsewhere instead of drifting", "Suppliers absorb all overruns", "Targets are advisory until SOP"], 1, "Cooper & Slagmulder's rule: the number holds; features, design or make-buy flex around it."],
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
        <div class="qc-expl" role="status" aria-live="polite"></div></div>`).join("");

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

/* ════════ Glossary tooltips — first mention per module gets a hover definition ════════ */
(function () {
  "use strict";
  const TERMS = [
    ["FAST", "Function Analysis System Technique — maps functions on a HOW→/←WHY logic axis between scope lines."],
    ["Value Index", "Cost ÷ Worth for a function. Above 1.2, watch; above 2.0, attack."],
    ["should-cost", "A bottom-up estimate of what a part ought to cost: material, cycle time, machine rates, labour, overhead, fair margin."],
    ["cleansheet", "A fully transparent, layer-by-layer should-cost model used for fact-based negotiation."],
    ["LPP", "Linear Performance Pricing — regressing price against a cost driver across a part family to expose outliers."],
    ["target costing", "Market price − required margin = allowable cost, set before design starts and cascaded down."],
    ["design-to-cost", "Managing cost as a design requirement with the same authority as mass, performance or safety."],
    ["kaizen costing", "Continuous, incremental cost reduction during production — the running-change counterpart to target costing."],
    ["teardown", "Systematic disassembly and costing of a product — yours or a competitor's — to harvest facts and ideas."],
    ["DFMA", "Design for Manufacture & Assembly — minimum-part-count logic and assembly-friendly geometry, quantified."],
    ["buy-to-fly", "Raw material bought ÷ material in the finished part. Aerospace titanium can start at 8:1."],
    ["OEE", "Overall Equipment Effectiveness = availability × performance × quality — the denominator of machine cost per part."],
    ["TCO", "Total Cost of Ownership — purchase price plus lifetime energy, service, warranty and disposal cost."],
    ["PPAP", "Production Part Approval Process — the automotive gate every implemented VAVE change must clear."],
    ["TRIZ", "Theory of Inventive Problem Solving — resolves design contradictions using 40 principles distilled from patents."],
    ["Kano", "Model separating must-be, performance, attractive, indifferent and reverse requirements — the de-contenting compass."],
    ["Pugh matrix", "Concept screening: score each candidate +/−/same against the current design (the datum) per criterion."],
    ["basic function", "The reason the product exists (\"heat water\"). Remove it and the product is pointless."],
    ["secondary function", "How this particular design happens to work — and therefore where most removable cost hides."],
    ["gain-share", "Contractual split of verified savings with a supplier — the engine of supplier-driven VAVE."],
  ].map(([t, d]) => [new RegExp("(^|[^\\w-])(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")($|[^\\w-])", "i"), t, d]);
  window.VH_TERMS = TERMS.map((t) => [t[1], t[2]]); // flashcard deck

  document.querySelectorAll(".tmod").forEach((mod) => {
    const used = new Set();
    const walker = document.createTreeWalker(mod, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest("h2, h3, h4, .gloss, .tmod-tag, .qcheck, button, a, code")) return NodeFilter.FILTER_REJECT;
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
        const start = m.index + m[1].length;
        const word = m[2];
        const after = node.splitText(start);
        after.data = after.data.slice(word.length);
        const span = document.createElement("span");
        span.className = "gloss";
        span.tabIndex = 0;
        span.setAttribute("data-def", def);
        span.textContent = word;
        node.parentNode.insertBefore(span, after);
        used.add(term);
        break; // one wrap per text node; later nodes catch the other terms
      }
    });
  });
})();

/* ════════ Module 4 interactives: FAST builder · function library · identification challenge ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── 1. Step-by-step animated FAST diagram ── */
  const fb = $("#fastBuilder");
  if (fb) {
    const CAPTIONS = [
      "A FAST diagram starts as an empty canvas. Press <b>Next step</b> to begin.",
      "<b>Step 1 — Draw the scope lines.</b> Two dashed lines bracket what your study covers. Everything you'll analyse lives between them. The logic axis runs left–right: moving right asks <b>HOW?</b>, moving left asks <b>WHY?</b>",
      "<b>Step 2 — Place the basic function.</b> <i>HEAT WATER</i> goes just inside the left scope line. It's the reason the kettle exists — remove it and the product is pointless.",
      "<b>Step 3 — Ask HOW?</b> HOW do we heat water? — by <i>generating heat</i>. The answer sits immediately to the right, connected by the logic path.",
      "<b>Step 4 — Keep asking HOW?</b> HOW do we generate heat? — by <i>conducting current</i> through a resistive element. Each HOW? extends the chain one card to the right.",
      "<b>Step 5 — Stop at the assumed function.</b> HOW do we conduct current? — mains electricity <i>supplies power</i>. That's outside our control, so it sits <b>outside the right scope line</b>. Our study stops here.",
      "<b>Step 6 — Anchor the WHY? direction.</b> WHY do we heat water? — to <i>prepare a beverage</i>. That's the customer's higher purpose, so it sits <b>outside the left scope line</b>. Now read the chain backwards: every WHY? must sound right.",
      "<b>Step 7 — Float the all-time functions.</b> <i>ENSURE SAFETY</i> and <i>CONVEY ESTEEM</i> act on the whole product all the time, so they float above the main path rather than joining the chain.",
      "<b>Done — now validate.</b> Read it aloud both ways: \"WHY conduct current? To generate heat. WHY generate heat? To heat water. ✓\" and \"HOW to heat water? Generate heat. HOW? Conduct current. ✓\" — a sentence that sounds wrong means a card is misplaced. That read-aloud test is the whole point of FAST.",
    ];
    const LAST = CAPTIONS.length - 1;
    let step = 0;
    const stage = $("#fbStage"), cap = $("#fbCaption"), prev = $("#fbPrev"), next = $("#fbNext"), dots = $("#fbDots");
    dots.innerHTML = CAPTIONS.map((_, i) => `<i class="fb-dot${i === 0 ? " on" : ""}"></i>`).join("");
    function render() {
      $$("[data-fstep]", stage).forEach((el) => el.classList.toggle("fb-in", +el.dataset.fstep <= step));
      stage.classList.toggle("fb-validating", step === LAST);
      cap.innerHTML = CAPTIONS[step];
      prev.disabled = step === 0;
      next.textContent = step === LAST ? "↻ Replay" : "Next step →";
      $$(".fb-dot", dots).forEach((d, i) => d.classList.toggle("on", i <= step));
    }
    next.addEventListener("click", () => { step = step === LAST ? 0 : step + 1; render(); });
    prev.addEventListener("click", () => { if (step > 0) { step--; render(); } });
    render();
  }

  /* ── 2. Function library: active verb + measurable noun ── */
  const LIB = {
    "Mechanical": [
      ["Transmit torque", "carry twisting force from one part to another", "driveshaft, gear, coupling"],
      ["Support load", "hold up a weight or force without failing", "bracket, chassis, table leg"],
      ["Absorb shock", "soak up sudden impact energy", "bumper foam, shoe sole, damper"],
      ["Store energy", "hold energy for later release", "spring, flywheel, battery"],
      ["Position component", "hold a part in exactly the right place", "locating pin, bracket, jig"],
      ["Join components", "hold two or more parts together", "weld, adhesive, snap-fit, bolt"],
      ["Increase friction", "resist sliding between surfaces", "tyre tread, rubber feet, grip tape"],
      ["Reduce friction", "let surfaces slide or roll easily", "bearing, bushing, lubricant"],
      ["Limit travel", "stop movement beyond a set point", "end stop, detent, snap ring"],
      ["Guide motion", "constrain movement along a path", "rail, slot, hinge, linear guide"],
    ],
    "Electrical & electronic": [
      ["Conduct current", "carry electricity from one point to another", "wire, busbar, PCB trace"],
      ["Block current", "stop electricity going where it shouldn't", "insulation, isolator, fuse (when blown)"],
      ["Store charge", "hold electrical energy briefly", "capacitor, battery cell"],
      ["Convert energy", "change one energy form into another", "motor, generator, LED, heater"],
      ["Switch circuit", "open or close an electrical path", "relay, transistor, push button"],
      ["Regulate voltage", "hold electrical pressure steady", "regulator IC, zener diode"],
      ["Amplify signal", "make a weak signal stronger", "op-amp, audio amplifier"],
      ["Suppress interference", "stop unwanted electrical noise", "ferrite bead, shield can, filter"],
    ],
    "Thermal & fluid": [
      ["Generate heat", "produce thermal energy on purpose", "heating element, burner"],
      ["Dissipate heat", "move unwanted heat away", "heat sink, fan, radiator"],
      ["Insulate heat", "slow heat passing through", "foam layer, air gap, double wall"],
      ["Contain fluid", "keep liquid or gas inside a space", "tank, pipe, kettle body"],
      ["Control flow", "set how much fluid passes", "valve, orifice, thermostat"],
      ["Seal interface", "stop leaks where two parts meet", "O-ring, gasket, weld bead"],
      ["Filter particles", "remove unwanted matter from a flow", "air filter, strainer, membrane"],
      ["Circulate air", "move air around a space", "fan, blower, vent"],
    ],
    "Information & control": [
      ["Indicate status", "show the user what state the product is in", "LED, gauge, icon"],
      ["Sense temperature", "measure how hot or cold something is", "thermistor, thermocouple"],
      ["Measure pressure", "quantify force per area in a system", "pressure sensor, gauge"],
      ["Transmit signal", "send information from one place to another", "cable, antenna, optical fibre"],
      ["Store data", "keep information for later use", "memory chip, SD card"],
      ["Control sequence", "decide what happens and when", "controller, timer, cam"],
      ["Emit sound", "produce an audible signal", "buzzer, speaker, chime"],
      ["Emit light", "produce visible light", "LED, bulb, display backlight"],
    ],
    "Protection & durability": [
      ["Resist corrosion", "survive attack by water or chemicals", "coating, stainless steel, anodising"],
      ["Resist wear", "survive repeated rubbing", "hardened surface, wear plate"],
      ["Resist flame", "not catch fire or spread fire", "FR plastic, intumescent coating"],
      ["Protect surface", "shield a surface from damage", "paint, film, case"],
      ["Exclude dust", "keep dirt out of a mechanism", "seal, boot, cover"],
      ["Ensure safety", "prevent harm to the user (all-time function)", "guard, interlock, insulation"],
      ["Damp vibration", "reduce unwanted shaking", "rubber mount, mass damper"],
      ["Retain fastener", "stop a joint working loose", "thread-locker, lock washer, nyloc"],
    ],
    "Esteem & human": [
      ["Convey quality", "make the product feel well made", "gloss finish, tight gaps, weight"],
      ["Please eye", "look attractive to the customer", "styling line, colour, proportion"],
      ["Convey esteem", "signal status or brand to others", "badge, chrome trim, packaging"],
      ["Reduce effort", "make the product easier to use", "soft-touch grip, assist spring"],
      ["Save time", "let the user finish the task faster", "quick-release, one-touch control"],
      ["Assure user", "give confidence it is working properly", "solid click, progress light"],
      ["Improve comfort", "make use physically pleasant", "padding, ergonomic curve"],
      ["Aid grip", "help the hand hold the product", "knurling, rubber overmould"],
    ],
  };
  const lib = $("#fnLib");
  if (lib) {
    const filters = $("#fnFilters"), grid = $("#fnGrid");
    const cats = Object.keys(LIB);
    filters.innerHTML = ['<button class="fn-chip is-on" data-cat="all">All (' + cats.reduce((n, c) => n + LIB[c].length, 0) + ')</button>']
      .concat(cats.map((c) => `<button class="fn-chip" data-cat="${c}">${c} (${LIB[c].length})</button>`)).join("");
    function renderLib(cat) {
      const show = cat === "all" ? cats : [cat];
      grid.innerHTML = show.map((c) =>
        `<div class="fn-cat"><h5>${c}</h5>` + LIB[c].map(([fn, meaning, ex]) =>
          `<div class="fn-item"><b>${fn}</b><span>${meaning}</span><em>e.g. ${ex}</em></div>`).join("") + "</div>").join("");
    }
    filters.addEventListener("click", (e) => {
      const chip = e.target.closest(".fn-chip");
      if (!chip) return;
      $$(".fn-chip", filters).forEach((c) => c.classList.toggle("is-on", c === chip));
      renderLib(chip.dataset.cat);
    });
    renderLib("all");
  }

  /* ── 3. Function Identification Challenge: 8 examples × 4 options ── */
  const FNCHAL = [
    ["The heating element inside an electric kettle", ["Provide heat", "Generate heat", "Make water hot", "Boil kettle"], 1,
     "\"Generate heat\" — active verb, measurable noun. \"Provide\" is a banned verb; \"make water hot\" is three words and vague; \"boil kettle\" names the product, not the job."],
    ["The rubber feet under a laptop", ["Provide stability", "Hold laptop", "Increase friction", "Stop movement"], 2,
     "\"Increase friction\" is what the rubber physically does, and friction is measurable. \"Provide stability\" uses a banned verb; \"hold laptop\" describes the part's location, not its job; \"stop movement\" isn't measurable as stated."],
    ["A car headlight", ["Enable driving", "Emit light", "Provide visibility", "Light road"], 1,
     "\"Emit light\" — you can measure lumens. \"Enable\" and \"provide\" are banned verbs; \"light road\" describes where the light goes, not the function the part performs."],
    ["The plastic insulation around a mains wire", ["Ensure protection", "Cover wire", "Make wire safe", "Block current"], 3,
     "\"Block current\" is the measurable job — electricity must not pass through it. \"Ensure\" is banned; \"cover wire\" describes the solution's geometry; \"make wire safe\" is vague and unmeasurable."],
    ["A water bottle cap", ["Seal container", "Close bottle", "Provide closure", "Keep water inside"], 0,
     "\"Seal container\" — a seal is testable (pressure, leak rate). \"Close bottle\" names the product; \"provide closure\" uses a banned verb; \"keep water inside\" is four words hiding the same job."],
    ["The handle of a hot coffee mug", ["Provide grip", "Help user", "Transmit force", "Hold mug"], 2,
     "The handle's primary job is to \"transmit force\" — it carries the lifting force from your hand to the mug (it also performs a second function: isolate heat). \"Provide\" is banned; \"help user\" is unmeasurable; \"hold mug\" is the product in disguise."],
    ["The spring inside a retractable ballpoint pen", ["Store energy", "Retract tip", "Provide clicking", "Make pen work"], 0,
     "The spring itself does one job: \"store energy\" (and release it). Retracting the tip is the combined job of spring + latch mechanism; \"provide clicking\" is banned and describes a side effect; \"make pen work\" is hopelessly vague."],
    ["The high-gloss paint on a luxury car (beyond protecting the metal)", ["Look good", "Impress people", "Convey quality", "Provide beauty"], 2,
     "\"Convey quality\" is the standard esteem function — and it is measurable through market research and price premiums. \"Look good\" has no active verb; \"impress people\" isn't testable; \"provide beauty\" uses a banned verb with an unmeasurable noun."],
  ];
  const mount = $("#fncMount");
  if (mount) {
    let answered, score;
    function renderChal() {
      answered = new Array(FNCHAL.length).fill(false); score = 0;
      mount.innerHTML = FNCHAL.map(([q, opts], qi) => `
        <div class="fnc-item" data-qi="${qi}">
          <div class="fnc-q"><span class="fnc-n">${qi + 1}</span>${q} — which is the correctly written function?</div>
          <div class="fnc-opts">${opts.map((o, oi) => `<button type="button" class="fnc-opt" data-oi="${oi}">${o}</button>`).join("")}</div>
          <div class="fnc-expl" role="status" aria-live="polite"></div>
        </div>`).join("") +
        `<div class="fnc-score" id="fncScore" role="status" aria-live="polite"></div>
         <div class="fnc-actions"><button type="button" class="btn btn-ghost" id="fncReset" hidden>↻ Try the challenge again</button></div>`;
      $("#fncReset").addEventListener("click", renderChal);
    }
    mount.addEventListener("click", (e) => {
      const btn = e.target.closest(".fnc-opt");
      if (!btn) return;
      const item = btn.closest(".fnc-item");
      const qi = +item.dataset.qi;
      if (answered[qi]) return;
      answered[qi] = true;
      const [, , correct, expl] = FNCHAL[qi];
      const right = +btn.dataset.oi === correct;
      if (right) score++;
      $$(".fnc-opt", item).forEach((o, oi) => {
        o.disabled = true;
        if (oi === correct) o.classList.add("is-right");
        else if (o === btn) o.classList.add("is-wrong");
      });
      const ex = $(".fnc-expl", item);
      ex.textContent = (right ? "✓ Correct. " : "✗ Not quite. ") + expl;
      ex.className = "fnc-expl show " + (right ? "ok" : "no");
      if (answered.every(Boolean)) {
        const s = $("#fncScore");
        const msg = score === 8 ? "Perfect — you think in functions now!" : score >= 6 ? "Strong — review the ones you missed and you're there." : "Good practice — re-read section 4.3 on fake functions and try again.";
        s.innerHTML = `You scored <b>${score} / 8</b>. ${msg}`;
        s.classList.add("show");
        $("#fncReset").hidden = false;
      }
    });
    renderChal();
  }
})();


/* ════════ Rotating quotes about Value Engineering (training hero) ════════ */
(function () {
  "use strict";
  const slide = document.getElementById("tqSlide");
  if (!slide) return;
  const QUOTES = [
    ["All cost is for function.", "— Lawrence D. Miles, father of Value Analysis"],
    ["Value analysis is a potent and completely different procedure for accomplishing far greater results.", "— Lawrence D. Miles, General Electric, 1947"],
    ["Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", "— Antoine de Saint-Exupéry"],
    ["Costs do not exist to be calculated. Costs exist to be reduced.", "— Taiichi Ohno, father of the Toyota Production System"],
    ["The customer never buys a product — they buy the job it does.", "— the first principle of function thinking"],
  ];
  const txt = document.getElementById("tqText"), who = document.getElementById("tqWho");
  let i = 0, paused = false;
  const box = document.getElementById("trQuotes");
  box.addEventListener("mouseenter", () => { paused = true; });
  box.addEventListener("mouseleave", () => { paused = false; });
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  setInterval(() => {
    if (paused) return;
    i = (i + 1) % QUOTES.length;
    slide.classList.add("tq-out");
    setTimeout(() => {
      txt.textContent = QUOTES[i][0];
      who.textContent = QUOTES[i][1];
      slide.classList.remove("tq-out");
    }, 450);
  }, 6500);
})();

/* ════════ Academy extras: cert counter · course search · review mode · community ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const cfg = window.VF_CONFIG || {};
  const KEY = "vf-academy";
  const getState = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

  /* ── 1. live certificates-issued counter (social proof) ── */
  if (window.VHCloud && VHCloud.live && VHCloud.certCount) {
    VHCloud.certCount().then((n) => {
      if (!n || n < 1) return;
      const tile = $("#certCountStat");
      if (tile) { $("#certCountNum").textContent = n; tile.hidden = false; }
    });
  }

  /* ── 2. course search across all modules ── */
  const input = $("#courseSearch"), results = $("#searchResults");
  if (input && results) {
    const mods = $$(".tmod").filter((m) => m.dataset.mod !== "exam");
    const index = [];
    mods.forEach((mod) => {
      $$("h3, h4, p, li", mod).forEach((el) => {
        if (el.closest(".qcheck, button, .vo-bar, .fn-challenge, .fast-builder, .fn-lib, .ve-lab")) return;
        const text = el.textContent.replace(/\s+/g, " ").trim();
        if (text.length > 8) index.push({ mod: mod.dataset.mod, title: mod.dataset.title, el, text, low: text.toLowerCase() });
      });
    });
    function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
    function run(q) {
      q = q.trim().toLowerCase();
      if (q.length < 3) { results.hidden = true; results.innerHTML = ""; return; }
      const hits = index.filter((e) => e.low.includes(q)).slice(0, 8);
      if (!hits.length) { results.innerHTML = '<div class="sr-none">No match — try a shorter word.</div>'; results.hidden = false; return; }
      results.innerHTML = hits.map((h, i) => {
        const at = h.low.indexOf(q);
        const snippet = esc(h.text.slice(Math.max(0, at - 30), at)) + "<mark>" + esc(h.text.substr(at, q.length)) + "</mark>" + esc(h.text.substr(at + q.length, 46));
        return `<button type="button" class="sr-hit" data-i="${i}"><b>${h.title}</b><span>…${snippet}…</span></button>`;
      }).join("");
      results.hidden = false;
      $$(".sr-hit", results).forEach((btn) => btn.addEventListener("click", () => {
        const h = hits[+btn.dataset.i];
        results.hidden = true; input.value = "";
        const link = $(`.mod-link[data-target="${h.mod}"]`);
        if (link) link.click();
        setTimeout(() => {
          try { h.el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
          h.el.classList.add("search-hit");
          setTimeout(() => h.el.classList.remove("search-hit"), 2600);
        }, 350);
      }));
    }
    input.addEventListener("input", () => run(input.value));
    document.addEventListener("click", (e) => { if (!e.target.closest(".course-search-wrap")) results.hidden = true; });
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") { results.hidden = true; input.blur(); } });
  }

  /* ── 3. review mode: missed exam questions + glossary flashcards ── */
  const foot = $(".tr-side-foot");
  if (foot) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn btn-ghost rev-btn"; btn.id = "revBtn";
    btn.textContent = "↻ Review & flashcards";
    foot.appendChild(btn);
    btn.addEventListener("click", openReview);
  }

  function openReview() {
    const st = getState();
    const missed = (st.review || []).filter((i) => window.VH_BANK && window.VH_BANK[i]);
    const terms = window.VH_TERMS || [];
    let modal = $("#revModal");
    if (modal) modal.remove();
    modal = document.createElement("div");
    modal.id = "revModal"; modal.className = "rev-modal";
    modal.innerHTML = `
      <div class="rev-card" role="dialog" aria-label="Review and flashcards">
        <button type="button" class="rev-close" aria-label="Close">✕</button>
        <div class="rev-tabs">
          <button type="button" class="rev-tab is-on" data-tab="missed">Missed questions (${missed.length})</button>
          <button type="button" class="rev-tab" data-tab="cards">Flashcards (${terms.length})</button>
        </div>
        <div class="rev-pane" id="revMissed"></div>
        <div class="rev-pane" id="revCards" hidden></div>
      </div>`;
    document.body.appendChild(modal);
    $(".rev-close", modal).addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
    document.addEventListener("keydown", function escClose(e) { if (e.key === "Escape") { modal.remove(); document.removeEventListener("keydown", escClose); } });
    $$(".rev-tab", modal).forEach((t) => t.addEventListener("click", () => {
      $$(".rev-tab", modal).forEach((x) => x.classList.toggle("is-on", x === t));
      $("#revMissed").hidden = t.dataset.tab !== "missed";
      $("#revCards").hidden = t.dataset.tab !== "cards";
    }));

    // missed-questions pane: requiz with instant feedback
    const mp = $("#revMissed", modal);
    if (!missed.length) {
      mp.innerHTML = '<p class="rev-empty">No missed exam questions to review — either you haven\'t taken the exam yet, or you got everything right. 🎉</p>';
    } else {
      mp.innerHTML = missed.map((bi, n) => {
        const [q, opts] = window.VH_BANK[bi];
        return `<div class="rev-q" data-bi="${bi}"><div class="rev-qt">${n + 1}. ${q}</div>
          <div class="rev-opts">${opts.map((o, oi) => `<button type="button" class="rev-opt" data-oi="${oi}">${o}</button>`).join("")}</div></div>`;
      }).join("");
      mp.addEventListener("click", (e) => {
        const ob = e.target.closest(".rev-opt");
        if (!ob) return;
        const qEl = ob.closest(".rev-q");
        const [, , correct] = window.VH_BANK[+qEl.dataset.bi];
        $$(".rev-opt", qEl).forEach((o, oi) => {
          o.disabled = true;
          if (oi === correct) o.classList.add("is-right");
          else if (o === ob) o.classList.add("is-wrong");
        });
      });
    }

    // flashcards pane
    const cp = $("#revCards", modal);
    let ci = 0, flipped = false;
    const deck = terms.slice().sort(() => Math.random() - 0.5);
    function renderCard() {
      const [term, def] = deck[ci] || ["—", "—"];
      cp.innerHTML = `
        <div class="fc-card${flipped ? " is-flipped" : ""}" id="fcCard" role="button" tabindex="0" aria-label="Flashcard — click to flip">
          <div class="fc-face fc-front"><span>${term}</span><em>tap to reveal</em></div>
          <div class="fc-face fc-back"><span>${def}</span></div>
        </div>
        <div class="fc-nav">
          <button type="button" class="btn btn-ghost" id="fcPrev" ${ci === 0 ? "disabled" : ""}>← Prev</button>
          <span class="fc-count">${ci + 1} / ${deck.length}</span>
          <button type="button" class="btn btn-primary" id="fcNext" ${ci === deck.length - 1 ? "disabled" : ""}>Next →</button>
        </div>`;
      const card = $("#fcCard", cp);
      const flip = () => { flipped = !flipped; card.classList.toggle("is-flipped", flipped); };
      card.addEventListener("click", flip);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      $("#fcPrev", cp).addEventListener("click", () => { if (ci > 0) { ci--; flipped = false; renderCard(); } });
      $("#fcNext", cp).addEventListener("click", () => { if (ci < deck.length - 1) { ci++; flipped = false; renderCard(); } });
    }
    renderCard();
  }

  /* ── 4. community discussion (Giscus) — appears once configured ── */
  if (cfg.giscusRepo && cfg.giscusRepoId && cfg.giscusCategory && cfg.giscusCategoryId) {
    const sec = $("#community");
    if (sec) {
      sec.hidden = false;
      const dark = document.documentElement.dataset.theme !== "light";
      const s = document.createElement("script");
      s.src = "https://giscus.app/client.js";
      s.async = true; s.crossOrigin = "anonymous";
      s.setAttribute("data-repo", cfg.giscusRepo);
      s.setAttribute("data-repo-id", cfg.giscusRepoId);
      s.setAttribute("data-category", cfg.giscusCategory);
      s.setAttribute("data-category-id", cfg.giscusCategoryId);
      s.setAttribute("data-mapping", "specific");
      s.setAttribute("data-term", "VE Academy — course discussion");
      s.setAttribute("data-strict", "0");
      s.setAttribute("data-reactions-enabled", "1");
      s.setAttribute("data-input-position", "top");
      s.setAttribute("data-theme", dark ? "transparent_dark" : "light");
      s.setAttribute("data-lang", "en");
      $("#giscusMount").appendChild(s);
      document.addEventListener("vf-themechange", () => {
        const frame = document.querySelector("iframe.giscus-frame");
        if (frame) frame.contentWindow.postMessage({ giscus: { setConfig: { theme: document.documentElement.dataset.theme === "light" ? "light" : "transparent_dark" } } }, "https://giscus.app");
      });
    }
  }
})();

/* ════════ Module labs: TRIZ navigator & idea sprint (m5) · should-cost calculator (m9) · teardown walkthrough (m10) ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── m5 · TRIZ contradiction navigator ── */
  (function () {
    const imp = $("#trizImp"), wor = $("#trizWor"), out = $("#trizOut");
    if (!imp) return;
    const PARAMS = ["Weight", "Strength / stiffness", "Speed / cycle time", "Reliability", "Cost to make", "Ease of assembly"];
    // curated pairs from the classic contradiction matrix, with a concrete idea each
    const M = {
      "Strength / stiffness|Weight": [[1, "Segmentation", "ribbed or hollow sections — an I-beam is TRIZ before TRIZ"], [40, "Composite materials", "glass-filled polymer instead of solid metal"], [15, "Dynamics", "stiff only where and when the load is — variable wall thickness"]],
      "Weight|Strength / stiffness": [[1, "Segmentation", "honeycomb or lattice core carries the load at a fraction of the mass"], [35, "Parameter change", "switch material state or grade — HSLA steel, thinner gauge"], [8, "Anti-weight", "let another part or structure carry part of the load"]],
      "Speed / cycle time|Reliability": [[10, "Preliminary action", "pre-position, pre-heat or pre-assemble before the fast step"], [11, "Cushion in advance", "add a self-check or backup so speed can't cause a failure"], [28, "Replace mechanical system", "sensor + servo instead of a rushed mechanical linkage"]],
      "Reliability|Cost to make": [[6, "Universality", "one part doing two jobs fails in fewer interfaces"], [25, "Self-service", "the part maintains itself — self-locking, self-cleaning"], [2, "Taking out", "remove the fragile function from the harsh zone entirely"]],
      "Cost to make|Reliability": [[27, "Cheap short-lived object", "a replaceable £0.10 wear insert instead of a £5 hardened part"], [1, "Segmentation", "isolate the wear zone into a small replaceable element"], [35, "Parameter change", "cheaper grade plus a local coating where it matters"]],
      "Cost to make|Strength / stiffness": [[1, "Segmentation", "stamped and folded sheet replaces a machined billet"], [40, "Composite materials", "over-mould a cheap core with a strong skin"], [10, "Preliminary action", "work-harden or form features in the same press stroke"]],
      "Ease of assembly|Reliability": [[13, "The other way round", "assemble from the other direction — gravity holds it"], [26, "Copying", "one snap-fit geometry copied everywhere: nothing to mix up"], [3, "Local quality", "add a lead-in chamfer — the part aligns itself"]],
      "Ease of assembly|Cost to make": [[6, "Universality", "one fastener family for the whole product"], [1, "Segmentation", "modules assembled offline, mated in one motion"], [2, "Taking out", "eliminate the fastener — snap-fit is the ideal final result"]],
      "Weight|Cost to make": [[35, "Parameter change", "thinner high-strength grade — less material at slightly higher £/kg"], [2, "Taking out", "delete the part: can a neighbour perform its function?"], [31, "Porous materials", "foamed core where solid adds only weight"]],
      "Speed / cycle time|Cost to make": [[10, "Preliminary action", "combine operations into one tool stroke"], [5, "Merging", "process parts in parallel, not sequence"], [28, "Replace mechanical system", "cure with UV instead of a 20-minute oven"]],
      "Strength / stiffness|Cost to make": [[3, "Local quality", "harden or thicken only the loaded zone"], [17, "Another dimension", "a bend or flange adds stiffness for free"], [40, "Composite materials", "selective reinforcement only along the load path"]],
      "Reliability|Weight": [[11, "Cushion in advance", "small redundant element instead of oversizing everything"], [3, "Local quality", "reinforce the failure point only"], [24, "Intermediary", "sacrificial element takes the abuse"]],
    };
    const FALLBACK = [[1, "Segmentation", "divide the part or process and treat each piece separately"], [2, "Taking out", "remove the troublesome property or part from the zone"], [10, "Preliminary action", "do part of the job before it's needed"], [35, "Parameter change", "change a material property, state or concentration"]];
    PARAMS.forEach((p) => { imp.add(new Option(p, p)); wor.add(new Option(p, p)); });
    imp.value = "Strength / stiffness"; wor.value = "Weight";
    function show() {
      if (imp.value === wor.value) {
        out.innerHTML = '<p class="triz-same">Improving and worsening the <em>same</em> parameter isn\'t a contradiction — pick two different ones.</p>';
        out.hidden = false; return;
      }
      const rec = M[imp.value + "|" + wor.value] || FALLBACK;
      const generic = !M[imp.value + "|" + wor.value];
      out.innerHTML = (generic ? '<p class="triz-note">No curated cell for this exact pair — these four universal principles resolve most contradictions:</p>' : "") +
        rec.map((r) => `<div class="triz-p"><span class="triz-n">${r[0]}</span><div><b>${r[1]}</b><p>${r[2]}</p></div></div>`).join("");
      out.hidden = false;
    }
    imp.addEventListener("change", show);
    wor.addEventListener("change", show);
    show();
  })();

  /* ── m5 · three-minute idea sprint ── */
  (function () {
    const go = $("#sprintGo"), clock = $("#sprintClock"), count = $("#sprintCount"),
      pad = $("#sprintPad"), verdict = $("#sprintVerdict"), fnSel = $("#sprintFn");
    if (!go) return;
    ["Transmit torque", "Contain fluid", "Conduct current", "Protect contents", "Position panel", "Dissipate heat"]
      .forEach((f) => fnSel.add(new Option(f, f)));
    let t = null, left = 180;
    const ideas = () => pad.value.split("\n").map((l) => l.trim()).filter((l) => l.length > 2).length;
    const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    function tick() {
      left--; clock.textContent = fmt(left);
      if (left <= 30) clock.classList.add("is-low");
      if (left <= 0) stop();
    }
    function stop() {
      clearInterval(t); t = null;
      pad.disabled = true;
      go.textContent = "▶ Start 3:00";
      const n = ideas();
      verdict.hidden = false;
      verdict.innerHTML = n >= 9
        ? `<b>${n} ideas — workshop pace. 🎉</b> That's the 6-3-5 rhythm: three ideas every five minutes, sustained. Now imagine six people doing this simultaneously.`
        : n >= 5
          ? `<b>${n} ideas — solid.</b> The last few before the buzzer are usually the interesting ones; run it again on the same function and you'll pass nine.`
          : `<b>${n} ideas.</b> Normal for a first sprint — the censor in your head is still on. Rules: no judging, no deleting, write the silly ones too.`;
    }
    go.addEventListener("click", () => {
      if (t) { stop(); return; }
      left = 180; clock.textContent = fmt(left); clock.classList.remove("is-low");
      verdict.hidden = true; pad.disabled = false; pad.value = ""; pad.focus();
      count.textContent = "0 ideas";
      go.textContent = "■ Stop early";
      t = setInterval(tick, 1000);
    });
    pad.addEventListener("input", () => { count.textContent = ideas() + (ideas() === 1 ? " idea" : " ideas"); });
  })();

  /* ── m9 · live should-cost calculator ── */
  (function () {
    const rows = $("#scRows");
    if (!rows) return;
    const F = ["scMass", "scYield", "scMat", "scCycle", "scRate", "scOps", "scWage", "scScrap", "scOh", "scSga", "scMargin", "scQuote", "scVol"]
      .reduce((o, id) => (o[id] = $("#" + id), o), {});
    const eur = (v) => "£" + v.toFixed(2);
    const COLORS = ["#5aa2ff", "#7ec4ff", "#34d399", "#fbbf24", "#f59e0b", "#a78bfa", "#f472b6"];
    function calc() {
      const v = (id) => Math.max(0, parseFloat(F[id].value) || 0);
      const yieldPc = Math.min(100, Math.max(1, v("scYield")));
      const mat = (v("scMass") / (yieldPc / 100)) * v("scMat");
      const proc = (v("scCycle") / 3600) * v("scRate");
      const lab = (v("scCycle") / 3600) * v("scOps") * v("scWage");
      const scrap = (mat + proc + lab) * v("scScrap") / 100;
      const oh = (mat + proc + lab + scrap) * v("scOh") / 100;
      const sub = mat + proc + lab + scrap + oh;
      const sga = sub * v("scSga") / 100;
      const margin = (sub + sga) * v("scMargin") / 100;
      const total = sub + sga + margin;
      const layers = [["Raw material", mat], ["Process & machine", proc], ["Direct labour", lab], ["Scrap & yield", scrap], ["Overhead", oh], ["SG&A", sga], ["Fair margin", margin]];
      rows.innerHTML = layers.map((l, i) =>
        `<tr><td><i class="sc-dot" style="background:${COLORS[i]}"></i>${l[0]}</td><td>${eur(l[1])}</td></tr>`).join("");
      $("#scTotal").textContent = eur(total);
      $("#scBar").innerHTML = total > 0 ? layers.map((l, i) =>
        `<i style="width:${(l[1] / total * 100).toFixed(1)}%;background:${COLORS[i]}" title="${l[0]} ${eur(l[1])}"></i>`).join("") : "";
      const q = v("scQuote"), vol = v("scVol"), gap = q - total, gapEl = $("#scGap");
      if (q <= 0) { gapEl.innerHTML = ""; return; }
      if (gap > 0.005) {
        const pc = (gap / total * 100).toFixed(0);
        gapEl.className = "sc-gap sc-gap-over";
        gapEl.innerHTML = `Quote ${eur(q)} vs should-cost <b>${eur(total)}</b> → gap <b>${eur(gap)}</b> per part (${pc}% above should).` +
          (vol > 0 ? ` At ${vol.toLocaleString("en-GB")} pcs/year that's <b>£${Math.round(gap * vol).toLocaleString("en-GB")}</b> on the table.` : "");
      } else {
        gapEl.className = "sc-gap sc-gap-ok";
        gapEl.innerHTML = `Quote ${eur(q)} is at or below the should-cost of <b>${eur(total)}</b> — either your buyer is excellent or an assumption is off. Check the machine-rate utilisation first.`;
      }
    }
    Object.values(F).forEach((el) => el.addEventListener("input", calc));
    calc();
  })();

  /* ── m10 · teardown walkthrough stepper ── */
  (function () {
    const stage = $("#tdStage");
    if (!stage) return;
    const cap = $("#tdCaption"), dots = $("#tdDots"), next = $("#tdNext"), prev = $("#tdPrev");
    const STEPS = [
      { t: "Two mice on the bench — the competitor's next to yours. Nothing has been touched yet; the first move is a camera, not a screwdriver.",
        cards: [["🖱️", "Theirs", "£24 retail"], ["🖱️", "Ours", "£29 retail"]] },
      { t: "Step 1 — Acquire & document. Photograph, weigh and measure everything before the first screw turns. You only get one first teardown.",
        cards: [["📷", "48 photos", "every face, every label"], ["⚖️", "87 g vs 112 g", "theirs is 22% lighter"], ["📏", "Dimensions logged", "against a scale reference"]] },
      { t: "Step 2 — Systematic disassembly, level by level, with a stopwatch. Disassembly sequence in reverse is their assembly cost in disguise.",
        cards: [["⏱", "48 s to open", "ours takes 92 s"], ["🔩", "2 screws", "ours has 6 + 2 clip types"], ["🧩", "Snap-fit chassis", "one moulding holds everything"]] },
      { t: "Step 3 — Digital BOM capture. Every part logged: material, mass, process evidence, supplier marks, fastener count.",
        cards: [["📋", "9 parts vs 14", "five fewer things to buy, fit and fail"], ["🏷", "PCB supplier mark", "same board house as our B-supplier"], ["🔧", "Tool marks", "2-cavity mould, mid-volume strategy"]] },
      { t: "Step 4 — Should-cost each part at THEIR assumptions: their region, their volumes, their processes. Band every estimate; deltas are robust where absolutes are fragile.",
        cards: [["💶", "Their BOM ≈ £3.10", "±15% banded estimate"], ["💶", "Our BOM ≈ £4.60", "same method, same bands"], ["Δ", "Top shell −£0.60", "biggest single-part delta"]] },
      { t: "Step 5 — Harvest & transfer. Findings become creative-phase inputs with owners and dates — that's the difference between a teardown and teardown tourism.",
        cards: [["💡", "Snap-fit chassis", "adopt — delete 4 screws"], ["💡", "Single-screw service path", "adapt to our architecture"], ["🧱", "Cost walk: −£1.50", "design −0.9 · sourcing −0.4 · assembly −0.2"]] },
    ];
    let s = 0;
    dots.innerHTML = STEPS.map((_, i) => `<i data-d="${i}"></i>`).join("");
    function render() {
      const st = STEPS[s];
      stage.innerHTML = st.cards.map((c, i) =>
        `<div class="td-card td-in" style="animation-delay:${i * 0.12}s"><span class="td-ico">${c[0]}</span><b>${c[1]}</b><small>${c[2]}</small></div>`).join("");
      cap.textContent = st.t;
      $$("#tdDots i").forEach((d, i) => d.classList.toggle("is-on", i <= s));
      prev.disabled = s === 0;
      next.textContent = s === 0 ? "Begin the teardown →" : s === STEPS.length - 1 ? "↺ Replay" : "Next step →";
    }
    next.addEventListener("click", () => { s = s === STEPS.length - 1 ? 0 : s + 1; render(); });
    prev.addEventListener("click", () => { if (s > 0) { s--; render(); } });
    render();
  })();
})();


/* ════════ Module 5 & 6 rebuild interactives: SCAMPER · technique challenges · weighted-matrix sandbox ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── shared challenge builder (mirrors the Module-4 FNCHAL pattern) ── */
  function buildChallenge(mountSel, questions, closingMsg) {
    const mount = $(mountSel);
    if (!mount) return;
    let answered, score;
    const N = questions.length;
    function render() {
      answered = new Array(N).fill(false); score = 0;
      mount.innerHTML = questions.map(([q, opts], qi) => `
        <div class="fnc-item" data-qi="${qi}">
          <div class="fnc-q"><span class="fnc-n">${qi + 1}</span>${q}</div>
          <div class="fnc-opts">${opts.map((o, oi) => `<button type="button" class="fnc-opt" data-oi="${oi}">${o}</button>`).join("")}</div>
          <div class="fnc-expl" role="status" aria-live="polite"></div>
        </div>`).join("") +
        `<div class="fnc-score" role="status" aria-live="polite"></div>
         <div class="fnc-actions"><button type="button" class="btn btn-ghost fncReset" hidden>↻ Try the challenge again</button></div>`;
      $(".fncReset", mount).addEventListener("click", render);
    }
    mount.addEventListener("click", (e) => {
      const btn = e.target.closest(".fnc-opt");
      if (!btn) return;
      const item = btn.closest(".fnc-item");
      const qi = +item.dataset.qi;
      if (answered[qi]) return;
      answered[qi] = true;
      const [, , correct, expl] = questions[qi];
      const right = +btn.dataset.oi === correct;
      if (right) score++;
      $$(".fnc-opt", item).forEach((o, oi) => {
        o.disabled = true;
        if (oi === correct) o.classList.add("is-right");
        else if (o === btn) o.classList.add("is-wrong");
      });
      const ex = $(".fnc-expl", item);
      ex.textContent = (right ? "✓ Correct. " : "✗ Not quite. ") + expl;
      ex.className = "fnc-expl show " + (right ? "ok" : "no");
      if (answered.every(Boolean)) {
        const s = $(".fnc-score", mount);
        const msg = score === N ? "Perfect — you've got the judgement, not just the vocabulary!" : score >= N - 2 ? "Strong — review the ones you missed and you're there." : closingMsg;
        s.innerHTML = `You scored <b>${score} / ${N}</b>. ${msg}`;
        s.classList.add("show");
        $(".fncReset", mount).hidden = false;
      }
    });
    render();
  }

  /* ── 1 · SCAMPER explorer (Module 5) ── */
  (function () {
    const row = $("#scamperRow"), panel = $("#scamperPanel");
    if (!row) return;
    const SC = [
      ["S", "Substitute", "What could you swap out — the material, a part, the energy source, the process?",
       "Swap the machined aluminium body for a glass-filled nylon moulding: two-thirds lighter, a third of the cost, and colour moulded in so no anodising step."],
      ["C", "Combine", "What if two parts, features or steps became one?",
       "Combine the reflector and the lens into a single moulded optic — one part instead of two, and no alignment step on the line."],
      ["A", "Adapt", "Who else has solved this? What can you borrow from another product or industry?",
       "Adapt the bayonet mount from a camera lens so the head twists on in a quarter-turn — no threads to cross-thread, faster assembly."],
      ["M", "Modify / Magnify", "What if you made a feature bigger, smaller, or changed its shape?",
       "Magnify the knurling into a full-length grip pattern that doubles as the heat sink — better hold and better cooling from one feature."],
      ["P", "Put to other use", "Could the part do a second job, or serve a different user?",
       "Put the tail-cap to other use as a magnetic base, so the torch sticks to a car bonnet hands-free — new function, near-zero cost."],
      ["E", "Eliminate", "What if this part simply didn't exist? Which neighbour could do its job?",
       "Eliminate the separate on/off switch: a twist of the head completes the circuit. One fewer part, one fewer seal, one fewer thing to fail. (The strongest SCAMPER move in VE.)"],
      ["R", "Reverse", "What if you flipped the order, turned it inside out, or ran it backwards?",
       "Reverse the battery loading — load from the front behind the head instead of the tail — so the tail becomes a solid sealed grip and waterproofing gets easier."],
    ];
    row.innerHTML = SC.map(([l, name], i) =>
      `<button type="button" class="scamper-key${i === 0 ? " is-on" : ""}" data-i="${i}"><b>${l}</b><span>${name}</span></button>`).join("");
    function show(i) {
      const [l, name, q, ex] = SC[i];
      $$(".scamper-key", row).forEach((k) => k.classList.toggle("is-on", +k.dataset.i === i));
      panel.innerHTML = `<div class="sc-letter">${l}</div><div class="sc-body"><h5>${name}</h5><p class="sc-q">${q}</p><p class="sc-ex"><b>On the torch →</b> ${ex}</p></div>`;
    }
    row.addEventListener("click", (e) => { const k = e.target.closest(".scamper-key"); if (k) show(+k.dataset.i); });
    show(0);
  })();

  /* ── 2 · Module 5 technique challenge ── */
  buildChallenge("#m5ChalMount", [
    ["Your team keeps proposing small tweaks to the current bracket instead of fresh concepts. What's the fix?",
     ["Write the function on the board and ideate on that, not the part", "Invite more senior engineers", "Give everyone longer to think", "Use a bigger whiteboard"], 0,
     "The existing part anchors everyone. Naming the function — 'support load' — and hiding the current design reopens the whole solution space."],
    ["Two people dominate every brainstorm and the quiet experts never get a word in. Best technique?",
     ["Classic brainstorming, but firmer", "Brainwriting 6-3-5", "Cancel the session", "Let the manager decide"], 1,
     "6-3-5 is silent and written: everyone contributes exactly three ideas per round, so the loudest voice and the quietest expert get equal airtime."],
    ["You're stuck on 'make it stiffer, but it keeps getting heavier'. Which tool is built for exactly this?",
     ["SCAMPER", "Analogy", "TRIZ contradiction matrix", "A show of hands"], 2,
     "'Improve A, worsen B' is a textbook technical contradiction — TRIZ's matrix returns the inventive principles that historically resolved it."],
    ["The flow has dried up and the room is tired, but you still need twenty more ideas. What keeps the pump running?",
     ["End the session early", "Run SCAMPER letter by letter", "Repeat the same question louder", "Break for two hours"], 1,
     "SCAMPER is a mechanical checklist — Substitute, Combine, Adapt… — that keeps producing even when spontaneous flow has stopped."],
    ["A torch has three sub-functions with several options each, and you suspect the winning combination has never been built. Which technique?",
     ["Morphological analysis", "Classic brainstorming", "Pugh matrix", "Pick the cheapest option"], 0,
     "Morphological analysis lists every option per sub-function and combines them systematically — ideal for surfacing untried combinations."],
    ["Someone says 'make the bracket out of cardboard' and the room laughs. What should the facilitator do?",
     ["Write it down without judging it", "Explain why it can't work", "Ask them to be serious", "Move on quickly"], 0,
     "Defer all judgement. Wild ideas stretch the space — 'cardboard bracket' provokes 'how much load does this really see?', which finds the real weight saving."],
    ["You want to deliver 'contain fluid' at a tenth of today's cost. Where do you look first?",
     ["The internal cost database", "Another industry or nature (analogy & biomimicry)", "The current supplier's quote", "Last year's report"], 1,
     "Analogy and biomimicry steal solutions from other worlds — a drinks carton contains fluid for pennies; nature is full of cheap containment."],
    ["The boss shares their favourite idea first and the room's thinking narrows around it. What went wrong?",
     ["Nothing — leaders should lead", "Anchoring — the senior voice should speak last", "Not enough ideas were on the board", "The boss happened to be right"], 1,
     "Whatever the senior person says first becomes the anchor everyone rearranges around. In ideation, the most senior person speaks last."],
  ], "Good practice — re-read section 5.2 on Osborn's rules and 5.11 on sequencing the tools, then try again.");

  /* ── 3 · Module 6 weighted-matrix sandbox ── */
  (function () {
    const wrap = $("#wmWeights"), table = $("#wmTable"), note = $("#wmNote");
    if (!wrap) return;
    const CRIT = [
      { key: "sav", label: "Net savings", w: 40 },
      { key: "risk", label: "Low technical risk", w: 30 },
      { key: "speed", label: "Fast to implement", w: 20 },
      { key: "inv", label: "Low investment", w: 10 },
    ];
    const CONCEPTS = [
      { name: "Spline shaft", s: [8, 7, 9, 8] },
      { name: "Integrated forging", s: [9, 4, 3, 4] },
      { name: "Plastic overmould", s: [9, 5, 6, 5] },
      { name: "Polygon shaft", s: [7, 8, 8, 7] },
    ];
    const DEFAULT_WINNER = "Spline shaft";
    wrap.innerHTML = CRIT.map((c, i) =>
      `<label class="wm-w"><span>${c.label}</span>
        <input type="range" min="0" max="100" step="5" value="${c.w}" data-i="${i}" />
        <b class="wm-pct" data-i="${i}">${c.w}%</b></label>`).join("");
    function calc() {
      const raw = CRIT.map((_, i) => +$(`input[data-i="${i}"]`, wrap).value);
      const sum = raw.reduce((a, b) => a + b, 0) || 1;
      CRIT.forEach((_, i) => { $(`.wm-pct[data-i="${i}"]`, wrap).textContent = Math.round(raw[i] / sum * 100) + "%"; });
      const scored = CONCEPTS.map((c) => ({
        name: c.name, s: c.s,
        total: c.s.reduce((acc, v, i) => acc + v * raw[i], 0) / sum,
      })).sort((a, b) => b.total - a.total);
      const best = scored[0].total;
      table.innerHTML =
        `<thead><tr><th>Concept</th>${CRIT.map((c) => `<th>${c.label.replace("Low ", "").replace("Fast to i", "I").replace("Net s", "S")}</th>`).join("")}<th>Score</th></tr></thead>` +
        "<tbody>" + scored.map((c, r) =>
          `<tr class="${r === 0 ? "wm-win" : ""}"><td>${c.name}${r === 0 ? " 🏆" : ""}</td>${c.s.map((v) => `<td>${v}</td>`).join("")}<td><b>${c.total.toFixed(2)}</b></td></tr>`).join("") +
        "</tbody>";
      if (scored[0].name !== DEFAULT_WINNER) {
        note.className = "wm-note wm-flip";
        note.innerHTML = `⚠ Winner flipped to <b>${scored[0].name}</b> (was ${DEFAULT_WINNER} at the default weights). A ranking that changes when you nudge a weight means the decision depends on your appetite — <b>report that sensitivity to the sponsor, don't hide it.</b>`;
      } else {
        note.className = "wm-note";
        note.innerHTML = `At these weights the winner is <b>${scored[0].name}</b> (${best.toFixed(2)}). Drag <em>Net savings</em> up and <em>Low technical risk</em> down and watch a riskier, higher-saving concept overtake it.`;
      }
    }
    wrap.addEventListener("input", calc);
    calc();
  })();

  /* ── 4 · Module 6 evaluation challenge ── */
  buildChallenge("#m6ChalMount", [
    ["You have 380 raw ideas from the creative day. What's the very first move?",
     ["Deep-analyse every single one", "Fast triage into go / grow / park", "Let the chief engineer pick favourites", "Build the top three immediately"], 1,
     "Never deep-study 380 ideas — you'll stall by idea 60. Triage is a shallow, fast first pass: go / grow / park."],
    ["An idea saves £3 per unit but breaks a homologation rule. Where does it belong in the matrix?",
     ["Give it a low risk score", "Knock it out — it fails a non-negotiable screen", "Average it with the rest", "Hand it to a champion"], 1,
     "Safety and regulatory compliance are knockout screens, not scored criteria. No saving can trade against them — it's out."],
    ["Your weighted matrix uses BOTH 'annual savings' and 'payback period' as criteria. What's the problem?",
     ["Nothing — more criteria is better", "Double counting — both measure money", "Too few criteria overall", "Weights don't matter anyway"], 1,
     "Both criteria measure money, so money is counted twice and dominates unfairly. Pick one and pair it with investment."],
    ["Early concepts are too foggy to score honestly on a 1–9 scale. Which tool fits?",
     ["A weighted matrix with guessed numbers", "A Pugh matrix (+ / S / − versus a datum)", "The effort–impact grid", "A coin flip"], 1,
     "When precise scores would be false precision, Pugh compares each concept against a datum with just better / same / worse — honest and fast."],
    ["A tiny change to one criterion's weight flips your top-ranked concept. What should you do?",
     ["Hide it and keep the original winner", "Report the sensitivity to the sponsor", "Delete the criterion", "Stop using weights"], 1,
     "A winner that flips on a small weight change means the choice depends on appetite — that's precisely the conversation the sponsor must have, not something to bury."],
    ["When should the evaluation criteria be fixed?",
     ["After seeing the idea list", "Before anyone sees the ideas", "During the final vote", "It makes no difference"], 1,
     "Criteria chosen after the ideas appear get bent toward someone's favourite. Agree them with the sponsor before the list is revealed."],
    ["You want to separate quick wins from money pits in about ten minutes. Which tool?",
     ["A full FMEA", "The effort–impact 2×2 grid", "A weighted matrix", "A Pugh matrix"], 1,
     "The effort–impact grid is the crude, fast first ranking: high impact + low effort = quick wins; low impact + high effort = money pits to park."],
    ["Evaluation is done and the ideas are ranked. What must every survivor leave with?",
     ["A patent application", "A named champion and a gate date", "A press release", "A budget code"], 1,
     "Ideas handed to 'the team' reappear untouched next year. Every survivor needs one named champion to carry it into development, plus a date."],
  ], "Good practice — re-read sections 6.2–6.7 on the funnel and the ranking tools, then try again.");
})();
