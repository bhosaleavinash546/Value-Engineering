// Every module of both courses, not just the first one a page opens with:
// accessibility (axe, WCAG 2 A/AA) in dark and light, no sideways scrolling on a
// 375px phone, no script errors. Also checks that every course video, cover
// image and photo exists, and that each video can start playing before it has
// fully downloaded.
const fs = require("fs");
const path = require("path");
const { demoContext } = require("../lib");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const COURSES = ["training.html", "leaders.html"];

module.exports = async function modules({ browser, O, r, ROOT }) {
  // ── media files referenced by the course pages
  for (const pg of COURSES) {
    const html = fs.readFileSync(path.join(ROOT, pg), "utf8");
    const refs = new Set();
    for (const m of html.matchAll(/<(?:source|img|video)\b[^>]*?\b(?:src|poster)="((?:videos|photos)\/[^"]+)"/g)) refs.add(m[1]);
    for (const m of html.matchAll(/\bposter="([^"]+)"/g)) refs.add(m[1]);
    for (const ref of refs) {
      const file = path.join(ROOT, ref);
      const ok = fs.existsSync(file) && fs.statSync(file).size > 1000;
      r.ok(ok, `${pg}: ${ref} exists`);
      if (ok && ref.endsWith(".mp4")) {
        const head = fs.readFileSync(file).subarray(0, 64 * 1024).toString("latin1");
        const moov = head.indexOf("moov"), mdat = head.indexOf("mdat");
        r.ok(moov > -1 && (mdat === -1 || moov < mdat), `${ref} can start playing before it has fully downloaded (index at the front)`);
      }
    }
  }

  // ── every module, both themes, desktop and phone
  for (const pg of COURSES) {
    for (const theme of ["dark", "light"]) {
      const ctx = await demoContext(browser, { viewport: { width: 1280, height: 900 } });
      await ctx.addInitScript((t) => localStorage.setItem("vf-theme", t), theme);
      const p = await ctx.newPage();
      const errs = []; p.on("pageerror", (e) => errs.push(e.message));
      await p.goto(`${O}/${pg}`); await p.waitForTimeout(800);
      const ids = await p.$$eval(".cat-card[data-open]", (els) => els.map((e) => e.dataset.open).filter((id) => /^[ml]\d+$/.test(id)));
      for (const id of ids) {
        await p.goto(`${O}/${pg}`); await p.waitForTimeout(400);
        await p.click(`.cat-card[data-open="${id}"]`); await p.waitForTimeout(400);
        // scroll through so diagrams that reveal on scroll are checked as people see them
        await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 450) { scrollTo(0, y); await new Promise((ok) => setTimeout(ok, 25)); } });
        await p.waitForTimeout(1200);
        if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: AXE });
        const v = await p.evaluate(async (id) => (await axe.run(
          // the FAST builder's faded "finished diagram" preview is faint on purpose
          { include: [[`section[data-mod="${id}"]`]], exclude: [[".fb-ghost"]] },
          { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }))
          .violations.map((x) => `${x.id} (${x.nodes.map((n) => n.target.join(" ")).slice(0, 2).join("; ")})`), id);
        r.ok(!v.length, `${pg} ${id} [${theme}] accessibility${v.length ? ": " + v.join(", ") : ""}`);
        if (theme === "dark") {
          await p.setViewportSize({ width: 375, height: 800 }); await p.waitForTimeout(250);
          const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          r.ok(ov <= 0, `${pg} ${id} fits a 375px phone${ov > 0 ? ` (overflows by ${ov}px)` : ""}`);
          await p.setViewportSize({ width: 1280, height: 900 });
        }
      }
      r.ok(!errs.length, `${pg} [${theme}] no script errors while opening every module${errs.length ? ": " + errs[0] : ""}`);
      await ctx.close();
    }
  }
};
