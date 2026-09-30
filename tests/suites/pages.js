// Every page: accessibility (axe, WCAG 2 A/AA) in dark and light themes,
// no sideways scrolling on a 375px phone, and no script errors.
const fs = require("fs");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const PAGES = [
  "index.html", "training.html", "leaders.html", "auth.html", "certificate.html", "verify.html", "privacy.html", "terms.html", "changelog.html", "404.html",
  "job-plan/", "function-analysis/", "cost-levers/", "ideation/", "technology/", "benchmarking/", "industries/", "governance/", "toolkit/", "glossary/",
];

module.exports = async function pages({ browser, O, r }) {
  for (const pg of PAGES) {
    for (const theme of ["dark", "light"]) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await ctx.addInitScript((t) => localStorage.setItem("vf-theme", t), theme);
      const p = await ctx.newPage();
      const errs = []; p.on("pageerror", (e) => errs.push(e.message));
      await p.goto(`${O}/${pg}`);
      await p.waitForTimeout(1000);
      // scroll through so scroll-triggered content is revealed before checking contrast
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((ok) => setTimeout(ok, 40)); } });
      await p.waitForTimeout(700);
      await p.addScriptTag({ content: AXE });
      await p.waitForTimeout(1200);
      const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }))
        .violations.map((x) => `${x.id} (${x.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`));
      r.ok(!v.length, `${pg} [${theme}] accessibility${v.length ? ": " + v.join(", ") : ""}`);
      if (theme === "dark") {
        await p.setViewportSize({ width: 375, height: 800 }); await p.waitForTimeout(300);
        const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        r.ok(ov <= 0, `${pg} fits a 375px phone${ov > 0 ? ` (overflows by ${ov}px)` : ""}`);
      }
      r.ok(!errs.length, `${pg} [${theme}] no script errors${errs.length ? ": " + errs[0] : ""}`);
      await ctx.close();
    }
  }
};
