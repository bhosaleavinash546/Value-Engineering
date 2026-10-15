/* Account sync and exam safety, in "live mode" with a stand-in for the Supabase SDK.
   The real site-config (Supabase on) is used, but the SDK file is replaced by a stub whose calls
   are answered here from one in-memory database, so two browser contexts behave like two
   devices of the same learner. Nothing reaches the real database. */
const STUB = `
window.supabase = { createClient: function () {
  function call(op, args) { return fetch("/__mock/" + op, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(args || {}) }).then(function (r) { if (r.status === 599) throw new TypeError("Failed to fetch"); return r.json(); }); }
  function q(table) {
    var st = { table: table, filters: [] };
    var api = {
      select: function (cols) { st.op = st.op || "select"; st.cols = cols; return api; },
      eq: function (c, v) { st.filters.push([c, v]); return api; },
      is: function () { return api; },
      maybeSingle: function () { return call("db", st); },
      upsert: function (row) { st.op = "upsert"; st.row = row; return call("db", st); },
      update: function (row) { st.op = "update"; st.row = row; return api; },
      insert: function (row) { st.op = "insert"; st.row = row; return call("db", st); },
      then: function (ok, ko) { return call("db", st).then(ok, ko); },
    };
    return api;
  }
  return {
    auth: {
      getUser: function () { return call("getUser"); },
      getSession: function () { return call("getSession"); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      signOut: function () { return call("signOut"); },
      signInWithOtp: function (a) { return call("signInWithOtp", a); },
      verifyOtp: function (a) { return call("verifyOtp", a); },
      updateUser: function (a) { return call("updateUser", a); },
      signInWithPassword: function (a) { return call("signInWithPassword", a); },
    },
    from: q,
    rpc: function (fn, args) { return call("rpc", { fn: fn, args: args }); },
  };
} };`;

function mockDb() {
  const db = { progress: {}, course_progress: {}, certificates: {} };
  const cfg = { latency: {}, readFails: false, submitLoseResponse: false, otpError: null };
  const ops = [], attempts = {};
  async function handle(route, user) {
    const req = route.request(), op = req.url().split("/__mock/")[1], a = JSON.parse(req.postData() || "{}");
    const key = op === "db" ? `${a.op || "select"}:${a.table}` : op === "rpc" ? "rpc:" + a.fn : op;
    await new Promise((ok) => setTimeout(ok, cfg.latency[key] || 20));
    let res;
    if (op === "getUser") res = { data: { user } };
    else if (op === "getSession") res = { data: { session: user ? { user } : null } };
    else if (op === "signInWithOtp") res = { error: cfg.otpError };
    else if (op === "db") {
      const T = db[a.table] || (db[a.table] = {});
      const course = a.row ? a.row.course : (a.filters.find((f) => f[0] === "course") || [])[1];
      const k = a.table === "course_progress" ? user.id + "|" + course : a.table === "certificates" ? (a.row ? a.row.id : (a.filters.find((f) => f[0] === "id") || [])[1]) : user.id;
      if (a.op === "upsert") { T[k] = JSON.parse(JSON.stringify(a.row)); res = { error: null }; }
      else if (a.op === "update" || a.op === "insert") res = { error: null };
      else if (cfg.readFails) res = { data: null, error: { message: "Service unavailable" } };
      else res = { data: T[k] ? { data: T[k].data } : null, error: null };
    } else if (op === "rpc") {
      if (a.fn === "verify_certificate") { const c = db.certificates[a.args.cert_id]; res = { data: c ? [c] : [], error: null }; }
      else if (a.fn === "certificate_count") res = { data: Object.keys(db.certificates).length, error: null };
      else if (a.fn === "start_exam") { const id = "att-" + Date.now(); attempts[id] = {}; res = { data: { attempt: id, pass: 80, questions: Array.from({ length: 3 }, (_, i) => ({ module: "m" + (i + 1), q: "Question " + i, options: ["A", "B", "C", "D"] })) }, error: null }; }
      else if (a.fn === "submit_exam") {
        // like the server: the first marking is stored and returned again if the paper is sent twice
        const at = attempts[a.args.p_attempt];
        if (!at.result) {
          at.result = { score: 100, right: 3, total: 3, passed: true, pass: 80, by_module: {}, review: [] };
          if (cfg.submitLoseResponse) { cfg.submitLoseResponse = false; ops.push(key); return route.fulfill({ status: 599, body: "" }); }
        }
        res = { data: at.result, error: null };
      } else res = { data: null, error: { message: "unknown rpc" } };
    } else res = { error: null };
    ops.push(key);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(res) });
  }
  return { db, cfg, ops, handle };
}

