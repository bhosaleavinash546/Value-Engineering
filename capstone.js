/* ═══════════════════════════════════════════════════════════
   VAVEhub VE Academy — capstone: the K-17 kettle, all six phases.
   Each phase: the facts → your work → a gate checklist → a worked answer.
   Ends with a two-page value study built from the learner's own work.
   Saved in localStorage "vh-capstone"; signed-in learners also sync it to
   course_progress (course "capstone").
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const gbp = (v) => (v < -0.004 ? "−" : "") + "£" + Math.abs(v).toFixed(2);
  const gbp0 = (v) => (v < 0 ? "−" : "") + "£" + Math.round(Math.abs(v)).toLocaleString("en-GB");
  const num = (v) => { const x = parseFloat(String(v == null ? "" : v).replace(/[£,\s]/g, "")); return isNaN(x) ? null : x; };
  const track = (n) => { if (window.vhTrack) window.vhTrack(n); };
  let mount = $("#capMount");
  const stepsEl = $("#capSteps"), report = $("#capReport");
  if (!mount) return;

  /* ── the facts of the case ── */
  const BOM = [["Heating element", 2.1], ["Body (moulded, coloured)", 1.6], ["Assembly and packing", 1.4], ["Thermostat and switch", 1.3],
    ["Base and connector", 1.2], ["Chrome trim", 0.9], ["Lid and filter", 0.5]];
  const START = 9.0, ALLOW = 7.875, VOLUME = 250000;
  const FN = [["Heat water", 2.1, 2.0], ["Contain water", 1.7, 0.9], ["Control temperature", 1.3, 0.6], ["Conduct current", 1.2, 0.7], ["Convey esteem", 1.3, 0.3]];
  const BANNED = ["provide", "allow", "enable", "facilitate", "ensure", "help", "make"];
  const WORKED = {
    p1: { scope: "In scope: the K-17's body, lid, controls, base and trim, and how it's assembled and packed. Out of scope: the heating element (a safety-certified part on a contract renewed last year) and the mains cable.",
      start: "9.00", target: "7.88", why: "The allowable cost. It sells for £18 with VAT; after VAT and the retailer's 30% the business receives £10.50, and it needs a 25% margin, which leaves £7.875, shown as £7.88. That's a cut of about 12.5%.",
      top: ["Heating element", "Body (moulded, coloured)", "Assembly and packing"],
      req: "“Customers expect chrome.” The survey says 60% of buyers don't care either way, and reviews say it shows fingerprints. Keep the look, but question how we get it." },
    p2: { basic: "Heat water", fns: ["Contain water", "Control temperature", "Conduct current", "Convey esteem", "Indicate status", "Pour water"], targets: ["Control temperature", "Convey esteem"] },
    p3: { ideas: ["Convey esteem: moulded-in colour and an in-mould film instead of the chrome trim", "Convey esteem: metallic-effect plastic, as used on car interior trim",
      "Convey esteem: drop the trim, change the handle colour instead", "Control temperature: one combined thermostat and switch from a catalogue", "Control temperature: remove the separate boil-dry cut-out and rely on the thermostat alone",
      "Control temperature: borrow the switch-off sensor design from rice cookers", "Contain water: thinner body wall with ribs where it's needed", "Contain water: filter moulded into the lid",
      "Conduct current: standard 360° base connector from a catalogue", "Conduct current: shorter internal wiring by moving the switch", "Assemble: snap-fit base cover, three screws instead of seven",
      "Assemble: one-piece lid and hinge, which also fixes the hinge failures", "Pack: smaller carton, 12 per outer instead of 8", "Indicate status: light pipe from the existing LED instead of a second LED"].join("\n") },
    p4: [["Convey esteem: moulded-in colour and an in-mould film instead of the chrome trim", "0.62", 7, 8, 7], ["Control temperature: one combined thermostat and switch from a catalogue", "0.38", 6, 7, 6],
      ["Assemble: snap-fit base cover, three screws instead of seven", "0.15", 4, 8, 8], ["Contain water: filter moulded into the lid", "0.08", 3, 7, 7]],
    p5: { saving: "0.62", volume: "250000", tooling: "48000", test: "6000", hours: "80", rate: "65", months: "4", step: "3",
      risk: "The film could lift near the hot base. Rig test: 500 boil cycles and a scratch test before ordering the full tool; the trial tool is ordered alongside, with a stop point." },
    p6: [["Approve", "Sam Patel, design", "Mar 2027", "L3"], ["Approve with conditions", "Ana Ruiz, purchasing", "May 2027", "L2"], ["Approve with conditions", "Lee Chen, manufacturing", "Feb 2027", "L2"], ["Needs more data", "Sam Patel, design", "Jan 2027", "L1"]],
  };
  const PHASES = [
    { id: "p1", n: 1, title: "Information", mod: "m3", gate: ["The starting cost is £9.00, checked by finance, and it's fixed for the whole study",
      "The target comes from evidence (the allowable cost), not a round number", "The scope says what is out, as well as what is in", "The three biggest cost items are named", "At least one ‘requirement’ has been checked against evidence"] },
    { id: "p2", n: 2, title: "Function analysis", mod: "m4", gate: ["There is one basic function", "Every function is an active verb and a measurable noun", "Each function's cost is compared with its worth (Value Index)", "Targets were chosen by Value Index, not by size"] },
    { id: "p3", n: 3, title: "Creative", mod: "m5", gate: ["At least 12 ideas, none crossed out", "Every idea starts with the function it serves", "At least two ideas for each target function", "At least one idea is borrowed from another industry or product"] },
    { id: "p4", n: 4, title: "Evaluation", mod: "m6", gate: ["The criteria and weights were fixed before scoring", "Ideas that fail a must-pass check (safety, standards) were screened out first", "The ranking was checked by moving each weight 10 points", "Every idea taken forward has a named champion"] },
    { id: "p5", n: 5, title: "Development", mod: "m7", gate: ["Finance has checked the saving per unit", "All one-time costs are in: tooling, testing, engineering", "Testing goes only as far up the ladder as the risk needs", "There is a start date, and long-lead items start alongside the tests"] },
    { id: "p6", n: 6, title: "Presentation and implementation", short: "Presentation", mod: "m8", gate: ["Every idea has a decision, an owner and a date", "The cost walk reaches the target, or the gap left is explained", "Savings will be counted only at L4, checked against the £9.00 starting cost", "The next review date is in the diary"] },
  ];

  /* ── saved work ── */
  const KEY = "vh-capstone";
  const tidy = (c) => { c = c && typeof c === "object" && !Array.isArray(c) ? c : {}; if (!c.gates || typeof c.gates !== "object") c.gates = {}; c.phase = +c.phase || 1; return c; };
  const load = () => { try { return tidy(JSON.parse(localStorage.getItem(KEY))); } catch { return tidy({}); } };
  let cap = load();
  // the account copy is read before anything is uploaded, so opening the page on a new device can't wipe it
  const LIVE = !!(window.VHCloud && VHCloud.live);
  let cloudReady = !LIVE, cloudPending = false, saveTimer = null;
  const saveNote = (msg) => { const n = $("#capSave"); if (n) n.textContent = msg; };
  function upload(now) {
    if (!LIVE) return;
    if (!cloudReady) { cloudPending = true; return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!(await VHCloud.user())) return; // signed out: this browser only
      const ok = await VHCloud.saveCourse("capstone", cap);
      saveNote(ok ? "Your work is saved in this browser and to your account." : "Saved in this browser. Your account couldn't be reached just now; we'll try again with your next change.");
    }, now ? 0 : 1200);
  }
  function save(now) {
    cap.t = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(cap)); } catch {}
    upload(now);
  }
  function pullCloud(retry) {
    VHCloud.loadCourse("capstone").then((cloud) => {
      if (cloud === false) { if (retry) setTimeout(() => pullCloud(false), 15000); else saveNote("Saved in this browser. Your account copy couldn't be reached, so nothing has been uploaded."); return; }
      cloudReady = true;
      const pending = cloudPending; cloudPending = false;
      if (cloud && typeof cloud === "object" && (cloud.t || 0) > (cap.t || 0)) {
        cap = tidy(Object.assign({}, cloud)); try { localStorage.setItem(KEY, JSON.stringify(cap)); } catch {} show(cap.phase, true);
        saveNote("Your work is saved in this browser and to your account.");
      } else if (cap.t && (pending || !cloud || (cloud.t || 0) < cap.t)) upload(true); // this browser has newer work
      else if (cloud) saveNote("Your work is saved in this browser and to your account.");
    });
  }
  if (LIVE) pullCloud(true);
  const P = (id) => (cap[id] = cap[id] || {});
  const passed = (id) => { const g = cap.gates[id] || []; const ph = PHASES.find((x) => x.id === id); return ph.gate.every((_, i) => g[i]); };

  /* ── layout pieces ── */
  function steps() {
    stepsEl.innerHTML = PHASES.map((ph) => `<li><button type="button" data-go="${ph.n}" class="${cap.phase === ph.n ? "is-on" : ""}${passed(ph.id) ? " is-done" : ""}"${cap.phase === ph.n ? ' aria-current="step"' : ""}>
      <span>${passed(ph.id) ? "✓" : ph.n}</span>${ph.short || ph.title}</button></li>`).join("") +
      `<li><button type="button" data-go="7" class="${cap.phase === 7 ? "is-on" : ""}"${cap.phase === 7 ? ' aria-current="step"' : ""}><span>📄</span>Your study</button></li>`;
  }
  stepsEl.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) { show(+b.dataset.go); const h = cap.phase === 7 ? report : $("#capH", mount); if (h) h.focus({ preventScroll: true }); } });

  const field = (id, label, value, opts = {}) => opts.area
    ? `<label class="cap-f"><span>${label}</span><textarea id="${id}" rows="${opts.rows || 3}"${opts.ph ? ` placeholder="${esc(opts.ph)}"` : ""}>${esc(value || "")}</textarea></label>`
    : `<label class="cap-f${opts.small ? " is-small" : ""}"><span>${label}</span>${opts.pre ? `<em>${opts.pre}</em>` : ""}<input id="${id}" type="${opts.type || "text"}"${opts.type === "number" ? ' inputmode="decimal" step="any"' : ""} value="${esc(value || "")}"${opts.ph ? ` placeholder="${esc(opts.ph)}"` : ""} /></label>`;
  const sel = (id, label, options, value) => `<label class="cap-f is-small"><span>${label}</span><select id="${id}"><option value="">Choose…</option>${options.map((o) => `<option${o === value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`;

  function frame(ph, facts, work, worked) {
    const g = cap.gates[ph.id] || [];
    return `<article class="cap-phase" aria-labelledby="capH">
      <p class="cap-kicker">Phase ${ph.n} of 6</p><h2 id="capH" tabindex="-1">${ph.title}</h2>
      <div class="cap-grid">
        <section class="cap-facts" aria-label="The facts"><h3>The facts you have</h3>${facts}
          <p class="cap-link">Need a reminder? <a href="training.html?open=${ph.mod}">Module ${ph.mod.slice(1)}</a>.</p></section>
        <section class="cap-work" aria-label="Your work"><h3>Your work</h3>${work}<div class="cap-out" role="status" aria-live="polite"></div></section>
      </div>
      <section class="cap-gate" aria-labelledby="gateH"><h3 id="gateH">Phase gate: tick each one when it's true of your work</h3>
        ${ph.gate.map((t, i) => `<label><input type="checkbox" data-gate="${i}"${g[i] ? " checked" : ""} /> ${t}</label>`).join("")}
        <p class="cap-gate-msg" role="status" aria-live="polite"></p></section>
      <details class="cap-worked"><summary>Compare with a worked answer</summary><div>${worked}</div></details>
      <div class="cap-nav">${ph.n > 1 ? `<button type="button" class="btn btn-ghost" data-go="${ph.n - 1}">← Phase ${ph.n - 1}</button>` : "<span></span>"}
        <button type="button" class="btn btn-primary" data-go="${ph.n + 1}">${ph.n < 6 ? `Next: phase ${ph.n + 1} →` : "See your study →"}</button></div>
    </article>`;
  }
  function bindCommon(ph) {
    $$(".cap-nav [data-go]", mount).forEach((b) => b.addEventListener("click", () => {
      show(+b.dataset.go);
      window.scrollTo({ top: $(".cap-steps").offsetTop - 70, behavior: "smooth" });
      const h = cap.phase === 7 ? report : $("#capH", mount); if (h) h.focus({ preventScroll: true });
    }));
    const gateMsg = () => { $(".cap-gate-msg", mount).textContent = passed(ph.id) ? `✓ Gate passed. Phase ${ph.n} is done.` : ""; };
    $$(".cap-gate input", mount).forEach((c) => c.addEventListener("change", () => {
      cap.gates[ph.id] = $$(".cap-gate input", mount).map((x) => x.checked); save(); steps(); gateMsg();
      if (passed(ph.id)) track("capstone/gate-" + ph.n);
    }));
    gateMsg();
    $(".cap-worked", mount).addEventListener("toggle", (e) => { if (e.target.open) track("capstone/worked-" + ph.n); });
  }
  const out = (html, ok) => { const o = $(".cap-out", mount); o.innerHTML = html; o.className = "cap-out" + (html ? (ok ? " is-ok" : " is-note") : ""); };

  /* ── phase 1 · Information ── */
  function p1() {
    const ph = PHASES[0], d = P("p1");
    const facts = `<p>Your company makes the <b>K-17</b>, a 1.7-litre cordless kettle. It sells about <b>${VOLUME.toLocaleString("en-GB")} a year</b> at
      <b>£18</b> in the shops, including 20% VAT. Retailers keep 30% of the price before VAT, and the business needs a 25% margin.</p>
      <div class="tbl-scroll" tabindex="0" role="region" aria-label="Costed parts list"><table class="cap-table"><caption>Costed parts list, checked by finance</caption>
      <thead><tr><th>Item</th><th>Cost</th></tr></thead><tbody>${BOM.map(([p, c]) => `<tr><td>${p}</td><td>${gbp(c)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th>Total</th><th>${gbp(START)}</th></tr></tfoot></table></div>
      <ul class="cap-list"><li>Warranty returns are 1.8%. The top cause is a broken lid hinge (0.7%).</li>
      <li>Reviews praise how fast it boils. Several say the chrome trim shows fingerprints.</li>
      <li>Survey of 400 buyers: automatic switch-off is a must-have; boil speed is the thing they compare; 60% don't care about the chrome trim either way.</li>
      <li>A rival kettle sells at the same price. Its teardown suggests it costs about £7.70 to make: moulded-in colour, one combined thermostat and switch, three screws instead of seven.</li></ul>`;
    const work = field("p1scope", "Scope: what's in and what's out", d.scope, { area: true }) +
      `<div class="cap-row">${field("p1start", "Starting cost", d.start, { type: "number", pre: "£", small: true })}${field("p1target", "Target cost", d.target, { type: "number", pre: "£", small: true })}</div>` +
      field("p1why", "Why that target? (the evidence)", d.why, { area: true, rows: 2 }) +
      `<p class="cap-sub">The three biggest cost items</p><div class="cap-row">${[0, 1, 2].map((i) => sel("p1top" + i, `#${i + 1}`, BOM.map((b) => b[0]), (d.top || [])[i])).join("")}</div>` +
      field("p1req", "One ‘requirement’ you'd question, and the evidence", d.req, { area: true, rows: 2 });
    const w = WORKED.p1;
    const worked = `<p><b>Scope.</b> ${esc(w.scope)}</p><p><b>Starting cost</b> £9.00 · <b>target</b> £7.88. ${esc(w.why)}</p>
      <p><b>Biggest three:</b> heating element £2.10, body £1.60, assembly and packing £1.40. Together they're more than half the cost.</p><p><b>Requirement questioned.</b> ${esc(w.req)}</p>`;
    mount.innerHTML = frame(ph, facts, work, worked);
    const check = () => {
      d.scope = $("#p1scope").value; d.start = $("#p1start").value; d.target = $("#p1target").value; d.why = $("#p1why").value; d.req = $("#p1req").value;
      d.top = [0, 1, 2].map((i) => $("#p1top" + i).value); save();
      const notes = [], s = num(d.start), t = num(d.target);
      if (s !== null && Math.abs(s - START) > 0.005) notes.push(`The starting cost is the finance-checked total, £${START.toFixed(2)}. Fix it now and measure every saving against it.`);
      if (t !== null && t > ALLOW + 0.01) notes.push(`A target of £${t.toFixed(2)} is still above what the market allows. Work it out: £18 ÷ 1.2 = £15.00; less the retailer's 30% = £10.50; less a 25% margin = £7.88.`);
      if (t !== null && s !== null && t < s && t <= ALLOW + 0.01 && Math.abs(s - START) <= 0.005) notes.push(`✓ A target of £${t.toFixed(2)} means taking out ${gbp(s - t)} a kettle, ${(((s - t) / s) * 100).toFixed(1)}%: worth ${gbp0((s - t) * VOLUME)} a year.`);
      const top = d.top.filter(Boolean), want = ["Heating element", "Body (moulded, coloured)", "Assembly and packing"];
      if (top.length === 3) notes.push(want.every((x) => top.includes(x)) ? "✓ Those are the three biggest items, more than half the cost between them." : "Check the order by cost: the three biggest are £2.10, £1.60 and £1.40.");
      if (d.scope && !/out/i.test(d.scope)) notes.push("Say what's out of scope too. It stops the study wandering into things nobody can change.");
      out(notes.map((n) => `<p>${esc(n)}</p>`).join(""), notes.every((n) => n.startsWith("✓")));
    };
    mount.addEventListener("input", check); mount.addEventListener("change", check);
    bindCommon(ph); if (d.start || d.target) check();
  }

  /* ── phase 2 · Function analysis ── */
  function p2() {
    const ph = PHASES[1], d = P("p2");
    d.fns = d.fns || [];
    const facts = `<p>Name the kettle's functions, then use the team's cost split below. It's the one from the Module 3 lab: each part's cost shared across the functions it serves.
      Worth is the cheapest known way to do the job, from benchmarks.</p>
      <div class="tbl-scroll" tabindex="0" role="region" aria-label="Cost and worth by function"><table class="cap-table"><caption>Cost and worth by function (assembly and packing kept separate)</caption>
      <thead><tr><th>Function</th><th>Cost</th><th>Worth</th><th>Value Index</th></tr></thead>
      <tbody>${FN.map(([f, c, w]) => `<tr><td>${f}</td><td>${gbp(c)}</td><td>${gbp(w)}</td><td class="${c / w > 2 ? "vi-hot" : c / w > 1.2 ? "vi-warm" : ""}">${(c / w).toFixed(2)}</td></tr>`).join("")}</tbody></table></div>
      <p class="cap-small">Value Index = cost ÷ worth. Up to 1.2 is healthy, 1.2–2.0 is worth watching, above 2.0 is a target.</p>`;
    const work = field("p2basic", "The basic function (verb + noun)", d.basic, { ph: "e.g. Heat water" }) +
      `<p class="cap-sub">Other functions, one per box</p><div class="cap-fns">${[0, 1, 2, 3, 4, 5].map((i) => `<input id="p2f${i}" aria-label="Function ${i + 1}" value="${esc(d.fns[i] || "")}" />`).join("")}</div>
      <fieldset class="cap-pick"><legend>Which functions are your targets?</legend>${FN.map(([f]) => `<label><input type="checkbox" value="${f}"${(d.targets || []).includes(f) ? " checked" : ""} /> ${f}</label>`).join("")}</fieldset>`;
    const w = WORKED.p2;
    const worked = `<p><b>Basic function:</b> heat water. It's why anyone buys a kettle.</p><p><b>Others:</b> ${w.fns.join(", ").toLowerCase()}.</p>
      <p><b>Targets:</b> control temperature (VI 2.17) and convey esteem (VI 4.33). Contain water (1.89) is one to watch. Heat water costs the most, but it costs about what it's worth.</p>`;
    mount.innerHTML = frame(ph, facts, work, worked);
    const check = () => {
      d.basic = $("#p2basic").value.trim(); d.fns = [0, 1, 2, 3, 4, 5].map((i) => $("#p2f" + i).value.trim());
      d.targets = $$(".cap-pick input:checked", mount).map((x) => x.value); save();
      const notes = [];
      [d.basic, ...d.fns].filter(Boolean).forEach((f) => {
        const words = f.split(/\s+/);
        if (BANNED.includes(words[0].toLowerCase())) notes.push([`“${f}”: “${words[0]}” is an empty verb. Say what physically happens.`, "function-words"]);
        else if (words.length !== 2) notes.push([`“${f}”: use two words, an active verb and a measurable noun.`, "function-words"]);
      });
      if (d.basic && !/^heat\s+water$/i.test(d.basic)) notes.push([`Is “${d.basic}” really why people buy a kettle? The basic function is the job the product exists to do.`]);
      if (d.targets.length) {
        if (d.targets.includes("Heat water")) notes.push(["Heat water is the most expensive function, but its Value Index is 1.05: it costs about what it's worth.", "value-index"]);
        const want = ["Control temperature", "Convey esteem"], miss = want.filter((x) => !d.targets.includes(x));
        if (miss.length) notes.push([`${miss.join(" and ")} ${miss.length > 1 ? "are" : "is"} above a Value Index of 2.`]);
        if (!miss.length && d.targets.every((x) => want.includes(x) || x === "Contain water")) notes.push(["✓ Right targets: the two functions costing more than twice what they're worth."]);
      }
      out(notes.map(([n]) => `<p>${esc(n)}</p>`).join(""), notes.length && notes.every(([n]) => n.startsWith("✓")));
      const mk = notes.find((x) => x[1]);
      if (mk && window.VHMistakes) VHMistakes.attach($(".cap-out", mount).lastElementChild || $(".cap-out", mount), mk[1], { link: false });
    };
    mount.addEventListener("change", check);
    bindCommon(ph); if (d.basic || d.targets) check();
  }

  /* ── phase 3 · Creative ── */
  const ideaList = () => String((cap.p3 && cap.p3.ideas) || "").split("\n").map((s) => s.trim()).filter(Boolean);
  function p3() {
    const ph = PHASES[2], d = P("p3");
    const facts = `<p>Your targets are <b>control temperature</b> (£1.30 against a worth of £0.60) and <b>convey esteem</b> (£1.30 against £0.30).
      Assembly and packing (£1.40) is fair game too. Remember what you learned in Phase 1: the hinge failures, the fingerprints, the rival's three screws.</p>
      <ul class="cap-list"><li>Quantity first. Write every idea down, however odd.</li><li>Start each line with the function it serves, then a colon: <i>Convey esteem: …</i></li>
      <li>Look outside kettles: rice cookers, car interiors, toys, packaging.</li></ul>`;
    const work = field("p3ideas", "Your ideas, one per line", d.ideas, { area: true, rows: 12, ph: "Convey esteem: moulded-in colour instead of chrome trim" }) +
      `<p class="cap-count" id="p3count"></p>`;
    const worked = `<ol class="cap-ideas">${WORKED.p3.ideas.split("\n").map((i) => `<li>${esc(i)}</li>`).join("")}</ol>
      <p>Fourteen ideas, and none judged yet. Three are borrowed from other products: car trim, rice cookers and light pipes.</p>`;
    mount.innerHTML = frame(ph, facts, work, worked);
    const check = () => {
      d.ideas = $("#p3ideas").value; save();
      const list = ideaList(), byFn = (f) => list.filter((x) => x.toLowerCase().startsWith(f)).length;
      const noFn = list.filter((x) => !/^[^:]{3,40}:/.test(x)).length;
      $("#p3count").innerHTML = `<b>${list.length}</b> idea${list.length === 1 ? "" : "s"} · control temperature: <b>${byFn("control temperature")}</b> · convey esteem: <b>${byFn("convey esteem")}</b>${noFn ? ` · ${noFn} without a function` : ""}`;
      const notes = [];
      if (list.length >= 12 && byFn("control temperature") >= 2 && byFn("convey esteem") >= 2 && !noFn) notes.push("✓ Enough ideas, and every one is aimed at a function.");
      else if (list.length) notes.push(list.length < 12 ? `Keep going: ${12 - list.length} more. The first ideas are usually the obvious ones.` : noFn ? "Start each idea with the function it serves, then a colon." : "Aim at least two ideas at each target function.");
      out(notes.map((n) => `<p>${esc(n)}</p>`).join(""), notes[0] && notes[0].startsWith("✓"));
    };
    mount.addEventListener("input", check);
    bindCommon(ph); check();
  }

  /* ── phase 4 · Evaluation ── */
  const W = [0.5, 0.3, 0.2];
  const rowScore = (r) => (r && r[2] && r[3] && r[4] ? W[0] * r[2] + W[1] * r[3] + W[2] * r[4] : null);
  function p4() {
    const ph = PHASES[3], d = P("p4");
    d.rows = d.rows || [[], [], [], []];
    const ideas = ideaList().length ? ideaList() : WORKED.p3.ideas.split("\n");
    const facts = `<p>The sponsor agreed the criteria and weights before anyone saw the ideas:</p>
      <ul class="cap-list"><li><b>Saving</b>, weight 50%: 9 = a big saving per kettle</li><li><b>Risk</b>, weight 30%: 9 = very safe</li><li><b>Effort</b>, weight 20%: 9 = very easy</li></ul>
      <p><b>Must-pass check:</b> the automatic switch-off and the boil-dry protection must meet the safety standard. Any idea that weakens them is out before scoring.</p>
      <p>Pick your four strongest ideas, estimate the saving per kettle, and score them 1–9.</p>`;
    const scoreSel = (id, v, label) => `<select id="${id}" aria-label="${label}"><option value=""></option>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<option${+v === n ? " selected" : ""}>${n}</option>`).join("")}</select>`;
    const work = `<div class="tbl-scroll" tabindex="0" role="region" aria-label="Scoring table"><table class="cap-table cap-score"><thead><tr><th>Idea</th><th>Saving per kettle</th><th>Saving</th><th>Risk</th><th>Effort</th><th>Score</th></tr></thead><tbody>
      ${[0, 1, 2, 3].map((i) => { const r = d.rows[i] || []; return `<tr data-i="${i}"><td><select id="p4i${i}" aria-label="Idea ${i + 1}"><option value="">Choose an idea…</option>${ideas.map((x) => `<option${x === r[0] ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></td>
        <td><span class="cap-pound">£<input id="p4v${i}" type="number" inputmode="decimal" step="0.01" aria-label="Saving per kettle, idea ${i + 1}" value="${esc(r[1] || "")}" /></span></td>
        <td>${scoreSel("p4s" + i, r[2], `Saving score, idea ${i + 1}`)}</td><td>${scoreSel("p4r" + i, r[3], `Risk score, idea ${i + 1}`)}</td><td>${scoreSel("p4e" + i, r[4], `Effort score, idea ${i + 1}`)}</td>
        <td class="cap-sc" id="p4t${i}"></td></tr>`; }).join("")}</tbody></table></div>`;
    const worked = `<div class="tbl-scroll" tabindex="0" role="region" aria-label="Worked scoring"><table class="cap-table"><thead><tr><th>Idea</th><th>Saving</th><th>S / R / E</th><th>Score</th></tr></thead><tbody>
      ${WORKED.p4.map((r) => `<tr><td>${esc(r[0])}</td><td>£${r[1]}</td><td>${r[2]} / ${r[3]} / ${r[4]}</td><td>${rowScore(r).toFixed(1)}</td></tr>`).join("")}</tbody></table></div>
      <p>The idea to remove the separate boil-dry cut-out was screened out first: boil-dry protection is a must-pass safety item. Moving each weight by 10 points never changes the winner. Second place is close: with saving at 40% and effort at 30%, the snap-fit edges ahead of the thermostat, so both go forward.
      The champions: Sam Patel (trim), Ana Ruiz (thermostat), Lee Chen (snap-fit).</p>`;
    mount.innerHTML = frame(ph, facts, work, worked);
    const check = () => {
      d.rows = [0, 1, 2, 3].map((i) => [$("#p4i" + i).value, $("#p4v" + i).value, +$("#p4s" + i).value || null, +$("#p4r" + i).value || null, +$("#p4e" + i).value || null]);
      save();
      const ranked = d.rows.map((r, i) => [i, rowScore(r)]).filter((x) => x[1] !== null).sort((a, b) => b[1] - a[1]);
      d.rows.forEach((r, i) => { const s = rowScore(r), pos = ranked.findIndex((x) => x[0] === i); $("#p4t" + i).textContent = s === null ? "" : `${s.toFixed(1)}${pos === 0 ? " · 1st" : ""}`; });
      const notes = [];
      if (d.rows.some((r) => /bimetal|boil-dry/i.test(r[0] || ""))) notes.push("One of these touches the boil-dry protection, a must-pass safety item. Screen it out before scoring.");
      if (ranked.length >= 2) {
        // sensitivity: move 10 points from saving to risk and see if the winner changes
        const alt = d.rows.map((r, i) => [i, r[2] && r[3] && r[4] ? 0.4 * r[2] + 0.4 * r[3] + 0.2 * r[4] : null]).filter((x) => x[1] !== null).sort((a, b) => b[1] - a[1]);
        notes.push(alt[0][0] === ranked[0][0] ? "✓ Sensitivity check: with saving at 40% and risk at 40%, the winner stays the same." : "Careful: with saving at 40% and risk at 40%, a different idea comes top. Tell the sponsor; don't hide it.");
      }
      out(notes.map((n) => `<p>${esc(n)}</p>`).join(""), notes.length && notes.every((n) => n.startsWith("✓")));
    };
    mount.addEventListener("change", check); mount.addEventListener("input", check);
    bindCommon(ph); check();
  }

  /* ── phase 5 · Development ── */
  function bc(d) {
    const v = (k) => Math.max(0, num(d[k]) || 0);
    const annual = v("saving") * v("volume"), one = v("tooling") + v("test") + v("hours") * v("rate");
    const pay = annual > 0 ? (one / annual) * 12 : Infinity;
    return { annual, one, pay, verdict: annual <= 0 ? "No saving, no case." : pay <= 12 ? "Ready for the board: payback within 12 months." : pay <= 24 ? "Borderline: over the usual 12-month limit." : "Not worth doing as a production change." };
  }
  const topIdea = () => {
    const rows = (cap.p4 && cap.p4.rows) || [];
    const best = rows.map((r) => [r, rowScore(r)]).filter((x) => x[1] !== null && x[0][0]).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
  };
  function p5() {
    const ph = PHASES[4], d = P("p5"), top = topIdea();
    if (!d.idea && top) { d.idea = top[0]; if (!d.saving) d.saving = top[1]; }
    if (!d.volume) d.volume = String(VOLUME);
    if (!d.rate) d.rate = "65";
    const facts = `<p>Build the business case for your top idea${top ? `: <b>${esc(top[0])}</b>` : ""}.</p>
      <ul class="cap-list"><li>Volume: ${VOLUME.toLocaleString("en-GB")} kettles a year; the K-17 has about four years of life left.</li>
      <li>Quotes for the trim idea: a new body tool with a film insert, £48,000; film £0.28 a kettle instead of the £0.90 trim.</li>
      <li>Validation for a cosmetic change: about £6,000. Engineering: £65 an hour.</li>
      <li>The testing ladder: 1 desk check · 2 simulation · 3 rig test · 4 line trial · 5 field trial.</li></ul>`;
    const work = field("p5idea", "Idea", d.idea) +
      `<div class="cap-row">${field("p5saving", "Saving per kettle", d.saving, { type: "number", pre: "£", small: true })}${field("p5volume", "Kettles a year", d.volume, { type: "number", small: true })}</div>
      <div class="cap-row">${field("p5tooling", "Tooling", d.tooling, { type: "number", pre: "£", small: true })}${field("p5test", "Validation and testing", d.test, { type: "number", pre: "£", small: true })}</div>
      <div class="cap-row">${field("p5hours", "Engineering hours", d.hours, { type: "number", small: true })}${field("p5rate", "Rate per hour", d.rate, { type: "number", pre: "£", small: true })}${field("p5months", "Months until it's made", d.months, { type: "number", small: true })}</div>
      ${sel("p5step", "Highest testing step needed", ["1 · Desk check", "2 · Simulation", "3 · Rig test", "4 · Line trial", "5 · Field trial"], d.step)}
      ${field("p5risk", "The biggest risk, and how you'll deal with it", d.risk, { area: true, rows: 2 })}<div class="bc-cards" id="p5cards"></div>`;
    const w = WORKED.p5, wb = bc(w);
    const worked = `<p><b>Idea:</b> moulded-in colour and in-mould film instead of the chrome trim. Saving £0.62 a kettle (£0.90 trim → £0.28 film) × 250,000 = <b>${gbp0(wb.annual)} a year</b>.</p>
      <p><b>One-time:</b> tooling £48,000 + validation £6,000 + 80 hours × £65 (£5,200) = <b>${gbp0(wb.one)}</b>. <b>Payback ${wb.pay.toFixed(1)} months.</b></p>
      <p><b>Testing:</b> up to step 3, a rig test. <b>Risk:</b> ${esc(w.risk)}</p>`;
    mount.innerHTML = frame(ph, facts, work, worked);
    const check = () => {
      ["idea", "saving", "volume", "tooling", "test", "hours", "rate", "months", "risk"].forEach((k) => { d[k] = $("#p5" + k).value; });
      d.step = $("#p5step").value; save();
      const r = bc(d);
      $("#p5cards").innerHTML = [[gbp0(r.annual), "a year"], [gbp0(r.one), "one-time"], [isFinite(r.pay) ? r.pay.toFixed(1) + " months" : "—", "payback"]]
        .map(([b, s]) => `<div class="bc-card"><b>${b}</b><span>${s}</span></div>`).join("");
      const notes = [r.annual > 0 ? (r.pay <= 12 ? "✓ " : "") + r.verdict : ""];
      if (num(d.tooling) === null || num(d.test) === null || num(d.hours) === null) notes.push("Fill in every one-time cost, even the small ones. Leaving one out is the commonest business-case mistake.");
      if (/^5/.test(d.step || "") && /trim|film|colour|esteem/i.test(d.idea || "")) notes.push("A field trial for a cosmetic change? Only climb the ladder as far as the risk needs; every step costs time and payback.");
      out(notes.filter(Boolean).map((n) => `<p>${esc(n)}</p>`).join(""), notes.filter(Boolean).every((n) => n.startsWith("✓")));
    };
    mount.addEventListener("input", check); mount.addEventListener("change", check);
    bindCommon(ph); check();
  }

  /* ── phase 6 · Presentation and implementation ── */
  function p6() {
    const ph = PHASES[5], d = P("p6");
    const rows = (((cap.p4 && cap.p4.rows) || []).filter((r) => r[0]).length ? cap.p4.rows.filter((r) => r[0]) : WORKED.p4);
    d.rows = d.rows || [];
    const facts = `<p>The decision board meets on Thursday. Take each evaluated idea to it and record the decision, an owner and a date.
      Then check the cost walk: does it reach the £7.88 target?</p>
      <ul class="cap-list"><li>Stages: L1 idea · L2 validated (saving checked by finance) · L3 approved · L4 implemented (in production and checked against the £9.00 starting cost).</li>
      <li>Only L4 savings are reported as real.</li></ul>`;
    const opts = ["Approve", "Approve with conditions", "Needs more data", "Reject"];
    const work = `<div class="tbl-scroll" tabindex="0" role="region" aria-label="Decision log"><table class="cap-table cap-dec"><thead><tr><th>Idea</th><th>Saving</th><th>Decision</th><th>Owner</th><th>By when</th><th>Stage</th></tr></thead><tbody>
      ${rows.map((r, i) => { const x = d.rows[i] || []; return `<tr><td>${esc(r[0])}</td><td>£${esc(r[1] || "0")}</td>
        <td><select id="p6d${i}" aria-label="Decision, idea ${i + 1}"><option value=""></option>${opts.map((o) => `<option${o === x[0] ? " selected" : ""}>${o}</option>`).join("")}</select></td>
        <td><input id="p6o${i}" aria-label="Owner, idea ${i + 1}" value="${esc(x[1] || "")}" /></td><td><input id="p6w${i}" aria-label="By when, idea ${i + 1}" value="${esc(x[2] || "")}" placeholder="e.g. Mar 2027" /></td>
        <td><select id="p6s${i}" aria-label="Stage, idea ${i + 1}"><option value=""></option>${["L1", "L2", "L3", "L4"].map((o) => `<option${o === x[3] ? " selected" : ""}>${o}</option>`).join("")}</select></td></tr>`; }).join("")}
      </tbody></table></div><div id="p6walk"></div>`;
    const worked = `<div class="tbl-scroll" tabindex="0" role="region" aria-label="Worked decision log"><table class="cap-table"><thead><tr><th>Idea</th><th>Decision</th><th>Owner</th><th>By</th><th>Stage</th></tr></thead><tbody>
      ${WORKED.p4.map((r, i) => `<tr><td>${esc(r[0])}</td>${WORKED.p6[i].map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p>Approved and conditional ideas save £1.15 a kettle: £9.00 → £7.85, just under the £7.88 target. That's only 3p of headroom. If one idea slips, the target is missed, so keep the filter idea and two parked ideas warm. The filter idea (£0.08) waits for more data. The thermostat and snap-fit ideas are approved subject to finance checking their business cases, so they sit at L2 until then.
      Nothing is reported as saved yet: none is at L4. The next review is booked for the first Thursday of next month.</p>`;
    mount.innerHTML = frame(ph, facts, work, worked);
    const check = () => {
      d.rows = rows.map((_, i) => [$("#p6d" + i).value, $("#p6o" + i).value, $("#p6w" + i).value, $("#p6s" + i).value]); save();
      const go = rows.map((r, i) => [r, d.rows[i]]).filter(([, x]) => /^Approve/.test(x[0]));
      const planned = go.reduce((s, [r]) => s + (num(r[1]) || 0), 0), real = rows.reduce((s, r, i) => s + (d.rows[i][3] === "L4" ? num(r[1]) || 0 : 0), 0);
      const after = START - planned, max = START;
      const bar = (label, v, cls) => `<div class="cw-row"><span>${label}</span><div class="cw-track"><i class="${cls}" style="width:${Math.max(2, (v / max) * 100).toFixed(1)}%"></i></div><b>${gbp(v)}</b></div>`;
      $("#p6walk").innerHTML = `<h4 class="cap-sub">Cost walk</h4>${bar("Starting cost", START, "cw-start")}${go.map(([r]) => bar("− " + esc(r[0].replace(/^[^:]+:\s*/, "")), num(r[1]) || 0, "cw-cut")).join("")}${bar("After approved ideas", after, after <= ALLOW + 0.005 ? "cw-ok" : "cw-over")}
        <p class="cap-small">Target £7.88 (the allowable cost). Counted as real today (L4 only): <b>${gbp(real)}</b> a kettle.</p>`;
      const notes = [];
      if (go.length) notes.push(after <= ALLOW + 0.005 ? `✓ The approved ideas reach the target: ${gbp(after)} against £7.88.` : `The approved ideas get to ${gbp(after)}, ${gbp(after - ALLOW)} short of £7.88. Explain the gap, or take another idea to the board.`);
      if (d.rows.some((x) => x[0] && x[0] !== "Reject" && (!x[1] || !x[2]))) notes.push("Every idea going forward needs an owner and a date, or it quietly disappears.");
      if (d.rows.some((x, i) => x[3] === "L4" && !/^Approve/.test(x[0]))) notes.push("An idea at L4 must have been approved first.");
      out(notes.map((n) => `<p>${esc(n)}</p>`).join(""), notes.length && notes.every((n) => n.startsWith("✓")));
    };
    mount.addEventListener("change", check); mount.addEventListener("input", check);
    bindCommon(ph); check();
  }

  /* ── your study: two printable pages ── */
  function study(useWorked) {
    track("capstone/study" + (useWorked ? "-worked" : ""));
    const C = useWorked ? { p1: WORKED.p1, p2: WORKED.p2, p3: WORKED.p3, p4: { rows: WORKED.p4 }, p5: Object.assign({ idea: WORKED.p4[0][0] }, WORKED.p5), p6: { rows: WORKED.p6 } } : cap;
    const p1d = C.p1 || {}, p2d = C.p2 || {}, p4rows = ((C.p4 && C.p4.rows) || []).filter((r) => r && r[0]), p5d = C.p5 || {}, p6rows = (C.p6 && C.p6.rows) || [];
    const ideas = String((C.p3 && C.p3.ideas) || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const dash = (v) => (v && String(v).trim() ? esc(v) : '<span class="rp-gap">—</span>');
    const name = (window.VHAccount && VHAccount.user && VHAccount.user.name) || "";
    const t = num(p1d.target), r5 = bc(p5d);
    const go = p4rows.map((r, i) => [r, p6rows[i] || []]).filter(([, x]) => /^Approve/.test(x[0] || ""));
    const after = START - go.reduce((s, [r]) => s + (num(r[1]) || 0), 0);
    const done = PHASES.filter((ph) => passed(ph.id)).length;
    report.hidden = false;
    report.innerHTML = `<div class="rp-bar"><button type="button" class="btn btn-primary" id="rpPrint">Print or save as PDF</button>
        <button type="button" class="btn btn-ghost" id="rpSwap">${useWorked ? "Show my study" : "Show the worked study"}</button>
        ${useWorked ? "" : `<span class="rp-note">${done} of 6 phase gates passed. Gaps show as a dash.</span>`}</div>
      <div class="rp-page"><header class="rp-head"><div><p class="rp-brand">VAVE<b>hub</b> · VE Academy capstone</p><h2 id="rpTitle">Value study: K-17 cordless kettle</h2>
        <p>${useWorked ? "Worked example" : name ? "Prepared by " + esc(name) : "Prepared by: ____________________"} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p></div>
        <div class="rp-nums"><div><b>£9.00</b><span>starting cost</span></div><div><b>${t !== null ? "£" + t.toFixed(2) : "—"}</b><span>target</span></div><div><b>${go.length ? gbp(after) : "—"}</b><span>after approved ideas</span></div></div></header>
        <h3>1 · Scope and starting point</h3><p>${dash(p1d.scope)}</p><p><b>Why this target:</b> ${dash(p1d.why)}</p>
        <p><b>Biggest cost items:</b> ${(p1d.top || []).filter(Boolean).length ? (p1d.top || []).filter(Boolean).map(esc).join(", ") : dash("")}</p>
        <p><b>Requirement questioned:</b> ${dash(p1d.req)}</p>
        <h3>2 · Functions, cost and worth</h3><p><b>Basic function:</b> ${dash(p2d.basic)} · <b>Others:</b> ${(p2d.fns || []).filter(Boolean).length ? (p2d.fns || []).filter(Boolean).map(esc).join(", ") : dash("")}</p>
        <table class="rp-table"><thead><tr><th>Function</th><th>Cost</th><th>Worth</th><th>VI</th><th>Target?</th></tr></thead><tbody>
          ${FN.map(([f, c, w]) => `<tr><td>${f}</td><td>${gbp(c)}</td><td>${gbp(w)}</td><td>${(c / w).toFixed(2)}</td><td>${(p2d.targets || []).includes(f) ? "✓" : ""}</td></tr>`).join("")}</tbody></table>
        <h3>3 · Ideas</h3><p>${ideas.length} idea${ideas.length === 1 ? "" : "s"} generated${ideas.length ? `, including: ${ideas.slice(0, 5).map(esc).join("; ")}${ideas.length > 5 ? "; …" : "."}` : "."}</p>
        <footer class="rp-foot">Page 1 of 2 · A practice study on a made-up product, prepared with the VAVEhub VE Academy capstone.</footer></div>
      <div class="rp-page">
        <h3>4 · Evaluation (saving 50% · risk 30% · effort 20%)</h3>
        <table class="rp-table"><thead><tr><th>Idea</th><th>Saving per kettle</th><th>S / R / E</th><th>Score</th></tr></thead><tbody>
          ${p4rows.length ? p4rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${num(r[1]) !== null ? gbp(num(r[1])) : "—"}</td><td>${r[2] || "–"} / ${r[3] || "–"} / ${r[4] || "–"}</td><td>${rowScore(r) !== null ? rowScore(r).toFixed(1) : "—"}</td></tr>`).join("") : `<tr><td colspan="4">${dash("")}</td></tr>`}</tbody></table>
        <h3>5 · Business case: ${dash(p5d.idea)}</h3>
        <div class="rp-nums rp-nums-4"><div><b>${r5.annual ? gbp0(r5.annual) : "—"}</b><span>saving a year</span></div><div><b>${r5.one ? gbp0(r5.one) : "—"}</b><span>one-time cost</span></div>
          <div><b>${isFinite(r5.pay) && r5.annual ? r5.pay.toFixed(1) + " mo" : "—"}</b><span>payback</span></div><div><b>${p5d.step ? esc(p5d.step.split(" · ")[1] || p5d.step) : "—"}</b><span>highest test</span></div></div>
        <p><b>Risk and how it's handled:</b> ${dash(p5d.risk)}</p>
        <h3>6 · Decisions</h3>
        <table class="rp-table"><thead><tr><th>Idea</th><th>Decision</th><th>Owner</th><th>By</th><th>Stage</th></tr></thead><tbody>
          ${p4rows.length ? p4rows.map((r, i) => { const x = p6rows[i] || []; return `<tr><td>${esc(r[0])}</td><td>${dash(x[0])}</td><td>${dash(x[1])}</td><td>${dash(x[2])}</td><td>${dash(x[3])}</td></tr>`; }).join("") : `<tr><td colspan="5">${dash("")}</td></tr>`}</tbody></table>
        <p class="rp-concl">${go.length ? (after <= ALLOW + 0.005 ? `The approved ideas take the K-17 from £9.00 to ${gbp(after)}, inside the £7.88 target: ${gbp0((START - after) * VOLUME)} a year at ${VOLUME.toLocaleString("en-GB")} kettles, before one-time costs. Savings will be reported only when each change is in production and checked by finance against the £9.00 starting cost.`
          : `The approved ideas take the K-17 from £9.00 to ${gbp(after)}, ${gbp(after - ALLOW)} short of the £7.88 target. The gap needs another idea or a decision from the sponsor.`) : "No decisions recorded yet."}</p>
        <footer class="rp-foot">Page 2 of 2 · Figures are illustrative. The method follows SAVE International's six-phase job plan.</footer></div>`;
    $("#rpPrint").addEventListener("click", () => { track("capstone/print"); window.print(); });
    $("#rpSwap").addEventListener("click", () => study(!useWorked));
  }

  /* ── switching phases ── */
  const VIEWS = [null, p1, p2, p3, p4, p5, p6];
  function show(n, quiet) {
    const to = Math.min(7, Math.max(1, n || 1));
    if (to !== cap.phase || !quiet) { cap.phase = to; if (!quiet) save(true); }
    // a fresh container drops the previous phase's listeners
    const fresh = mount.cloneNode(false); mount.replaceWith(fresh); mount = fresh;
    steps();
    report.hidden = true; report.innerHTML = "";
    if (cap.phase === 7) { study(false); return; }
    VIEWS[cap.phase]();
  }
  track("capstone/open");
  show(cap.phase, true); // opening the page changes nothing, so nothing is saved
})();
