/* ════════════════════════════════════════════════════════════
   VAVEhub — authentication engine
   Views: signin · signup · forgot · otp · success
   Runs in DEMO mode (localStorage) out of the box; switches to
   real email-OTP auth when Supabase creds are set in site-config.js
   ════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const cfg = (window.VF_CONFIG || {});
  const LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);

  /* ── tiny store helpers (demo mode) ── */
  const store = {
    accounts() { try { return JSON.parse(localStorage.getItem("vh-accounts")) || {}; } catch { return {}; } },
    saveAccounts(a) { try { localStorage.setItem("vh-accounts", JSON.stringify(a)); } catch {} },
    setSession(s) { try { localStorage.setItem("vh-session", JSON.stringify(s)); } catch {} },
    session() { try { return JSON.parse(localStorage.getItem("vh-session")); } catch { return null; } },
    clearSession() { try { localStorage.removeItem("vh-session"); } catch {} },
  };
  // very light obfuscation for demo only — NOT real security
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return "d" + (h >>> 0).toString(36); };
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  /* ── view router ── */
  const views = $$(".auth-view");
  function show(name) {
    views.forEach((v) => v.classList.toggle("is-active", v.id === "view-" + name));
    const first = $(".auth-view.is-active input");
    if (first) setTimeout(() => first.focus(), 60);
    banner("signin-banner", ""); banner("signup-banner", ""); banner("forgot-banner", ""); banner("otp-banner", ""); banner("newpass-banner", "");
  }
  $$("[data-goto]").forEach((b) => b.addEventListener("click", () => show(b.dataset.goto)));

  /* ── password show/hide ── */
  $$("[data-pwtoggle]").forEach((btn) => btn.addEventListener("click", () => {
    const inp = document.getElementById(btn.dataset.pwtoggle);
    inp.type = inp.type === "password" ? "text" : "password";
    btn.textContent = inp.type === "password" ? "👁" : "🙈";
  }));

  /* ── banners & field errors ── */
  function banner(id, msg, kind) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || "";
    el.className = "form-banner" + (msg ? " show " + (kind || "err") : "");
  }
  function fieldError(input, on) { input.closest(".field").classList.toggle("is-error", on); }
  function loading(form, on) {
    const btn = $('button[type="submit"]', form);
    if (btn) { btn.classList.toggle("is-loading", on); btn.disabled = on; }
  }

  /* ── password strength ── */
  const suPass = $("#su-pass");
  if (suPass) {
    const meter = $("#pw-strength"), hint = $("#pw-hint");
    suPass.addEventListener("input", () => {
      const v = suPass.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
      if (/\d/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      if (v.length < 8) score = Math.min(score, 1);
      meter.dataset.score = v ? score : 0;
      hint.textContent = ["Use 8+ characters with a mix of letters, numbers & symbols.",
        "Weak — add length and variety.", "Fair — add numbers or symbols.",
        "Good password.", "Strong password ✓"][v ? score : 0];
    });
  }

  /* ── OTP flow state ── */
  let pending = null; // { mode: 'signup'|'signin'|'reset', email, name, pass, code, expires }
  let resendTimer = null;

  function genCode() {
    if (window.crypto && crypto.getRandomValues) {
      const a = new Uint32Array(1); crypto.getRandomValues(a);
      return String(a[0] % 1000000).padStart(6, "0");
    }
    return String(Math.floor(100000 + Date.now() % 900000));
  }

  async function sendCode(mode, email, extra) {
    pending = Object.assign({ mode, email, code: genCode(), expires: Date.now() + 600000 }, extra || {});
    $("#otp-target").textContent = email;
    // clear inputs
    $$("#otp-row input").forEach((i) => { i.value = ""; i.classList.remove("filled"); });
    show("otp");
    startResend();
    if (LIVE) {
      // Real path: Supabase sends the email. Surface the ACTUAL error if the
      // send fails (signInWithOtp resolves with {error}, it does not throw).
      try {
        const { error } = await (await supaReady()).auth.signInWithOtp({ email, options: { shouldCreateUser: mode !== "signin", data: (extra && extra.name) ? { full_name: extra.name } : undefined } });
        if (error) banner("otp-banner", "Email couldn't be sent: " + (error.message || "unknown error") + ". Check spam, or try again shortly.", "err");
      } catch (e) { banner("otp-banner", "Could not send code: " + (e.message || "try again"), "err"); }
      $("#demo-otp").className = "demo-otp";
    } else {
      // Demo path: reveal the code on-screen (clearly labeled)
      const d = $("#demo-otp");
      d.innerHTML = "Demo mode — your code is <b>" + pending.code + "</b><br>(a real deployment emails this instead)";
      d.className = "demo-otp show";
    }
    $$("#otp-row input")[0].focus();
  }

  function startResend() {
    let t = 60; // Supabase rate-limits OTP resends to 60s
    const timerEl = $("#otp-timer"), resendEl = $("#otp-resend");
    clearInterval(resendTimer);
    resendEl.innerHTML = 'Didn\'t get it? Resend in <b id="otp-timer">' + t + 's</b>';
    resendTimer = setInterval(() => {
      t--;
      if (t <= 0) {
        clearInterval(resendTimer);
        resendEl.innerHTML = 'Didn\'t get it? <button class="link-btn" id="otp-resend-btn">Resend code</button>';
        $("#otp-resend-btn").addEventListener("click", () => {
          if (pending) sendCode(pending.mode, pending.email, { name: pending.name, pass: pending.pass });
        });
      } else {
        const el = $("#otp-timer"); if (el) el.textContent = t + "s";
      }
    }, 1000);
  }

  /* ── OTP inputs: auto-advance, paste, backspace ── */
  const otpInputs = $$("#otp-row input");
  otpInputs.forEach((inp, i) => {
    inp.addEventListener("input", () => {
      inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
      inp.classList.toggle("filled", !!inp.value);
      if (inp.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !inp.value && i > 0) otpInputs[i - 1].focus();
    });
    inp.addEventListener("paste", (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6).split("");
      digits.forEach((d, k) => { if (otpInputs[k]) { otpInputs[k].value = d; otpInputs[k].classList.add("filled"); } });
      (otpInputs[digits.length] || otpInputs[5]).focus();
    });
  });

  function currentOtp() { return otpInputs.map((i) => i.value).join(""); }

  /* ── Supabase client (live mode only) — shared with vh-cloud.js ── */
  let _supa = null;
  async function supaReady() {
    if (window.VHCloud && VHCloud.live) { await VHCloud.ready; if (VHCloud.client()) return VHCloud.client(); }
    if (_supa) return _supa;
    if (!window.supabase) await new Promise((res) => {
      const sdk = document.createElement("script");
      sdk.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      sdk.onload = res; sdk.onerror = res;
      document.head.appendChild(sdk);
    });
    if (!window.supabase) throw new Error("Supabase library not loaded");
    _supa = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    return _supa;
  }

  function succeed(title, msg, name, email) {
    if (name) store.setSession({ name, email: email || (pending && pending.email) || "", at: Date.now() });
    $("#success-title").textContent = title;
    $("#success-msg").textContent = msg;
    show("success");
  }

  /* ── SIGN UP ── */
  $("#form-signup").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#su-name").value.trim(), email = $("#su-email").value.trim(), pass = $("#su-pass").value;
    let bad = false;
    fieldError($("#su-name"), !name); if (!name) bad = true;
    fieldError($("#su-email"), !validEmail(email)); if (!validEmail(email)) bad = true;
    fieldError($("#su-pass"), pass.length < 8); if (pass.length < 8) bad = true;
    if (!$("#su-terms").checked) { banner("signup-banner", "Please accept to continue.", "err"); bad = true; }
    if (bad) return;
    if (store.accounts()[email.toLowerCase()]) { banner("signup-banner", "An account with this email already exists — try signing in.", "err"); return; }
    loading(e.target, true);
    setTimeout(() => { loading(e.target, false); sendCode("signup", email, { name, pass }); }, 500);
  });

  /* ── SIGN IN (password) ── */
  $("#form-signin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#si-email").value.trim(), pass = $("#si-pass").value;
    fieldError($("#si-email"), !validEmail(email));
    fieldError($("#si-pass"), !pass);
    if (!validEmail(email) || !pass) return;
    loading(e.target, true);
    if (LIVE) {
      try {
        const { data, error } = await (await supaReady()).auth.signInWithPassword({ email, password: pass });
        loading(e.target, false);
        if (error) return banner("signin-banner", error.message, "err");
        const nm = (data && data.user && data.user.user_metadata && data.user.user_metadata.full_name) || email.split("@")[0];
        succeed("Welcome back, " + nm.split(" ")[0] + "!", "Signed in successfully.", nm, email);
      } catch (err) { loading(e.target, false); banner("signin-banner", "Sign-in failed. Try the email code option.", "err"); }
      return;
    }
    setTimeout(() => {
      loading(e.target, false);
      const acc = store.accounts()[email.toLowerCase()];
      if (!acc) return banner("signin-banner", "No account found for this email. Create one — it's free.", "err");
      if (acc.pass !== hash(pass)) return banner("signin-banner", "Incorrect password. Try again or reset it.", "err");
      succeed("Welcome back, " + acc.name.split(" ")[0] + "!", "Signed in successfully.", acc.name, email);
    }, 500);
  });

  /* ── SIGN IN via OTP ── */
  $("[data-otp-signin]").addEventListener("click", () => {
    const email = $("#si-email").value.trim();
    if (!validEmail(email)) { fieldError($("#si-email"), true); banner("signin-banner", "Enter your email first, then request a code.", "err"); return; }
    sendCode("signin", email);
  });

  /* ── FORGOT ── */
  $("#form-forgot").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#fp-email").value.trim();
    fieldError($("#fp-email"), !validEmail(email));
    if (!validEmail(email)) return;
    if (!LIVE && !store.accounts()[email.toLowerCase()]) {
      banner("forgot-banner", "No account found for this email. Create one instead — it's free.", "err");
      return;
    }
    loading(e.target, true);
    setTimeout(() => { loading(e.target, false); sendCode("reset", email); }, 500);
  });

  /* ── OTP VERIFY ── */
  $("#form-otp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = currentOtp();
    if (code.length !== 6) { banner("otp-banner", "Enter all six digits.", "err"); return; }
    loading(e.target, true);

    if (LIVE) {
      try {
        const { error } = await (await supaReady()).auth.verifyOtp({ email: pending.email, token: code, type: "email" });
        if (!error && pending.pass) { try { await (await supaReady()).auth.updateUser({ password: pending.pass }); } catch (x) {} }
        loading(e.target, false);
        if (error) return banner("otp-banner", "Invalid or expired code.", "err");
        finishPending();
      } catch (err) { loading(e.target, false); banner("otp-banner", "Verification failed.", "err"); }
      return;
    }
    setTimeout(() => {
      loading(e.target, false);
      if (!pending || Date.now() > pending.expires) return banner("otp-banner", "That code expired — request a new one.", "err");
      if (code !== pending.code) return banner("otp-banner", "Incorrect code. Check the digits and try again.", "err");
      finishPending();
    }, 500);
  });

  function finishPending() {
    clearInterval(resendTimer);
    if (pending.mode === "reset") {
      // Email verified — now let the user actually choose a new password.
      $("#np-target").textContent = pending.email;
      show("newpass");
      return; // keep `pending` for the newpass submit
    }
    if (LIVE) {
      const nm = pending.name || pending.email.split("@")[0];
      if (pending.mode === "signup") succeed("Welcome to VAVEhub, " + nm.split(" ")[0] + "!", "Your account is verified and ready.", nm, pending.email);
      else succeed("You're in!", "Signed in with a one-time code.", nm, pending.email);
      pending = null; return;
    }
    const accts = store.accounts();
    if (pending.mode === "signup") {
      accts[pending.email.toLowerCase()] = { name: pending.name, email: pending.email, pass: hash(pending.pass), created: Date.now() };
      store.saveAccounts(accts);
      succeed("Welcome to VAVEhub, " + pending.name.split(" ")[0] + "!", "Your account is verified and ready.", pending.name);
    } else { // signin via otp
      const acc = accts[pending.email.toLowerCase()];
      succeed("You're in!", "Signed in with a one-time code.", acc ? acc.name : pending.email.split("@")[0], pending.email);
    }
    pending = null;
  }

  /* ── SET NEW PASSWORD (reset flow, after OTP verified) ── */
  $("#form-newpass").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p1 = $("#np-pass").value, p2 = $("#np-pass2").value;
    fieldError($("#np-pass"), p1.length < 8);
    fieldError($("#np-pass2"), p1 !== p2);
    if (p1.length < 8 || p1 !== p2) return;
    if (!pending || pending.mode !== "reset") { show("signin"); return; }
    loading(e.target, true);
    const email = pending.email;
    if (LIVE) {
      try {
        // OTP verification signed the user in, so updateUser can set the password
        const { error } = await (await supaReady()).auth.updateUser({ password: p1 });
        loading(e.target, false);
        if (error) return banner("newpass-banner", error.message, "err");
        succeed("Password updated", "Your new password is saved — and you're signed in.", email.split("@")[0], email);
        pending = null;
      } catch (err) { loading(e.target, false); banner("newpass-banner", "Could not save the password — try again.", "err"); }
      return;
    }
    setTimeout(() => {
      loading(e.target, false);
      const accts = store.accounts();
      const acc = accts[email.toLowerCase()];
      if (!acc) return banner("newpass-banner", "Account not found — please sign up instead.", "err");
      acc.pass = hash(p1);
      store.saveAccounts(accts);
      succeed("Password updated", "Your new password is saved — and you're signed in.", acc.name, email);
      pending = null;
    }, 500);
  });

  /* ── already signed in? offer to continue instead of re-asking ── */
  (async function detectSession() {
    let name = null;
    if (LIVE && window.VHCloud) { try { name = await VHCloud.displayName(); } catch (e) {} }
    else { const sess = store.session(); if (sess && sess.name) name = sess.name; }
    if (!name) return;
    const noteEl = $("#signed-note");
    $("#sn-name").textContent = name;
    $("#sn-avatar").textContent = name.trim().charAt(0).toUpperCase();
    noteEl.hidden = false;
    $("#sn-signout").addEventListener("click", async () => {
      if (window.VHCloud) await VHCloud.signOut(); else store.clearSession();
      noteEl.hidden = true;
    });
  })();

  /* ── mode note ── */
  const note = $("#mode-note");
  if (note) note.textContent = LIVE
    ? "Secure email-code authentication."
    : "Demo mode — accounts are stored in this browser only. Connect Supabase in site-config.js to go live.";

  /* ── deep-link: auth.html?view=signup ── */
  const wanted = new URLSearchParams(location.search).get("view");
  if (wanted && $("#view-" + wanted)) show(wanted);

  /* ── ?next= : after auth, return where the user came from (same-site only) ── */
  const nextRaw = new URLSearchParams(location.search).get("next");
  if (nextRaw && !/^(https?:|\/\/|javascript:)/i.test(nextRaw)) {
    const goBtn = $("#view-success a.btn-primary");
    if (goBtn) { goBtn.setAttribute("href", nextRaw); goBtn.querySelector(".btn-label") ? 0 : (goBtn.textContent = "Continue →"); }
    const contBtn = $(".signed-note a.btn-primary");
    if (contBtn) contBtn.setAttribute("href", nextRaw);
  }
})();
