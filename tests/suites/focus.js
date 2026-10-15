// Focus mode on both courses: open and close, keeping the reader's place, contents panel,
// previous/next, text size, remembered between visits, phone fit and accessibility.
const fs = require("fs");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

module.exports = async function focus({ browser, O, r }) {
  for (const [page, first, second, name] of [["training.html", "m1", "m2", "Academy"], ["leaders.html", "l0", "l1", "Leaders"]]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const p = await ctx.newPage();
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(`${O}/${page}?open=${first}`); await p.waitForTimeout(1200);
    const vis = (s) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; }, s);

    r.ok(await vis(`.tmod[data-mod="${first}"] .fm-open`), `${name}: every module has a Focus mode button`);
    // read a little way in, then switch on: the same paragraph should stay on screen
    const para = await p.evaluate((id) => { const el = document.querySelectorAll(`.tmod[data-mod="${id}"] p`)[2]; scrollTo({ top: el.getBoundingClientRect().top + scrollY - 200, behavior: "instant" }); el.id = "fmProbe"; return true; }, first);
    await p.keyboard.press("f"); await p.waitForTimeout(400);
    r.ok(await p.evaluate(() => document.documentElement.classList.contains("vh-focus")), `${name}: Focus mode switches on`);
    r.ok(!(await vis(".tr-nav")) && !(await vis(".tr-sidebar")) && !(await vis(".tr-hero")) && !(await vis(".tr-footer")), `${name}: site menu, sidebar, banner and footer are hidden`);
    r.ok(await vis(".fm-bar") && await vis(".fm-foot"), `${name}: the focus top bar and module bar are shown`);
    const top = await p.evaluate(() => document.getElementById("fmProbe").getBoundingClientRect().top);
    r.ok(para && top > 40 && top < 500, `${name}: the reader stays on the same paragraph (${Math.round(top)}px from the top)`);
    r.ok((await p.textContent("#fmName")).trim().length > 3, `${name}: the top bar names the module`);
    await p.click("#fmExit"); await p.waitForTimeout(300);
    r.ok(await p.evaluate(() => !document.documentElement.classList.contains("vh-focus")), `${name}: the Exit focus button leaves focus mode`);
    await p.click(`.tmod[data-mod="${first}"] .fm-open`); await p.waitForTimeout(300);
    r.ok(await p.evaluate(() => document.documentElement.classList.contains("vh-focus")), `${name}: the Focus mode button switches it on`);

    // contents panel
    await p.click("#fmMenu"); await p.waitForTimeout(300);
    r.ok(await vis("#fmDrawer") && (await p.$$("#fmDrawer .fm-item")).length === (await p.$$("#modNav .mod-link")).length, `${name}: the contents panel lists every module`);
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    r.ok(!(await vis("#fmDrawer")) && await p.evaluate(() => document.documentElement.classList.contains("vh-focus")), `${name}: Esc closes the contents panel first and stays in focus mode`);

    // next module
    await p.click("#fmNext"); await p.waitForTimeout(500);
    r.ok(await p.evaluate(() => document.querySelector("#modNav .mod-link.is-active").dataset.target) === second, `${name}: the Next button opens the next module`);
    r.ok(await p.evaluate(() => document.documentElement.classList.contains("vh-focus")), `${name}: focus mode stays on when changing module`);

    // text size
    await p.click("#fmSize"); await p.waitForTimeout(150);
    r.ok(await p.evaluate(() => document.documentElement.classList.contains("fm-t1")), `${name}: the text size button makes text larger`);
    await p.click("#fmSize"); await p.click("#fmSize"); await p.waitForTimeout(150);
    r.ok(await p.evaluate(() => !/fm-t[12]/.test(document.documentElement.className)), `${name}: text size goes back to normal after three presses`);

    // accessibility in focus mode, panel open
    await p.click("#fmMenu"); await p.waitForTimeout(300);
    await p.addScriptTag({ content: AXE });
    const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } })).violations.map((x) => x.id + " (" + x.nodes.map((n) => n.target.join(" ")).slice(0, 2).join("; ") + ")"));
    r.ok(!v.length, `${name}: focus mode passes accessibility checks${v.length ? ": " + v.join(", ") : ""}`);
    await p.keyboard.press("Escape"); await p.waitForTimeout(150);

    // remembered on the next visit, then Esc to leave
    await p.reload(); await p.waitForTimeout(1200);
    r.ok(await p.evaluate(() => document.documentElement.classList.contains("vh-focus")), `${name}: focus mode is remembered on the next visit`);
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    r.ok(await p.evaluate(() => !document.documentElement.classList.contains("vh-focus")) && await vis(".tr-nav"), `${name}: Esc leaves focus mode and brings the page back`);
    await p.keyboard.press("f"); await p.waitForTimeout(300);
    r.ok(await p.evaluate(() => document.documentElement.classList.contains("vh-focus")), `${name}: the F key switches focus mode on`);
    const box = await p.$(".tmod.is-visible input, .tmod.is-visible textarea");
    if (box) { await p.keyboard.press("Escape"); await box.focus(); await p.keyboard.press("f"); await p.waitForTimeout(200);
      r.ok(await p.evaluate(() => !document.documentElement.classList.contains("vh-focus")), `${name}: typing "f" in a box doesn't switch focus mode on`); }
    else await p.keyboard.press("Escape");

    // phone
    await p.setViewportSize({ width: 375, height: 800 }); await p.waitForTimeout(200);
    await p.evaluate(() => { document.activeElement.blur(); }); await p.keyboard.press("f"); await p.waitForTimeout(300);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    r.ok(ov <= 0, `${name}: focus mode fits a 375px phone${ov > 0 ? " (overflows by " + ov + "px)" : ""}`);
    const tap = await p.evaluate(() => ["#fmMenu", "#fmSize", "#fmExit", "#fmPrev", "#fmNext"].every((s) => { const b = document.querySelector(s).getBoundingClientRect(); return b.width === 0 || (b.width >= 40 && b.height >= 40); }));
    r.ok(tap, `${name}: focus mode buttons are big enough to tap`);
    await p.click("#fmExit"); await p.waitForTimeout(200);
    r.ok(!errs.length, `${name}: no script errors${errs.length ? ": " + errs[0] : ""}`);
    await ctx.close();
  }
};
