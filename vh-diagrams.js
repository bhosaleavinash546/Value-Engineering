/* VAVEhub concept diagrams — scroll-triggered animation + count-ups.
   Each diagram lives in .concept-viz (excluded from narration & search).
   The observer adds .in-view when a diagram scrolls into view, which the
   CSS uses to grow bars / draw curves; any [data-countup] element counts
   from 0 to its target once revealed. Fully reduced-motion aware. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fmt(v, dp) { return dp ? v.toFixed(dp) : String(Math.round(v)); }

  function countUp(el) {
    var target = parseFloat(el.dataset.countup) || 0;
    var pre = el.dataset.pre || "", suf = el.dataset.suf || "", dp = el.dataset.dp ? +el.dataset.dp : 0;
    if (reduce) { el.textContent = pre + fmt(target, dp) + suf; return; }
    var start = null, dur = 1100;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = pre + fmt(target * e, dp) + suf;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = pre + fmt(target, dp) + suf;
    }
    requestAnimationFrame(step);
  }

  function reveal(viz) {
    if (viz.classList.contains("in-view")) return;
    viz.classList.add("in-view");
    var nums = viz.querySelectorAll("[data-countup]");
    for (var i = 0; i < nums.length; i++) countUp(nums[i]);
  }

  var vizzes = document.querySelectorAll(".concept-viz");
  if (!vizzes.length) return;
  if (!("IntersectionObserver" in window)) {
    for (var i = 0; i < vizzes.length; i++) reveal(vizzes[i]);
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.3 });
  for (var j = 0; j < vizzes.length; j++) io.observe(vizzes[j]);
})();

/* ── Exploded-view SUV teardown — real part photography, scroll-driven ──
   Renders into every [data-xview] mount on a 16:9 studio canvas. The
   explosion is choreographed purely by scrolling: assembled at the
   viewport edges, subassemblies separating on approach, full teardown
   when centred — reassembling as the user scrolls past in either
   direction. Images are AI-generated studio photography (user-supplied),
   background-removed, served same-origin from /parts. */
