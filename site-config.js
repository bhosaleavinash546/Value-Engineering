/* ════════════════════════════════════════════════════════════
   VAVEhub — one-file activation for newsletter, contact
   form, booking and analytics. Fill a value, push, and the
   feature switches on. Leave empty ("") to keep the fallback.
   ════════════════════════════════════════════════════════════ */
window.VF_CONFIG = {
  /* 1) NEWSLETTER — create a free account at https://buttondown.com,
        then set your username here (e.g. "valueforge").
        Until set, the subscribe box falls back to an email draft. */
  buttondownUser: "",

  /* 2) CONTACT FORM — create a free form at https://formspree.io,
        then paste the form ID here (e.g. "xkgwqyzb").
        Until set, the form falls back to opening an email draft. */
  formspreeId: "",

  /* 3) BOOKING — create a free https://calendly.com event,
        then paste the full link (e.g. "https://calendly.com/you/30min").
        Until set, the "Book a call" button stays hidden. */
  calendlyUrl: "",

  /* 4) ANALYTICS — create a free site at https://www.goatcounter.com,
        then set your code here (e.g. "valueforge" for
        valueforge.goatcounter.com). Until set, no analytics loads. */
  goatcounterCode: "",

  /* 5) AUTH (real email-OTP login) — create a free project at
        https://supabase.com, then paste your Project URL and anon
        (public) key here. Supabase sends real OTP emails and stores
        accounts securely. Until both are set, the login page runs in
        DEMO mode (accounts saved in the browser only). */
  supabaseUrl: "https://pnvidzchlnlfodfnawur.supabase.co",
  supabaseAnonKey: "sb_publishable_2dBHd481kEfJh2AIY-nFvw_yVKteCwl",

  /* 6) COMMUNITY DISCUSSION (Giscus) — enable GitHub Discussions on the
        repo, install the giscus app (github.com/apps/giscus), then copy
        the four values from giscus.app. Until set, the discussion panel
        stays hidden. */
  giscusRepo: "",
  giscusRepoId: "",
  giscusCategory: "",
  giscusCategoryId: "",
};

/* Normalise the Supabase URL: accept a pasted REST endpoint
   (…/rest/v1/) or a trailing slash and reduce it to the base origin. */
(function () {
  var c = window.VF_CONFIG;
  if (c && c.supabaseUrl) {
    c.supabaseUrl = c.supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  }
})();

/* GoatCounter loader — privacy-friendly, no cookies */
(function () {
  var c = window.VF_CONFIG.goatcounterCode;
  if (!c) return;
  var s = document.createElement("script");
  s.async = true;
  s.dataset.goatcounter = "https://" + c + ".goatcounter.com/count";
  s.src = "https://gc.zgo.at/count.js";
  document.head.appendChild(s);
})();

/* ── Light/dark theme toggle (persisted) ── */
(function () {
  var root = document.documentElement;
  function icons() {
    var light = root.dataset.theme === "light";
    document.querySelectorAll("[data-themetoggle]").forEach(function (b) { b.textContent = light ? "☀️" : "🌙"; });
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = light ? "#f3f5fa" : "#05070f";
  }
  document.querySelectorAll("[data-themetoggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = root.dataset.theme === "light" ? "dark" : "light";
      root.dataset.theme = next;
      try { localStorage.setItem("vf-theme", next); } catch (e) {}
      icons();
      document.dispatchEvent(new CustomEvent("vf-themechange"));
    });
  });
  icons();
})();

/* ── PWA: register the service worker (offline shell + audio cache) ── */
(function () {
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
