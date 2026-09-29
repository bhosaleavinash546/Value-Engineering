// Homepage and the ten guide pages: old links redirect, the tools on each guide
// work, navigation (desktop and phone menu), contents lists and skip links.
module.exports = async function guides({ browser, O, r }) {
  const errs = [];
  const mk = async (w = 1366, mobile = false) => {
    const p = await (await browser.newContext({ viewport: { width: w, height: 900 }, isMobile: mobile, hasTouch: mobile })).newPage();
    p.on("pageerror", (e) => errs.push(p.url() + " :: " + e.message));
    return p;
  };
  const done = (p) => p.context().close();

  // Old one-page links
  const map = { save: "job-plan", fast: "function-analysis", levers: "cost-levers", ideation: "ideation", tech: "technology", benchmark: "benchmarking", industries: "industries", governance: "governance", toolkit: "toolkit", glossary: "glossary" };
  for (const [old, slug] of Object.entries(map)) {
    const p = await mk(); await p.goto(`${O}/#${old}`); await p.waitForURL(`**/${slug}/`, { timeout: 4000 }).catch(() => {});
    r.ok(p.url() === `${O}/${slug}/`, `/#${old} redirects to /${slug}/`); await done(p);
  }
  for (const keep of ["about", "faq", "diagnose", "engage"]) {
    const p = await mk(); await p.goto(`${O}/#${keep}`); await p.waitForTimeout(500);
    r.ok(p.url() === `${O}/#${keep}`, `/#${keep} stays on the homepage`); await done(p);
  }

  // Tools on the guide pages
  let p = await mk(); await p.goto(`${O}/job-plan/`); await p.waitForTimeout(900);
  await (await p.$$(".save-tab"))[2].click(); await p.waitForTimeout(300);
  r.ok(await p.$eval(".save-panel.is-active", (e) => e.textContent.includes("Creative")), "Job plan: phase tabs switch");
  r.ok(await p.$eval(".save-tab:nth-child(3)", (e) => e.getAttribute("aria-selected") === "true"), "Job plan: selected tab is announced to screen readers");
  r.ok((await p.$$(".guide-toc a")).length >= 3, "Job plan: 'On this page' contents list");
  await done(p);

  p = await mk(); await p.goto(`${O}/cost-levers/`); await p.waitForTimeout(900);
  await p.click('#leverFilters .chip[data-filter="sourcing"]'); await p.waitForTimeout(500);
  const vis = await p.$$eval("#leverGrid .lever", (ls) => ls.filter((l) => !l.classList.contains("is-hidden")).length);
  r.ok(vis > 0 && vis < 36, `Cost levers: filter works (${vis} sourcing levers)`);
  await p.click("#selPains .pain"); await p.waitForTimeout(300);
  r.ok((await p.$$("#selResults li")).length === 5, "Cost levers: lever selector ranks the top 5");
  await done(p);

  p = await mk(); await p.goto(`${O}/ideation/`); await p.waitForTimeout(900);
  await p.$eval("#fSlider", (s) => { s.value = 9; s.dispatchEvent(new Event("input")); });
  r.ok((await p.textContent("#viNum")) !== "", "Ideation: value index simulator responds");
  r.ok((await p.getAttribute("#viVerdict", "aria-live")) === "polite", "Ideation: simulator verdict is read out");
  await done(p);

  p = await mk(); await p.goto(`${O}/benchmarking/`); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelector("[data-xview]").scrollIntoView({ block: "center" })); await p.waitForTimeout(900);
  const imgs = await p.$$eval("[data-xview] img", (is) => is.map((i) => i.complete && i.naturalWidth > 0));
  r.ok(imgs.length === 16 && imgs.every(Boolean), `Benchmarking: exploded view loads all ${imgs.length} part photos`);
  r.ok(!!(await p.$(".xv-scene.xp-s2, .xv-scene.xp-s1")), "Benchmarking: explodes on scroll");
  await done(p);

  p = await mk(); await p.goto(`${O}/industries/`); await p.waitForTimeout(900);
  await (await p.$$(".ind-tab"))[3].click(); await p.waitForTimeout(300);
  r.ok(await p.$eval(".ind-panel.is-active", (e) => e.textContent.includes("Appliance")), "Industries: tabs switch");
  await done(p);

  p = await mk(); await p.goto(`${O}/glossary/`); await p.waitForTimeout(900);
  await p.fill("#gSearch", "pugh"); await p.waitForTimeout(300);
  r.ok(await p.$$eval("#gGrid .g-term", (ts) => ts.filter((t) => !t.classList.contains("is-hidden")).length) === 1, "Glossary: search finds a term");
  r.ok((await p.$$("#gGrid .g-term[id^=term-]")).length === 26, "Glossary: 26 terms, each with its own anchor");
  await done(p);
  p = await mk(); await p.goto(`${O}/glossary/#term-cleansheet`); await p.waitForTimeout(700);
  r.ok(await p.evaluate(() => { const b = document.getElementById("term-cleansheet").getBoundingClientRect(); return b.top >= 0 && b.top < innerHeight; }), "Glossary: deep link scrolls to the term");
  await done(p);

  p = await mk(); await p.goto(`${O}/toolkit/`); await p.waitForTimeout(900);
  r.ok((await p.$$(".tool-card")).length >= 7, "Toolkit: lists the templates");
  await done(p);
  p = await mk(); await p.goto(`${O}/toolkit/teardown-bom.html`);
  r.ok((await p.getAttribute(".ver a", "href")) === "../training.html?open=m10", "Toolkit: template links to its Academy module");
  await done(p);

  // Homepage
  p = await mk(); await p.goto(`${O}/`); await p.waitForTimeout(1500);
  r.ok((await p.$$(".pb-card")).length === 10, "Homepage: 10 guide cards");
  r.ok(!!(await p.$("#wizStage")) && !!(await p.$("#estVol")), "Homepage: value diagnosis and savings estimator present");
  r.ok((await p.$$(".faq-item")).length === 8, "Homepage: 8 FAQs");
  await p.evaluate(() => document.querySelector("#wizStage .wiz-opt").click()); await p.waitForTimeout(500);
  r.ok(await p.evaluate(() => document.activeElement.classList.contains("wiz-q")), "Homepage quiz: focus moves to the next question");
  await p.evaluate(() => { const c = document.getElementById("estCur"); c.value = "€"; c.dispatchEvent(new Event("change")); c.dispatchEvent(new Event("input")); });
  r.ok(await p.evaluate(() => { const c = document.getElementById("estCur"); return c.options[c.selectedIndex].text.includes("EUR") && document.getElementById("estSave").textContent.includes("€"); }), "Savings estimator: euro option shows €");
  await p.click('.pb-card[href="benchmarking/"]'); await p.waitForURL("**/benchmarking/");
  r.ok(p.url().endsWith("/benchmarking/"), "Homepage: guide card opens its guide");
  await p.click('#navLinks a[href="cost-levers/"]'); await p.waitForURL("**/cost-levers/");
  r.ok(await p.$eval('#navLinks a[aria-current="page"]', (a) => a.textContent === "Cost Levers"), "Top nav: navigates and highlights the current page");
  await p.click(".brand"); await p.waitForURL(`${O}/`);
  r.ok(p.url() === `${O}/`, "Logo returns home");
  await done(p);

  // Skip link
  p = await mk(); await p.goto(`${O}/governance/`); await p.waitForTimeout(700);
  await p.keyboard.press("Tab");
  r.ok(await p.evaluate(() => document.activeElement.classList.contains("skip-link") || /skip/i.test(document.activeElement.textContent)), "Guide: first Tab lands on 'Skip to content'");
  await done(p);

  // Phone menu
  p = await mk(390, true); await p.goto(`${O}/ideation/`); await p.waitForTimeout(800);
  await p.click("#navToggle"); await p.waitForTimeout(400);
  r.ok(await p.$eval("#navLinks", (n) => n.classList.contains("is-open")), "Phone menu opens");
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  r.ok(await p.evaluate(() => !document.getElementById("navLinks").classList.contains("is-open") && document.activeElement.id === "navToggle"), "Phone menu closes with Esc and returns focus");
  await p.click("#navToggle"); await p.waitForTimeout(400);
  await p.click('#navLinks a[href="glossary/"]'); await p.waitForURL("**/glossary/");
  r.ok(p.url().endsWith("/glossary/"), "Phone menu navigates");
  await done(p);

  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
};
