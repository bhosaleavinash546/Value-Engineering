// VE Academy practice: the common-mistake notes, the worked examples that fade into
// problems (should-cost m9, target cost m13), the FAST builder (m4) and the labs in
// m3 and m8. Checks the answers are marked fairly, the feedback names the mistake,
// and the result screens pass accessibility checks in both themes and fit a phone.
const fs = require("fs");
const { demoContext } = require("../lib");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

module.exports = async function practice({ browser, O, r }) {
  const errs = [];
  const U = `${O}/training.html`;
  const axe = async (p, sel) => {
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: AXE });
    return p.evaluate(async (s) => (await axe.run(document.querySelector(s), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }))
      .violations.map((x) => `${x.id} (${x.nodes.map((n) => n.target.join(" ")).slice(0, 2).join("; ")})`), sel);
  };

  for (const theme of ["dark", "light"]) {
    const ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
    await ctx.addInitScript((t) => localStorage.setItem("vf-theme", t), theme);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(e.message));
    const open = async (id) => { await p.goto(`${U}?open=${id}`); await p.waitForTimeout(900); };
    const T = `[${theme}]`;

    // ── m3: function–cost matrix
    await open("m3");
    await p.click("#fcFill"); await p.check('.fc-pick input[value="0"]'); await p.click("#fcCheck");
    r.ok(await p.$eval("#fcFb", (e) => /most expensive function/.test(e.textContent) && !!e.querySelector('.mk-note[data-mistake="value-index"]')),
      `${T} m3 lab: picking the most expensive function explains why it isn't the target`);
    await p.uncheck('.fc-pick input[value="0"]'); await p.check('.fc-pick input[value="2"]'); await p.check('.fc-pick input[value="4"]'); await p.click("#fcCheck");
    r.ok(await p.$eval("#fcFb .fx-sum", (e) => e.classList.contains("is-ok")), `${T} m3 lab: the two functions above a Value Index of 2 are the right targets`);
    await p.fill('input[data-i="3"][data-j="1"]', "50"); await p.click("#fcCheck");
    r.ok(/adds up to 75%/.test(await p.textContent("#fcFb")), `${T} m3 lab: a row that doesn't add up to 100% is caught`);
    let v = await axe(p, "#fcLab"); r.ok(!v.length, `${T} m3 lab results: accessibility${v.length ? ": " + v.join(", ") : ""}`);

    // ── m4: FAST builder, tap to place
    await open("m4");
    await p.click('#fxMount .fnc-opt[data-k="0"]');
    r.ok((await p.$$("#fxMount [data-go]")).length === 1, `${T} FAST: a wrong answer on the kettle goes to the part-built torch first`);
    await p.click('#fxMount [data-go="0"]'); await p.waitForTimeout(200);
    const place = async (card, slot) => { await p.click(`#fxMount .fx-pool .fx-card[data-card="${card}"]`); await p.click(`#fxMount .fx-slot[data-slot="${slot}"]`); };
    await place("bad1", "c1"); await p.click("#fxMount .fx-check");
    r.ok(await p.$eval("#fxMount .fx-fb", (e) => /empty verb/.test(e.textContent) && !!e.querySelector('.mk-note[data-mistake="function-words"]')),
      `${T} FAST: a banned-verb card is flagged as a common mistake`);
    await p.click('#fxMount .fx-slot[data-slot="c1"]'); // send it back
    r.ok(!!(await p.$('#fxMount .fx-pool .fx-card[data-card="bad1"]')), `${T} FAST: tapping a placed card sends it back`);
    for (const [c, s] of [["conv", "c1"], ["cond", "c2"], ["sw", "c3"], ["focus", "w1"], ["heat", "w2"], ["est", "a2"]]) await place(c, s);
    await p.click("#fxMount .fx-check");
    r.ok(await p.$eval("#fxMount .fx-sum", (e) => e.classList.contains("is-ok")), `${T} FAST: the torch with Switch circuit on the HOW chain is accepted`);
    v = await axe(p, "#fastPractice"); r.ok(!v.length, `${T} FAST board: accessibility${v.length ? ": " + v.join(", ") : ""}`);
    await p.click("#fxMount .fx-next"); await p.waitForTimeout(200);
    for (const [c, s] of [["org", "ho"], ["fasten", "basic"], ["drive", "c1"], ["force", "c2"], ["apply", "as"], ["pierce", "w1"], ["clinch", "w2"], ["feed", "w3"], ["store", "a1"], ["est", "a2"]]) await place(c, s);
    await p.click("#fxMount .fx-check");
    r.ok(await p.$eval("#fxMount .fx-sum", (e) => e.classList.contains("is-ok")), `${T} FAST: the stapler with Pierce paper below the path is also accepted`);
    await p.click("#fxMount .fx-reset");
    for (const [c, s] of [["org", "ho"], ["fasten", "basic"], ["force", "c1"], ["drive", "c2"], ["apply", "as"]]) await place(c, s);
    await p.click("#fxMount .fx-check");
    r.ok(/HOW do you fasten paper\? “Transmit force” doesn't answer that/.test(await p.textContent("#fxMount .fx-fb")), `${T} FAST: a link in the wrong order is explained with a HOW question`);

    // ── m4: notes in the quick check (second miss only) and the function challenge
    const qc = '.qcheck[data-qc="m4"] .qc-item[data-qi="0"]';
    await p.click(`${qc} .qc-opt[data-oi="0"]`); await p.waitForTimeout(750);
    r.ok(!(await p.$(`${qc} .mk-note`)), `${T} quick check: no mistake note after the first wrong try`);
    await p.click(`${qc} .qc-opt[data-oi="0"]`); await p.waitForTimeout(100);
    r.ok(!!(await p.$(`${qc} .mk-note[data-mistake="function-words"]`)), `${T} quick check: the note appears with the hint after the second wrong try`);
    await p.click('#fncMount .fnc-item[data-qi="0"] .fnc-opt[data-oi="0"]');
    r.ok(!!(await p.$('#fncMount .fnc-item[data-qi="0"] .mk-note[data-mistake="function-words"]')), `${T} function challenge: "Provide heat" shows the banned-verb note`);
    await p.click('#fncMount .fnc-item[data-qi="0"] .mk-note a');
    await p.waitForTimeout(400);
    r.ok(await p.evaluate(() => document.querySelector(".tmod.is-visible").dataset.mod === "m4" && !/open=m4&reload/.test(location.href)), `${T} "Revisit" opens the module in place`);

    // ── m8: funnel review
    await open("m8");
    const ans = ["L1", "L2", "L3", "L4", "L3", "L4", "L1", "L2"];
    for (let i = 0; i < 8; i++) { await p.selectOption(`#funnelMount select[data-i="${i}"]`, ans[i]); if (i === 4 || i === 6) await p.check(`#funnelMount input[type=checkbox][data-i="${i}"]`); }
    await p.fill("#fnTotal", "155"); await p.click("#fnCheck");
    r.ok(await p.$eval("#fnFb", (e) => /£95k/.test(e.textContent) && !!e.querySelector('.mk-note[data-mistake="counting-early"]')), `${T} m8 lab: counting approved ideas as savings is flagged`);
    await p.fill("#fnTotal", "95"); await p.click("#fnCheck");
    r.ok(/8 of 8 ideas right/.test(await p.textContent("#fnFb")) && !(await p.$("#fnFb .mk-note")), `${T} m8 lab: the right review is accepted`);
    v = await axe(p, "#funnelLab"); r.ok(!v.length, `${T} m8 lab results: accessibility${v.length ? ": " + v.join(", ") : ""}`);

    // ── m9: should-cost, faded
    await open("m9");
    r.ok((await p.$$("#scfMount .fd-step.is-shown")).length === 9 && !(await p.$("#scfMount input")), `${T} should-cost: the first bracket is fully worked`);
    await p.click('#scfMount .fd-self .fnc-opt[data-k="0"]');
    r.ok((await p.$$("#scfMount [data-go]")).length === 2, `${T} should-cost: a right answer offers to skip the part-filled problem`);
    await p.click('#scfMount [data-go="1"]'); await p.waitForTimeout(200);
    r.ok((await p.$$("#scfMount .fd-step.is-shown")).length === 4 && (await p.$$("#scfMount input")).length === 5, `${T} should-cost: the part-filled problem shows four layers`);
    // overhead wrong (on material only), the rest worked from it
    for (const [k, x] of [["oh", "0.30"], ["sga", "0.13"], ["margin", "0.10"], ["total", "2.03"], ["gap", "0.07"]]) await p.fill(`#scfMount input[data-k="${k}"]`, x);
    await p.click("#scfMount .fd-check");
    const fbs = await p.$$eval("#scfMount .fd-fb", (els) => els.map((e) => e.className.includes("is-ok")));
    r.ok(!fbs[0] && fbs.slice(1).every(Boolean), `${T} should-cost: one wrong layer doesn't fail the layers after it`);
    r.ok(/not on material alone/.test(await p.textContent("#scfMount .fd-step[data-k=oh] .fd-fb")), `${T} should-cost: the overhead slip gets its own explanation`);
    await p.click("#scfMount .fd-check");
    r.ok(!(await p.$eval("#scfMount .fd-show", (b) => b.hidden)), `${T} should-cost: "Show the working" appears after a second try`);

    // ── m13: target cost, faded, straight to the blank one
    await open("m13");
    await p.click('#tcMount .fd-self .fnc-opt[data-k="0"]'); await p.click('#tcMount [data-go="2"]'); await p.waitForTimeout(200);
    await p.fill('#tcMount input[data-k="exvat"]', "14.40");
    await p.click("#tcMount .fd-check");
    r.ok(/divide by 1\.20/.test(await p.textContent('#tcMount .fd-step[data-k="exvat"] .fd-fb')), `${T} target cost: taking 20% off instead of removing VAT is explained`);
    for (const [k, x] of [["exvat", "15"], ["net", "10.50"], ["allow", "7.88"], ["target", "1.97"], ["gap", "0.13"]]) await p.fill(`#tcMount input[data-k="${k}"]`, x);
    await p.click("#tcMount .fd-check"); await p.waitForTimeout(200);
    r.ok(!!(await p.$("#tcMount .wf svg")) && (await p.$$("#tcMount .wf-table tbody tr")).length === 6, `${T} target cost: solving it shows the waterfall and every function's target`);
    r.ok(/biggest gap is Convey esteem/.test(await p.textContent("#tcMount .wf-note")), `${T} target cost: the biggest gap is named`);
    v = await axe(p, "#tcLab"); r.ok(!v.length, `${T} target-cost results: accessibility${v.length ? ": " + v.join(", ") : ""}`);
    await ctx.close();
  }

  // ── Your week: spaced review and weekly goal (clock fixed to Thursday 15 October 2026)
  {
    const ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 }, acceptDownloads: true });
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.clock.install({ time: new Date("2026-10-15T09:00:00") });
    await p.goto(U); await p.waitForTimeout(600);
    r.ok(/Finish a module and its questions come back/.test(await p.textContent("#vhWeek")), "review: explained before any module is finished");
    const at = (s) => new Date(s).toISOString();
    await p.evaluate((x) => localStorage.setItem("vf-academy", JSON.stringify({ done: ["m1", "m2", "m4"], doneAt: { m1: x[0], m2: x[1], m4: x[2] } })),
      [at("2026-10-08T10:00"), at("2026-10-12T10:00"), at("2026-10-14T10:00")]);
    await p.reload(); await p.waitForTimeout(900);
    r.ok(/3 questions due today/.test(await p.textContent("#vhWeek")), "review: three questions due from modules finished 1+ days ago (a set started earlier today is topped up)");
    await p.selectOption("#vwGoal", "3"); await p.waitForTimeout(200);
    r.ok(/2 of 3/.test(await p.textContent("#vhWeek")) && /This week: 2 of 3 modules/.test(await p.textContent("#myLearn")), "weekly goal: counts this week's modules and shows in the welcome banner instead of a streak");
    r.ok(!/streak/i.test(await p.textContent("#myLearn")), "welcome banner no longer shows a daily streak");
    await p.click("#rvStart");
    for (let i = 0; i < 3; i++) {
      // pick a wrong option for the first question, the right one for the others
      await p.evaluate((wrong) => {
        const rv = JSON.parse(localStorage.getItem("vh-review")), k = rv.day.keys[rv.day.done.length];
        const q = window.VH_PRACTICE.find((x) => { let h = 5381; for (let j = 0; j < x.q.length; j++) h = ((h << 5) + h + x.q.charCodeAt(j)) | 0; return "q" + (h >>> 0).toString(36) === k; });
        const btn = [...document.querySelectorAll("#rvMount .fnc-opt")].find((b) => (+b.dataset.i === q.c) !== wrong);
        btn.click();
      }, i === 0);
      await p.waitForTimeout(100);
      await p.click("#rvMount .rv-next button"); await p.waitForTimeout(100);
    }
    const rv = await p.evaluate(() => JSON.parse(localStorage.getItem("vh-review")));
    r.ok(rv.day.right === 2 && Object.values(rv.miss).every((d) => d === "2026-10-16") && Object.keys(rv.miss).length === 1, "review: a missed question is due again tomorrow");
    const missedMod = await p.evaluate((k) => { const q = window.VH_PRACTICE.find((x) => { let h = 5381; for (let j = 0; j < x.q.length; j++) h = ((h << 5) + h + x.q.charCodeAt(j)) | 0; return "q" + (h >>> 0).toString(36) === k; }); return q && q.mod; }, rv.day.keys[0]);
    const moved = rv.day.from.filter((m) => m !== missedMod);
    r.ok(moved.length > 0 && moved.every((m) => rv.mods[m].stage === 1 && rv.mods[m].next === "2026-10-17"), "review: a module answered correctly moves on to its next review");
    r.ok(!rv.day.from.includes(missedMod) || (rv.mods[missedMod].stage === 0 && rv.mods[missedMod].next === "2026-10-17"), "review: a module whose question was missed keeps its stage");
    r.ok(/Today's review is done: 2 of 3/.test(await p.textContent("#vhWeek")), "review: today's result is shown");
    await p.clock.setSystemTime(new Date("2026-10-16T09:00:00")); await p.reload(); await p.waitForTimeout(800);
    r.ok(/1 question due today, from questions you missed/.test(await p.textContent("#vhWeek")), "review: the next day brings back the missed question");
    await p.click("#vhWeek .vw-cal summary");
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#vwIcs")]);
    const ics = fs.readFileSync(await dl.path(), "utf8");
    r.ok(/RRULE:FREQ=WEEKLY/.test(ics) && /DTSTART:20261019T083000/.test(ics) && /review=1/.test(ics), "calendar reminder: weekly, next Monday 08:30, links to the review");
    await p.goto(`${U}?review=1`); await p.waitForTimeout(1000);
    r.ok(!!(await p.$("#rvMount .rv-q")), "review link from the calendar opens straight into the questions");
    const v = await axe(p, "#vhWeek"); r.ok(!v.length, `Your week: accessibility${v.length ? ": " + v.join(", ") : ""}`);
    await ctx.close();
  }

  // ── phone: the FAST board scrolls inside its box, the page doesn't
  const ctx = await demoContext(browser, { viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${U}?open=m4`); await p.waitForTimeout(900);
  await p.click('#fxMount .fnc-opt[data-k="1"]'); await p.click('#fxMount [data-go="1"]'); await p.waitForTimeout(200);
  await p.tap('#fxMount .fx-pool .fx-card[data-card="fasten"]'); await p.tap('#fxMount .fx-slot[data-slot="basic"]');
  r.ok(await p.$eval('#fxMount .fx-slot[data-slot="basic"]', (s) => /Fasten paper/.test(s.textContent)), "phone: tap a card, then tap a place");
  r.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "phone: the FAST board doesn't widen the page");
  await ctx.close();

  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
};
