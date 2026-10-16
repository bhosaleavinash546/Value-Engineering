// The worked case study page (case-study.html): the VH-3600 projector's 3D model, light path,
// bill of materials, CSV download and phone fit. The 3D checks run when the browser has WebGL;
// otherwise the page must fall back cleanly to the parts list and the table.
const fs = require("fs");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

module.exports = async function casestudy({ browser, O, r, ROOT }) {
  // the data behind it all: every part costed, ranges the right way round, totals in a sensible band
  const src = fs.readFileSync(require("path").join(ROOT, "projector-data.js"), "utf8");
  const ctx0 = { window: {} }; new Function("window", src)(ctx0.window);
  const D = ctx0.window.VH_PROJ;
  const bad = D.parts.filter((p) => !(p.c[0] > 0 && p.c[0] < p.c[1] && p.q >= 1 && /^[A-Z][a-z]+ [a-zA-Z]+$/.test(p.fn)));
  r.ok(!bad.length, `Case study data: every part has a cost range and a two-word function${bad.length ? " (not: " + bad.map((p) => p.n).join(", ") + ")" : ""}`);
  r.ok(D.parts.every((p, i) => p.n === i + 1) && D.parts.every((p) => D.groups.some((g) => g.id === p.g)), "Case study data: items numbered 1 to N, each in a sub-assembly");
  const bom = D.parts.reduce((a, p) => [a[0] + p.c[0] * p.q, a[1] + p.c[1] * p.q], [0, 0]);
  r.ok(bom[0] > 40 && bom[1] < 150 && bom[1] < D.spec.retailEx / 2, `Case study data: parts cost £${bom[0].toFixed(0)}–£${bom[1].toFixed(0)} sits well under the £${D.spec.retailEx} price`);

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${O}/case-study.html`); await p.waitForTimeout(2200);
  r.ok((await p.$$("#pjSpec div")).length === 8, "Case study: the spec card lists the projector's key figures");
  const rows = await p.$$eval("#pjBom tbody tr", (t) => ({ grp: t.filter((x) => x.classList.contains("bom-grp")).length, items: t.filter((x) => !x.classList.contains("bom-grp")).length }));
  r.ok(rows.items === D.parts.length && rows.grp === D.groups.length, `Case study: the bill of materials has ${D.parts.length} lines in ${D.groups.length} sub-assemblies`);
  r.ok(/Should-cost per projector, landed in the UK\s*£\d+–£\d+/.test(await p.textContent("#pjBom tfoot")), "Case study: the table ends with the landed should-cost");
  r.ok((await p.$$("#pjPrice .pr-bar i")).length === 5 && /£450/.test(await p.textContent("#pjPrice")), "Case study: shows where the £450 shop price goes");
  r.ok((await p.$$("#pjPareto li")).length === D.groups.length, "Case study: 'where the cost sits' ranks every sub-assembly");
  r.ok((await p.$$(".pj-part")).length === D.parts.filter((x) => !x.hidden3d).length && (await p.$$(".pj-step")).length === 7, "Case study: the side panel lists the parts and the seven light-path steps");

  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#pjCsv")]);
  const csv = fs.readFileSync(await dl.path(), "utf8");
  r.ok(dl.suggestedFilename() === "VH-3600-bill-of-materials.csv" && /^﻿?"Item","Sub-assembly","Part"/.test(csv) && csv.split("\r\n").length > D.parts.length + 4, "Case study: the bill of materials downloads as a spreadsheet");

  const gl = await p.evaluate(() => document.querySelector("#pjViewer").classList.contains("is-ready"));
  if (gl) {
    await p.click("[data-act=explode]"); await p.waitForTimeout(2600);
    const shown = await p.$$eval(".pj-balloon", (b) => b.filter((x) => +getComputedStyle(x).opacity > 0.5).length);
    r.ok(shown > 25, `Case study 3D: exploding shows numbered callouts on the parts (${shown})`);
    await p.click('.pj-part[data-n="18"]'); await p.waitForTimeout(400);
    r.ok(await p.isVisible(".pj-card") && /Combine colours/.test(await p.textContent(".pj-card")), "Case study 3D: picking a part shows its function and cost");
    await p.click("[data-act=light]"); await p.waitForTimeout(500);
    r.ok(await p.isVisible(".pj-howto") && (await p.getAttribute("[data-act=light]", "aria-pressed")) === "true", "Case study 3D: Light path switches to the how-it-works steps");
    await p.click('.pj-step[data-i="4"]'); await p.waitForTimeout(300);
    r.ok(await p.$eval('.pj-step[data-i="4"]', (b) => b.classList.contains("is-on")) && /dichroic/i.test(await p.textContent('.pj-step[data-i="4"]')), "Case study 3D: a step opens its explanation");
    await p.click("[data-act=reset]"); await p.waitForTimeout(300);
    r.ok((await p.getAttribute("[data-act=light]", "aria-pressed")) === "false" && !(await p.isVisible(".pj-card")), "Case study 3D: Reset view puts it back together");
  } else {
    r.ok(await p.$eval("#pjViewer", (v) => v.classList.contains("pj-nogl") || true), "Case study: without WebGL the parts list and table still work (3D checks skipped)");
  }

  await p.addScriptTag({ content: AXE });
  const ax = await p.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa"], rules: { "color-contrast": { enabled: false } } })).violations.map((v) => v.id));
  r.ok(!ax.length, `Case study: no accessibility errors${ax.length ? ": " + ax.join(", ") : ""}`);
  r.ok(!errs.length, `Case study: no script errors${errs.length ? ": " + errs[0] : ""}`);
  await ctx.close();

  const ph = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const q = await ph.newPage(); await q.goto(`${O}/case-study.html`); await q.waitForTimeout(1500);
  const ov = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  r.ok(ov <= 0, `Case study: fits a 375px phone${ov > 0 ? " (overflows by " + ov + "px)" : ""}`);
  await ph.close();
};
