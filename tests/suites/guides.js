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
  r.ok((await p.$$(".tool-card")).length >= 12, "Toolkit: lists the templates");
  const tk = await p.evaluate(async () => {
    const hrefs = [...document.querySelectorAll(".tool-actions a, a.tool-card")].map((a) => a.href), bad = [];
    for (const h of hrefs) { const res = await fetch(h); if (!res.ok) bad.push(h); }
    return { n: hrefs.length, bad };
  });
  r.ok(tk.n >= 23 && !tk.bad.length, `Toolkit: every printable and Excel link opens (${tk.n} links)${tk.bad.length ? ": " + tk.bad.join(", ") : ""}`);
  await done(p);
  p = await mk(); await p.goto(`${O}/toolkit/teardown-bom.html`);
  r.ok((await p.getAttribute(".ver a", "href")) === "../training.html?open=m10", "Toolkit: template links to its Academy module");
  await done(p);
  for (const s of ["business-case", "should-cost-buildup", "programme-charter", "target-cost-cascade", "value-study-logbook", "programme-business-case", "study-sponsor-charter"]) {
    p = await mk(375, true); await p.goto(`${O}/toolkit/${s}.html`); await p.waitForTimeout(200);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    r.ok(ov <= 0 && (await p.getAttribute(".btnbar a[download]", "href")) === `${s}.xlsx`, `Toolkit: ${s} fits a phone and offers its Excel file`);
    await done(p);
  }

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
  await p.click('#navLinks a[href="case-study.html"]'); await p.waitForURL("**/case-study.html");
  r.ok(p.url().endsWith("/case-study.html"), "Phone menu navigates");
  await done(p);

  // ── Topic page: VAVE explained
  { const p = await browser.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${O}/vave/`); await p.waitForTimeout(700);
  const ld = await p.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).flatMap((d) => d["@graph"] || [d]).map((g) => g["@type"]));
  r.ok(ld.includes("FAQPage") && ld.includes("Article") && ld.includes("BreadcrumbList"), "VAVE page: article, breadcrumb and FAQ data for search engines");
  r.ok((await p.$$(".guide-toc a")).length >= 8, "VAVE page: 'On this page' lists every section");
  await p.check('input[name="vc1"][value="ve"]'); await p.check('input[name="vc2"][value="ve"]'); await p.check('input[name="vc3"][value="long"]');
  r.ok(/Value engineering\./.test(await p.textContent("#vaveChooserOut")), "VAVE page: the VA-or-VE helper recommends value engineering for a product still in design");
  r.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "VAVE page: no sideways scrolling");
  await p.goto(`${O}/`); await p.waitForTimeout(400);
  r.ok(!!(await p.$('footer a[href="vave/"]')), "footer links to the VAVE topic page");
  await p.close(); }

  // ── Public module summary pages (one per Academy module)
  { const p = await browser.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  const sm = await (await p.request.get(`${O}/sitemap.xml`)).text();
  const mods = [...sm.matchAll(/academy\/([a-z-]+)\//g)].map((m) => m[1]);
  r.ok(mods.length === 13, `sitemap lists all 13 module pages (found ${mods.length})`);
  const bad = [];
  for (const [i, slug] of mods.entries()) {
    await p.goto(`${O}/academy/${slug}/`); await p.waitForTimeout(250);
    const info = await p.evaluate(() => ({
      start: document.querySelector(".am-cta a")?.getAttribute("href"),
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).flatMap((d) => d["@graph"] || [d]).map((g) => g["@type"]),
      learn: document.querySelectorAll(".pil-sec:first-child li").length,
      canon: document.querySelector('link[rel="canonical"]')?.href || "",
      h1: document.querySelectorAll("h1").length,
    }));
    if (info.start !== `training.html?open=m${i + 1}` || !info.ld.includes("LearningResource") || !info.ld.includes("BreadcrumbList") || info.learn < 3 || !info.canon.endsWith(`/academy/${slug}/`) || info.h1 !== 1) bad.push(slug);
  }
  r.ok(!bad.length, `module pages: start button, search data, learning list, canonical and one heading${bad.length ? " (failed: " + bad.join(", ") + ")" : ""}`);
  await p.goto(`${O}/academy/function-analysis-fast/`); await p.waitForTimeout(300);
  await p.click(".am-cta a"); await p.waitForURL("**/training.html?open=m4"); await p.waitForTimeout(900);
  r.ok((await p.evaluate(() => document.querySelector(".mod-link.is-active")?.dataset.target)) === "m4", "module page 'Start' button opens that module in the Academy");
  await p.close(); }

  // ── "Topics" menu: on every public page, opens the five topic guides and the glossary, closes with Esc
  { const p = await browser.newPage({ viewport: { width: 1440, height: 900 } }); p.on("pageerror", (e) => errs.push(e.message));
  for (const pg of ["", "job-plan/", "value-analysis/", "academy/function-analysis-fast/"]) {
    await p.goto(`${O}/${pg}`); await p.waitForTimeout(400);
    const n = await p.$$eval("#navTopics a", (as) => as.map((a) => a.getAttribute("href")));
    r.ok(n.length === 6 && n.includes("vave/") && n.includes("product-cost-optimisation/") && n.some((h) => h.endsWith("glossary/")), `Topics menu lists the five topic guides and the glossary on /${pg}`);
  }
  await p.goto(`${O}/value-analysis/`); await p.waitForTimeout(400);
  r.ok(await p.$eval(".nav-dd-btn", (b) => b.classList.contains("is-active")) && await p.$eval('#navTopics a[href="value-analysis/"]', (a) => a.getAttribute("aria-current") === "page"), "Topics menu marks the topic page you are on");
  await p.focus(".nav-dd-btn"); await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  r.ok(await p.$eval(".nav-dd-btn", (b) => b.getAttribute("aria-expanded") === "true") && await p.isVisible('#navTopics a[href="vave/"]'), "Topics menu opens from the keyboard");
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  r.ok(!(await p.isVisible('#navTopics a[href="vave/"]')) && await p.evaluate(() => document.activeElement.classList.contains("nav-dd-btn")), "Esc closes the Topics menu and returns focus");
  await p.click(".nav-dd-btn"); await p.waitForTimeout(200); await p.click('#navTopics a[href="vave/"]'); await p.waitForURL("**/vave/");
  r.ok(p.url().endsWith("/vave/"), "a Topics menu link opens its page");
  await p.setViewportSize({ width: 375, height: 760 }); await p.waitForTimeout(300);
  await p.click("#navToggle"); await p.waitForTimeout(450);
  await p.click(".nav-dd-btn"); await p.waitForTimeout(250);
  r.ok(await p.isVisible('#navTopics a[href="value-engineering/"]'), "Topics folds out inside the phone menu");
  r.ok(await p.evaluate(() => { const l = document.getElementById("navLinks"); l.scrollTop = l.scrollHeight; const c = l.querySelector(".nav-cta").getBoundingClientRect(); return c.bottom <= innerHeight + 1; }), "the phone menu scrolls so every item can be reached");
  await p.close(); }

  // ── Search engine ownership files must stay on the site, or Google/Bing lose access
  { const p = await browser.newPage();
  for (const f of ["googlefa3e3bc48c151077.html"]) {
    const res = await p.request.get(`${O}/${f}`);
    r.ok(res.status() === 200 && (await res.text()).includes("google-site-verification: " + f), `search engine ownership file ${f} is published`);
  }
  const ink = require("fs").readdirSync(require("path").join(__dirname, "..", "..")).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  const inkRes = ink.length === 1 ? await p.request.get(`${O}/${ink[0]}`) : null;
  r.ok(ink.length === 1 && inkRes.status() === 200 && (await inkRes.text()).trim() === ink[0].slice(0, 32), "IndexNow key file is published and matches its name");
  await p.close(); }

  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
};
