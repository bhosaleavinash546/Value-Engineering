/* Runs the site checks against a local copy of the site.
   Usage:  cd tests && npm install && node run.js [suite ...]
   Suites: pages, modules, links, narration, guides, academy, leaders, admin (default: all)
   Set CHROMIUM_PATH to use an existing Chromium instead of Playwright's own. */
const { ROOT, startServer, launch, recorder } = require("./lib");

const SUITES = ["pages", "modules", "links", "narration", "guides", "academy", "leaders", "admin"];
const PORT = +process.env.PORT || 8490;

(async () => {
  const pick = process.argv.slice(2);
  const run = pick.length ? SUITES.filter((s) => pick.includes(s)) : SUITES;
  const server = await startServer(PORT);
  const browser = await launch();
  const O = `http://127.0.0.1:${PORT}`;
  const results = [];
  for (const name of run) {
    console.log(`\n── ${name} ──`);
    const r = recorder(name);
    const t0 = Date.now();
    try { await require(`./suites/${name}`)({ browser, O, r, ROOT }); }
    catch (e) { r.ok(false, `${name} crashed: ${e.message.split("\n")[0]}`); }
    console.log(`  ${r.pass} passed, ${r.fail} failed (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    results.push(r);
  }
  await browser.close();
  server.close();
  const fail = results.reduce((n, r) => n + r.fail, 0), pass = results.reduce((n, r) => n + r.pass, 0);
  console.log(`\n══ ${pass} passed, ${fail} failed ══`);
  results.filter((r) => r.fail).forEach((r) => r.failures.forEach((f) => console.log(`  ✗ [${r.name}] ${f}`)));
  process.exit(fail ? 1 : 0);
})();
