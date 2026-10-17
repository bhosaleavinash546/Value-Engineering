// The welcome tour: the question appears once, each path's three steps end on the right page, keyboard,
// the checklist ticks, the students' link, phone fit, the replay link, the counts sent, and accessibility.
const fs = require("fs");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

module.exports = async function welcome({ browser, O, r }) {
  const open = async (vp, theme) => {
    const ctx = await browser.newContext({ viewport: vp || { width: 1280, height: 860 }, isMobile: !!(vp && vp.width < 600), hasTouch: !!(vp && vp.width < 600) });
    if (theme) await ctx.addInitScript((t) => { try { localStorage.setItem("vf-theme", t); } catch (e) {} }, theme);
    const sent = [];
    await ctx.route("**/rpc/log_welcome", (q) => { try { sent.push(JSON.parse(q.request().postData())); } catch (e) {} q.fulfill({ status: 204, body: "" }); });
    const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    return { ctx, p, sent, errs };
  };
  const axe = async (p) => { await p.addScriptTag({ content: AXE });
    return p.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } })).violations
      .filter((x) => x.nodes.some((n) => n.target.join(" ").includes("vw-"))).map((x) => x.id + " (" + x.nodes.map((n) => n.target.join(" ")).slice(0, 2).join("; ") + ")")); };

  // first visit: the question, then each path to its last step
  const ENDS = { student: "/training.html", pro: "/toolkit/", leader: "/leaders.html", explore: "/case-study.html" };
  for (const [path, end] of Object.entries(ENDS)) {
    const { ctx, p, sent, errs } = await open();
    await p.goto(`${O}/`);
    const shown = await p.waitForSelector(".vw-ask.is-on", { timeout: 9000 }).then(() => true, () => false);
    r.ok(shown, `${path}: a first visit sees the welcome question`);
    if (!shown) { await ctx.close(); continue; }
    if (path === "student") {
      const v = await axe(p); r.ok(!v.length, `the welcome question passes accessibility checks${v.length ? ": " + v.join(", ") : ""}`);
      r.ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains("vw-choice")), "the first answer has keyboard focus");
    }
    await p.click(`.vw-choice[data-p="${path}"]`); await p.waitForTimeout(700);
    r.ok(await p.$(".vw-card .vw-next") && /Step 1 of 3/i.test(await p.textContent(".vw-card .vw-k")), `${path}: step 1 of 3 is shown`);
    r.ok(await p.evaluate(() => { const t = document.querySelector(".vw-target"), s = document.querySelector(".vw-spot"); if (!t || !s) return false;
      const a = t.getBoundingClientRect(), b = s.getBoundingClientRect(); return Math.abs(a.left - b.left) < 20 && Math.abs(a.width - b.width) < 30; }), `${path}: the spotlight is on the item being explained`);
    if (path === "student") {
      await p.keyboard.press("ArrowRight"); await p.waitForTimeout(500);
      r.ok(/Step 2 of 3/i.test(await p.textContent(".vw-card .vw-k")), "→ moves to the next step");
      await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(500);
      r.ok(/Step 1 of 3/i.test(await p.textContent(".vw-card .vw-k")), "← moves back a step");
    }
    await p.click(".vw-next"); await p.waitForTimeout(500);
    await p.click(".vw-next"); await p.waitForTimeout(500);
    if (path === "pro") { const v = await axe(p); r.ok(!v.length, `the tour card passes accessibility checks${v.length ? ": " + v.join(", ") : ""}`); }
    const href = await p.getAttribute(".vw-card .vw-go", "href");
    r.ok(href === end, `${path}: the last step leads to ${end} (${href})`);
    await Promise.all([p.waitForNavigation(), p.click(".vw-card .vw-go")]); await p.waitForTimeout(800);
    r.ok(new URL(p.url()).pathname === end, `${path}: pressing it opens ${end}`);
    r.ok(!!(await p.$(".vw-list")), `${path}: the "first 10 minutes" checklist follows to the next page`);
    const ev = sent.map((x) => x.p_event);
    r.ok(["shown", "path", "step1", "step3", "finish"].every((e) => ev.includes(e)) && sent.every((x) => /^[a-z0-9]{4,16}$/.test(x.p_visitor) && !("email" in x)),
      `${path}: anonymous counts are sent (${ev.join(", ")})`);
    r.ok(!errs.length, `${path}: no script errors${errs.length ? ": " + errs[0] : ""}`);
    await ctx.close();
  }

  // skip: never asked again; Esc closes a tour; the replay link brings it back
  { const { ctx, p } = await open();
    await p.goto(`${O}/`); await p.waitForSelector(".vw-ask.is-on", { timeout: 9000 });
    await p.click(".vw-skip"); await p.reload(); await p.waitForTimeout(5000);
    r.ok(!(await p.$(".vw-ask")), "after Skip, the question isn't shown again");
    r.ok(!!(await p.$('footer a[href="/?tour=1"]')), "the footer has a Show me around link");
    await p.goto(`${O}/?tour=1`); await p.waitForSelector(".vw-ask.is-on", { timeout: 5000 }).catch(() => {});
    r.ok(!!(await p.$(".vw-ask.is-on")), "Show me around (/?tour=1) brings the question back");
    await p.click('.vw-choice[data-p="explore"]'); await p.waitForTimeout(500);
    await p.keyboard.press("Escape"); await p.waitForTimeout(500);
    r.ok(!(await p.$(".vw-card")) && !(await p.$(".vw-ov")), "Esc closes the tour");
    await ctx.close(); }

  // the students' link goes straight to the student path
  { const { ctx, p } = await open();
    await p.goto(`${O}/?for=students`); await p.waitForSelector(".vw-ask.is-on", { timeout: 5000 }).catch(() => {});
    r.ok(!!(await p.$('.vw-ask [data-p="student"]')) && !(await p.$(".vw-choice")), "?for=students skips the question and offers the student tour");
    await ctx.close(); }

  // the checklist ticks itself
  { const { ctx, p } = await open();
    await p.addInitScript(() => { if (!localStorage.getItem("vh-welcome")) localStorage.setItem("vh-welcome", JSON.stringify({ vid: "testvisitor", path: "explore", items: {}, hints: { "cs-turn": 1, "cs-explode": 1, "ac-listen": 1, "ac-focus": 1 } })); });
    await p.goto(`${O}/training.html`); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem("vh-welcome")));
    r.ok(st.items && st.items.academy, "visiting the Academy ticks “Look inside the Academy”");
    await ctx.close(); }

  // phone, light theme: the card is a sheet and nothing spills sideways
  { const { ctx, p } = await open({ width: 375, height: 740 }, "light");
    await p.goto(`${O}/`); await p.waitForSelector(".vw-ask.is-on", { timeout: 9000 });
    await p.tap('.vw-choice[data-p="pro"]'); await p.waitForTimeout(800);
    const fit = await p.evaluate(() => { const c = document.querySelector(".vw-card").getBoundingClientRect(); return c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth; });
    r.ok(fit, "on a 375px phone the tour card fits the screen");
    r.ok(await p.evaluate(() => { const t = document.querySelector(".vw-target"); return !!t && t.getClientRects().length > 0; }), "on a phone the menu opens to show the link being explained");
    const v = await axe(p); r.ok(!v.length, `phone, light theme: passes accessibility checks${v.length ? ": " + v.join(", ") : ""}`);
    await ctx.close(); }
};