module.exports = async function ({ browser, O, r }) {
  const U = { id: "u1", email: "sam@example.com", user_metadata: { full_name: "Sam Patel" } };
  const errs = [];
  async function device(S, user, init) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await ctx.route("**/vendor/supabase-*.js", (rt) => rt.fulfill({ status: 200, contentType: "text/javascript", body: STUB }));
    await ctx.route("**/__mock/**", (rt) => S.handle(rt, user));
    await ctx.route(/supabase\.co|goatcounter|zgo\.at/, (rt) => rt.abort());
    if (user) await ctx.addInitScript((u) => localStorage.setItem("sb-mock-auth-token", JSON.stringify({ user: { id: u.id } })), user);
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("dialog", (d) => d.accept());
    return { ctx, p };
  }
  const ALL = Array.from({ length: 13 }, (_, i) => "m" + (i + 1));

  // ── Capstone: opening the page on a second device doesn't wipe the work saved from the first
  {
    const S = mockDb();
    S.db.course_progress["u1|capstone"] = { data: { phase: 5, gates: { p1: [true, true, true, true, true] }, p1: { scope: "Device A: my scope notes" }, t: Date.now() - 3600e3 } };
    const d = await device(S, U);
    await d.p.goto(O + "/capstone.html"); await d.p.waitForTimeout(2000);
    const row = S.db.course_progress["u1|capstone"].data;
    r.ok(row.p1 && row.p1.scope === "Device A: my scope notes" && row.phase === 5, "capstone: a new device doesn't overwrite the work saved to the account");
    r.ok(await d.p.evaluate(() => JSON.parse(localStorage.getItem("vh-capstone") || "{}").phase === 5), "capstone: a new device picks up the account's work");
    await d.ctx.close();
  }
  // ── Capstone: if the account can't be read, nothing is uploaded
  {
    const S = mockDb(); S.cfg.readFails = true;
    S.db.course_progress["u1|capstone"] = { data: { phase: 4, p1: { scope: "Saved scope" }, t: 1 } };
    const d = await device(S, U);
    await d.p.goto(O + "/capstone.html"); await d.p.waitForTimeout(800);
    await d.p.fill("#p1scope", "typed while offline"); await d.p.waitForTimeout(1800);
    r.ok(!S.ops.includes("upsert:course_progress") && S.db.course_progress["u1|capstone"].data.p1.scope === "Saved scope", "capstone: when the account can't be read, nothing is uploaded over it");
    await d.ctx.close();
  }
  // ── Academy: a device with older progress merges with the account instead of overwriting it
  for (const slow of [false, true]) {
    const S = mockDb();
    if (slow) S.cfg.latency["select:progress"] = 700;
    S.db.progress.u1 = { data: { done: ALL.slice(0, 10), doneAt: {} } };
    const d = await device(S, U, () => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem("vf-academy", JSON.stringify({ done: ["m1", "m2"], role: "design" })); } });
    await d.p.goto(O + "/training.html"); await d.p.waitForTimeout(2500);
    const cloud = S.db.progress.u1.data.done || [];
    const first = S.ops.findIndex((o) => o === "upsert:progress"), read = S.ops.indexOf("select:progress");
    r.ok(cloud.length >= 10 && (first === -1 || first > read), `Academy${slow ? " (slow account read)" : ""}: an older device never uploads before reading the account (${cloud.length} modules kept)`);
    r.ok(await d.p.evaluate(() => JSON.parse(localStorage.getItem("vf-academy")).done.length) >= 10, `Academy${slow ? " (slow account read)" : ""}: the older device is brought up to date`);
    await d.ctx.close();
  }
  // ── Academy: a failed account read uploads nothing
  {
    const S = mockDb(); S.cfg.readFails = true;
    S.db.progress.u1 = { data: { done: ALL.slice(0, 8) } };
    const d = await device(S, U, () => localStorage.setItem("vf-academy", JSON.stringify({ done: ["m1"] })));
    await d.p.goto(O + "/training.html"); await d.p.waitForTimeout(1500);
    r.ok(!S.ops.includes("upsert:progress") && S.db.progress.u1.data.done.length === 8, "Academy: when the account can't be read, the saved progress is left alone");
    await d.p.click('#modNav .mod-link[data-target="m4"]'); await d.p.waitForTimeout(400);
    r.ok(!(await d.p.$("#authGate.is-visible")) && (await d.p.evaluate(() => document.querySelector(".tmod.is-visible").dataset.mod)) === "m4", "Academy: with the database unreachable, a signed-in learner can still open their modules");
    await d.ctx.close();
  }
  // ── Exam: the server marks the paper but the reply is lost; sending again shows the result
  {
    const S = mockDb(); S.cfg.submitLoseResponse = true;
    S.db.progress.u1 = { data: { done: ALL } };
    const d = await device(S, U, () => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem("vf-academy", JSON.stringify({ done: Array.from({ length: 13 }, (_, i) => "m" + (i + 1)) })); } });
    await d.p.goto(O + "/training.html?open=exam"); await d.p.waitForTimeout(1500);
    await d.p.click("#examStart"); await d.p.waitForSelector(".ex-q");
    for (let i = 0; i < 3; i++) { await d.p.click(".ex-opt >> nth=0"); await d.p.click("#exNext"); }
    await d.p.waitForSelector("#exResend"); await d.p.click("#exResend"); await d.p.waitForTimeout(800);
    r.ok(/passed/.test(await d.p.textContent("#examMount")), "exam: answers sent twice after a lost reply still show the result");
    // the pass is kept until the certificate is made, even across a reload
    await d.p.reload(); await d.p.waitForTimeout(1500);
    const after = await d.p.textContent("#examMount");
    r.ok(/You passed with 100%/.test(after) && !!(await d.p.$("#certNameInput")), "exam: a pass survives a reload before the name is entered");
    await d.ctx.close();
  }
  // ── Sign-in with a code for an email that has no account
  {
    const S = mockDb(); S.cfg.otpError = { message: "Signups not allowed for otp", status: 422 };
    const d = await device(S, null);
    await d.p.goto(O + "/auth.html"); await d.p.waitForTimeout(600);
    await d.p.fill("#si-email", "newperson@example.com"); await d.p.click("[data-otp-signin]"); await d.p.waitForTimeout(800);
    r.ok(/couldn't find an account/.test(await d.p.textContent("#otp-banner")), "sign-in code for an unknown email says there's no account");
    await d.ctx.close();
  }
  // ── Certificate page: the score and date on record win over an edited link
  {
    const S = mockDb();
    S.db.certificates["VH-REAL1234"] = { id: "VH-REAL1234", full_name: "Sam Patel", score: 82, issued_at: "2026-09-01T10:00:00Z" };
    const tok = Buffer.from(JSON.stringify({ n: "Sam Patel", s: 100, d: "2025-01-01", id: "VH-REAL1234" })).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const d = await device(S, null);
    await d.p.goto(O + "/certificate.html?c=" + tok); await d.p.waitForTimeout(1200);
    const shown = await d.p.evaluate(() => [document.getElementById("certScore").textContent, document.getElementById("certDate").textContent]);
    r.ok(shown[0] === "82%" && shown[1] === "1 September 2026", `certificate page shows the score and date on record (${shown.join(", ")})`);
    await d.ctx.close();
  }
  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
};
