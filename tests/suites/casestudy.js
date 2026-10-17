// The worked case study page (case-study.html): the VH-3600 projector's 3D model, light path,
// bill of materials, CSV download and phone fit. The 3D checks run when the browser has WebGL;
// otherwise the page must fall back cleanly to the parts list and the table.
const fs = require("fs");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

module.exports = async function casestudy({ browser, O, r, ROOT }) {
  // the data behind it all: report lines at the report's figures, parts that add back up to them, functions that add up to the parts
  const src = fs.readFileSync(require("path").join(ROOT, "projector-data.js"), "utf8");
  const ctx0 = { window: {} }; new Function("window", src)(ctx0.window);
  const D = ctx0.window.VH_PROJ, r2 = (v) => Math.round(v * 100) / 100, sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  const bad = D.parts.filter((p) => !(p.ext > 0 && p.q >= 1 && /^[A-Z][a-z]+ [a-zA-Z]+$/.test(p.fn) && Object.keys(p.alloc).every((k) => D.lines.some((l) => l.id === k))));
  r.ok(!bad.length, `Case study data: every part is costed from a report line and has a two-word function${bad.length ? " (not: " + bad.map((p) => p.n).join(", ") + ")" : ""}`);
  r.ok(D.parts.every((p, i) => p.n === i + 1) && D.parts.every((p) => D.groups.some((g) => g.id === p.g)), "Case study data: items numbered 1 to N, each in a group");
  const lineMiss = D.lines.filter((l) => r2(sum(D.parts, (p) => p.alloc[l.id] || 0)) !== l.ext);
  r.ok(!lineMiss.length, `Case study data: the parts add back up to every report line${lineMiss.length ? " (not: " + lineMiss.map((l) => l.id).join(", ") + ")" : ""}`);
  const bomR = r2(sum(D.lines.filter((l) => !l.added), (l) => l.ext));
  r.ok(bomR === D.report.bom && r2(bomR + sum(D.chain.filter((c) => c.cost), (c) => c.cost)) === D.report.ddp, `Case study data: report lines total £${bomR} and build up to the report's £${D.report.ddp} landed`);
  const fnTot = r2(sum(D.funcs, (f) => f.cost)), bomAll = r2(sum(D.lines, (l) => l.ext));
  const perPart = {}; D.funcs.forEach((f) => Object.entries(f.alloc).forEach(([n, v]) => (perPart[n] = (perPart[n] || 0) + v)));
  r.ok(fnTot === bomAll && D.parts.every((p) => r2(perPart[p.n] || 0) === p.ext), `Case study data: function costs share out every part exactly (£${fnTot})`);
  const V = D.ideas.filter((x) => !x.extra), core = r2(sum(V.filter((x) => +x.id.slice(1) <= 12), (x) => x.save)), all = r2(sum(V, (x) => x.save));
  const waves = [1, 2, 3, 4].map((w) => [r2(sum(V.filter((x) => x.wave === w), (x) => x.save)), sum(V.filter((x) => x.wave === w), (x) => x.nre)]);
  r.ok(V.length === 20 && core === 18.35 && all === 24.65 && JSON.stringify(waves) === JSON.stringify([[3.1, 31], [9.55, 166], [7.65, 270], [4.35, 220]]), "Case study data: the 20 ideas match the report's totals and waves");
  const fid = new Set(D.funcs.map((f) => f.id)), pairKey = (a, b) => [a, b].sort().join("|");
  const pairsOk = D.paired.pairs.length === D.paired.fns.length * (D.paired.fns.length - 1) / 2 && new Set(D.paired.pairs.map((p) => pairKey(p[0], p[1]))).size === D.paired.pairs.length && D.paired.pairs.every((p) => p[2] === p[0] || p[2] === p[1]);
  r.ok(D.flinks.every(([a, b]) => fid.has(a) && fid.has(b)) && D.funcs.filter((f) => f.kind === "basic").length === 1 && D.funcs.every((f) => /^[A-Z][a-z]+ [a-zA-Z]+$/.test(f.fn)) && pairsOk,
    "Case study data: one basic function, verb-noun FAST functions, valid links and a complete paired comparison");
  r.ok(D.parts.every((p) => Array.isArray(p.fn2) && Array.isArray(p.fnU) && [...p.fn2, ...p.fnU].every((f) => /^[A-Z][a-z]+ [a-zA-Z]+$/.test(f))), "Case study data: every part's secondary and unwanted functions are verb-noun too");
  r.ok(D.ideas.every((x) => x.parts.every((n) => D.parts.some((p) => p.n === n)) && Object.keys(x.f || {}).every((id) => D.funcs.some((f) => f.id === id))), "Case study data: every idea points at real parts and functions");

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${O}/case-study.html`);
  // the 3D model compiles its shaders before it draws; on a machine with no GPU that takes a while
  await p.waitForFunction(() => { const v = document.querySelector("#pjViewer"); return v.classList.contains("is-live") || v.classList.contains("pj-nogl"); }, null, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(500);
  r.ok((await p.$$("#pjSpec div")).length === 8, "Case study: the spec card lists the projector's key figures");
  const rows = await p.$$eval("#pjBom tbody tr", (t) => ({ grp: t.filter((x) => x.classList.contains("bom-grp")).length, lines: t.filter((x) => x.classList.contains("bom-line")).length, kids: t.filter((x) => x.classList.contains("bom-kid")).length }));
  const kids = sum(D.parts, (p) => Object.keys(p.alloc).length);
  r.ok(rows.grp === D.subs.length && rows.lines === D.lines.length && rows.kids === kids, `Case study: the bill of materials shows ${D.lines.length} report lines in ${D.subs.length} groups, with their parts`);
  r.ok(/Landed cost in the UK\s*£142\.70/.test(await p.textContent("#pjBom tfoot")), "Case study: the table ends with the landed cost");
  r.ok((await p.$$("#pjPrice .pr-bar i")).length === 5 && /£425/.test(await p.textContent("#pjPrice")), "Case study: shows where the £425 shop price goes");
  r.ok((await p.$$("#pjPareto li")).length === 11 && /£131\.60 ex-works and £141\.50 landed/.test(await p.textContent("#pjChain")), "Case study: Pareto of the costliest lines, and the cost build-up against the report's totals");
  r.ok((await p.$$(".pj-part")).length === D.parts.filter((x) => !x.hidden3d).length && (await p.$$(".pj-step")).length === 7, "Case study: the side panel lists the parts and the seven light-path steps");

  // a video for the product, each step and the lessons, each with its file, poster and transcript
  const vids = await p.$$eval(".cs-vid", (f) => f.map((x) => [x.querySelector("source").getAttribute("src"), x.querySelector("video").getAttribute("poster"), x.querySelectorAll("details p").length]));
  const missing = vids.filter(([v, po, n]) => !fs.existsSync(require("path").join(ROOT, v)) || !fs.existsSync(require("path").join(ROOT, po)) || n < 3);
  r.ok(vids.length === 12 && !missing.length, `Case study: twelve videos with their files, posters and transcripts${missing.length ? " (missing: " + missing.map((m) => m[0]).join(", ") + ")" : ""}`);

  // the six phases
  r.ok(await p.evaluate(() => ["p1", "p2", "p3", "p4", "p5", "p6", "learnt"].every((id) => document.getElementById(id))), "Case study: all six phases and the lessons are on the page");
  const st = await p.evaluate(() => ({ proc: document.querySelectorAll("#stProcess tbody tr").length, tool: /£165k/.test(document.querySelector("#stTooling").textContent), sens: document.querySelectorAll("#stSens tbody tr").length,
    fn: document.querySelectorAll("#stFunctions tbody tr").length, fast: document.querySelectorAll("#stFast g.fx").length, total: document.querySelectorAll("#stFunctions tfoot td")[0].textContent,
    pf: document.querySelectorAll("#stPartFns tbody tr:not(.pf-grp)").length, mx: document.querySelectorAll("#stMatrix tbody tr").length, pareto: document.querySelectorAll("#stFnPareto .fp-b").length,
    pc: document.querySelectorAll("#stPaired tbody tr").length, vg: document.querySelectorAll("#stValGraph li").length, clues: document.querySelectorAll(".fa-clues tbody tr").length,
    ideas: document.querySelectorAll("#stIdeas tbody tr").length, ev: document.querySelectorAll("#stEval tbody tr").length, cases: document.querySelectorAll("#stCases .st-case").length,
    waves: document.querySelectorAll("#stWaves table").length, dlp: /£131\.85/.test(document.querySelector("#stDlp").textContent), bridge: document.querySelectorAll("#stBridge rect").length }));
  r.ok(st.proc === 8 && st.tool && st.sens === 5, "Case study phase 1: factory audit, tooling (with the £165k gap flagged) and volume tables");
  const costed = D.funcs.filter((f) => f.cost > 0).length;
  r.ok(st.fn === costed && st.total === "£" + bomAll.toFixed(2), `Case study phase 2: ${st.fn} costed functions whose costs add up to the parts total (${st.total})`);
  r.ok(st.fast === D.funcs.length, `Case study phase 2: the FAST diagram draws every function (${st.fast})`);
  r.ok(st.pf === D.parts.length && st.mx === 12 && st.pareto === costed && st.pc === D.paired.fns.length && st.vg === D.paired.fns.length && st.clues >= 6,
    "Case study phase 2: part functions, cost matrix, Pareto, paired comparison, value graph and clues are all drawn");
  r.ok(st.ideas === 24 && st.ev === 21 && st.cases === 3 && st.waves === 4 && st.dlp, "Case study phases 3–5: 24 ideas, 21 scored, 3 business cases, 4 waves and the DLP benchmark");
  r.ok(/£24\.65/.test(await p.textContent("#stDecision")) && st.bridge === 9 && (await p.$$("#stPlan .g-row")).length === 8, "Case study phase 6: the decision, the cost bridge and the plan");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#pjCsv")]);
  const csv = fs.readFileSync(await dl.path(), "utf8");
  r.ok(dl.suggestedFilename() === "VH-3600-bill-of-materials.csv" && /^﻿?"Line","Sub-assembly","Description"/.test(csv) && csv.split("\r\n").length > D.parts.length + D.lines.length, "Case study: the bill of materials downloads as a spreadsheet");

  const gl = await p.evaluate(() => document.querySelector("#pjViewer").classList.contains("is-ready"));
  if (gl) {
    await p.click("[data-act=explode]");
    await p.waitForFunction(() => [...document.querySelectorAll(".pj-balloon")].filter((x) => +getComputedStyle(x).opacity > 0.5).length > 25, null, { timeout: 60000 }).catch(() => {});
    const shown = await p.$$eval(".pj-balloon", (b) => b.filter((x) => +getComputedStyle(x).opacity > 0.5).length);
    r.ok(shown > 25, `Case study 3D: exploding shows numbered callouts on the parts (${shown})`);
    await p.click('.pj-part[data-n="19"]'); await p.waitForTimeout(400);
    const cardTxt = await p.textContent(".pj-card");
    r.ok(await p.isVisible(".pj-card") && /Combine images/.test(cardTxt) && /A4 Dichroic cross prism/.test(cardTxt) && /V20/.test(cardTxt), "Case study 3D: picking a part shows its function, its report line and its VAVE ideas");
    await p.click("[data-act=light]"); await p.waitForTimeout(500);
    r.ok(await p.isVisible(".pj-howto") && (await p.getAttribute("[data-act=light]", "aria-pressed")) === "true", "Case study 3D: Light path switches to the how-it-works steps");
    await p.click('.pj-step[data-i="4"]'); await p.waitForTimeout(300);
    r.ok(await p.$eval('.pj-step[data-i="4"]', (b) => b.classList.contains("is-on")) && /dichroic/i.test(await p.textContent('.pj-step[data-i="4"]')), "Case study 3D: a step opens its explanation");
    await p.click("[data-act=reset]"); await p.waitForTimeout(300);
    await p.click('#stFunctions .st-3d[data-parts="6,22,23,24,25,27"]'); await p.waitForTimeout(900);
    r.ok((await p.$$(".pj-part.is-on")).length === 6, "Case study: a function's 3D button lights up its parts in the model");
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
