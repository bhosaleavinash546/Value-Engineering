/* ════════════════════════════════════════════════════════════
   VAVEhub — cloud data layer (Supabase)
   Shared by auth.html, training.html, certificate.html, verify.html.
   Gracefully no-ops to localStorage when Supabase isn't configured,
   so every page keeps working in demo mode.
   Expose: window.VHCloud
   ════════════════════════════════════════════════════════════ */
window.VHCloud = (function () {
  "use strict";
  const cfg = window.VF_CONFIG || {};
  const LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  let client = null, ready;

  // Load the Supabase SDK on demand, then create the client.
  // Content pages only need it to show who is signed in, so they skip the 200 KB SDK
  // unless this browser already holds a Supabase session token.
  const NEEDS_SDK = /(training|leaders|auth|certificate|verify|admin)\.html$/.test(location.pathname);
  const HAS_TOKEN = (() => { try { return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k)); } catch (e) { return true; } })();
  ready = (function () {
    if (!LIVE || (!NEEDS_SDK && !HAS_TOKEN)) return Promise.resolve(null);
    return new Promise((resolve) => {
      if (window.supabase) { resolve(mk()); return; }
      const s = document.createElement("script");
      s.src = "vendor/supabase-2.110.1.min.js"; // self-hosted, pinned — no third-party CDN
      s.onload = () => resolve(mk());
      s.onerror = () => resolve(null); // fall back silently
      document.head.appendChild(s);
    });
    function mk() {
      try { client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey); } catch (e) { client = null; }
      return client;
    }
  })();

  // Remember how this browser first found the site (a campaign tag or the linking website),
  // so the owner dashboard can show where learners come from. Stays on the device until sign-in.
  try {
    if (!localStorage.getItem("vh-src")) {
      const utm = new URLSearchParams(location.search).get("utm_source");
      let src = utm || "";
      if (!src && document.referrer) {
        const h = new URL(document.referrer).hostname.replace(/^www\./, "");
        if (h && h !== location.hostname.replace(/^www\./, "")) src = h;
      }
      localStorage.setItem("vh-src", (src || "direct").slice(0, 80));
    }
  } catch (e) {}

  async function user() {
    if (!LIVE) return null;
    await ready; if (!client) return null;
    // the stored session (refreshed by the SDK when it expires) rather than a network round trip on every save
    try { const { data } = await client.auth.getSession(); return data && data.session ? data.session.user : null; } catch (e) { return null; }
  }


  /* ── Exams marked on the server ──
     Live sites call the Supabase functions in supabase-exam.sql: the page only ever sees
     questions without answers. Without Supabase (local demo and the automated tests) the
     same rules run in the browser on a dummy bank (tests/fixtures/exam-demo-bank.json),
     because the real question banks are never published. */
  const DEMO_KEY = "vh-demo-exam";
  const PASS = { academy: 80, leaders: 70 };
  const mix = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let demoBank = null;
  async function loadDemoBank() {
    if (demoBank) return demoBank;
    try { const r = await fetch("tests/fixtures/exam-demo-bank.json", { cache: "no-store" }); if (r.ok) demoBank = await r.json(); } catch (e) {}
    return demoBank;
  }
  const demoState = () => { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || { attempts: {}, certs: {} }; } catch (e) { return { attempts: {}, certs: {} }; } };
  const demoSave = (s) => { try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); } catch (e) {} };
  const demo = {
    async start(course) {
      const bank = (await loadDemoBank() || {})[course];
      if (!bank || !bank.length) return { error: "offline" };
      if (course === "academy") { // same rule as the server: all 13 modules complete first
        let done = [];
        try { done = (JSON.parse(localStorage.getItem("vf-academy")) || {}).done || []; } catch (e) {}
        if (new Set(done.filter((m) => /^m([1-9]|1[0-3])$/.test(m))).size < 13) return { need_modules: true };
      }
      const st = demoState();
      const lastFail = Object.values(st.attempts).filter((a) => a.course === course && a.passed === false).map((a) => a.at).sort().pop();
      if (lastFail && Date.now() - Date.parse(lastFail) < 3600e3) return { wait_until: new Date(Date.parse(lastFail) + 3600e3).toISOString() };
      const per = course === "academy" ? 2 : 1, extras = course === "academy" ? 4 : 5;
      const byMod = {};
      mix(bank.map((q, i) => i)).forEach((i) => { (byMod[bank[i].module] = byMod[bank[i].module] || []).push(i); });
      let picked = [].concat(...Object.values(byMod).map((l) => l.slice(0, per)));
      const rest = mix(bank.map((q, i) => i).filter((i) => !picked.includes(i) &&
        (course === "leaders" || bank[i].kind === "apply" || bank[i].kind === "calc" || bank[i].pool === "case")));
      // the small demo bank can run out of scenario questions; top up from the rest so the paper is always full
      const extra = rest.slice(0, extras);
      if (extra.length < extras) extra.push(...mix(bank.map((q, i) => i).filter((i) => !picked.includes(i) && !extra.includes(i))).slice(0, extras - extra.length));
      picked = mix(picked.concat(extra));
      const perms = picked.map((i) => mix(bank[i].options.map((o, k) => k)));
      const id = "demo-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      st.attempts[id] = { course, qids: picked, perms, at: null, passed: null };
      demoSave(st);
      return { attempt: id, pass: PASS[course],
        questions: picked.map((i, n) => ({ module: bank[i].module, q: bank[i].q, options: perms[n].map((k) => bank[i].options[k]) })) };
    },
    async submit(id, answers) {
      const st = demoState(), a = st.attempts[id];
      if (!a) return { error: "This attempt has already been marked" };
      if (a.at && a.result) return a.result; // sent twice (a lost reply, a double click): the first marking stands
      const bank = (await loadDemoBank())[a.course];
      const marks = a.qids.map((qi, n) => {
        const q = bank[qi], chosen = answers[n] == null ? null : a.perms[n][answers[n]];
        return { q, chosen, ok: chosen === q.answer };
      });
      const right = marks.filter((m) => m.ok).length, total = marks.length;
      const score = Math.round((100 * right) / Math.max(total, 1)), passed = score >= PASS[a.course];
      const by = {};
      marks.forEach((m) => { const b = (by[m.q.module] = by[m.q.module] || [0, 0]); b[1]++; if (m.ok) b[0]++; });
      const result = { score, right, total, passed, pass: PASS[a.course], by_module: by,
        review: passed ? marks.filter((m) => !m.ok).map((m) => ({ q: m.q.q, yours: m.chosen == null ? "" : m.q.options[m.chosen], right: m.q.options[m.q.answer], why: m.q.explanation })) : null,
        wait_until: passed ? null : new Date(Date.now() + 3600e3).toISOString() };
      Object.assign(a, { at: new Date().toISOString(), passed, score, result });
      demoSave(st);
      return result;
    },
    async issue(id, name) {
      const st = demoState(), a = st.attempts[id];
      const nm = String(name || "").trim().replace(/\s+/g, " ");
      if (!a || !a.passed) return { error: "No passed attempt found" };
      if (nm.length < 2 || nm.length > 60) return { error: "Please enter your name (2 to 60 characters)" };
      const prev = st.certs[a.course];
      const cert = prev ? Object.assign(prev, { name: nm, score: Math.max(prev.score, a.score) })
        : { id: (a.course === "leaders" ? "VL-" : "VH-") + Date.now().toString(36).toUpperCase(), name: nm, score: a.score, date: new Date().toISOString().slice(0, 10) };
      st.certs[a.course] = cert; demoSave(st);
      return cert;
    },
  };
  const demoQuotes = () => { try { return JSON.parse(localStorage.getItem("vh-demo-quotes")) || []; } catch (e) { return []; } };
  const demoQuotesSave = (q) => { try { localStorage.setItem("vh-demo-quotes", JSON.stringify(q)); } catch (e) {} };
  async function rpc(fn, args) {
    await ready;
    if (!client) return { error: "offline" };
    const u = await user(); if (!u) return { error: "signin" };
    try {
      const { data, error } = await client.rpc(fn, args);
      if (error) return { error: error.message || "error" };
      return data;
    } catch (e) { return { error: "offline" }; }
  }

  return {
    live: LIVE,
    ready,
    client: () => client,
    user,

    // ── session name for greeting/nav ──
    async displayName() {
      const u = await user();
      if (!u) return null;
      return (u.user_metadata && u.user_metadata.full_name) || (u.email ? u.email.split("@")[0] : null);
    },

    async signOut() {
      if (LIVE) { await ready; if (client) await client.auth.signOut(); }
      try { localStorage.removeItem("vh-session"); } catch (e) {}
    },

    // ── profile details for the owner dashboard, at most once a day per browser:
    // time zone + language (to estimate the country; no IP address), phone or computer,
    // first referrer, last seen. `force` is used straight after signing in.
    async touchProfile(force) {
      if (!LIVE) return false;
      const today = new Date().toISOString().slice(0, 10);
      try { if (!force && localStorage.getItem("vh-touch") === today) return false; } catch (e) {}
      const u = await user(); if (!u) return false;
      const row = {
        last_seen_at: new Date().toISOString(),
        timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; } })(),
        language: (navigator.language || "").slice(0, 20) || null,
        device: /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) ? "phone" : /iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : "computer",
      };
      try {
        const { error } = await client.from("profiles").update(row).eq("id", u.id);
        if (error) return false;
        let src = null; try { src = localStorage.getItem("vh-src"); } catch (e) {}
        if (src) await client.from("profiles").update({ source: src }).eq("id", u.id).is("source", null);
        try { localStorage.setItem("vh-touch", today); } catch (e) {}
        return true;
      } catch (e) { return false; }
    },

    // ── anonymous module feedback (no user id is sent) ──
    async sendFeedback(module, helpful, comment) {
      if (!LIVE) return false;
      await ready; if (!client) return false;
      try {
        const { error } = await client.from("module_feedback").insert({ module, helpful, comment: comment ? String(comment).slice(0, 500) : null });
        return !error;
      } catch (e) { return false; }
    },

    // ── progress: push/pull the course state blob ──
    // saves return true/false; loads return the data, null when nothing is saved yet, or false when the read failed
    async saveProgress(state) {
      const u = await user(); if (!u) return false;
      try {
        const { error } = await client.from("progress").upsert({ user_id: u.id, data: state, updated_at: new Date().toISOString() });
        return !error;
      } catch (e) { return false; }
    },
    async loadProgress() {
      const u = await user(); if (!u) return null;
      try {
        const { data, error } = await client.from("progress").select("data").eq("user_id", u.id).maybeSingle();
        if (error) return false;
        return data ? data.data : null;
      } catch (e) { return false; }
    },

    // ── other courses (e.g. VAVE for Leaders): one row per learner per course ──
    async saveCourse(course, state) {
      const u = await user(); if (!u) return false;
      try {
        const { error } = await client.from("course_progress").upsert({ user_id: u.id, course, data: state, updated_at: new Date().toISOString() });
        return !error;
      } catch (e) { return false; }
    },
    async loadCourse(course) {
      const u = await user(); if (!u) return null;
      try {
        const { data, error } = await client.from("course_progress").select("data").eq("user_id", u.id).eq("course", course).maybeSingle();
        if (error) return false;
        return data ? data.data : null;
      } catch (e) { return false; }
    },

    // ── certificates ──
        async registerCertificate(cert) {
      const u = await user(); if (!u) return false;
      try {
        const { error } = await client.from("certificates").upsert({
          id: cert.id, user_id: u.id, full_name: cert.name, score: cert.score, issued_at: new Date(cert.date).toISOString(),
        });
        return !error;
      } catch (e) { return false; }
    },
    // re-save a local certificate the database doesn't have yet (e.g. the first save failed)
    async ensureCertificate(cert) {
      if (!cert || !cert.id || !LIVE) return;
      const u = await user(); if (!u) return;
      const r = await this.verifyCertificate(cert.id);
      if (r.status === "notfound") await this.registerCertificate(cert);
    },
    // total certificates issued — public count for social proof
    async certCount() {
      if (!LIVE) return null;
      await ready; if (!client) return null;
      try {
                const r = await client.rpc("certificate_count");
        if (!r.error) return Number(r.data);
        // older database without the function: fall back to counting rows
        const { count, error } = await client.from("certificates").select("id", { count: "exact", head: true });
        return error ? null : count;
      } catch (e) { return null; }
    },
    async verifyCertificate(id) {
      if (!LIVE) return { status: "demo" };
      await ready; if (!client) return { status: "demo" };
      try {
                // checks ONE certificate by ID; the full list can't be read
        const r = await client.rpc("verify_certificate", { cert_id: id });
        if (!r.error) { const c = (r.data || [])[0]; return c ? { status: "valid", cert: c } : { status: "notfound" }; }
        // older database without the function
        const { data, error } = await client.from("certificates").select("id,full_name,score,issued_at").eq("id", id).maybeSingle();
        if (error) return { status: "error" };
        return data ? { status: "valid", cert: data } : { status: "notfound" };
      } catch (e) { return { status: "error" }; }
    },

    // ── exams (see the note above loadDemoBank) ──
    examStart: (course) => (LIVE ? rpc("start_exam", { p_course: course }) : demo.start(course)),
    examSubmit: (attempt, answers) => (LIVE ? rpc("submit_exam", { p_attempt: attempt, p_answers: answers.map((a) => (a == null ? null : a)) }) : demo.submit(attempt, answers)),
    examIssue: (attempt, name) => (LIVE ? rpc("issue_certificate", { p_attempt: attempt, p_name: name }) : demo.issue(attempt, name)),

    // ── verified learner quotes (supabase-testimonials.sql); demo mode keeps them in this browser ──
    quoteSubmit: (course, certId, quote, name, role) => (LIVE
      ? rpc("submit_testimonial", { p_course: course, p_cert: certId, p_quote: quote, p_name: name, p_role: role || "", p_consent: true })
      : (() => { const q = demoQuotes(); const i = q.findIndex((x) => x.course === course); const row = { id: "d" + Date.now(), course, cert_id: certId, quote, display_name: name, role: role || null, consent: true, approved: false, created_at: new Date().toISOString() }; if (i >= 0) { if (q[i].approved) return { error: "already approved" }; q[i] = row; } else q.push(row); demoQuotesSave(q); return "ok"; })()),
    async quotes(course) {
      if (!LIVE) return demoQuotes().filter((x) => x.approved && x.course === course);
      await ready; if (!client) return [];
      try { const r = await client.rpc("approved_testimonials", { p_course: course }); return r.error ? [] : (r.data || []); } catch (e) { return []; }
    },
    adminQuotes: () => (LIVE ? rpc("admin_testimonials", {}) : demoQuotes()),
    adminSetQuote: (id, approved, del) => (LIVE ? rpc("admin_set_testimonial", { p_id: id, p_approved: !!approved, p_delete: !!del })
      : (() => { let q = demoQuotes(); q = del ? q.filter((x) => x.id !== id) : q.map((x) => (x.id === id ? Object.assign(x, { approved: !!approved }) : x)); demoQuotesSave(q); return "ok"; })()),
  };
})();
