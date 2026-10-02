/* VAVE for Leaders — the six interactive tools (one per module 1–6). */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const num = (el) => Math.max(0, parseFloat(el.value) || 0);
  function money(v, cur) {
    const loc = cur === "₹" ? "en-IN" : "en-GB";
    if (cur === "₹" && v >= 1e7) return "₹" + (v / 1e7).toLocaleString(loc, { maximumFractionDigits: 2 }) + " crore";
    if (cur === "₹" && v >= 1e5) return "₹" + (v / 1e5).toLocaleString(loc, { maximumFractionDigits: 2 }) + " lakh";
    if (v >= 1e6) return cur + (v / 1e6).toLocaleString(loc, { maximumFractionDigits: 2 }) + " million";
    return cur + Math.round(v).toLocaleString(loc);
  }
  const card = (big, small) => `<div class="bc-card"><b>${big}</b><span>${small}</span></div>`;

  /* ── Module 1 · profit-equivalent calculator ── */
  (function () {
    const cards = $("#peCards");
    if (!cards) return;
    const F = { cur: $("#peCur"), save: $("#peSave"), vol: $("#peVol"), margin: $("#peMargin"), rev: $("#peRev") };
    function calc() {
      const cur = F.cur.value, annual = num(F.save) * num(F.vol), m = num(F.margin) / 100;
      const sales = m > 0 ? annual / m : 0;
      const rev = num(F.rev), pts = rev > 0 ? (annual / rev) * 100 : 0;
      cards.innerHTML = card(money(annual, cur), "extra profit a year from the saving") +
        card(m > 0 ? money(sales, cur) : "—", "extra sales needed to earn the same profit") +
        (rev > 0 ? card("+" + pts.toLocaleString("en-GB", { maximumFractionDigits: 2 }) + " pts", "on your profit margin") : "");
      $("#peVerdict").textContent = annual > 0 && m > 0
        ? `At a ${F.margin.value}% margin, every ${cur}1 saved is worth ${cur}${(1 / m).toLocaleString("en-GB", { maximumFractionDigits: 1 })} of new sales. This saving does the work of ${money(sales, cur)} in extra sales.` +
          (rev > 0 ? ` That's ${pts.toLocaleString("en-GB", { maximumFractionDigits: 2 })} percentage points on your profit margin.` : "")
        : "Enter a saving, a volume and a margin above zero.";
    }
    Object.values(F).forEach((el) => el.addEventListener("input", calc));
    calc();
  })();

  /* ── Module 2 · pick the value move ── */
  (function () {
    const mount = $("#vmChalMount");
    if (!mount) return;
    const S = "Same function, lower cost", MF = "More function, same cost", ML = "More function, lower cost",
      G = "Function grows faster than cost", R = "Remove functions customers don't value", X = "Not VAVE: it cuts something customers value";
    const QS = [
      ["The same bracket in a lighter steel passes every test and costs 12% less.", [S, MF, R, X], 0, "It does exactly the same job for less money."],
      ["Two parts are combined into one that's stronger and cheaper.", [S, G, ML, X], 2, "Stronger is more function, and it costs less too: the ideal result."],
      ["Only 2% of customers use a built-in timer that costs £1.10 per unit.", [S, R, MF, X], 1, "The data shows almost nobody uses it, so dropping it saves £1.10 with very little loss."],
      ["A better finish costs £4 more, and customers pay £15 more for it.", [MF, S, X, G], 3, "Cost goes up a little, but what customers get (and pay for) goes up much more."],
      ["A thinner wall saves 5% but fails the drop test.", [X, S, R, ML], 0, "Durability is something customers value. Cutting it isn't VAVE, whatever the saving."],
    ];
    let answered, score;
    function render() {
      answered = new Array(QS.length).fill(false); score = 0;
      // options appear in a new order on every attempt, so the right answer isn't always in the same place
      const order = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      mount.innerHTML = QS.map(([q, opts], qi) => `
        <div class="fnc-item" data-qi="${qi}">
          <div class="fnc-q"><span class="fnc-n">${qi + 1}</span>${q}</div>
          <div class="fnc-opts">${order(opts.length).map((oi) => `<button type="button" class="fnc-opt" data-oi="${oi}">${opts[oi]}</button>`).join("")}</div>
          <div class="fnc-expl" role="status" aria-live="polite"></div>
        </div>`).join("") +
        `<div class="fnc-score" role="status" aria-live="polite"></div>
         <div class="fnc-actions"><button type="button" class="btn btn-ghost fncReset" hidden>↻ Try again</button></div>`;
      $(".fncReset", mount).addEventListener("click", render);
    }
    mount.addEventListener("click", (e) => {
      const btn = e.target.closest(".fnc-opt");
      if (!btn) return;
      const item = btn.closest(".fnc-item"), qi = +item.dataset.qi;
      if (answered[qi]) return;
      answered[qi] = true;
      const [, , correct, expl] = QS[qi], right = +btn.dataset.oi === correct;
      if (right) score++;
      $$(".fnc-opt", item).forEach((o) => { o.disabled = true; if (+o.dataset.oi === correct) o.classList.add("is-right"); else if (o === btn) o.classList.add("is-wrong"); });
      const ex = $(".fnc-expl", item);
      ex.textContent = (right ? "✓ Correct. " : "✗ Not quite. ") + expl;
      ex.className = "fnc-expl show " + (right ? "ok" : "no");
      if (answered.every(Boolean)) {
        const s = $(".fnc-score", mount);
        s.innerHTML = `You scored <b>${score} / ${QS.length}</b>. ${score === QS.length ? "Spot on: you can tell value from cost cutting." : "Look again at the ones you missed, especially the last one."}`;
        s.classList.add("show");
        $(".fncReset", mount).hidden = false;
      }
    });
    render();
  })();

  /* ── Module 3 · the job plan, step by step ── */
  (function () {
    const stage = $("#jpStage");
    if (!stage) return;
    const STEPS = [
      ["1 · Information", "Day 1", "The facilitator, with finance", "An agreed, dated starting cost; the few parts that make up most of the cost; what customers actually need",
        "Is the starting cost agreed with finance, and dated?", "The team goes through the costs, walks the production line and looks at the product before anyone suggests an idea.",
        "Spend analysis finds the same part bought at different prices, and AI reads thousands of warranty comments in minutes."],
      ["2 · Function analysis", "Days 1–2", "Design engineering, with the facilitator", "A list of functions, what each one costs, and the mismatches",
        "Which functions cost far more than they're worth?", "The team maps what each part does and what each function costs, then finds where the money is being wasted.",
        "Should-cost software estimates what each part should cost from its 3D model."],
      ["3 · Creative", "Day 3", "The whole team, suppliers included", "Hundreds of ideas for the costly functions",
        "Did we protect the day from criticism and interruptions?", "A full day of ideas. No criticism allowed: judging comes tomorrow.",
        "AI tools suggest extra ideas for each function; the team decides which are worth pursuing."],
      ["4 · Evaluation", "Day 4", "The team, against agreed criteria", "A shortlist, with a named owner for every idea",
        "Who owns each idea, and by when?", "Ideas are sorted, screened and scored. The survivors each get an owner.",
        "Cost models test ideas quickly, so fewer are rejected on guesswork."],
      ["5 · Development", "Day 5", "Idea owners, with finance", "Business cases: saving, one-time cost, risk and date",
        "Has finance checked the savings?", "The best ideas become business cases a board can decide on.",
        "Simulation checks strength and fit before anything is made, and AI drafts the business case for people to check."],
      ["6 · Presentation", "Day 5", "The sponsor and decision board", "A signed decision log",
        "Did every idea get a yes, a no, or 'more data by a date'?", "The week ends with decisions, not applause.",
        "A live dashboard tracks every idea's stage, owner and date. The decisions stay with people."],
    ];
    const bar = $("#jpSteps");
    bar.innerHTML = STEPS.map((s, i) => `<button type="button" class="jp-step" data-s="${i}" aria-pressed="false"><b>${s[0]}</b><small>${s[1]}</small></button>`).join("");
    function pick(i) {
      const [, when, who, makes, ask, what, ai] = STEPS[i];
      $$(".jp-step", bar).forEach((b, k) => { b.classList.toggle("is-on", k === i); b.setAttribute("aria-pressed", String(k === i)); });
      stage.innerHTML = [["🕐", "When and who", when + " · " + who], ["📄", "What it produces", makes], ["❓", "Ask as a leader", ask], ["🤖", "Where AI helps", ai]]
        .map((c, k) => `<div class="td-card td-in" style="animation-delay:${k * 0.08}s"><span class="td-ico">${c[0]}</span><b>${c[1]}</b><small>${c[2]}</small></div>`).join("");
      $("#jpCaption").textContent = what;
    }
    bar.addEventListener("click", (e) => { const b = e.target.closest(".jp-step"); if (b) pick(+b.dataset.s); });
    pick(0);
  })();

  /* ── Module 4 · business case in 60 seconds ── */
  (function () {
    const cards = $("#bqCards");
    if (!cards) return;
    const F = { cur: $("#bqCur"), save: $("#bqSave"), vol: $("#bqVol"), one: $("#bqOne"), delay: $("#bqDelay") };
    function calc() {
      const cur = F.cur ? F.cur.value : "£", annual = num(F.save) * num(F.vol), one = num(F.one), delay = num(F.delay);
      const payback = annual > 0 ? (one / annual) * 12 : Infinity;
      cards.innerHTML = card(money(annual, cur), "yearly saving, once it's in production") +
        card(isFinite(payback) ? payback.toFixed(1) + " months" : "—", "payback on the one-time cost") +
        card(money(annual * delay / 12, cur), `what the ${delay}-month wait costs`);
      const v = $("#bqVerdict");
      if (annual <= 0) { v.className = "bc-verdict bc-no"; v.textContent = "No saving, no case. Start with a saving per unit and a volume."; }
      else if (payback <= 12) { v.className = "bc-verdict bc-go"; v.innerHTML = `<b>Likely yes.</b> Payback in ${payback.toFixed(1)} months is within the usual 12-month limit. Savings start in ${delay} month${delay === 1 ? "" : "s"}, when the change is in production, so set a date and hold people to it.`; }
      else if (payback <= 24) { v.className = "bc-verdict bc-mid"; v.innerHTML = `<b>Borderline.</b> ${payback.toFixed(1)} months is over the usual 12-month limit. Ask whether the one-time cost can come down, or whether it can join a planned design update.`; }
      else { v.className = "bc-verdict bc-no"; v.innerHTML = `<b>Likely no, for now.</b> ${payback.toFixed(1)} months is too long for a change to a product already in production. Keep it for the next new design, when tooling is being bought anyway.`; }
    }
    Object.values(F).forEach((el) => el.addEventListener("input", calc));
    calc();
  })();

  /* ── Module 5 · leadership readiness check ── */
  (function () {
    const mount = $("#rdMount");
    if (!mount) return;
    const QS = [
      ["Is there a named senior sponsor for VAVE?", "Name a sponsor who can make decisions, ideally the finance or operations director."],
      ["Are cost targets set by working back from market price and margin?", "Set cost targets from the market price and the margin you need."],
      ["Are people freed up for a full workshop week?", "Protect the team's time for the whole workshop."],
      ["Is engineering time funded to make approved changes?", "Fund the engineering time needed to put ideas into production."],
      ["Are decisions made at the meeting and written down?", "Require a signed decision log at every decision meeting."],
      ["Is there a monthly savings review, with an owner and a date for every idea?", "Start a monthly funnel review: every idea has an owner, a stage and a date."],
      ["Are savings only counted once they're in production and checked by finance?", "Count savings only at L4, checked by finance against a fixed starting cost."],
      ["Are people outside engineering trained to think in functions?", "Train design, purchasing, manufacturing, quality and finance together."],
    ];
    const ans = new Array(QS.length).fill(null);
    mount.innerHTML = `<div class="rd-list">${QS.map(([q], i) => `
      <fieldset class="rd-q"><legend>${i + 1}. ${q}</legend>
        <div class="rd-opts">${[["2", "Yes"], ["1", "Partly"], ["0", "No"]].map(([v, t]) =>
          `<label><input type="radio" name="rd${i}" value="${v}" /><span>${t}</span></label>`).join("")}</div>
      </fieldset>`).join("")}</div>
      <div class="bc-verdict" id="rdOut" role="status" aria-live="polite"></div>`;
    const out = $("#rdOut");
    function update() {
      const n = ans.filter((a) => a !== null).length;
      if (n < QS.length) { out.className = "bc-verdict"; out.textContent = `Answer all eight to see your score (${n} of 8 answered).`; return; }
      const score = ans.reduce((a, b) => a + b, 0);
      const [cls, band] = score >= 13 ? ["bc-go", "Ready to scale."] : score >= 8 ? ["bc-mid", "Good foundations, with gaps to close."] : ["bc-no", "Fix the basics before the first study."];
      const todo = QS.map((q, i) => [ans[i], q[1]]).filter(([a]) => a < 2).sort((a, b) => a[0] - b[0]).slice(0, 3).map(([, t]) => t);
      out.className = "bc-verdict " + cls;
      out.innerHTML = `<b>${score} / 16 · ${band}</b>` + (todo.length
        ? `<span class="rd-next">Your three most important next steps:</span><ol>${todo.map((t) => `<li>${t}</li>`).join("")}</ol>`
        : `<span class="rd-next">Everything's in place. Your next step is to widen the programme to more products.</span>`);
    }
    mount.addEventListener("change", (e) => { const m = /^rd(\d+)$/.exec(e.target.name || ""); if (m) { ans[+m[1]] = +e.target.value; update(); } });
    update();
  })();

  /* ── Module 6 · pilot picker ── */
  (function () {
    const mount = $("#ppMount");
    if (!mount) return;
    const CRIT = [
      ["spend", "Spend", "Yearly volume × unit cost is big enough to matter"],
      ["control", "Design control", "You're allowed to change the design"],
      ["life", "Life left", "1 = under a year, 3 = about two years, 5 = five years or more"],
      ["pain", "Pain", "Margin pressure or warranty problems"],
      ["data", "Data", "A costed parts list exists, or can be built in two weeks"],
    ];
    const P = [["Product A", [4, 4, 4, 3, 4]], ["Product B", [5, 1, 3, 5, 3]], ["Product C", [3, 5, 2, 2, 2]]];
    mount.innerHTML = `<div class="pp-grid">${P.map(([name, vals], p) => `
      <fieldset class="pp-col"><legend class="sr-only">Candidate ${p + 1}</legend>
        <label class="pp-name">Candidate ${p + 1}<input type="text" maxlength="40" value="${name}" data-p="${p}" /></label>
        ${CRIT.map(([k, label, hint], c) => `<label class="pp-row"><span>${label} <b id="ppv${p}${c}">${vals[c]}</b></span>
          <input type="range" min="1" max="5" step="1" value="${vals[c]}" data-p="${p}" data-c="${c}" aria-describedby="pph${c}" />
          ${p === 0 ? `<small id="pph${c}">${hint}</small>` : `<small aria-hidden="true">${hint}</small>`}</label>`).join("")}
      </fieldset>`).join("")}</div>
      <div class="bc-verdict" id="ppOut" role="status" aria-live="polite"></div>`;
    function update() {
      const rows = P.map((_, p) => {
        const v = CRIT.map((_, c) => +$(`input[data-p="${p}"][data-c="${c}"]`, mount).value);
        const name = ($(`.pp-name input[data-p="${p}"]`, mount).value || `Candidate ${p + 1}`).trim();
        const warn = [];
        if (v[1] <= 2) warn.push("little freedom to change the design");
        if (v[2] <= 2) warn.push("less than two years left to collect the savings");
        if (v[4] <= 2) warn.push("no costed parts list yet, so allow extra time");
        return { name, total: v.reduce((a, b) => a + b, 0), warn, breaker: v[1] <= 2 || v[2] <= 2 };
      }).sort((a, b) => (a.breaker - b.breaker) || (b.total - a.total));
      CRIT.forEach((_, c) => P.forEach((__, p) => { $(`#ppv${p}${c}`).textContent = $(`input[data-p="${p}"][data-c="${c}"]`, mount).value; }));
      const out = $("#ppOut");
      const best = rows[0];
      out.className = "bc-verdict " + (best.breaker ? "bc-no" : "bc-go");
      out.innerHTML = "";
      const head = document.createElement("b");
      head.textContent = best.breaker ? "None of these is a safe first pilot yet." : `Best first pilot: ${best.name}.`;
      const ol = document.createElement("ol");
      rows.forEach((r) => {
        const li = document.createElement("li");
        li.textContent = `${r.name}: ${r.total} / 25` + (r.warn.length ? ` · watch out: ${r.warn.join("; ")}` : " · no deal-breakers");
        ol.appendChild(li);
      });
      out.append(head, ol);
    }
    mount.addEventListener("input", update);
    update();
  })();
})();
