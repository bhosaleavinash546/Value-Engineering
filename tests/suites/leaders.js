// VAVE for Leaders (leaders.html): navigation, quick-check gating, the six
// interactive tools, feedback, the quiz, the certificate and the phone layout.
const fs = require("fs");
const path = require("path");
const { demoContext } = require("../lib");

module.exports = async function leaders({ browser, O, r, ROOT }) {
  const errs = [];
  const track = (p) => { p.on("pageerror", (e) => errs.push(e.message)); return p; };
  const open = (p, id) => p.evaluate((id) => document.querySelector(`#modNav .mod-link[data-target="${id}"]`).click(), id);
  const U = `${O}/leaders.html`;
  const src = fs.readFileSync(path.join(ROOT, "leaders-data.js"), "utf8");
  const C = new Function("window", src + "; return window.VH_COURSE;")({});

  // ── open to everyone (live config, not signed in)
  let ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  let p = track(await ctx.newPage());
  await p.goto(U); await p.waitForTimeout(900);
  r.ok((await p.$$("#modNav .mod-link")).length === 8, "sidebar lists 7 modules + the quiz");
  r.ok((await p.$$(".cat-card")).length === 8, "course-at-a-glance lists 7 modules + the quiz");
  await p.click(".cat-card[data-open=l4]"); await p.waitForTimeout(300);
  r.ok(!!(await p.$('section[data-mod="l4"].is-visible')), "any module opens without an account");
  r.ok(await p.$eval('.tmod-done[data-done="l4"]', (b) => b.disabled), "'Mark complete' waits for the quick check");
  await ctx.close();

  // ── signed in (demo): the tools, quick checks and completion
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage());
  await p.goto(U); await p.waitForTimeout(900);
  r.ok(!!(await p.$('section[data-mod="l0"].is-visible')), "first visit opens Module 0");
  await p.click('.tmod-done[data-done="l0"]'); await p.waitForTimeout(300);
  r.ok(!!(await p.$('section[data-mod="l1"].is-visible')), "Module 0 leads on to Module 1");

  // M1 calculator: 50p × 200,000 at 8% → £100,000 and £1.25 million
  const pe = await p.textContent("#peCards");
  r.ok(pe.includes("£100,000") && pe.includes("£1.25 million"), `profit-equivalent calculator matches the worked example (${pe.replace(/\s+/g, " ").trim()})`);
  await p.selectOption("#peCur", "₹"); await p.fill("#peSave", "10"); await p.fill("#peVol", "100000"); await p.fill("#peMargin", "10"); await p.waitForTimeout(100);
  const inr = await p.textContent("#peCards");
  r.ok(inr.includes("₹10 lakh") && inr.includes("₹1 crore"), `calculator works in rupees, in lakh and crore (${inr.replace(/\s+/g, " ").trim()})`);

  // quick check gating on Module 1
  const answer = async (id) => {
    for (const [qi, q] of C.quick[id].entries()) await p.click(`.qcheck[data-qc="${id}"] .qc-item[data-qi="${qi}"] .qc-opt[data-oi="${q[2]}"]`);
  };
  await p.click(`.qcheck[data-qc="l1"] .qc-item[data-qi="0"] .qc-opt[data-oi="0"]`);
  r.ok((await p.textContent(`.qcheck[data-qc="l1"] .qc-item[data-qi="0"] .qc-expl`)).includes("Not quite"), "a wrong quick-check answer explains why");
  await answer("l1");
  r.ok(!(await p.$eval('.tmod-done[data-done="l1"]', (b) => b.disabled)), "passing the quick check unlocks 'Mark complete'");
  await p.click('.tmod-done[data-done="l1"]'); await p.waitForTimeout(300);

  // M2 value-move challenge: answer all correctly
  for (let i = 0; i < 5; i++) {
    for (let o = 0; o < 4; o++) {
      const ok = await p.evaluate(({ i, o }) => { const b = document.querySelector(`#vmChalMount .fnc-item[data-qi="${i}"] .fnc-opt[data-oi="${o}"]`); if (b.disabled) return true; b.click(); return b.classList.contains("is-right"); }, { i, o });
      if (ok) break;
    }
  }
  r.ok((await p.textContent("#vmChalMount .fnc-score")).includes("/ 5"), "'pick the value move' scores all five scenarios");
  await answer("l2"); await p.click('.tmod-done[data-done="l2"]'); await p.waitForTimeout(300);

  // M3 job plan
  await p.click('.jp-step[data-s="5"]'); await p.waitForTimeout(150);
  r.ok((await p.textContent("#jpStage")).includes("signed decision log") && (await p.getAttribute('.jp-step[data-s="5"]', "aria-pressed")) === "true", "job-plan steps show what each step produces");
  await answer("l3"); await p.click('.tmod-done[data-done="l3"]'); await p.waitForTimeout(300);

  // M4 business case: 30p × 300,000, £45,000 → 6 months, delay costs £45,000
  const bq = await p.textContent("#bqCards");
  r.ok(bq.includes("£90,000") && bq.includes("6.0 months") && bq.includes("£45,000"), "business case matches the worked example");
  r.ok((await p.textContent("#bqVerdict")).includes("Likely yes"), "business case gives a board verdict");
  await p.fill("#bqOne", "400000"); await p.waitForTimeout(100);
  r.ok((await p.textContent("#bqVerdict")).includes("Likely no"), "a long payback gets a 'likely no'");
  await answer("l4"); await p.click('.tmod-done[data-done="l4"]'); await p.waitForTimeout(300);

  // M5 readiness check
  for (let i = 0; i < 8; i++) await p.check(`#rdMount input[name="rd${i}"][value="${i < 2 ? 0 : 2}"]`);
  const rd = await p.textContent("#rdOut");
  r.ok(rd.includes("12 / 16") && rd.includes("Name a sponsor"), "readiness check scores and lists next steps");
  await answer("l5"); await p.click('.tmod-done[data-done="l5"]'); await p.waitForTimeout(300);

  // M6 pilot picker
  const pp = await p.textContent("#ppOut");
  r.ok(pp.includes("Best first pilot: Product A") && pp.includes("little freedom to change the design"), "pilot picker ranks candidates and flags deal-breakers");
  await p.fill('.pp-name input[data-p="0"]', "<b>Mixer</b>"); await p.waitForTimeout(100);
  r.ok((await p.textContent("#ppOut")).includes("<b>Mixer</b>"), "product names typed by learners are shown as text");
  r.ok(await p.evaluate(() => { const g = document.querySelector(".pp-grid"); return g.scrollWidth <= g.clientWidth + 1; }), "pilot picker fits its box");
  await answer("l6"); await p.click('.tmod-done[data-done="l6"]'); await p.waitForTimeout(300);
  r.ok(!!(await p.$('section[data-mod="quiz"].is-visible')), "Module 6 leads to the quiz");
  r.ok((await p.textContent("#sideProgText")).includes("6 / 7") || (await p.textContent("#sideProgText")).includes("7 / 7"), `progress counts completed modules (${await p.textContent("#sideProgText")})`);
  r.ok(!!(await p.$('[data-mod="l3"] .mod-feedback')), "every module asks 'Was this module helpful?'");

  // quiz: fail once, then pass
  await p.click("#examStart");
  for (let i = 0; i < 10; i++) {
    const q = await p.textContent(".ex-q");
    const item = C.quiz.find((x) => x[0] === q);
    const wrong = [0, 1, 2, 3].find((k) => k !== item[2]);
    await p.click(`.ex-opt[data-i="${i < 4 ? wrong : item[2]}"]`); await p.click("#exNext");
  }
  r.ok((await p.textContent(".ex-verdict")).includes("Not this time") && (await p.$$(".ex-review-item")).length === 4, "6 of 10 fails and shows the four corrections with explanations");
  await p.click("text=Retake the quiz");
  const positions = [0, 0, 0, 0];
  for (let i = 0; i < 10; i++) {
    const q = await p.textContent(".ex-q");
    const item = C.quiz.find((x) => x[0] === q);
    const btns = await p.$$(".ex-opt");
    for (const [k, b] of btns.entries()) if (+(await b.getAttribute("data-i")) === item[2]) { positions[k]++; await b.click(); }
    await p.click("#exNext");
  }
  r.ok((await p.textContent(".ex-verdict")).includes("passed"), "all correct passes");
  r.ok(positions.filter(Boolean).length >= 2, `answer positions are shuffled (A–D: ${positions.join("/")})`);
  await p.fill("#certNameInput", "Test Leader"); await p.click("#genCert"); await p.waitForTimeout(300);
  r.ok((await p.textContent("#certName")) === "Test Leader" && /^VL-/.test(await p.textContent("#certId")), "certificate shows the name and a VL- ID");
  r.ok(await p.$eval("#cert .cert-seal-img", (i) => i.src.endsWith("cert-seal-leaders.png")), "certificate uses the VAVE for Leaders seal");
  r.ok((await p.textContent("#cert")).includes("a one-hour overview of value analysis and value engineering for senior leaders"), "certificate uses the approved wording");
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("vh-leaders")));
  r.ok(saved.quiz.attempts.length === 2 && saved.quiz.passed && saved.cert && saved.doneAt.l3, "attempts, completion dates and certificate are saved");
  const academy = await p.evaluate(() => localStorage.getItem("vf-academy"));
  r.ok(!academy || !JSON.parse(academy).exam, "the leaders course never touches Academy progress");

  // share link and verification
  const token = await p.evaluate(() => { const e = JSON.parse(localStorage.getItem("vh-leaders")).cert; return btoa(unescape(encodeURIComponent(JSON.stringify({ n: e.name, s: e.score, d: e.date, id: e.id, k: "L" })))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); });
  const cp = track(await ctx.newPage());
  await cp.goto(`${O}/certificate.html?c=${token}`); await cp.waitForTimeout(500);
  r.ok((await cp.textContent(".cert-brand")).includes("VAVE FOR LEADERS") && (await cp.textContent(".cert-body")).includes("VAVE for Leaders") && (await cp.textContent("#certScore")) === "100%", "shared certificate page shows the leaders wording and score");
  r.ok(await cp.$eval(".cert-seal-img", (i) => i.src.endsWith("cert-seal-leaders.png") && i.complete && i.naturalWidth > 0), "shared certificate shows the VAVE for Leaders seal");
  r.ok(await cp.$eval(".cert-path", (e) => e.hidden || getComputedStyle(e).display === "none"), "Academy-only notes are hidden on a leaders certificate");
  await cp.close();
  await ctx.close();

  // ── live site, not signed in: passing asks the learner to sign in for the certificate
  ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("vh-leaders", JSON.stringify({ done: ["l0", "l1", "l2", "l3", "l4", "l5", "l6"], quiz: { attempts: [{ t: new Date().toISOString(), s: 80, p: true }], best: 80, passed: true } })));
  p = track(await ctx.newPage());
  await p.goto(`${U}?open=quiz`); await p.waitForTimeout(1200);
  const link = await p.getAttribute("#quizNext a", "href");
  r.ok(link === "auth.html?next=leaders.html%3Fopen%3Dquiz", "passing without an account offers 'Sign in to get your certificate' and returns to the quiz");
  await ctx.close();

  // ── phone
  ctx = await demoContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p = track(await ctx.newPage());
  for (const id of ["l3", "l5", "l6"]) {
    await p.goto(`${U}?open=${id}`); await p.waitForTimeout(600);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    r.ok(ov <= 0, `phone: ${id} has no sideways scrolling${ov > 0 ? ` (${ov}px)` : ""}`);
  }
  await ctx.close();

  // accessibility of every module (labs included) in both themes
  const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  for (const theme of ["dark", "light"]) {
    ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript((t) => localStorage.setItem("vf-theme", t), theme);
    p = track(await ctx.newPage());
    await p.goto(U); await p.waitForTimeout(700);
    await p.addScriptTag({ content: AXE });
    const bad = [];
    for (const id of ["l0", "l1", "l2", "l3", "l4", "l5", "l6", "quiz"]) {
      await open(p, id); await p.waitForTimeout(600);
      if (id === "quiz") { await p.click("#examStart"); await p.waitForTimeout(200); }
      const v = await p.evaluate(async () => (await axe.run(document.querySelector(".tmod.is-visible"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } })).violations.map((x) => x.id));
      if (v.length) bad.push(`${id}: ${v.join(", ")}`);
    }
    r.ok(!bad.length, `every module passes accessibility checks [${theme}]${bad.length ? ": " + bad.join("; ") : ""}`);
    await ctx.close();
  }

  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
};
