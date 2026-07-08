/* ── VAVEhub content protection ──
   Deters casual copying of course and site content: no text selection
   outside form fields, right-click and copy/cut intercepted (clipboard
   receives an attribution notice), save / view-source shortcuts and
   image dragging blocked. Interactive elements — inputs, textareas,
   selects, the exam, labs and calculators — are untouched, and the
   toolkit templates deliberately do not load this script. */
(function () {
  "use strict";

  /* clickjacking defence — GitHub Pages cannot send X-Frame-Options,
     so refuse to run inside another site's iframe */
  try {
    if (window.top !== window.self) { window.top.location = window.self.location; }
  } catch (e) {
    document.documentElement.style.display = "none"; // cross-origin frame we can't escape: hide instead
  }

  var NOTICE = "Content © VAVEhub — free to read at https://valueengineeringhub.com";

  /* selection off everywhere except things the user must type in */
  var st = document.createElement("style");
  st.textContent =
    "html.vh-protect body{-webkit-user-select:none;-moz-user-select:none;user-select:none}" +
    "html.vh-protect input,html.vh-protect textarea,html.vh-protect select,html.vh-protect [contenteditable]{-webkit-user-select:text;-moz-user-select:text;user-select:text}" +
    "html.vh-protect img,html.vh-protect svg{-webkit-user-drag:none;user-drag:none}" +
    ".vh-prot-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);z-index:9999;" +
    "background:rgba(9,13,28,.94);color:#eaeefb;border:1px solid rgba(90,162,255,.45);border-radius:12px;" +
    "padding:.6rem 1rem;font:600 .78rem 'IBM Plex Mono',monospace;letter-spacing:.04em;opacity:0;" +
    "transition:opacity .25s,transform .25s;pointer-events:none;box-shadow:0 12px 34px rgba(0,0,0,.45)}" +
    ".vh-prot-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}";
  document.head.appendChild(st);
  document.documentElement.classList.add("vh-protect");

  var tEl = null, tTimer = null;
  function toast(msg) {
    if (!tEl) { tEl = document.createElement("div"); tEl.className = "vh-prot-toast"; document.body.appendChild(tEl); }
    tEl.textContent = msg;
    tEl.classList.add("show");
    clearTimeout(tTimer);
    tTimer = setTimeout(function () { tEl.classList.remove("show"); }, 1800);
  }

  function inField(t) { return t && t.closest && t.closest("input, textarea, select, [contenteditable]"); }

  /* right-click */
  document.addEventListener("contextmenu", function (e) {
    if (inField(e.target)) return;
    e.preventDefault();
    toast("© VAVEhub — content is protected");
  });

  /* copy & cut: clipboard gets the attribution notice instead */
  ["copy", "cut"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (inField(e.target)) return;
      e.preventDefault();
      try { e.clipboardData.setData("text/plain", NOTICE); } catch (err) {}
      toast("Copying is disabled — © VAVEhub");
    });
  });

  /* select-all / save / view-source shortcuts (printing stays allowed —
     certificates and module summaries are meant to be printed) */
  document.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey) || inField(e.target)) return;
    var k = (e.key || "").toLowerCase();
    if (k === "a" || k === "s" || k === "u") {
      e.preventDefault();
      if (k !== "a") toast("© VAVEhub — content is protected");
    }
  });

  /* image / svg drag-out */
  document.addEventListener("dragstart", function (e) {
    var t = e.target;
    if (t && (t.tagName === "IMG" || (t.closest && t.closest("svg")))) e.preventDefault();
  });
})();
