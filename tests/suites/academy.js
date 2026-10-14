// VE Academy: catalogue and sign-in gate, labs, exam (gate, pass, shuffle,
// certificate), review-mode migration, module feedback and phone layout.
// Signed-in tests run in demo mode (Supabase switched off in the browser only).
const fs = require("fs");
const path = require("path");
const { demoContext } = require("../lib");

const ALL = Array.from({ length: 13 }, (_, i) => "m" + (i + 1));

module.exports = async function academy({ browser, O, r, ROOT }) {
  const errs = [];
  const track = (p) => { p.on("pageerror", (e) => errs.push(e.message)); return p; };
  const open = (p, id) => p.evaluate((id) => document.querySelector(`#modNav .mod-link[data-target="${id}"]`).click(), id);
  const U = `${O}/training.html`;

  // ── Signed out: catalogue and gate (demo config, no learner)
  let ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } }, null);
  let p = track(await ctx.newPage());
  await p.goto(U); await p.waitForSelector("#modNav .mod-link");
  r.ok(await p.$eval("#catWrap", (d) => d.open), "first visit: course catalogue is open");
  r.ok((await p.$$(".cat-card")).length === 14, "catalogue: 13 modules + exam");
  r.ok((await p.textContent(".cat-card[data-open=m1]")).includes("Free preview"), "Module 1 is a free preview");
  await p.click(".cat-card[data-open=m1]"); await p.waitForTimeout(400);
  r.ok(!!(await p.$('section[data-mod="m1"].is-visible')), "Module 1 opens without an account");
  await p.click(".cat-card[data-open=m7]"); await p.waitForTimeout(400);
  r.ok(!(await p.$('section[data-mod="m7"].is-visible')), "signed out: Module 7 stays locked");
  await ctx.close();

  // ── Signed in: labs and course features
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage());
  await p.goto(U); await p.evaluate(() => localStorage.setItem("vf-academy", JSON.stringify({ done: ["m1"], qc: { m2: true } }))); await p.reload();
  await p.waitForSelector("#modNav .mod-link"); await p.waitForTimeout(500);
  r.ok(!(await p.$eval("#catWrap", (d) => d.open)), "returning learner: catalogue collapsed");
  await open(p, "m7"); await p.waitForTimeout(400);
  r.ok(!!(await p.$('section[data-mod="m7"].is-visible')), "signed in: Module 7 opens");
  r.ok((await p.textContent("#bcVerdict")).includes("Ready for the board"), "M7 business-case lab gives a verdict");
  await open(p, "m9"); await p.waitForTimeout(400);
  r.ok((await p.textContent("#scTotal")).includes("1.42"), "M9 should-cost lab totals £1.42");
  r.ok((await p.getAttribute("#scGap", "aria-live")) === "polite", "M9 lab result is read out to screen readers");
  await open(p, "m5"); await p.waitForTimeout(300);
  r.ok((await p.$$("#sprintFn option")).length > 0, "M5 idea sprint dropdown filled");
  const sr = await p.evaluate(() => ({ live: ["scamperPanel", "trizOut", "sprintVerdict", "wmNote", "scGap"].every((id) => document.getElementById(id).getAttribute("aria-live") === "polite"),
    summaries: document.querySelectorAll(".tmod .sr-only").length, fast: document.getElementById("fbStage").getAttribute("aria-hidden") === "true" }));
  r.ok(sr.live && sr.summaries >= 5 && sr.fast, `labs have screen-reader summaries and live results (${sr.summaries} summaries)`);
  r.ok(await p.evaluate(() => [...document.querySelectorAll(".tcase p i")].filter((i) => !i.textContent.startsWith("Source")).every((i) => getComputedStyle(i).display === "inline")), "case-study italics stay inline");

  // exam gate: all 13 modules needed
  await open(p, "exam"); await p.waitForTimeout(400);
  r.ok(!(await p.$("#examStart")) && !!(await p.$("#examNextMod")), "exam locked until all 13 modules are done");
  await p.click("#examNextMod"); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('section[data-mod="m2"] .tmod-done').click()); await p.waitForTimeout(300);
  const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem("vf-academy")));
  r.ok(st2.done.includes("m2") && !!(st2.doneAt && st2.doneAt.m2), "completing a module records the date");
  await open(p, "m2"); await p.waitForTimeout(300);
  r.ok(await p.evaluate(() => document.querySelector(".tmod.is-visible").dataset.mod === "m2"), "'continue' button opens the next unfinished module");
  await ctx.close();

  // ── Full exam (demo mode marks with the dummy bank in tests/fixtures; the real bank is server-only)
  const src = fs.readFileSync(path.join(ROOT, "training.js"), "utf8");
  r.ok(!src.includes("const BANK = [") && !/Right answer m\d/.test(src), "the exam answers are not shipped in the page");
  const positions = [0, 0, 0, 0];
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage());
  await p.goto(U); await p.evaluate((d) => localStorage.setItem("vf-academy", JSON.stringify({ done: d })), ALL); await p.reload(); await p.waitForTimeout(600);
  await open(p, "exam"); await p.waitForTimeout(300);
  r.ok((await p.textContent("#examMount")).includes("two from every module"), "exam intro explains how the 30 questions are chosen");
  await p.click("#examStart"); await p.waitForSelector(".ex-q");
  const mods = new Set();
  for (let i = 0; i < 30; i++) {
    const q = await p.textContent(".ex-q");
    const mm = q.match(/question (m\d+)-/); if (mm) mods.add(mm[1]);
    const btns = await p.$$(".ex-opt");
    for (const [k, bt] of btns.entries()) if ((await bt.textContent()).includes("Right answer")) { positions[k]++; await bt.click(); }
    await p.click("#exNext"); await p.waitForTimeout(20);
  }
  r.ok(mods.size === 13, `every module appears in the paper (${mods.size} of 13)`);
  await p.waitForSelector(".ex-verdict");
  r.ok((await p.textContent(".ex-verdict")).includes("passed"), "all-correct exam passes");
  r.ok(Math.max(...positions) <= 18 && positions.filter(Boolean).length >= 3, `answers are shuffled across positions (A–D: ${positions.join("/")})`);
  await p.fill("#certNameInput", "Test Learner"); await p.click("#genCert"); await p.waitForSelector("#certName");
  await p.waitForTimeout(200);
  r.ok((await p.textContent("#certName")).includes("Test Learner"), "certificate carries the learner's name");
  r.ok(/^VH-/.test(await p.textContent("#certId")), "certificate ID is issued by the exam service");
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("vf-academy")));
  r.ok(Array.isArray(saved.attempts) && saved.attempts.length === 1 && saved.attempts[0].p === true && saved.attempts[0].s === 100, "exam attempt is recorded for the owner dashboard");
  await p.reload(); await p.waitForTimeout(700);
  r.ok((await p.textContent("#navProgText")).trim() === "✓ Certified", "progress badge shows ✓ Certified");
  await ctx.close();

  // ── Failed exam: per-module results, no answers, one-hour wait
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage());
  await p.goto(U); await p.evaluate((d) => localStorage.setItem("vf-academy", JSON.stringify({ done: d })), ALL); await p.reload(); await p.waitForTimeout(600);
  await open(p, "exam"); await p.waitForTimeout(300);
  await p.click("#examStart"); await p.waitForSelector(".ex-q");
  for (let i = 0; i < 30; i++) {
    const btns = await p.$$(".ex-opt");
    for (const bt of btns) if (!(await bt.textContent()).includes("Right answer")) { await bt.click(); break; }
    await p.click("#exNext"); await p.waitForTimeout(20);
  }
  await p.waitForSelector(".ex-verdict");
  const failText = await p.textContent("#examMount");
  r.ok(failText.includes("Not this time") && (await p.$$(".ex-mod-row")).length === 13, "a failed exam shows how you did in each module");
  r.ok(!failText.includes("Right answer"), "a failed exam doesn't reveal the answers");
  r.ok((await p.$$(".ex-goto")).length > 0, "weak modules get a 'Revisit' button");
  await p.reload(); await p.waitForTimeout(600); await open(p, "exam"); await p.waitForTimeout(300);
  await p.click("#examStart"); await p.waitForTimeout(400);
  r.ok((await p.textContent("#examMount")).includes("one-hour break"), "a new attempt has to wait an hour after a fail");
  await ctx.close();

  // ── Resume after sign-in: the account arrives a moment after the page opens (as on the live site)
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } }, null);
  p = track(await ctx.newPage());
  await p.goto(U); await p.evaluate(() => localStorage.setItem("vf-academy", JSON.stringify({ done: ["m1", "m2", "m3"] }))); await p.reload(); await p.waitForTimeout(600);
  const before = await p.evaluate(() => document.querySelector(".tmod.is-visible").dataset.mod);
  await p.evaluate(() => document.dispatchEvent(new CustomEvent("vh-account", { detail: { name: "Late Learner", email: "l@example.com" } })));
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => document.querySelector(".tmod.is-visible").dataset.mod);
  r.ok(before === "m1" && after === "m4", `a learner whose account loads late is taken to their next module (${before} → ${after})`);
  r.ok(await p.evaluate(() => localStorage.getItem("vh-last-course")) === "academy", "the Academy is remembered as the last course used");
  await ctx.close();

  // ── Practice exam: questions from the quick checks and challenges, explained straight away
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage());
  await p.goto(U); await p.waitForTimeout(600);
  await p.evaluate(() => { window.__gc = []; window.goatcounter = { count: (o) => window.__gc.push(o.path) }; });
  await p.click("#revBtn"); await p.waitForSelector("#revModal .rev-q");
  r.ok((await p.$$("#revModal .rev-q")).length === 20, "practice exam deals 20 questions");
  await p.waitForTimeout(100);
  r.ok((await p.evaluate(() => window.__gc)).includes("practice-exam"), "opening the practice exam is counted as an anonymous event");
  await p.click("#revModal .rev-q .rev-opt"); await p.waitForTimeout(100);
  r.ok(/Correct|Not quite/.test(await p.textContent("#revModal .rev-q .rev-why")), "a practice answer is explained straight away");
  await ctx.close();

  // ── Module feedback (live config; the Supabase request is intercepted, nothing is stored)
  const sent = [];
  ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.route("**/rest/v1/module_feedback**", async (rt) => { sent.push(JSON.parse(rt.request().postData() || "null")); await rt.fulfill({ status: 201, body: "" }); });
  p = track(await ctx.newPage());
  await p.goto(U); await p.waitForTimeout(1200);
  await open(p, "m1"); await p.waitForTimeout(500);
  const box = p.locator('[data-mod="m1"] .mod-feedback');
  r.ok((await box.textContent()).includes("Was this module helpful?"), "feedback question shown at the end of the module");
  await box.locator('.mf-btn[data-v="1"]').click(); await p.waitForTimeout(800);
  await box.locator("textarea").fill("More worked examples please"); await box.locator(".mf-send").click(); await p.waitForTimeout(800);
  const rows = sent.map((x) => (Array.isArray(x) ? x[0] : x));
  r.ok(rows.length === 2 && rows[0].module === "m1" && rows[0].helpful === true && rows[0].comment === null, "rating is sent straight away");
  r.ok(rows[1] && rows[1].comment === "More worked examples please", "optional comment is sent");
  r.ok((await box.textContent()).includes("Thanks for your feedback"), "thank-you message shown");
  await p.reload(); await p.waitForTimeout(1000);
  r.ok((await p.locator('[data-mod="m1"] .mod-feedback').textContent()).includes("Thanks"), "answered modules remember the feedback");
  r.ok(await p.evaluate(() => !window.VHVoice.extractAll().some((m) => m.blocks.some((t) => /helpful|improve the course/i.test(t)))), "feedback box is not read out by the narration");
  await ctx.close();

  // ── Phone: the lesson comes first, sidebar collapsed
  ctx = await demoContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p = track(await ctx.newPage());
  await p.goto(U); await p.evaluate(() => localStorage.setItem("vf-academy", JSON.stringify({ done: ["m1"] }))); await p.reload(); await p.waitForTimeout(800);
  r.ok(await p.evaluate(() => { const s = document.getElementById("sideBody"); return !s || s.closest(".is-collapsed") !== null || getComputedStyle(s).display === "none"; }), "phone: course sidebar starts collapsed");
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  r.ok(ov <= 0, "phone: no sideways scrolling");
  await ctx.close();

  // ── Account page counts the right number of questions
  p = track(await browser.newPage()); await p.goto(`${O}/auth.html`); await p.waitForTimeout(500);
  r.ok(await p.evaluate(() => [...document.querySelectorAll("b")].some((b) => b.textContent === "132")), "sign-up page mentions the 132-question bank");
  await p.close();

  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
};
