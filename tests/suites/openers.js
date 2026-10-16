// Course page openers (Batch 6): the new opening section with the 60-second try-it, the
// outcomes list, and the learner home that replaces the introduction for returning learners.
const { demoContext } = require("../lib");

module.exports = async function openers({ browser, O, r }) {
  for (const [pg, name, wrong, right, key] of [["training.html", "Academy", "heat", "esteem", "vf-academy"], ["leaders.html", "Leaders", "a", "c", "vh-leaders"]]) {
    // ── first visit
    let ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    let p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(`${O}/${pg}`); await p.waitForTimeout(900);
    r.ok(await p.isVisible("#trHero h1") && !(await p.isVisible("#trHome")), `${name}: a first-time visitor sees the course introduction, not the learner home`);
    r.ok((await p.$$(".tr-out-grid li")).length === 6, `${name}: six outcomes listed`);
    r.ok(/\d{1,2} \w+ 20\d\d/.test(await p.textContent(".tr-byline time")), `${name}: the "Updated" date is filled in`);
    const lesson = await p.evaluate(() => Math.round(document.querySelector(".tr-layout").getBoundingClientRect().top + scrollY));
    r.ok(lesson < 1300, `${name}: the lesson starts within about 1.4 screens on a laptop (${lesson}px)`);
    // the try-it: a tempting wrong answer, then the right one
    await p.click(`.tr-try-opt[data-k="${wrong}"]`); await p.waitForTimeout(300);
    r.ok(await p.isVisible(".tr-try-verdict.is-no") && (await p.textContent("#tryOut")).length > 80, `${name} try-it: a wrong answer is explained, not just marked`);
    await p.click(`.tr-try-opt[data-k="${right}"]`); await p.waitForTimeout(300);
    r.ok(await p.isVisible(".tr-try-verdict.is-ok") && await p.$eval(`.tr-try-opt[data-k="${right}"]`, (b) => b.classList.contains("is-best") && b.getAttribute("aria-pressed") === "true"), `${name} try-it: the right answer is confirmed and marked`);
    await p.click("#tryGo"); await p.waitForTimeout(700);
    r.ok(await p.evaluate(() => !!document.querySelector(".tmod.is-visible") && document.querySelector(".tmod.is-visible").getBoundingClientRect().top < innerHeight), `${name} try-it: its button takes you into the first module`);
    await p.setViewportSize({ width: 375, height: 800 }); await p.waitForTimeout(250);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    r.ok(ov <= 0, `${name}: the new opening fits a 375px phone${ov > 0 ? " (overflows by " + ov + "px)" : ""}`);
    r.ok((await p.$$(".tr-faq-item")).length === 5 && await p.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => /"FAQPage"/.test(s.textContent))), `${name}: five questions answered, with FAQ data for search engines`);
    r.ok(/VMA/.test(await p.textContent(".tr-author")) && !/certificate number|cert no/i.test(await p.textContent(".tr-author")), `${name}: "Who wrote this course" shows the author's credentials`);
    r.ok(!errs.length, `${name}: no script errors${errs.length ? ": " + errs[0] : ""}`);
    await ctx.close();

    // ── verified quotes (demo mode): sent after passing, shown only once approved, linked to the certificate
    ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
    p = await ctx.newPage();
    await p.goto(`${O}/${pg}`); await p.waitForTimeout(1200);
    await p.evaluate(() => { document.getElementById("certName").textContent = "Priya Shah"; document.getElementById("certId").textContent = "VH-TEST1"; document.getElementById("certWrap").hidden = false; });
    await p.waitForSelector("#quoteBox", { timeout: 3000 }).catch(() => {});
    r.ok(await p.isVisible("#quoteBox") && await p.inputValue("#qbName") === "Priya Shah", `${name}: after passing, an optional quote box appears, name filled in`);
    await p.fill("#qbText", "Clear, practical and free. The should-cost module paid for itself in my first supplier meeting.");
    await p.fill("#qbRole", "Buyer");
    await p.click("#quoteBox button[type=submit]");
    r.ok(/needs|required/i.test(await p.evaluate(() => document.getElementById("qbConsent").validationMessage || "")) || !(await p.isVisible("text=Thank you")), `${name}: the quote can't be sent without the consent tick`);
    await p.check("#qbConsent"); await p.click("#quoteBox button[type=submit]"); await p.waitForTimeout(400);
    r.ok(await p.isVisible("#quoteBox >> text=Thank you"), `${name}: the quote is sent`);
    await p.reload(); await p.waitForTimeout(1200);
    r.ok(await p.$eval("#trQuotesLive", (e) => e.hidden), `${name}: an unapproved quote isn't shown`);
    await p.evaluate(async () => { const q = await VHCloud.adminQuotes(); await VHCloud.adminSetQuote(q[0].id, true); });
    await p.reload(); await p.waitForTimeout(1200);
    r.ok(!(await p.$eval("#trQuotesLive", (e) => e.hidden)) && await p.$eval('#trQuotesLive a', (a) => /verify\.html\?id=VH-TEST1/.test(a.getAttribute("href"))), `${name}: once approved it's shown, linked to the certificate`);
    await ctx.close();

    // ── returning learner (progress in this browser)
    ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
    p = await ctx.newPage();
    await p.addInitScript((k) => { try { localStorage.setItem(k, JSON.stringify({ done: k === "vf-academy" ? ["m1", "m2"] : ["l0", "l1"], doneAt: {}, qc: {} })); } catch (e) {} }, key);
    await p.goto(`${O}/${pg}`); await p.waitForTimeout(1500);
    r.ok(await p.isVisible("#trHome #myLearn") && !(await p.isVisible("#trHero")), `${name}: a returning learner starts on the learner home`);
    r.ok(/Continue/.test(await p.textContent("#mlGo")), `${name}: the learner home offers Continue`);
    const top = await p.evaluate(() => Math.round(document.querySelector(".tr-layout").getBoundingClientRect().top + scrollY));
    r.ok(top < 700, `${name}: for a returning learner the lesson starts near the top (${top}px)`);
    await p.click("#trAboutBtn"); await p.waitForTimeout(300);
    r.ok(await p.isVisible("#trHero h1") && await p.$eval("#trAboutBtn", (b) => b.getAttribute("aria-expanded") === "true"), `${name}: "About this course" brings the introduction back`);
    await ctx.close();
  }

  // ── the homepage "Choose your track" section
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(`${O}/index.html`); await p.waitForTimeout(900);
    const cards = await p.$$eval("#tracks .trk-card", (els) => els.map((e) => [e.querySelector(".trk-tag").textContent, e.querySelector("a.btn").getAttribute("href")]));
    r.ok(cards.length === 2 && /Practitioner/.test(cards[0][0]) && cards[0][1] === "training.html" && /Executive/.test(cards[1][0]) && cards[1][1] === "leaders.html", "Homepage: two tracks, each linking to its course");
    r.ok(/not a professional certification/.test(await p.textContent("#tracks .trk-catch")), "Homepage: the \"No catch\" strip says what the certificate isn't");
    await p.click("[data-trailer=leaders]"); await p.waitForTimeout(500);
    r.ok(await p.evaluate(() => { const d = document.querySelector("dialog.trk-dlg[open]"); return !!d && /trailer-leaders\.mp4$/.test(d.querySelector("video").src); }), "Homepage: a trailer button opens that course's trailer");
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    r.ok(!(await p.$("dialog.trk-dlg[open]")), "Homepage: Escape closes the trailer");
    await p.setViewportSize({ width: 375, height: 800 }); await p.waitForTimeout(250);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    r.ok(ov <= 0, `Homepage: the tracks fit a 375px phone${ov > 0 ? " (overflows by " + ov + "px)" : ""}`);
    // the About the author section
    await p.evaluate(() => document.querySelector("#author").scrollIntoView({ behavior: "instant" })); await p.waitForTimeout(800);
    const au = await p.evaluate(() => { const a = document.querySelector("#author");
      return { img: !a.querySelector("img"), links: [...a.querySelectorAll(".author-links a")].map((x) => x.href), text: a.textContent }; });
    r.ok(au.img, "Homepage author: no photo, initials only");
    r.ok(au.links.some((h) => /linkedin\.com\/in\//.test(h)) && au.links.some((h) => h === "https://bhosaleavinash546.github.io/avinash-bhosale-portfolio/"), "Homepage author: LinkedIn and portfolio links");
    r.ok(!/\b(JLR|Jaguar|John Deere|Tata)\b/.test(au.text) && !/certificate (no|number)/i.test(au.text), "Homepage author: no employer names or certificate numbers");
    r.ok(/VMA/.test(au.text) && /PGDM/.test(au.text), "Homepage author: certificates and education listed");
    r.ok(!errs.length, `Homepage: no script errors${errs.length ? ": " + errs[0] : ""}`);
    await ctx.close();
  }
};
