/* Robustness checks added after the 360 review: exam resume, bad saved data, shared computers,
   deep links, keyboard focus, escaping, dates in other time zones, printing and small UI rules. */
const fs = require("fs");
const path = require("path");
const { demoContext } = require("../lib");

module.exports = async function ({ browser, O, r, ROOT }) {
  const U = `${O}/training.html`;
  const ALL = Array.from({ length: 13 }, (_, i) => "m" + (i + 1));
  const errs = [];
  const track = (p) => { p.on("pageerror", (e) => errs.push(e.message)); p.on("dialog", (d) => d.accept()); return p; };
  const seeded = (data) => (d) => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem("vf-academy", JSON.stringify(d)); } };

  // ── Exam: a reload in the middle keeps the paper and the answers given so far
  let ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(seeded({ done: ALL }), { done: ALL });
  let p = track(await ctx.newPage());
  await p.goto(U + "?open=exam"); await p.waitForTimeout(700);
  await p.click("#examStart"); await p.waitForSelector(".ex-q");
  const q1 = await p.textContent(".ex-q");
  await p.click(".ex-opt >> nth=1"); await p.click("#exNext"); await p.waitForTimeout(50);
  await p.click(".ex-opt >> nth=2"); await p.waitForTimeout(50);
  await p.reload(); await p.waitForTimeout(800);
  if (!(await p.$(".ex-q"))) { await p.click("#examStart"); await p.waitForSelector(".ex-q"); }
  const back = await p.evaluate(() => ({ text: document.querySelector("#examMount").textContent, head: document.querySelector(".ex-q-head span").textContent, picked: [...document.querySelectorAll(".ex-opt")].findIndex((b) => b.classList.contains("is-picked")) }));
  r.ok(/Welcome back/.test(back.text) && /Question 2/.test(back.head) && back.picked === 2, `exam: a reload carries on at the same question with the answers kept (${back.head}, option ${back.picked})`);
  await p.click("#exPrev"); await p.waitForTimeout(50);
  r.ok((await p.textContent(".ex-q")) === q1 && (await p.evaluate(() => [...document.querySelectorAll(".ex-opt")].findIndex((b) => b.classList.contains("is-picked")))) === 1, "exam: earlier answers are still there after the reload");
  // moving to a module and back doesn't lose the paper
  await p.click('#modNav .mod-link[data-target="m3"]'); await p.waitForTimeout(200);
  await p.click('#modNav .mod-link[data-target="exam"]'); await p.waitForTimeout(200);
  r.ok(!!(await p.$("#examMount .ex-q")), "exam: opening a module and coming back keeps the paper on screen");
  await ctx.close();

  // ── Demo marking: a paper sent twice gets the same result back
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage()); await p.goto(U); await p.waitForTimeout(500);
  const twice = await p.evaluate(async () => {
    const paper = await VHCloud.examStart("leaders");
    const picks = paper.questions.map(() => 0);
    const a = await VHCloud.examSubmit(paper.attempt, picks), b = await VHCloud.examSubmit(paper.attempt, picks);
    return [a.score, b.score, !!b.error];
  });
  r.ok(twice[0] === twice[1] && !twice[2], "exam marking: sending the same paper twice returns the first result");
  await ctx.close();

  // ── Saved data of the wrong shape doesn't break the pages
  for (const bad of ["1", '"x"', '{"done":{}}', '{"exam":{"passed":true}}', '{"attempts":5,"doneAt":3}']) {
    ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
    await ctx.addInitScript((v) => { localStorage.setItem("vf-academy", v); localStorage.setItem("vh-capstone", v); }, bad);
    p = track(await ctx.newPage());
    const before = errs.length;
    await p.goto(U); await p.waitForTimeout(600);
    const ok1 = !!(await p.$(".tmod.is-visible"));
    await p.goto(`${O}/capstone.html`); await p.waitForTimeout(500);
    const ok2 = !!(await p.$("#capMount .cap-phase"));
    r.ok(ok1 && ok2 && errs.length === before, `saved data ${bad} doesn't break the Academy or the capstone`);
    errs.length = before;
    await ctx.close();
  }

  // ── Shared computer: a different person signing in doesn't inherit the last person's progress
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } }, { name: "Second Person", email: "second@example.com" });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem("vh-owner", "e:first@example.com"); localStorage.setItem("vf-academy", JSON.stringify({ done: ["m1", "m2", "m3"] })); localStorage.setItem("vh-capstone", JSON.stringify({ phase: 3, t: 1 })); } });
  p = track(await ctx.newPage()); await p.goto(U); await p.waitForTimeout(600);
  const shared = await p.evaluate(() => ({ owner: localStorage.getItem("vh-owner"), done: (JSON.parse(localStorage.getItem("vf-academy") || "{}").done || []).length, cap: localStorage.getItem("vh-capstone") }));
  r.ok(shared.owner === "e:second@example.com" && shared.done === 0 && !shared.cap, "shared computer: a different learner starts with a clean slate");
  await p.reload(); await p.evaluate(() => localStorage.setItem("vf-academy", JSON.stringify({ done: ["m1"] }))); await p.reload(); await p.waitForTimeout(500);
  r.ok((await p.evaluate(() => JSON.parse(localStorage.getItem("vf-academy")).done.length)) === 1, "shared computer: the same learner keeps their own progress");
  await ctx.close();

  // ── Capstone: just opening the page saves nothing
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage()); await p.goto(`${O}/capstone.html`); await p.waitForTimeout(600);
  r.ok((await p.evaluate(() => localStorage.getItem("vh-capstone"))) === null, "capstone: opening the page doesn't write anything");
  r.ok(await p.evaluate(() => { const ol = document.querySelector("#capSteps"); const last = ol.lastElementChild.getBoundingClientRect(); return last.right <= ol.getBoundingClientRect().right + 1; }), "capstone: all seven steps are visible on a laptop");
  await ctx.close();

  // ── Deep links scroll to the module; choosing a module updates the address
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage()); await p.goto(U + "?open=m4"); await p.waitForTimeout(1500);
  const deep = await p.evaluate(() => { const h = document.querySelector(".tmod.is-visible h2").getBoundingClientRect(); return { top: h.top, mod: document.querySelector(".tmod.is-visible").dataset.mod, focus: document.activeElement.tagName }; });
  r.ok(deep.mod === "m4" && deep.top > 60 && deep.top < 700 && deep.focus === "H2", `a link to a module scrolls to it and focuses its heading (top ${Math.round(deep.top)}px)`);
  await p.click('#modNav .mod-link[data-target="m6"]'); await p.waitForTimeout(400);
  r.ok(/[?&]open=m6\b/.test(await p.evaluate(() => location.search)), "choosing a module puts it in the address, so a reload opens it");
  await ctx.close();

  // ── Practice dialog: focus moves in, Escape closes and returns focus
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage()); await p.goto(U); await p.waitForTimeout(600);
  await p.focus("#revBtn"); await p.keyboard.press("Enter"); await p.waitForTimeout(200);
  const inDialog = await p.evaluate(() => !!document.activeElement.closest("#revModal"));
  for (let i = 0; i < 60; i++) await p.keyboard.press("Tab");
  const stillIn = await p.evaluate(() => !!document.activeElement.closest("#revModal"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  r.ok(inDialog && stillIn && !(await p.$("#revModal")) && (await p.evaluate(() => document.activeElement.id)) === "revBtn", "practice dialog: focus moves in, Tab stays inside, Escape returns to the button");
  await ctx.close();

  // ── Leaders pilot picker: a saved name can't inject markup
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  const evil = '"><img src=x onerror="window.__pwned=1">';
  await ctx.addInitScript((n) => localStorage.setItem("vh-leaders-labs", JSON.stringify({ pp: { names: [n, "B", "C"], vals: [[5, 5, 5, 5, 5], [1, 1, 1, 1, 1], [3, 3, 3, 3, 3]] } })), evil);
  p = track(await ctx.newPage()); await p.goto(`${O}/leaders.html?open=l6`); await p.waitForTimeout(900);
  r.ok(!(await p.evaluate(() => window.__pwned)) && (await p.inputValue('.pp-name input[data-p="0"]')) === evil, "pilot picker: saved candidate names are shown as text");
  await ctx.close();

  // ── Certificate dates don't move a day in time zones west of London
  ctx = await browser.newContext({ timezoneId: "America/Los_Angeles" });
  p = track(await ctx.newPage());
  const tok = Buffer.from(JSON.stringify({ n: "Sam Patel", s: 90, d: "2026-10-15", id: "VH-TEST1234" })).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await p.goto(`${O}/certificate.html?c=${tok}`); await p.waitForTimeout(500);
  r.ok((await p.textContent("#certDate")) === "15 October 2026", "certificate date is the same in Los Angeles");
  await ctx.close();

  // ── Printing a module prints the module (only a certificate on screen is printed on its own)
  ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  p = track(await ctx.newPage()); await p.goto(U + "?open=m1"); await p.waitForTimeout(600);
  await p.emulateMedia({ media: "print" });
  r.ok(await p.evaluate(() => getComputedStyle(document.querySelector(".tmod.is-visible h2")).visibility === "visible"), "printing a module shows the module");
  await ctx.close();

  // ── Small UI rules
  p = track(await browser.newPage({ viewport: { width: 390, height: 844 } }));
  await p.goto(`${O}/`); await p.waitForTimeout(500);
  const ui = await p.evaluate(() => ({
    hiddenLinks: [...document.querySelectorAll("#navLinks a")].filter((a) => getComputedStyle(a).visibility !== "hidden").length,
    border: (() => { const b = document.querySelector("button.btn"); return b ? getComputedStyle(b).borderTopStyle : "none"; })(),
    brandGap: getComputedStyle(document.querySelector(".brand")).columnGap,
  }));
  r.ok(ui.hiddenLinks === 0, "phone: links in the closed menu can't be reached with Tab");
  r.ok(ui.border === "none" || ui.border === "solid", `buttons have no browser bevel border (${ui.border})`);
  r.ok(ui.brandGap === "0px", "the wordmark reads VAVEhub, with no gap");
  await p.close();

  // ── Sign-in form: errors are announced and the field gets the focus
  p = track(await browser.newPage()); await p.goto(`${O}/auth.html`); await p.waitForTimeout(400);
  await p.fill("#si-email", "bad"); await p.click('#form-signin button[type="submit"]'); await p.waitForTimeout(150);
  const a11y = await p.evaluate(() => { const i = document.getElementById("si-email"); const d = (i.getAttribute("aria-describedby") || "").split(" ")[0]; return { inv: i.getAttribute("aria-invalid"), desc: d && document.getElementById(d) ? document.getElementById(d).textContent : "", focus: document.activeElement.id }; });
  r.ok(a11y.inv === "true" && /valid email/.test(a11y.desc) && a11y.focus === "si-email", "sign-in: an error is linked to its field and the field is focused");
  await p.close();

  // ── Service worker: scripts and styles come from the network first, so a release never mixes old code with new pages
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  r.ok(/\\\.\(html\|js\|css\)\$/.test(sw.replace(/\s/g, "")) || /\(html\|js\|css\)/.test(sw), "service worker: pages, scripts and styles are network-first");

  // ── Calendar reminder: long lines are folded (75 characters at most)
  const rv = fs.readFileSync(path.join(ROOT, "academy-review.js"), "utf8");
  r.ok(/map\(fold\)/.test(rv), "calendar file: long lines are folded");

  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
};
