// Owner dashboard (admin.html). Supabase is simulated: the admin_dashboard()
// call is intercepted, so no real data is read.
const AXE = require("fs").readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const REF = "pnvidzchlnlfodfnawur";
const now = Date.now(), DAY = 864e5, iso = (t) => new Date(t).toISOString();
function session(email) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(now / 1000) + 3600;
  const user = { id: "11111111-1111-1111-1111-111111111111", aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: {} };
  return { access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, email, exp, role: "authenticated" })}.sig`, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r", user };
}
const DATA = {
  generated_at: iso(now),
  users: [
    { id: "u1", email: "priya@example.com", name: "Priya Sharma", created_at: iso(now - 2 * DAY), last_sign_in_at: iso(now - DAY), confirmed: true,
      timezone: "Asia/Calcutta", language: "en-IN", device: "phone", source: "linkedin.com", last_seen_at: iso(now - 3600e3),
      progress: { done: ["m1", "m2", "m3"], doneAt: { m1: iso(now - DAY) }, role: "sourcing" },
      courses: { leaders: { done: ["l0", "l1", "l2", "l3", "l4", "l5", "l6"], quiz: { attempts: [{ t: iso(now - DAY), s: 90, p: true }], best: 90, passed: true }, updated_at: iso(now - DAY) } } },
    { id: "u2", email: "sam@example.com", name: "<img src=x onerror=window.__xss=1>", created_at: iso(now - 5 * DAY), confirmed: false,
      timezone: "Europe/London", device: "computer", source: "direct", progress: null },
    { id: "u3", email: "alex@example.com", name: "Alex Doe", created_at: iso(now - 40 * DAY), confirmed: true, language: "de-DE",
      progress: { done: ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "m11", "m12", "m13"],
        attempts: [{ t: iso(now - 20 * DAY), s: 70, p: false }, { t: iso(now - 19 * DAY), s: 87, p: true }], exam: { passed: true, score: 87 } } },
  ],
  certificates: [{ id: "VH-TEST1", user_id: "u3", full_name: "Alex Doe", score: 87, issued_at: iso(now - 19 * DAY) },
    { id: "VL-TEST2", user_id: "u1", full_name: "Priya Sharma", score: 90, issued_at: iso(now - DAY) }],
  feedback: [{ module: "m1", helpful: true, comment: "<b>Great</b> module", created_at: iso(now - DAY) }, { module: "m2", helpful: false, comment: null, created_at: iso(now - 2 * DAY) }],
};

module.exports = async function admin({ browser, O, r }) {
  const errs = [];
  async function open(opts) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    let auth = null;
    if (opts.email) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(session(opts.email))]);
    await ctx.route("**/rest/v1/rpc/admin_dashboard**", (rt) => { auth = rt.request().headers().authorization || ""; rt.fulfill(opts.reply); });
    await ctx.route("**/auth/v1/**", (rt) => rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session(opts.email || "x@example.com").user) }));
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(`${O}/admin.html`); await p.waitForTimeout(1500);
    return { p, ctx, auth: () => auth };
  }

  let t = await open({ reply: { status: 200, body: "{}" } });
  r.ok((await t.p.textContent("#gate h1")).includes("Sign in"), "signed out: asks the owner to sign in");
  r.ok((await t.p.getAttribute("#gate a", "href")) === "auth.html?next=admin.html", "sign-in link returns to the dashboard");
  r.ok(await t.p.evaluate(() => document.querySelector('meta[name=robots]').content.includes("noindex")), "dashboard is hidden from search engines");
  await t.ctx.close();

  t = await open({ email: "learner@example.com", reply: { status: 403, contentType: "application/json", body: JSON.stringify({ code: "42501", message: "Only the site owner can open the dashboard" }) } });
  r.ok((await t.p.textContent("#gate h1")).includes("can't open"), "a learner account is refused");
  r.ok(await t.p.$eval("#dash", (d) => d.hidden && !d.textContent), "no data is shown to a learner account");
  await t.ctx.close();

  t = await open({ email: "owner@example.com", reply: { status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST202", message: "Could not find the function public.admin_dashboard" }) } });
  r.ok((await t.p.textContent("#gate h1")).includes("setup step"), "explains the setup step when the database function is missing");
  await t.ctx.close();

  t = await open({ email: "owner@example.com", reply: { status: 200, contentType: "application/json", body: JSON.stringify(DATA) } });
  const p = t.p;
  r.ok(/^Bearer .+/.test(t.auth()), "dashboard request is sent with the owner's sign-in token");
  r.ok(!(await p.$eval("#dash", (d) => d.hidden)) && !(await p.$(".sample-note")), "real data loads (no sample banner)");
  await p.click('.seg button:has-text("All time")'); await p.waitForTimeout(300);
  r.ok((await p.textContent(".tile.hero .tile-value")).trim() === "3", "hero shows all 3 learners");
  const countries = await p.$$eval('[aria-label="Countries"] .hb-l', (els) => els.map((e) => e.textContent.trim()));
  r.ok(countries.some((c) => c.includes("India")) && countries.some((c) => c.includes("United Kingdom")) && countries.some((c) => c.includes("Germany")),
    `countries from time zone (old alias Asia/Calcutta) and language fallback: ${countries.join(", ")}`);
  r.ok(await p.evaluate(() => !window.__xss && !document.querySelector("#dash img") && document.body.textContent.includes("<img src=x")), "learner-typed text is shown as text, never run");
  r.ok((await p.textContent('[aria-label="Module feedback"]')).includes("<b>Great</b> module"), "feedback comments shown as plain text");
  r.ok((await p.$$("#usersCard tbody tr")).length === 3, "learners table lists everyone");
  const lead = await p.textContent('[aria-label="VAVE for Leaders"]');
  r.ok(/Learners on the course\s*1/.test(lead) && /Passed the quiz\s*1/.test(lead) && /Leaders certificates\s*1/.test(lead), "VAVE for Leaders section counts course learners, quiz passes and certificates");
  r.ok(!(await p.textContent('#usersCard')).includes("VL-TEST2"), "a leaders certificate isn't shown as an Academy certificate");
  await p.fill("#usersCard input[type=search]", "priya"); await p.waitForTimeout(200);
  r.ok((await p.$$("#usersCard tbody tr")).length === 1, "search filters the learners table");
  await p.fill("#usersCard input[type=search]", ""); await p.waitForTimeout(200);
  await p.selectOption("#fCountry", "IN"); await p.waitForTimeout(300);
  r.ok((await p.textContent(".tile.hero .tile-value")).trim() === "1", "country filter scopes the whole dashboard");
  await p.selectOption("#fCountry", "all"); await p.waitForTimeout(300);
  await p.click('#usersCard button[aria-label="Open details for Alex Doe"]'); await p.waitForTimeout(300);
  const detail = await p.textContent("#detail");
  r.ok(await p.$eval("#detail", (d) => d.open) && detail.includes("87%") && detail.includes("Below 80%") && detail.includes("VH-TEST1"), "learner detail shows modules, exam attempts and certificate");
  await p.keyboard.press("Escape");
  const dl = p.waitForEvent("download");
  await p.click("text=Download CSV");
  const csv = require("fs").readFileSync(await (await dl).path(), "utf8");
  r.ok(csv.includes("priya@example.com") && csv.includes("India") && csv.split("\n").length === 4, "CSV download has a row per learner");
  await p.click('[aria-label="Countries"] .card-h .btn'); await p.waitForTimeout(200);
  r.ok(!!(await p.$('[aria-label="Countries"] table')), "every chart has a table view");
  await p.addScriptTag({ content: AXE });
  const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } })).violations.map((x) => x.id));
  r.ok(!v.length, `dashboard accessibility${v.length ? ": " + v.join(", ") : ""}`);
  await t.ctx.close();

  // sample preview works without an account
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const sp = await ctx.newPage(); sp.on("pageerror", (e) => errs.push(e.message));
  await sp.goto(`${O}/admin.html?sample`); await sp.waitForTimeout(1200);
  r.ok(!!(await sp.$(".sample-note")) && (await sp.$$(".cols .bar")).length > 0, "sample preview shows charts, clearly labelled");
  r.ok(await sp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "fits a phone screen");
  await ctx.close();

  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
};
