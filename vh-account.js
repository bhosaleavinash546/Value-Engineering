/* ════════════════════════════════════════════════════════════
   VAVEhub — signed-in account layer (all pages)
   Reads the session (Supabase in live mode, vh-session in demo),
   swaps the nav "Sign in" link for an account chip with a menu,
   and exposes window.VHAccount for other scripts (cert prefill,
   My Learning banner). Safe no-op when nobody is signed in.
   ════════════════════════════════════════════════════════════ */
window.VHAccount = (function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);

  const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // demo sessions expire after 30 days

  /* Shared computers: course progress in this browser belongs to whoever signed in last ("vh-owner").
     When someone else signs in, it's cleared before the course pages read it, so one person's
     progress never ends up in another person's account. Runs before training.js / course.js / capstone.js. */
  const COURSE_KEYS = ["vf-academy", "vh-review", "vh-capstone", "vh-leaders", "vh-leaders-labs", "vh-mistakes", "vh-last-course", "vh-feedback"];
  (function checkOwner() {
    try {
      let who = "";
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (/^sb-.+-auth-token$/.test(k)) { const t = JSON.parse(localStorage.getItem(k)); if (t && t.user && t.user.id) who = "u:" + t.user.id; }
      }
      if (!who) { const s = JSON.parse(localStorage.getItem("vh-session")); if (s && s.email) who = "e:" + String(s.email).toLowerCase(); }
      if (!who) return; // signed out: leave things as they are
      const prev = localStorage.getItem("vh-owner");
      if (prev && prev !== who) {
        COURSE_KEYS.forEach((k) => localStorage.removeItem(k));
        try { Object.keys(sessionStorage).filter((k) => k.indexOf("vh-exam-run-") === 0).forEach((k) => sessionStorage.removeItem(k)); } catch (e) {}
      }
      localStorage.setItem("vh-owner", who);
    } catch (e) {}
  })();

  function localSession() {
    try {
      const s = JSON.parse(localStorage.getItem("vh-session"));
      if (s && s.at && Date.now() - s.at > SESSION_MAX_AGE) {
        localStorage.removeItem("vh-session");
        return null;
      }
      return s;
    } catch { return null; }
  }

  // escape user-controlled values before they enter innerHTML
  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  async function current() {
    if (window.VHCloud && VHCloud.live) {
      try {
        const name = await VHCloud.displayName();
        if (name) { const u = await VHCloud.user(); return { name, email: (u && u.email) || "", live: true }; }
      } catch (e) {}
      return null;
    }
    const s = localSession();
    return s && s.name ? { name: s.name, email: s.email || "", live: false } : null;
  }

  async function signOut() {
    if (window.VHCloud) { try { await VHCloud.signOut(); } catch (e) {} }
    try { localStorage.removeItem("vh-session"); } catch (e) {}
    // restore the signed-out nav in place — a static site needs no reload
    const chip = $(".acct-chip");
    if (chip) {
      const a = document.createElement("a");
      a.className = "nav-signin" + (document.body.classList.contains("tr-body") ? " tr-signin" : "");
      a.href = "auth.html";
      a.textContent = "Sign in";
      chip.replaceWith(a);
    }
    const cta = $(".nav-cta");
    if (cta) { cta.textContent = "Get started"; cta.href = "auth.html?view=signup"; }
    VHAccount.user = null;
    document.dispatchEvent(new CustomEvent("vh-account", { detail: null }));
  }

  function buildChip(user) {
    const first = user.name.trim().split(/\s+/)[0];
    const initial = first.charAt(0).toUpperCase();
    const wrap = document.createElement("div");
    wrap.className = "acct-chip";
    wrap.innerHTML =
      '<button class="acct-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="acctMenu">' +
        '<span class="acct-avatar">' + esc(initial) + '</span><span class="acct-name">' + esc(first) + '</span><span class="acct-caret">▾</span></button>' +
      '<div class="acct-menu" id="acctMenu" hidden>' +
        '<div class="acct-who">Signed in as<br><b>' + esc(user.name) + '</b>' + (user.email ? '<span>' + esc(user.email) + '</span>' : '') + '</div>' +
        '<a href="' + myCourse() + '">🎓 My learning</a>' +
        '<a href="toolkit/">🧰 Toolkit</a>' +
        '<button type="button" data-signout>Sign out</button>' +
      '</div>';
    const btn = $(".acct-btn", wrap), menu = $(".acct-menu", wrap);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || menu.hidden) return;
      menu.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.focus(); // back to the button that opened it
    });
    $("[data-signout]", wrap).addEventListener("click", signOut);
    return wrap;
  }

  // "My learning" opens the course this browser used last (set by training.js / course.js)
  function myCourse() {
    try { return localStorage.getItem("vh-last-course") === "leaders" ? "leaders.html" : "training.html"; } catch (e) { return "training.html"; }
  }

  async function init() {
    const user = await current();
    VHAccount.user = user;
    document.dispatchEvent(new CustomEvent("vh-account", { detail: user }));
    if (!user) return;
    const signin = $(".nav-signin");
    if (signin) signin.replaceWith(buildChip(user));
    const cta = $(".nav-cta");
    if (cta) { cta.textContent = "My learning →"; cta.href = myCourse(); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { current, signOut, user: null };
})();
