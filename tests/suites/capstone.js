// The capstone kettle study (capstone.html): the six phases with their checks,
// gates and worked answers, saving and resuming, and the two-page study it builds.
const fs = require("fs");
const { demoContext } = require("../lib");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

module.exports = async function capstone({ browser, O, r }) {
  const errs = [];
  const axe = async (p, sel) => {
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: AXE });
    return p.evaluate(async (s) => (await axe.run(document.querySelector(s), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }))
      .violations.map((x) => `${x.id} (${x.nodes.map((n) => n.target.join(" ")).slice(0, 2).join("; ")})`), sel);
  };
  for (const theme of ["dark", "light"]) {
    const ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
    await ctx.addInitScript((t) => localStorage.setItem("vf-theme", t), theme);
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    const T = `[${theme}]`;
    await p.goto(`${O}/capstone.html`); await p.waitForTimeout(700);
    r.ok((await p.$$("#capSteps button")).length === 7 && /Information/.test(await p.textContent("#capH")), `${T} opens at phase 1 with six phases and the study`);

    // phase 1
    await p.fill("#p1start", "9.00"); await p.fill("#p1target", "8.50");
    r.ok(/still above what the market allows/.test(await p.textContent(".cap-out")), `${T} phase 1: a target above the allowable cost is challenged`);
    await p.fill("#p1target", "7.88");
    r.ok(/taking out £1\.12 a kettle/.test(await p.textContent(".cap-out")), `${T} phase 1: a target at the allowable cost is confirmed with the saving`);
    await p.fill("#p1scope", "In scope: body and trim. Out of scope: the element.");
    await p.click(".cap-worked summary");
    let v = await axe(p, "#capMount"); r.ok(!v.length, `${T} phase 1: accessibility${v.length ? ": " + v.join(", ") : ""}`);
    await p.$$eval(".cap-gate input", (els) => els.forEach((e) => e.click()));
    r.ok(/Gate passed/.test(await p.textContent(".cap-gate-msg")) && !!(await p.$('#capSteps button.is-done[data-go="1"]')), `${T} phase 1: ticking the gate marks the phase done`);

    // phase 2
    await p.click('.cap-nav [data-go="2"]'); await p.waitForTimeout(200);
    r.ok(await p.evaluate(() => document.activeElement && document.activeElement.id === "capH"), `${T} moving on puts focus on the new phase heading`);
    await p.fill("#p2basic", "Heat water"); await p.fill("#p2f0", "Provide safety"); await p.dispatchEvent("#p2f0", "change");
    await p.check('.cap-pick input[value="Heat water"]');
    const o2 = await p.textContent(".cap-out");
    r.ok(/empty verb/.test(o2) && /Value Index is 1\.05/.test(o2) && !!(await p.$('.cap-out .mk-note[data-mistake]')), `${T} phase 2: banned verbs and targeting the biggest cost are explained`);
    await p.uncheck('.cap-pick input[value="Heat water"]'); await p.check('.cap-pick input[value="Control temperature"]'); await p.check('.cap-pick input[value="Convey esteem"]');
    await p.fill("#p2f0", "Contain water"); await p.dispatchEvent("#p2f0", "change");
    r.ok(/Right targets/.test(await p.textContent(".cap-out")), `${T} phase 2: the two functions above a Value Index of 2 are confirmed`);

    // phase 3: use the worked list
    await p.click('.cap-nav [data-go="3"]'); await p.waitForTimeout(200);
    await p.fill("#p3ideas", "Convey esteem: idea one\nControl temperature: idea two");
    r.ok(/Keep going: 10 more/.test(await p.textContent(".cap-out")), `${T} phase 3: counts ideas and asks for more`);
    const ideas = await p.evaluate(() => [...document.querySelectorAll(".cap-ideas li")].map((l) => l.textContent).join("\n"));
    await p.fill("#p3ideas", ideas);
    r.ok(/14/.test(await p.textContent("#p3count")) && /Enough ideas/.test(await p.textContent(".cap-out")), `${T} phase 3: fourteen ideas aimed at functions pass`);

    // phase 4
    await p.click('.cap-nav [data-go="4"]'); await p.waitForTimeout(200);
    const rows = [[0, "0.62", "7", "8", "7"], [3, "0.38", "6", "7", "6"], [10, "0.15", "4", "8", "8"], [7, "0.08", "3", "7", "7"]];
    for (let i = 0; i < 4; i++) {
      const opt = await p.$eval(`#p4i${i}`, (s, k) => s.options[k + 1].value, rows[i][0]);
      await p.selectOption(`#p4i${i}`, opt); await p.fill(`#p4v${i}`, rows[i][1]);
      await p.selectOption(`#p4s${i}`, rows[i][2]); await p.selectOption(`#p4r${i}`, rows[i][3]); await p.selectOption(`#p4e${i}`, rows[i][4]);
    }
    r.ok(/7\.3 · 1st/.test(await p.textContent("#p4t0")) && /winner stays the same/.test(await p.textContent(".cap-out")), `${T} phase 4: weighted scores, ranking and a sensitivity check`);
    v = await axe(p, "#capMount"); r.ok(!v.length, `${T} phase 4: accessibility${v.length ? ": " + v.join(", ") : ""}`);

    // phase 5
    await p.click('.cap-nav [data-go="5"]'); await p.waitForTimeout(200);
    r.ok(/chrome trim/.test(await p.inputValue("#p5idea")) && (await p.inputValue("#p5saving")) === "0.62", `${T} phase 5: starts from the top-ranked idea`);
    await p.fill("#p5tooling", "48000"); await p.fill("#p5test", "6000"); await p.fill("#p5hours", "80");
    r.ok(/£155,000/.test(await p.textContent("#p5cards")) && /4\.6 months/.test(await p.textContent("#p5cards")), `${T} phase 5: business case gives £155,000 a year and 4.6 months payback`);

    // phase 6
    await p.click('.cap-nav [data-go="6"]'); await p.waitForTimeout(200);
    for (const [i, d] of [[0, "Approve"], [1, "Approve with conditions"], [2, "Approve"], [3, "Needs more data"]]) { await p.selectOption(`#p6d${i}`, d); await p.fill(`#p6o${i}`, "Owner"); await p.fill(`#p6w${i}`, "Mar 2027"); }
    r.ok(/£7\.85/.test(await p.textContent("#p6walk")) && /reach the target/.test(await p.textContent(".cap-out")), `${T} phase 6: the cost walk reaches £7.85 against the £7.88 target`);
    v = await axe(p, "#capMount"); r.ok(!v.length, `${T} phase 6: accessibility${v.length ? ": " + v.join(", ") : ""}`);

    // the study
    await p.click('.cap-nav [data-go="7"]'); await p.waitForTimeout(300);
    const rep = await p.textContent("#capReport");
    r.ok((await p.$$("#capReport .rp-page")).length === 2 && /Heat water/.test(rep) && /£155,000/.test(rep) && /inside the £7\.88 target/.test(rep), `${T} the two-page study is built from the learner's work`);
    v = await axe(p, "#capReport"); r.ok(!v.length, `${T} study: accessibility${v.length ? ": " + v.join(", ") : ""}`);
    await p.click("#rpSwap");
    r.ok(/Worked example/.test(await p.textContent("#capReport")), `${T} the worked study can be shown for comparison`);
    await p.emulateMedia({ media: "print" });
    r.ok(await p.evaluate(() => getComputedStyle(document.querySelector(".cap-steps")).display === "none" && getComputedStyle(document.querySelector(".rp-page")).visibility === "visible"), `${T} printing shows only the two study pages`);
    await p.emulateMedia({ media: "screen" });

    // saved and resumed
    await p.reload(); await p.waitForTimeout(600);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem("vh-capstone")));
    r.ok(st.phase === 7 && st.p5.tooling === "48000" && st.gates.p1.every(Boolean), `${T} work and gates are saved and reopen where the learner left off`);
    await ctx.close();
  }
  // phone
  const ctx = await demoContext(browser, { viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  for (const n of [1, 4, 6, 7]) {
    await p.goto(`${O}/capstone.html`); await p.evaluate((n) => localStorage.setItem("vh-capstone", JSON.stringify({ phase: n })), n); await p.reload(); await p.waitForTimeout(400);
    r.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `phone: ${n === 7 ? "the study" : "phase " + n} fits without sideways scrolling`);
  }
  await ctx.close();
  // links from the Academy
  const html = fs.readFileSync(require("path").join(__dirname, "../../training.html"), "utf8");
  r.ok((html.match(/href="capstone\.html"/g) || []).length >= 2, "the Academy links to the capstone from Modules 8 and 13");
  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
};
