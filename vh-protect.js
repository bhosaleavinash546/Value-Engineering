/* ── VAVEhub: framing guard and copy attribution ──
   Text can be selected and copied (translation tools, screen magnifiers and
   people quoting the course all need it). Copied text gets a source line
   added at the end. Save / view-source shortcuts and image dragging are
   still blocked, and the page refuses to run inside another site's frame.
   The toolkit templates deliberately do not load this script. */
(function () {
  "use strict";

  /* clickjacking defence — GitHub Pages cannot send X-Frame-Options,
     so refuse to run inside another site's iframe */
  try {
    if (window.top !== window.self) { window.top.location = window.self.location; }
  } catch (e) {
    document.documentElement.style.display = "none"; // cross-origin frame we can't escape: hide instead
  }

  var st = document.createElement("style");
  st.textContent =
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

  /* copy: keep the text and add where it came from */
  document.addEventListener("copy", function (e) {
    if (inField(e.target)) return;
    var text = String(window.getSelection ? window.getSelection() : "");
    if (!text.trim() || !e.clipboardData) return;
    e.preventDefault();
    var src = "Source: VAVEhub, " + location.origin + location.pathname;
    try { e.clipboardData.setData("text/plain", text + "\n\n" + src); } catch (err) {}
  });

  /* save / view-source shortcuts (printing stays allowed —
     certificates and module summaries are meant to be printed) */
  document.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey) || inField(e.target)) return;
    var k = (e.key || "").toLowerCase();
    if (k === "s" || k === "u") {
      e.preventDefault();
      toast("© VAVEhub — content is protected");
    }
  });

  /* image / svg drag-out */
  document.addEventListener("dragstart", function (e) {
    var t = e.target;
    if (t && (t.tagName === "IMG" || (t.closest && t.closest("svg")))) e.preventDefault();
  });
})();