(function () {
  "use strict";
  var mounts = document.querySelectorAll("[data-xview]");
  if (!mounts.length) return;

  // img, alt, stagger, [x,y,w] at: assembled / stage-1 / stage-2 (centre %, width %)
  var ITEMS = [
    ["biw",      "Body-in-white shell",            4, [50,50,46], [50,42,34], [50,42,34]],
    ["bonnet",   "Bonnet",                         1, [43,44,12], [10,14,13], [7,13,14]],
    ["door-f",   "Front door",                     1, [45,47,7],  [20,13,8],  [17,12,8.5]],
    ["door-r",   "Rear door",                      1, [51,47,7],  [28,13,8],  [28,12,8.5]],
    ["tailgate", "Tailgate",                       1, [58,45,8],  [37,12,9.5],[40,11,10]],
    ["dash",     "Dashboard module",               2, [47,48,10], [72,13,13], [70,12,14]],
    ["seat",     "Seat",                           2, [52,50,5],  [82,15,6],  [84,15,6.5]],
    ["elec",     "Wiring harness, battery & ECUs", 3, [54,52,8],  [91,35,11], [92,36,12]],
    ["thermal",  "Cooling module",                 5, [41,52,7],  [7,42,10],  [6,43,11]],
    ["steering", "Steering system",                6, [46,54,7],  [10,71,11], [9,73,12]],
    ["engine",   "Engine & transmission",          7, [43,58,10], [27,79,14], [25,81,15]],
    ["chassis",  "Chassis frame",                  9, [50,62,34], [54,76,24], [55,77,26]],
    ["strut",    "Front strut & brake",            8, [43,63,4.5],[77,61,6],  [75,58,6.5]],
    ["strut-r",  "Rear suspension corner",         8, [58,63,6],  [88,58,8.5],[91,55,9]],
    ["wheel",    "Front wheel & tyre",             8, [40,66,8],  [75,84,8],  [73,86,8.5]],
    ["wheel2",   "Rear wheel & tyre",              8, [62,66,8],  [86,85,8],  [89,87,8.5]],
  ];
  var LABELS = [ // text, x%, y%
    ["Closures", 22, 24.5], ["Interior", 77, 26], ["Body-in-white", 50, 56.5],
    ["Thermal", 7, 55], ["Electrical", 91, 49], ["Steering", 10, 85],
    ["Powertrain", 27, 92.5], ["Chassis frame", 54, 89.5], ["Suspension + wheels", 81, 96],
  ];

  var SCENE = '<div class="xp-stage">' +
    ITEMS.map(function (it) {
      var f = it[0] === "wheel2" ? "wheel" : it[0];
      var pd = ({bonnet:0,"door-f":1,"door-r":2,tailgate:3,dash:0,seat:1,strut:0,"strut-r":1,wheel:2,wheel2:3})[it[0]] || 0;
      var a = it[3], s1 = it[4], s2 = it[5];
      var tuck = it[0] === "biw" ? "" : ";--o0:0;--k0:.35";
      return '<div class="xp-item" style="--d:' + it[2] + ';--pd:' + pd +
        ';--x0:' + a[0] + '%;--y0:' + a[1] + '%;--w0:' + a[2] +
        '%;--x1:' + s1[0] + '%;--y1:' + s1[1] + '%;--w1:' + s1[2] +
        '%;--x2:' + s2[0] + '%;--y2:' + s2[1] + '%;--w2:' + s2[2] + "%" + tuck +
        '"><img src="parts/' + f + '.webp" alt="' + it[1] + '" loading="lazy" draggable="false"/></div>';
    }).join("") +
    LABELS.map(function (l) {
      return '<span class="xp-lab" style="left:' + l[1] + '%;top:' + l[2] + '%">' + l[0] + "</span>";
    }).join("") +
    "</div>";

  var CAPS = [
    "Scroll to tear it down — the vehicle separates as it reaches the centre of your screen.",
    "Nine subassemblies separate along their own paths — closures first, then interior, electrical, thermal, steering, powertrain, suspension, and the chassis settles as the datum.",
    "Full teardown — every part countable, weighable and costable: a digital BOM in one picture. Scroll on and it reassembles.",
  ];

  var widgets = [];
  mounts.forEach(function (mount) {
    mount.insertAdjacentHTML("beforeend",
      '<div class="xv-scene xp xp-live">' + SCENE + "</div><p class='xv-cap'></p>");
    var scene = mount.querySelector(".xv-scene");
    var cap = mount.querySelector(".xv-cap");
    var w = { scene: scene, stage: -1 };
    w.setStage = function (n) {
      if (n === w.stage) return;
      w.stage = n;
      scene.classList.toggle("xp-s1", n >= 1);
      scene.classList.toggle("xp-s2", n >= 2);
      cap.textContent = CAPS[n];
    };
    w.setStage(0);
    widgets.push(w);
  });

  /* scroll driver: assembled at viewport edges, stage 1 approaching centre,
     full teardown centred — reassembles as the widget scrolls away. */
  var ticking = false;
  function drive() {
    ticking = false;
    var vh = window.innerHeight || 1;
    widgets.forEach(function (w) {
      var r = w.scene.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) return;
      var d = Math.abs((r.top + r.height / 2) - vh / 2) / vh; // 0 = centred
      w.setStage(d <= 0.3 ? 2 : d <= 0.55 ? 1 : 0);
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(drive); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  drive();
})();

/* ── Generic two-stage scroll driver ──
   Any [data-scrollstages] element gets .ss-s1 / .ss-s2 as it approaches the
   centre of the viewport, and loses them as it scrolls away — same
   choreography as the exploded view, reusable by any diagram (the Module 9
   cost waterfall uses it). An optional .ss-cap child carries per-stage
   captions in data-s0 / data-s1 / data-s2. */
(function () {
  "use strict";
  var els = document.querySelectorAll("[data-scrollstages]");
  if (!els.length) return;
  var items = [];
  els.forEach(function (el) {
    var it = { el: el, cap: el.querySelector(".ss-cap"), stage: -1 };
    it.set = function (n) {
      if (n === it.stage) return;
      it.stage = n;
      el.classList.toggle("ss-s1", n >= 1);
      el.classList.toggle("ss-s2", n >= 2);
      if (it.cap) it.cap.textContent = it.cap.dataset["s" + n] || "";
    };
    it.set(0);
    items.push(it);
  });
  var ticking = false;
  function drive() {
    ticking = false;
    var vh = window.innerHeight || 1;
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) return;
      var d = Math.abs((r.top + r.height / 2) - vh / 2) / vh;
      it.set(d <= 0.3 ? 2 : d <= 0.55 ? 1 : 0);
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(drive); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  drive();
})();
