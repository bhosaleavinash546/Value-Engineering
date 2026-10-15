/* ═══════════════════════════════════════════════════════════
   VAVEhub VE Academy — practice that goes beyond reading:
   1. the ten commonest VE mistakes, explained when a learner makes one
   2. worked examples that fade into problems (should-cost m9, target cost m13)
   3. a FAST diagram builder: drag or tap cards into place, checked HOW and WHY (m4)
   4. labs: function–cost matrix (m3), funnel review (m8)
   Expose: window.VHMistakes
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const gbp = (v) => (v < -0.004 ? "−" : "") + "£" + Math.abs(v).toFixed(2);
  const gbp0 = (v) => (v < 0 ? "−" : "") + "£" + Math.round(Math.abs(v)).toLocaleString("en-GB");
  const track = (name) => { if (window.vhTrack) window.vhTrack(name); };

  /* ═════ 1 · The ten commonest mistakes ═════ */
  const MISTAKES = {
    "cost-cutting": ["Treating VE as cost-cutting",
      "Cutting parts, features or a flat percentage takes value out along with the cost.",
      "Ask what each part does and what that job is worth, then remove cost where it's higher than the job is worth.", "m1", "Module 1.2"],
    "function-words": ["A function that isn't really a function",
      "Empty verbs (provide, allow, enable, ensure, facilitate) and descriptions of the part or the result hide the real job.",
      "Write an active verb and a measurable noun: generate heat, seal container, transmit force.", "m4", "Module 4.3"],
    "value-index": ["Chasing cost instead of value",
      "The most expensive part isn't automatically the best target, and the basic function is the one job you can't remove.",
      "Compare cost with worth. Value Index = cost ÷ worth, and anything above 2.0 is a target, whatever its size.", "m4", "Module 4.7"],
    "no-baseline": ["No agreed starting cost",
      "Without a costed parts list checked by finance, the study turns into an argument about the numbers, and nobody believes the savings.",
      "Freeze a starting cost that finance has checked before the study, and measure every saving against it.", "m2", "Module 2.6"],
    "judging-early": ["Judging ideas too early",
      "Criticism in the creative phase stops people offering ideas, and the odd ones are often where the best ones start.",
      "Write every idea down without comment. Judgement waits for the Evaluation phase.", "m5", "Module 5.2"],
    "gut-decision": ["Deciding by rank or gut feel",
      "The loudest or most senior voice isn't evidence, and criteria chosen after seeing the ideas get bent to suit a favourite.",
      "Agree the criteria and weights before anyone sees the ideas, then decide on evidence: data, tests, customer research.", "m6", "Module 6.6"],
    "thin-business-case": ["A business case without its costs, risks or dates",
      "Leaving out one-time costs, testing or the start date makes a saving look bigger and sooner than it is.",
      "Answer all five: what changes, what it saves, what it costs to bring in, what could go wrong, and when.", "m7", "Module 7.1"],
    "counting-early": ["Counting savings too early",
      "Approval, applause and ordered tooling aren't savings. Ideas still fall out between approval and production.",
      "Count a saving only at L4: in production, and checked by finance against the fixed starting cost.", "m8", "Module 8.5"],
    "price-squeeze": ["Squeezing the price instead of using facts",
      "A flat percentage demand gets resisted, and a supplier pushed below a fair margin hands you its quality problems.",
      "Build a should-cost, find the layer that's out of line, and ask the supplier about that fact.", "m9", "Module 9.7"],
    "target-creep": ["Letting the target cost move",
      "Each 'just this once' adds a little, and the margin the business needs quietly disappears.",
      "The target cost is never exceeded. If something is added, save the same amount somewhere else first.", "m13", "Module 13.2"],
  };
  // wrong answers in the quick checks, challenges and practice exam that show a known mistake
  const BY_OPTION = {
    "Agree, and spread the cut evenly": "cost-cutting", "Can we buy cheaper chrome?": "cost-cutting", "Raise the price": "cost-cutting",
    "A pricing problem, not an engineering one": "cost-cutting", "The price": "cost-cutting", "Nothing, a clear number is enough": "cost-cutting",
    "A bigger number, to stretch the team": "cost-cutting",
    "Provide heat": "function-words", "Make water hot": "function-words", "Boil kettle": "function-words", "Provide stability": "function-words",
    "Hold laptop": "function-words", "Stop movement": "function-words", "Enable driving": "function-words", "Provide visibility": "function-words",
    "Light road": "function-words", "Ensure protection": "function-words", "Cover wire": "function-words", "Make wire safe": "function-words",
    "Close bottle": "function-words", "Provide closure": "function-words", "Keep water inside": "function-words", "Provide grip": "function-words",
    "Help user": "function-words", "Hold mug": "function-words", "Retract tip": "function-words", "Provide clicking": "function-words",
    "Make pen work": "function-words", "Look good": "function-words", "Impress people": "function-words", "Provide beauty": "function-words",
    "Fasten flange — it's specific": "function-words",
    "Cut the costliest part": "value-index", "Remove the most expensive part": "value-index", "In the basic function": "value-index", "0.80 — healthy": "value-index",
    "Nothing — precision comes later": "no-baseline", "Finance fixes it afterwards": "no-baseline", "The facilitator estimates live": "no-baseline",
    "None, engineers know the costs": "no-baseline", "The current, inflation-adjusted cost": "no-baseline", "Report the saving as lost": "no-baseline",
    "Open a debate": "judging-early", "Delete the idea": "judging-early", "Explain why it can't work": "judging-early", "Ask them to be serious": "judging-early",
    "Move on quickly": "judging-early",
    "Let the chief engineer pick favourites": "gut-decision", "After seeing the idea list": "gut-decision", "During the final vote": "gut-decision",
    "Hide it and keep the original winner": "gut-decision", "Add it to the spec": "gut-decision", "Defer to seniority": "gut-decision", "Let the manager decide": "gut-decision",
    "Simple payback": "thin-business-case", "Gross saving only": "thin-business-case", "Saving per unit only": "thin-business-case",
    "They're worth the same": "thin-business-case", "The one in 18 months": "thin-business-case", "Just do it: margins are waste": "thin-business-case",
    "No checks at all": "thin-business-case", "After every test has passed": "thin-business-case",
    "When the workshop ends": "counting-early", "When the business case is approved": "counting-early", "When tooling is ordered": "counting-early",
    "Ideas approved at the workshop": "counting-early", "Gross savings at idea stage": "counting-early", "The number of workshops run": "counting-early",
    "Too few studies": "counting-early", "Claiming it first": "counting-early", "Splitting it 50/50": "counting-early", "Applause from management": "counting-early",
    "A polished slide deck": "counting-early", "Better slides": "counting-early", "A longer presentation": "counting-early",
    "Demand 25% off": "price-squeeze", "Squeezed first — it's pure profit": "price-squeeze", "Accept the quote — there's no other data": "price-squeeze",
    "Threaten to resource": "price-squeeze", "Ask every supplier for a 10% discount": "price-squeeze",
    "If costs drift up, raise the price": "target-creep", "Suppliers absorb all overruns": "target-creep", "Targets are only guidance until production starts": "target-creep",
    "Add it; the budget will absorb it": "target-creep", "Raise the target by £40": "target-creep", "It passes; fix it later": "target-creep",
    "Raise the target to match": "target-creep", "Leave cost out of the review": "target-creep",
  };
  const MK_KEY = "vh-mistakes";
  const counts = () => { try { return JSON.parse(localStorage.getItem(MK_KEY)) || {}; } catch { return {}; } };
  function bump(id) {
    const c = counts(); c[id] = (c[id] || 0) + 1;
    try { localStorage.setItem(MK_KEY, JSON.stringify(c)); } catch {}
    return c[id];
  }
  function noteHTML(id, n, link) {
    const [t, why, fix, mod, sec] = MISTAKES[id];
    const again = n >= 2 ? ` <span class="mk-count">You've made this one ${n} times.</span>` : "";
    const where = link === false ? `<span class="mk-sec">${sec}</span>` : `<a href="training.html?open=${mod}" data-vh-goto="${mod}">Revisit ${sec} →</a>`;
    return `<b class="mk-title">Common mistake: ${esc(t)}</b><span>${esc(why)} <b>Instead:</b> ${esc(fix)}</span>${again} ${where}`;
  }
  /* Show the note for a wrong answer after element `after`. `key` is the option text or a mistake id.
     Returns true when a note was shown. */
  function attach(after, key, opts) {
    if (!after) return false;
    const id = MISTAKES[key] ? key : BY_OPTION[String(key || "").trim()];
    const parent = after.parentNode;
    $$(":scope > .mk-note", parent).forEach((n) => n.remove());
    if (!id) return false;
    const n = bump(id);
    const el = document.createElement("div");
    el.className = "mk-note"; el.setAttribute("role", "note"); el.dataset.mistake = id;
    el.innerHTML = noteHTML(id, n, opts && opts.link);
    after.insertAdjacentElement("afterend", el);
    track("mistake/" + id);
    return true;
  }
  function clear(after) { if (after && after.parentNode) $$(":scope > .mk-note", after.parentNode).forEach((n) => n.remove()); }
  window.VHMistakes = { attach, clear, list: MISTAKES, byOption: BY_OPTION, counts };

  // "Revisit Module x" links open the module in place rather than reloading the page
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-vh-goto]");
    if (!a) return;
    const link = document.querySelector(`#modNav .mod-link[data-target="${a.dataset.vhGoto}"]`);
    if (!link) return;
    e.preventDefault();
    const modal = a.closest("[role=dialog]");
    if (modal) { const x = $(".rev-close, [data-close], .modal-close", modal); if (x) x.click(); }
    link.click();
  });

  /* ═════ 2 · Worked examples that fade into problems ═════
     cfg = { id, givens(g) → html, steps: [{ k, label, calc(v, g), work(v, g), hint, errs: [{ calc(v, g), msg, mk }] }],
             problems: [g0 worked, g1 part-filled, g2 on your own], partial (steps shown in g1),
             check: [question, options, right index, why], done(v, g, el) } */
  function faded(mount, cfg) {
    if (!mount) return;
    const STAGES = ["Worked example", "Part-filled", "On your own"];
    const refVals = (g) => { const v = {}; cfg.steps.forEach((s) => { v[s.k] = s.calc(v, g); }); return v; };
    const tolFor = (x) => Math.max(0.011, Math.abs(x) * 0.005);
    let stage = 0;

    function head(i) {
      return `<ol class="fd-track" aria-label="Your progress">${STAGES.map((s, k) =>
        `<li class="${k < i ? "is-done" : k === i ? "is-on" : ""}"${k === i ? ' aria-current="step"' : ""}><span>${k + 1}</span>${s}</li>`).join("")}</ol>`;
    }
    function stepRow(s, v, g, shown) {
      if (shown) {
        return `<li class="fd-step is-shown"><span class="fd-label">${s.label}</span><span class="fd-work">${s.work(v, g)}</span><b class="fd-val">${gbp(v[s.k])}</b></li>`;
      }
      return `<li class="fd-step" data-k="${s.k}"><label class="fd-ask"><span class="fd-label">${s.label}</span>
        <span class="fd-in">£<input type="number" inputmode="decimal" step="0.01" data-k="${s.k}" aria-describedby="fdfb-${cfg.id}-${s.k}" /></span></label>
        <p class="fd-fb" id="fdfb-${cfg.id}-${s.k}" role="status" aria-live="polite"></p></li>`;
    }
    function render(i) {
      stage = i;
      const g = cfg.problems[i], v = refVals(g);
      const showN = i === 0 ? cfg.steps.length : i === 1 ? cfg.partial : 0;
      mount.innerHTML = head(i) +
        `<div class="fd-problem"><h5>${g.title}</h5><div class="fd-givens">${cfg.givens(g)}</div>
         ${i === 0 ? "" : `<p class="fd-note">${i === 1 ? `The first ${showN} steps are done for you. Work out the rest.` : "Nothing is filled in this time."} Answers within a penny count. If one step is off, the next ones are marked against your own figure.</p>`}
         <ol class="fd-steps">${cfg.steps.map((s, k) => stepRow(s, v, g, k < showN)).join("")}</ol>
         <div class="fd-actions">${i === 0 ? "" : '<button type="button" class="btn btn-primary fd-check">Check my answers</button><button type="button" class="btn btn-ghost fd-show" hidden>Show the working</button>'}</div>
         <div class="fd-out"></div></div>`;
      if (i === 0) { worked(g, v); return; }
      let tries = 0;
      $(".fd-check", mount).addEventListener("click", () => {
        tries++;
        const ok = mark(g, v);
        if (ok) finish(g, v);
        else if (tries >= 2) $(".fd-show", mount).hidden = false;
      });
      $(".fd-show", mount).addEventListener("click", () => {
        cfg.steps.forEach((s) => {
          const li = $(`.fd-step[data-k="${s.k}"]`, mount);
          if (li && !li.classList.contains("is-ok")) {
            $(".fd-fb", li).innerHTML = `Working: ${s.work(v, g)} = <b>${gbp(v[s.k])}</b>`;
            $(".fd-fb", li).className = "fd-fb is-show";
          }
        });
      });
      track("lab/" + cfg.id + "-" + i);
    }
    function worked(g, v) {
      const out = $(".fd-out", mount);
      if (cfg.done) cfg.done(v, g, out);
      const [q, opts, c, why] = cfg.check;
      const box = document.createElement("div");
      box.className = "fd-self";
      box.innerHTML = `<p class="fd-self-q"><b>Quick check before you try one:</b> ${q}</p>
        <div class="fd-self-opts" role="group" aria-label="Answers">${opts.map((o, k) => `<button type="button" class="fnc-opt" data-k="${k}">${o}</button>`).join("")}</div>
        <p class="fd-self-fb" role="status" aria-live="polite"></p><div class="fd-actions fd-route"></div>`;
      out.after(box);
      box.addEventListener("click", (e) => {
        const b = e.target.closest(".fnc-opt");
        if (!b || box.dataset.answered) return;
        box.dataset.answered = "1";
        const right = +b.dataset.k === c;
        $$(".fnc-opt", box).forEach((o) => { o.disabled = true; if (+o.dataset.k === c) o.classList.add("is-right"); else if (o === b) o.classList.add("is-wrong"); });
        $(".fd-self-fb", box).textContent = (right ? "✓ Right. " : "✗ Not quite. ") + why;
        const route = $(".fd-route", box);
        // anyone who gets it right can skip the part-filled problem (it helps beginners, but slows down people who already know it)
        route.innerHTML = right
          ? '<button type="button" class="btn btn-primary" data-go="2">Try one on your own →</button><button type="button" class="btn btn-ghost" data-go="1">Do the part-filled one first</button>'
          : '<button type="button" class="btn btn-primary" data-go="1">Try a part-filled one →</button>';
        $$("[data-go]", route).forEach((x) => x.addEventListener("click", () => { render(+x.dataset.go); mount.scrollIntoView({ block: "start", behavior: "smooth" }); }));
        $("[data-go]", route).focus();
      });
    }
    function mark(g, ref) {
      const lv = {}; let all = true;
      cfg.steps.forEach((s) => {
        const li = $(`.fd-step[data-k="${s.k}"]`, mount);
        const expected = s.calc(ref, g), own = s.calc(lv, g);
        if (!li) { lv[s.k] = expected; return; }
        const inp = $("input", li), fb = $(".fd-fb", li), raw = inp.value.trim(), x = parseFloat(raw);
        VHMistakes.clear(fb);
        li.classList.remove("is-ok", "is-bad");
        if (raw === "" || isNaN(x)) { fb.textContent = "Fill this in."; fb.className = "fd-fb is-bad"; all = false; lv[s.k] = own; li.classList.add("is-bad"); return; }
        lv[s.k] = x;
        if (Math.abs(x - expected) <= tolFor(expected)) { fb.textContent = "✓"; fb.className = "fd-fb is-ok"; li.classList.add("is-ok"); return; }
        if (Math.abs(x - own) <= tolFor(own)) { fb.textContent = "✓ Right, from your earlier figure."; fb.className = "fd-fb is-ok"; li.classList.add("is-ok"); return; }
        all = false; li.classList.add("is-bad");
        const hit = (s.errs || []).find((er) => Math.abs(x - er.calc(lv, g)) <= tolFor(er.calc(lv, g)));
        fb.textContent = "✗ " + (hit ? hit.msg : s.hint);
        fb.className = "fd-fb is-bad";
        if (hit && hit.mk) VHMistakes.attach(fb, hit.mk);
      });
      return all;
    }
    function finish(g, v) {
      const out = $(".fd-out", mount);
      if (cfg.done) cfg.done(v, g, out);
      const next = document.createElement("div");
      next.className = "fd-actions fd-next";
      next.innerHTML = stage < 2
        ? `<p class="fd-well">✓ All correct.</p><button type="button" class="btn btn-primary">Next: ${stage === 1 ? "one on your own" : "the next one"} →</button>`
        : `<p class="fd-well">✓ All correct, with nothing filled in. That's the method learned.</p><button type="button" class="btn btn-ghost">↻ Start again from the worked example</button>`;
      out.after(next);
      $(".fd-check", mount).disabled = true;
      $("button", next).addEventListener("click", () => render(stage < 2 ? stage + 1 : 0));
      $("button", next).focus();
      track("lab/" + cfg.id + "-done" + stage);
    }
    render(0);
  }

  /* — m9 · should-cost, three stamped brackets — */
  const pc = (x) => x / 100;
  faded($("#scfMount"), {
    id: "m9f",
    partial: 4,
    givens: (g) => `<ul class="fd-list"><li>Net mass <b>${g.mass} kg</b>, material yield <b>${g.yld}%</b>, steel <b>£${g.price.toFixed(2)}/kg</b></li>
      <li>Press rate <b>£${g.rate}/h</b>, cycle time <b>${g.cycle} s</b>, one operator at <b>£${g.wage}/h</b></li>
      <li>Scrap <b>${g.scrap}%</b> of layers 1–3 · overhead <b>${g.oh}%</b> of layers 1–4 · SG&amp;A <b>${g.sga}%</b> of layers 1–5 · fair margin <b>${g.margin}%</b> of layers 1–6</li>
      <li>The supplier quotes <b>£${g.quote.toFixed(2)}</b></li></ul>`,
    steps: [
      { k: "mat", label: "1 · Material", calc: (v, g) => (g.mass / pc(g.yld)) * g.price, work: (v, g) => `${g.mass} kg ÷ ${g.yld}% × £${g.price.toFixed(2)}`,
        hint: "Material = net mass ÷ yield × price per kg. The offcuts are paid for too.",
        errs: [{ calc: (v, g) => g.mass * g.price, msg: "You've used the net mass. The offcuts are bought too, so divide by the yield first." }] },
      { k: "proc", label: "2 · Process", calc: (v, g) => (g.cycle / 3600) * g.rate, work: (v, g) => `${g.cycle} s ÷ 3,600 × £${g.rate}/h`,
        hint: "Process = cycle time in hours × machine rate.",
        errs: [{ calc: (v, g) => g.cycle * g.rate, msg: "The rate is per hour and the cycle is in seconds. Divide the seconds by 3,600 first." },
               { calc: (v, g) => (g.cycle / 60) * g.rate, msg: "That treats the rate as per minute. It's per hour: divide the seconds by 3,600." }] },
      { k: "lab", label: "3 · Labour", calc: (v, g) => (g.cycle / 3600) * g.wage, work: (v, g) => `${g.cycle} s ÷ 3,600 × £${g.wage}/h`,
        hint: "Labour = cycle time in hours × operators × wage.",
        errs: [{ calc: (v, g) => g.cycle * g.wage, msg: "The wage is per hour. Divide the cycle time by 3,600 first." }] },
      { k: "scrap", label: "4 · Scrap", calc: (v, g) => pc(g.scrap) * (v.mat + v.proc + v.lab), work: (v, g) => `${g.scrap}% × (${gbp(v.mat)} + ${gbp(v.proc)} + ${gbp(v.lab)})`,
        hint: "Scrap is a percentage of layers 1–3 together.",
        errs: [{ calc: (v, g) => pc(g.scrap) * v.mat, msg: "A scrapped part has used machine time and labour as well as material, so take the percentage of layers 1–3, not material alone." }] },
      { k: "oh", label: "5 · Overhead", calc: (v, g) => pc(g.oh) * (v.mat + v.proc + v.lab + v.scrap), work: (v, g) => `${g.oh}% × layers 1–4 (${gbp(v.mat + v.proc + v.lab + v.scrap)})`,
        hint: "Overhead is a percentage of layers 1–4 added up.",
        errs: [{ calc: (v, g) => pc(g.oh) * v.mat, msg: "Overhead goes on layers 1–4, not on material alone." },
               { calc: (v, g) => pc(g.oh) * (v.mat + v.proc + v.lab), msg: "Close: include scrap (layer 4) in the base too." }] },
      { k: "sga", label: "6 · SG&A", calc: (v, g) => pc(g.sga) * (v.mat + v.proc + v.lab + v.scrap + v.oh), work: (v, g) => `${g.sga}% × layers 1–5 (${gbp(v.mat + v.proc + v.lab + v.scrap + v.oh)})`,
        hint: "SG&A is a percentage of layers 1–5 added up." },
      { k: "margin", label: "7 · Fair margin", calc: (v, g) => pc(g.margin) * (v.mat + v.proc + v.lab + v.scrap + v.oh + v.sga), work: (v, g) => `${g.margin}% × layers 1–6 (${gbp(v.mat + v.proc + v.lab + v.scrap + v.oh + v.sga)})`,
        hint: "Fair margin is a percentage of layers 1–6 added up.",
        errs: [{ calc: (v, g) => pc(g.margin) * g.quote, msg: "Take the margin on your own cost build-up (layers 1–6), not on the supplier's quote." }] },
      { k: "total", label: "Should-cost", calc: (v) => v.mat + v.proc + v.lab + v.scrap + v.oh + v.sga + v.margin, work: () => "layers 1 to 7 added up",
        hint: "Add up layers 1 to 7." },
      { k: "gap", label: "The gap", calc: (v, g) => g.quote - v.total, work: (v, g) => `quote £${g.quote.toFixed(2)} − should-cost ${gbp(v.total)}`,
        hint: "The gap is the quoted price minus your should-cost.",
        errs: [{ calc: (v, g) => v.total - g.quote, msg: "The sign is the wrong way round: gap = quote − should-cost. A positive gap is money to discuss." }] },
    ],
    problems: [
      { title: "Bracket A (worked for you)", mass: 0.47, yld: 94, price: 1.6, rate: 90, cycle: 10, wage: 30, scrap: 5, oh: 20, sga: 8, margin: 6, quote: 2.05 },
      { title: "Bracket B", mass: 0.72, yld: 90, price: 1.5, rate: 120, cycle: 6, wage: 28, scrap: 4, oh: 25, sga: 7, margin: 5, quote: 2.10 },
      { title: "Bracket C", mass: 0.329, yld: 94, price: 2.1, rate: 75, cycle: 8, wage: 32, scrap: 6, oh: 30, sga: 8, margin: 6, quote: 1.75 },
    ],
    check: ["In the worked example, why is scrap worked out on layers 1–3 rather than on material alone?",
      ["Because a scrapped part has used machine time and labour as well as material", "Because scrap is always a share of the quote", "Because material is never scrapped", "To make the should-cost bigger"], 0,
      "By the time a part is scrapped, it has used material, press time and labour. All three are lost."],
    done: (v, g, el) => {
      const share = (v.gap / g.quote) * 100;
      el.className = "fd-out sc-gap " + (v.gap > 0.02 ? "sc-gap-over" : "sc-gap-ok");
      el.innerHTML = v.gap > 0.02
        ? `Should-cost <b>${gbp(v.total)}</b> against a quote of <b>£${g.quote.toFixed(2)}</b>: a gap of <b>${gbp(v.gap)}</b>, ${share.toFixed(0)}% of the quote.` +
          (g.oh >= 30 ? " The overhead layer is the one to ask about: 30% usually means a half-empty plant." : " Take the layer that's out of line to the supplier, not a percentage.")
        : `Should-cost <b>${gbp(v.total)}</b> against a quote of <b>£${g.quote.toFixed(2)}</b>. The quote is fair. Pushing further would cut into a fair margin, so spend your effort on another part.`;
    },
  });

  /* — m13 · target costing, from shop price to a target for each function — */
  const PRODUCTS = [
    { title: "A cordless drill (worked for you)", shop: 90, vat: 20, retail: 35, margin: 22, focus: 0,
      fns: [["Convert energy (motor)", 28, 12.4], ["Store energy (battery)", 32, 11.2], ["Transmit torque (gearbox, chuck)", 18, 7.9], ["Control speed (switch, electronics)", 10, 4.1], ["Contain parts (housing)", 7, 3.2]] },
    { title: "A robot vacuum cleaner", shop: 240, vat: 20, retail: 30, margin: 25, focus: 0,
      fns: [["Navigate room (sensors, software)", 18, 22], ["Remove dirt (motor, brushes)", 30, 29.5], ["Store energy (battery)", 22, 25.1], ["Contain dirt (bin, body)", 15, 13.2], ["Control cleaning (board, app)", 10, 12.8]] },
    { title: "An electric kettle", shop: 18, vat: 20, retail: 30, margin: 25, focus: 0,
      fns: [["Heat water (element)", 25, 2.1], ["Contain water (body, lid)", 20, 1.7], ["Control temperature (thermostat)", 10, 1.3], ["Conduct current (base, connector)", 12, 1.2], ["Convey esteem (chrome trim)", 8, 1.3], ["Assemble and pack", 20, 1.4]] },
  ];
  faded($("#tcMount"), {
    id: "m13",
    partial: 2,
    givens: (g) => { const f = g.fns[g.focus]; return `<ul class="fd-list"><li>Shop price <b>£${g.shop}</b>, including VAT at <b>${g.vat}%</b></li>
      <li>The retailer keeps <b>${g.retail}%</b> of the price before VAT</li><li>The business needs a <b>${g.margin}%</b> margin on what it receives</li>
      <li><b>${f[0]}</b> is worth <b>${f[1]}%</b> of the allowable cost and costs <b>£${f[2].toFixed(2)}</b> today</li></ul>`; },
    steps: [
      { k: "exvat", label: "Price before VAT", calc: (v, g) => g.shop / (1 + g.vat / 100), work: (v, g) => `£${g.shop} ÷ ${(1 + g.vat / 100).toFixed(2)}`,
        hint: `VAT is added on top of the price before VAT, so divide the shop price by 1 + the VAT rate.`,
        errs: [{ calc: (v, g) => g.shop * (1 - g.vat / 100), msg: "Taking 20% off isn't the same as removing VAT. VAT was added on top, so divide by 1.20." },
               { calc: (v, g) => g.shop, msg: "That's still the shop price. Take the VAT off first." }] },
      { k: "net", label: "Net selling price", calc: (v, g) => v.exvat * (1 - g.retail / 100), work: (v, g) => `${gbp(v.exvat)} × (1 − ${g.retail}%)`,
        hint: "Net selling price = price before VAT, less the retailer's share. It's what the business actually receives.",
        errs: [{ calc: (v, g) => g.shop * (1 - g.retail / 100), msg: "You've taken the retailer's share off the price with VAT in it. Start from the price before VAT." }] },
      { k: "allow", label: "Allowable cost", calc: (v, g) => v.net * (1 - g.margin / 100), work: (v, g) => `${gbp(v.net)} − ${g.margin}% margin`,
        hint: "Allowable cost = net selling price − the margin the business needs.",
        errs: [{ calc: (v, g) => v.net - g.shop * g.margin / 100, msg: "The margin is a share of what the business receives (the net price), not of the shop price." },
               { calc: (v, g) => g.shop * (1 - g.margin / 100), msg: "That starts from the shop price. Use the net selling price: VAT and the retailer's share never reach the business." }] },
      { k: "target", label: "Target for this function", calc: (v, g) => v.allow * g.fns[g.focus][1] / 100, work: (v, g) => `${gbp(v.allow)} × ${g.fns[g.focus][1]}%`,
        hint: "The function's target = allowable cost × its share." },
      { k: "gap", label: "Value gap (today's cost − target)", calc: (v, g) => g.fns[g.focus][2] - v.target, work: (v, g) => `£${g.fns[g.focus][2].toFixed(2)} − ${gbp(v.target)}`,
        hint: "Value gap = what the function costs today minus its target. Positive means it's over target.",
        errs: [{ calc: (v, g) => v.target - g.fns[g.focus][2], msg: "The sign is the wrong way round: gap = today's cost − target. Over target is a positive gap.", mk: "target-creep" }] },
    ],
    problems: PRODUCTS,
    check: ["What does the allowable cost tell the design team?",
      ["The most the product may cost to make, so the business still earns the margin it needs", "The price to charge customers", "What the product costs to make today", "The supplier's target price"], 0,
      "It's worked out from the market price downwards, before the design is fixed. The design has to fit it."],
    done: (v, g, el) => { el.className = "fd-out"; el.innerHTML = waterfall(g, v); },
  });

  function waterfall(g, v) {
    const vat = g.shop - v.exvat, retail = v.exvat - v.net, margin = v.net - v.allow;
    const bars = [["Shop price", 0, g.shop, "tot"], ["VAT", v.exvat, vat, "neg"], ["Retailer", v.net, retail, "neg"], ["Margin", v.allow, margin, "neg"], ["Allowable cost", 0, v.allow, "ok"]];
    const money = g.shop < 100 ? gbp : gbp0;
    const W = 560, H = 190, top = 14, base = H - 30, sc = (base - top) / g.shop, bw = 76, gap = (W - bars.length * bw) / (bars.length + 1);
    const svg = bars.map(([lab, from, h, cls], i) => {
      const x = gap + i * (bw + gap), y = base - (from + h) * sc;
      return `<rect class="wf-${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${Math.max(1, h * sc).toFixed(1)}" rx="4"/>
        <text class="wf-val" x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}">${cls === "neg" ? "−" : ""}${money(h)}</text>
        <text class="wf-lab" x="${(x + bw / 2).toFixed(1)}" y="${H - 12}">${lab}</text>`;
    }).join("");
    const rows = g.fns.map(([f, share, cur], i) => {
      const t = v.allow * share / 100, gp = cur - t;
      return `<tr${i === g.focus ? ' class="is-focus"' : ""}><td>${esc(f)}</td><td>${share}%</td><td>${gbp(t)}</td><td>£${cur.toFixed(2)}</td><td class="${gp > 0.004 ? "is-over" : "is-under"}">${gp > 0.004 ? "+" : ""}${gbp(gp)}</td></tr>`;
    }).join("");
    const shares = g.fns.reduce((s, f) => s + f[1], 0), cur = g.fns.reduce((s, f) => s + f[2], 0);
    const worst = g.fns.map((f) => [f[0], f[2] - v.allow * f[1] / 100]).sort((a, b) => b[1] - a[1])[0];
    return `<figure class="wf"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Waterfall: shop price ${money(g.shop)}, less VAT ${money(vat)}, less the retailer's share ${money(retail)}, less the margin ${money(margin)}, leaves an allowable cost of ${gbp(v.allow)}.">${svg}</svg>
      <figcaption>From shop price to allowable cost.</figcaption></figure>
      <div class="tbl-scroll" tabindex="0" role="region" aria-label="Targets for each function"><table class="wf-table"><thead><tr><th>Function</th><th>Share</th><th>Target</th><th>Today</th><th>Gap</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><th>Total (${shares}% given out, ${100 - shares}% kept in reserve)</th><th></th><th>${gbp(v.allow * shares / 100)}</th><th>£${cur.toFixed(2)}</th><th>${cur - v.allow * shares / 100 > 0 ? "+" : ""}${gbp(cur - v.allow * shares / 100)}</th></tr></tfoot></table></div>
      <p class="wf-note">The biggest gap is <b>${esc(worst[0])}</b> (${worst[1] > 0 ? "+" : ""}${gbp(worst[1])}). That's where the design work starts.${g.focus === 0 && g.fns[0][2] - v.allow * g.fns[0][1] / 100 < worst[1] - 0.004 ? " It isn't always the function you were asked about." : ""}</p>`;
  }

  /* ═════ 3 · FAST diagram builder ═════ */
  const FAST_SETS = [
    { name: "Pocket torch", product: "a pocket LED torch",
      cards: { vis: "Improve visibility", emit: "Emit light", conv: "Convert energy", cond: "Conduct current", sw: "Switch circuit", pow: "Supply power",
        focus: "Focus beam", heat: "Dissipate heat", water: "Resist water", est: "Convey esteem", bad1: "Provide illumination", bad2: "Aluminium tube" },
      ho: "vis", basic: "emit", assumed: "pow",
      how: [["vis", "emit"], ["emit", "conv"], ["conv", "cond"], ["cond", "sw"], ["sw", "pow"], ["cond", "pow"]],
      when: ["focus", "heat", "sw"], allTime: ["water", "est"],
      bad: { bad1: "“Provide” is an empty verb, so this isn't a function. The real job is already on the board: emit light.", bad2: "That's a part, not a function. Ask what the tube does: it contains the parts and resists water." },
      pre: { ho: "vis", basic: "emit", as: "pow", a1: "water" } },
    { name: "Stapler", product: "a desk stapler",
      cards: { org: "Organise documents", fasten: "Fasten paper", drive: "Drive staple", force: "Transmit force", pierce: "Pierce paper", clinch: "Clinch staple",
        apply: "Apply force", feed: "Feed staple", store: "Store staples", est: "Convey esteem", bad1: "Enable stapling", bad2: "Steel spring" },
      ho: "org", basic: "fasten", assumed: "apply",
      how: [["org", "fasten"], ["fasten", "drive"], ["fasten", "pierce"], ["pierce", "drive"], ["drive", "force"], ["force", "apply"]],
      when: ["clinch", "feed", "pierce"], allTime: ["store", "est"],
      bad: { bad1: "“Enable” is an empty verb, so this isn't a function. Say what physically happens: drive staple, fasten paper.", bad2: "That's a part, not a function. Ask what the spring does: it stores energy and feeds the next staple." },
      pre: {} },
  ];
  const SLOTS = [["ho", "Higher-order (WHY?)"], ["basic", "Basic function"], ["c1", "HOW? step 1"], ["c2", "HOW? step 2"], ["c3", "HOW? step 3"], ["as", "Assumed (outside the study)"],
    ["a1", "All the time 1"], ["a2", "All the time 2"], ["w1", "WHEN 1"], ["w2", "WHEN 2"], ["w3", "WHEN 3"]];

  function fastLab(mount) {
    if (!mount) return;
    const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
    function intro() {
      mount.innerHTML = `<div class="fd-self"><p class="fd-self-q"><b>Quick check on the kettle above:</b> reading the diagram from right to left, WHY do we conduct current?</p>
        <div class="fd-self-opts" role="group" aria-label="Answers">${["To supply power", "To generate heat", "To prepare a beverage", "To protect the user"].map((o, k) => `<button type="button" class="fnc-opt" data-k="${k}">${o}</button>`).join("")}</div>
        <p class="fd-self-fb" role="status" aria-live="polite"></p><div class="fd-actions fd-route"></div></div>`;
      const box = $(".fd-self", mount);
      box.addEventListener("click", (e) => {
        const b = e.target.closest(".fnc-opt");
        if (!b || box.dataset.answered) return;
        box.dataset.answered = "1";
        const right = +b.dataset.k === 1;
        $$(".fnc-opt", box).forEach((o) => { o.disabled = true; if (+o.dataset.k === 1) o.classList.add("is-right"); else if (o === b) o.classList.add("is-wrong"); });
        $(".fd-self-fb", box).textContent = (right ? "✓ Right. " : "✗ Not quite. ") + "Moving left asks WHY: we conduct current to generate heat, and generate heat to heat water.";
        $(".fd-route", box).innerHTML = right
          ? '<button type="button" class="btn btn-primary" data-go="1">Build a stapler, from scratch →</button><button type="button" class="btn btn-ghost" data-go="0">Start with a torch, part-built</button>'
          : '<button type="button" class="btn btn-primary" data-go="0">Build a torch, part-built →</button>';
        $$("[data-go]", box).forEach((x) => x.addEventListener("click", () => board(+x.dataset.go)));
        $("[data-go]", box).focus();
      });
    }
    function board(si) {
      const S = FAST_SETS[si];
      const placed = Object.assign({}, S.pre), locked = new Set(Object.keys(S.pre));
      let selected = null; // { card, from: slotId | null }
      track("lab/m4f-" + si);
      mount.innerHTML = `<ol class="fd-track" aria-label="Your progress"><li class="is-done"><span>1</span>Worked example</li>
          <li class="${si === 0 ? "is-on" : "is-done"}"${si === 0 ? ' aria-current="step"' : ""}><span>2</span>Part-built</li><li class="${si === 1 ? "is-on" : ""}"${si === 1 ? ' aria-current="step"' : ""}><span>3</span>From scratch</li></ol>
        <h5 class="fx-title">FAST diagram for ${S.product}</h5>
        <p class="fd-note">${si === 0 ? "Four cards are placed for you." : "Nothing is placed this time."} Put the HOW chain between the scope lines, the WHEN functions below it and the all-the-time functions above. One slot can stay empty.</p>
        <div class="fx-scroll" tabindex="0" role="region" aria-label="FAST diagram board. On a narrow screen, scroll sideways.">
          <div class="fx-board">
            <div class="fx-axis"><span>← WHY?</span><span>HOW? →</span></div>
            <div class="fx-scope fx-scope-l" aria-hidden="true"></div><div class="fx-scope fx-scope-r" aria-hidden="true"></div>
            ${SLOTS.map(([id, label]) => `<button type="button" class="fx-slot fx-${id}" data-slot="${id}"><small>${label}</small><span class="fx-in"></span></button>`).join("")}
          </div>
        </div>
        <p class="fx-help">Cards to place. Drag one onto the diagram, or tap it and then tap a place. Tap a placed card to send it back.</p>
        <div class="fx-pool" role="group" aria-label="Cards to place"></div>
        <div class="fd-actions"><button type="button" class="btn btn-primary fx-check">Check my diagram</button><button type="button" class="btn btn-ghost fx-reset">Start again</button></div>
        <div class="fx-fb" role="status" aria-live="polite"></div>`;
      const pool = $(".fx-pool", mount), fb = $(".fx-fb", mount);
      const say = (t) => { fb.innerHTML = `<p class="fx-say">${esc(t)}</p>`; };
      function draw() {
        const used = new Set(Object.values(placed));
        pool.innerHTML = Object.keys(S.cards).filter((k) => !used.has(k)).sort((a, b) => S.cards[a].localeCompare(S.cards[b]))
          .map((k) => `<button type="button" class="fx-card${selected && selected.card === k ? " is-sel" : ""}" draggable="true" data-card="${k}" aria-pressed="${!!(selected && selected.card === k)}">${esc(S.cards[k])}</button>`).join("") || '<span class="fx-empty">All cards placed.</span>';
        SLOTS.forEach(([id, label]) => {
          const slot = $(`.fx-slot[data-slot="${id}"]`, mount), c = placed[id];
          $(".fx-in", slot).innerHTML = c ? `<span class="fx-card is-placed${locked.has(id) ? " is-locked" : ""}" draggable="${!locked.has(id)}" data-card="${c}">${esc(S.cards[c])}</span>` : "";
          slot.classList.toggle("is-filled", !!c);
          slot.classList.remove("is-ok", "is-bad");
          slot.setAttribute("aria-label", `${label}: ${c ? S.cards[c] + (locked.has(id) ? ", placed for you" : "") : "empty"}`);
        });
      }
      function put(card, slotId, from) {
        if (locked.has(slotId)) { say("That card was placed for you."); return; }
        const prev = placed[slotId];
        if (from) delete placed[from];
        placed[slotId] = card;
        if (prev && from) placed[from] = prev; // swap
        selected = null; draw();
        say(`${S.cards[card]} placed: ${SLOTS.find((s) => s[0] === slotId)[1]}.`);
      }
      pool.addEventListener("click", (e) => {
        const b = e.target.closest(".fx-card");
        if (!b) { if (selected && selected.from) { delete placed[selected.from]; selected = null; draw(); } return; }
        selected = selected && selected.card === b.dataset.card ? null : { card: b.dataset.card, from: null };
        draw();
        if (selected) { $(`.fx-pool .fx-card[data-card="${selected.card}"]`, mount).focus(); say(`${S.cards[selected.card]} picked up. Now choose a place on the diagram.`); }
      });
      $(".fx-board", mount).addEventListener("click", (e) => {
        const slot = e.target.closest(".fx-slot");
        if (!slot) return;
        const id = slot.dataset.slot;
        if (selected) { put(selected.card, id, selected.from); slot.focus(); return; }
        if (placed[id] && !locked.has(id)) { const c = placed[id]; delete placed[id]; draw(); say(`${S.cards[c]} sent back to the cards.`); slot.focus(); }
      });
      // mouse drag and drop (touch and keyboard use tap-to-place above)
      mount.addEventListener("dragstart", (e) => {
        const c = e.target.closest(".fx-card");
        if (!c || c.classList.contains("is-locked")) return;
        const slot = c.closest(".fx-slot");
        selected = { card: c.dataset.card, from: slot ? slot.dataset.slot : null };
        e.dataTransfer.setData("text/plain", c.dataset.card); e.dataTransfer.effectAllowed = "move";
      });
      mount.addEventListener("dragover", (e) => { if (e.target.closest(".fx-slot, .fx-pool")) e.preventDefault(); });
      mount.addEventListener("drop", (e) => {
        const slot = e.target.closest(".fx-slot"), toPool = e.target.closest(".fx-pool");
        if (!selected || (!slot && !toPool)) return;
        e.preventDefault();
        if (slot) put(selected.card, slot.dataset.slot, selected.from);
        else { if (selected.from && !locked.has(selected.from)) delete placed[selected.from]; selected = null; draw(); }
      });
      $(".fx-reset", mount).addEventListener("click", () => board(si));
      $(".fx-check", mount).addEventListener("click", () => check());

      function check() {
        const T = (k) => S.cards[k], items = [], bad = new Set(), good = new Set();
        const linkOK = (a, b) => S.how.some(([x, y]) => x === a && y === b);
        const ok = (slot, msg) => { good.add(slot); items.push(["ok", msg]); };
        const no = (slot, msg, mk) => { bad.add(slot); items.push(["no", msg, mk]); };
        // cards that aren't functions
        Object.entries(placed).forEach(([slot, c]) => { if (S.bad[c]) no(slot, `${T(c)}: ${S.bad[c]}`, "function-words"); });
        // the three anchor positions
        const where = (c) => (S.when.includes(c) ? "It happens at the same time as the basic function, so it hangs below the path." : S.allTime.includes(c) ? "It's needed all the time, so it floats above the path." : "");
        if (placed.basic && !S.bad[placed.basic]) {
          if (placed.basic === S.basic) ok("basic", `${T(S.basic)} is the basic function: the reason ${S.product} exists.`);
          else no("basic", `${T(placed.basic)} isn't the basic function. The basic function is the job the product exists to do; take it away and the product is pointless. ${where(placed.basic)}`);
        }
        if (placed.ho && !S.bad[placed.ho]) {
          if (placed.ho === S.ho && placed.basic === S.basic) ok("ho", `WHY ${lower(T(S.basic))}? To ${lower(T(S.ho))}. That's the customer's goal, outside the left scope line.`);
          else if (placed.ho !== S.ho) no("ho", `${T(placed.ho)} doesn't answer WHY the basic function is done. The higher-order function is the customer's goal.`);
        }
        if (placed.as && !S.bad[placed.as]) {
          if (placed.as === S.assumed) ok("as", `${T(S.assumed)} is taken as given, so it sits outside the right scope line.`);
          else no("as", `${T(placed.as)} is something the study works on, so it belongs inside the scope lines. ${where(placed.as)}`);
        }
        // the HOW chain, read both ways
        const chain = ["c1", "c2", "c3"].map((s) => placed[s] || null);
        const firstGap = chain.indexOf(null);
        if (firstGap !== -1 && chain.slice(firstGap).some(Boolean)) no(["c1", "c2", "c3"][firstGap], "Fill the HOW chain from the left, with no gaps.");
        else if (placed.basic === S.basic) {
          const seq = [S.basic, ...chain.filter(Boolean)];
          if (placed.as) seq.push(placed.as);
          for (let i = 0; i < seq.length - 1; i++) {
            const a = seq[i], b = seq[i + 1], slotB = i + 1 < seq.length - 1 || !placed.as ? ["c1", "c2", "c3"][i] : "as";
            if (S.bad[b] || S.bad[a]) continue;
            if (linkOK(a, b)) ok(slotB, `HOW do you ${lower(T(a))}? ${T(b)}. WHY ${lower(T(b))}? To ${lower(T(a))}. ✓ Reads both ways.`);
            else no(slotB, `HOW do you ${lower(T(a))}? “${T(b)}” doesn't answer that. ${where(b)}`);
          }
          if (chain.filter(Boolean).length === 0) no("c1", "The chain needs at least one HOW step between the basic function and the assumed function.");
        }
        // above and below the path
        ["a1", "a2"].forEach((s) => { const c = placed[s]; if (!c || S.bad[c]) return; if (S.allTime.includes(c)) ok(s, `${T(c)} is needed all the time the product is in use, so it floats above.`); else no(s, `${T(c)} isn't needed all the time. ${where(c) || "It belongs on the HOW chain."}`); });
        ["w1", "w2", "w3"].forEach((s) => { const c = placed[s]; if (!c || S.bad[c]) return; if (S.when.includes(c)) ok(s, `WHEN you ${lower(T(S.basic))}, you also ${lower(T(c))}. ✓`); else no(s, `${T(c)} doesn't happen alongside the basic function. ${where(c) || "It belongs on the HOW chain."}`); });
        // anything left over
        const used = new Set(Object.values(placed));
        const missing = Object.keys(S.cards).filter((k) => !S.bad[k] && !used.has(k));
        if (missing.length) items.push(["no", `Still to place: ${missing.map(T).join(", ")}.`]);

        SLOTS.forEach(([id]) => { const el = $(`.fx-slot[data-slot="${id}"]`, mount); el.classList.toggle("is-ok", good.has(id) && !bad.has(id)); el.classList.toggle("is-bad", bad.has(id)); });
        const allGood = !items.some((x) => x[0] === "no");
        fb.innerHTML = `<p class="fx-sum ${allGood ? "is-ok" : "is-bad"}">${allGood ? "✓ Every link reads both ways. That's a valid FAST diagram." : `${items.filter((x) => x[0] === "no").length} thing${items.filter((x) => x[0] === "no").length > 1 ? "s" : ""} to fix. Read each link aloud.`}</p>
          <ul class="fx-list">${items.map(([k, m]) => `<li class="${k === "ok" ? "is-ok" : "is-bad"}">${k === "ok" ? "✓" : "✗"} ${esc(m)}</li>`).join("")}</ul>`;
        const mk = items.find((x) => x[0] === "no" && x[2]);
        if (mk) VHMistakes.attach($(".fx-list", fb), mk[2]);
        if (allGood) {
          const alt = si === 0 && !placed.c3 ? " Putting “Switch circuit” on the chain after “Conduct current” would also be right: there's more than one valid diagram."
            : si === 1 && placed.c3 ? " Starting the chain at “Drive staple” and hanging “Pierce paper” below would also be right." : "";
          fb.insertAdjacentHTML("beforeend", `<p class="fd-well">${alt.trim() ? alt.trim() : ""}</p><div class="fd-actions">${si === 0
            ? '<button type="button" class="btn btn-primary fx-next">Next: a stapler, from scratch →</button>'
            : '<button type="button" class="btn btn-ghost fx-next">↻ Back to the start</button>'}</div>`);
          $(".fx-next", fb).addEventListener("click", () => (si === 0 ? board(1) : intro()));
          track("lab/m4f-done" + si);
        }
      }
      draw();
    }
    intro();
  }
  fastLab($("#fxMount"));

  /* ═════ 4 · Module 3 lab: function–cost matrix ═════ */
  (function fcLab() {
    const mount = $("#fcMount");
    if (!mount) return;
    const FN = ["Heat water", "Contain water", "Control temperature", "Conduct current", "Convey esteem"];
    const WORTH = [2.0, 0.9, 0.6, 0.7, 0.3];
    const PARTS = [ // name, cost, given split (or null for the learner), accepted range for the learner rows
      ["Heating element", 2.1, [100, 0, 0, 0, 0]],
      ["Thermostat and switch", 1.3, [0, 0, 100, 0, 0]],
      ["Lid and filter", 0.5, [0, 100, 0, 0, 0]],
      ["Body (moulded, coloured)", 1.6, null, "Most teams put 20–40% of the body on Convey esteem (its colour and finish) and the rest on Contain water."],
      ["Base and connector", 1.2, null, "The base and connector carry current to the element: almost all of it is Conduct current."],
      ["Chrome trim", 0.9, null, "The trim holds nothing and heats nothing. It's there to look good: Convey esteem."],
    ];
    const OK = { 3: (r) => r[4] >= 20 && r[4] <= 40 && r[1] + r[4] >= 95, 4: (r) => r[3] >= 80, 5: (r) => r[4] >= 80 };
    mount.innerHTML = `<div class="tbl-scroll" tabindex="0" role="region" aria-label="Function–cost matrix">
      <table class="fc-table"><thead><tr><th>Part (cost)</th>${FN.map((f) => `<th>${f}</th>`).join("")}<th>Row</th></tr></thead><tbody>
      ${PARTS.map(([p, cost, split], i) => `<tr data-i="${i}"><th scope="row">${p}<small>£${cost.toFixed(2)}</small></th>${FN.map((f, j) => split
        ? `<td class="fc-given">${split[j] ? split[j] + "%" : "–"}</td>`
        : `<td><input type="number" min="0" max="100" step="5" inputmode="numeric" aria-label="${p}: % on ${f}" data-i="${i}" data-j="${j}" /></td>`).join("")}<td class="fc-sum"></td></tr>`).join("")}
      </tbody><tfoot>
        <tr><th scope="row">Function cost</th>${FN.map((_, j) => `<td class="fc-cost" data-j="${j}"></td>`).join("")}<td></td></tr>
        <tr><th scope="row">Worth (cheapest known way)</th>${WORTH.map((w) => `<td>£${w.toFixed(2)}</td>`).join("")}<td></td></tr>
        <tr><th scope="row">Value Index</th>${FN.map((_, j) => `<td class="fc-vi" data-j="${j}"></td>`).join("")}<td></td></tr>
      </tfoot></table></div>
      <p class="lab-hint">Value Index = cost ÷ worth (Module 4 covers worth in full). Up to 1.2 is healthy, 1.2–2.0 is worth watching, and above 2.0 is a target.</p>
      <fieldset class="fc-pick"><legend>Which functions would you attack first?</legend>${FN.map((f, j) => `<label><input type="checkbox" value="${j}" /> ${f}</label>`).join("")}</fieldset>
      <div class="fd-actions"><button type="button" class="btn btn-primary" id="fcCheck">Check</button><button type="button" class="btn btn-ghost" id="fcFill">Fill in a typical answer</button></div>
      <div class="fx-fb" id="fcFb" role="status" aria-live="polite"></div>`;
    const rowVals = (i) => (PARTS[i][2] || FN.map((_, j) => parseFloat($(`input[data-i="${i}"][data-j="${j}"]`, mount).value) || 0));
    function calc() {
      const cost = FN.map(() => 0);
      PARTS.forEach(([, c], i) => {
        const r = rowVals(i), s = r.reduce((a, b) => a + b, 0);
        r.forEach((p, j) => { cost[j] += (c * p) / 100; });
        const cell = $(`tr[data-i="${i}"] .fc-sum`, mount);
        cell.textContent = s + "%"; cell.className = "fc-sum " + (Math.abs(s - 100) <= 1 ? "is-ok" : "is-bad");
      });
      cost.forEach((c, j) => {
        $(`.fc-cost[data-j="${j}"]`, mount).textContent = "£" + c.toFixed(2);
        const vi = c / WORTH[j], cell = $(`.fc-vi[data-j="${j}"]`, mount);
        cell.textContent = vi.toFixed(2); cell.className = "fc-vi " + (vi > 2 ? "vi-hot" : vi > 1.2 ? "vi-warm" : "vi-ok");
      });
      return cost;
    }
    mount.addEventListener("input", (e) => { if (e.target.matches("input[type=number]")) calc(); });
    $("#fcFill", mount).addEventListener("click", () => {
      const fill = { 3: [0, 75, 0, 0, 25], 4: [0, 0, 0, 100, 0], 5: [0, 0, 0, 0, 100] };
      Object.entries(fill).forEach(([i, r]) => r.forEach((p, j) => { $(`input[data-i="${i}"][data-j="${j}"]`, mount).value = p || ""; }));
      calc();
    });
    $("#fcCheck", mount).addEventListener("click", () => {
      track("lab/m3");
      const fb = $("#fcFb", mount), cost = calc(), msgs = [];
      let good = true;
      [3, 4, 5].forEach((i) => {
        const r = rowVals(i), s = r.reduce((a, b) => a + b, 0);
        if (Math.abs(s - 100) > 1) { good = false; msgs.push(["no", `${PARTS[i][0]} adds up to ${s}%. Each part's cost must be shared out in full: 100%.`]); }
        else if (!OK[i](r)) { good = false; msgs.push(["no", `${PARTS[i][0]}: ${PARTS[i][3]}`]); }
        else msgs.push(["ok", `${PARTS[i][0]} shared sensibly.`]);
      });
      const picked = $$(".fc-pick input:checked", mount).map((x) => +x.value);
      const targets = cost.map((c, j) => (c / WORTH[j] > 2 ? j : -1)).filter((j) => j >= 0);
      let mk = null;
      if (good) {
        const miss = targets.filter((j) => !picked.includes(j)), extra = picked.filter((j) => !targets.includes(j));
        miss.forEach((j) => msgs.push(["no", `${FN[j]} costs £${cost[j].toFixed(2)} against a worth of £${WORTH[j].toFixed(2)}: a Value Index of ${(cost[j] / WORTH[j]).toFixed(1)}. That's a target.`]));
        extra.forEach((j) => {
          msgs.push(["no", `${FN[j]} has a Value Index of ${(cost[j] / WORTH[j]).toFixed(2)}.` + (j === 0 ? " It's the most expensive function, but it costs about what it's worth, and it's the basic function: the kettle exists to heat water." : " That's worth watching, but not first on the list.")]);
          if (j === 0) mk = "value-index";
        });
        if (!miss.length && !extra.length && picked.length) msgs.push(["ok", `Right: ${targets.map((j) => FN[j]).join(" and ")}. Neither is the most expensive function, but both cost more than twice what they're worth. For esteem, the job is to deliver the same look for less, not to strip it off.`]);
        if (!picked.length) msgs.push(["no", "Tick the functions you'd attack first."]);
        good = good && !miss.length && !extra.length && picked.length > 0;
      } else msgs.push(["no", "Fix the shares above, then pick your targets."]);
      fb.innerHTML = `<p class="fx-sum ${good ? "is-ok" : "is-bad"}">${good ? "✓ That's the Information phase pointing the creative phase at the right targets." : "Not quite yet."}</p>
        <ul class="fx-list">${msgs.map(([k, m]) => `<li class="${k === "ok" ? "is-ok" : "is-bad"}">${k === "ok" ? "✓" : "✗"} ${esc(m)}</li>`).join("")}</ul>`;
      if (mk) VHMistakes.attach($(".fx-list", fb), mk);
    });
    calc();
  })();

  /* ═════ 5 · Module 8 lab: this month's funnel review ═════ */
  (function funnelLab() {
    const mount = $("#funnelMount");
    if (!mount) return;
    // text, right stage, raise at the review?, saving £k a year, why
    const IDEAS = [
      ["Thinner-gauge bracket. Logged by Sam in last week's workshop with a rough saving of £40k a year. Nothing checked yet.", "L1", false, 40, "An idea with an owner and a rough saving, nothing checked: L1. It's new, so nothing to chase yet."],
      ["Merge the two housings. Finance has checked the £120k a year saving and the business case is written. The decision board meets next week.", "L2", false, 120, "The saving is checked by finance but nobody has approved it yet: L2."],
      ["Recycled plastic for the lid. Approved by the board in May. Tooling ordered; production trial in August.", "L3", false, 30, "Approved, not yet in production: L3, on track."],
      ["Remove the redundant clip. In production since March. Finance confirmed £35k a year against the fixed starting cost.", "L4", false, 35, "In production and checked by finance: L4. It counts."],
      ["Lighter carton. Approved in January. The owner left the company in April and nothing has happened since.", "L3", true, 25, "Still L3, but stuck with no owner. Raise it: name a new owner and date, or drop it on purpose."],
      ["New motor supplier. In production since June. Finance confirmed £60k a year against the fixed starting cost.", "L4", false, 60, "In production and checked: L4. It counts."],
      ["Snap-fits instead of screws. Logged eight months ago. No owner has ever been named and it has never been checked.", "L1", true, 50, "Still L1 after eight months with no owner. Every idea needs an owner, a stage and a date, or it's dropped: raise it."],
      ["Aluminium to steel heat sink. Finance has checked the £55k a year saving. Simulation shows it runs 4 °C hotter; the business case is being written.", "L2", false, 55, "Saving checked, not yet approved: L2. The heat result goes in the business case as a risk."],
    ];
    mount.innerHTML = `<p class="lab-hint">Stages from Module 8: <b>L1</b> idea · <b>L2</b> validated (saving checked by finance) · <b>L3</b> approved · <b>L4</b> implemented (in production and checked against the fixed starting cost).</p>
      <ol class="fn-list">${IDEAS.map(([t], i) => `<li class="fn-item" data-i="${i}"><p>${t}</p>
        <div class="fn-ctl"><label>Stage <select data-i="${i}"><option value="">Choose…</option><option>L1</option><option>L2</option><option>L3</option><option>L4</option></select></label>
        <label class="fn-raise"><input type="checkbox" data-i="${i}" /> Raise at the review</label></div><p class="fn-fb" role="status" aria-live="polite"></p></li>`).join("")}</ol>
      <label class="fn-total">Savings you can report as real this month: £<input type="number" id="fnTotal" inputmode="numeric" step="1" min="0" />k a year</label>
      <div class="fd-actions"><button type="button" class="btn btn-primary" id="fnCheck">Check my review</button></div>
      <div class="fx-fb" id="fnFb" role="status" aria-live="polite"></div>`;
    $("#fnCheck", mount).addEventListener("click", () => {
      track("lab/m8");
      let right = 0, chosen = 0;
      IDEAS.forEach(([, stage, raise, , why], i) => {
        const li = $(`.fn-item[data-i="${i}"]`, mount), sel = $("select", li).value, r = $("input", li).checked, fb = $(".fn-fb", li);
        if (sel) chosen++;
        const ok = sel === stage && r === raise;
        if (ok) right++;
        li.classList.toggle("is-ok", ok); li.classList.toggle("is-bad", !ok && !!sel);
        fb.textContent = sel ? (ok ? "✓ " : "✗ ") + why : "";
      });
      const total = parseFloat($("#fnTotal", mount).value), real = IDEAS.filter((x) => x[1] === "L4").reduce((s, x) => s + x[3], 0);
      const fb = $("#fnFb", mount);
      let totalMsg, mk = null;
      if (isNaN(total)) totalMsg = "Enter the saving you'd report.";
      else if (Math.abs(total - real) < 0.5) totalMsg = `✓ £${real}k a year: only the two L4 ideas count.`;
      else {
        const upTo3 = IDEAS.filter((x) => x[1] !== "L1" && x[1] !== "L2").reduce((s, x) => s + x[3], 0);
        totalMsg = `✗ The figure to report is £${real}k a year, from the L4 ideas only.` + (Math.abs(total - upTo3) < 0.5 || total > real ? " Approved and ordered isn't saved yet." : "");
        if (total > real) mk = "counting-early";
      }
      const all = right === IDEAS.length && !isNaN(total) && Math.abs(total - real) < 0.5;
      fb.innerHTML = `<p class="fx-sum ${all ? "is-ok" : "is-bad"}">${chosen < IDEAS.length ? `Choose a stage for all ${IDEAS.length} ideas. ` : ""}${right} of ${IDEAS.length} ideas right. ${esc(totalMsg)}</p>` +
        (all ? `<p class="fd-well">That's a review that takes 30 minutes: two ideas to chase, one honest number for the report.</p>` : "");
      if (mk) VHMistakes.attach($(".fx-sum", fb), mk);
    });
  })();
})();
