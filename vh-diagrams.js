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

/* ── Exploded-view SUV teardown — real part photography ──
   Renders into every [data-xview] mount. Stage 1: nine subassemblies fly
   from the vehicle to a labelled constellation (staggered Bézier cascade);
   Stage 2: multi-part clusters spread into individual components. Images
   are AI-generated studio photography (user-supplied), background-removed
   and served same-origin from /parts. */
(function () {
  "use strict";
  var mounts = document.querySelectorAll("[data-xview]");
  if (!mounts.length) return;

  // img, alt, delay, [x,y,w] at: assembled / stage-1 / stage-2 (centre %, width %)
  var ITEMS = [
    ["biw",      "Body-in-white shell",            4, [50,50,58], [50,34,42], [50,34,42]],
    ["bonnet",   "Bonnet",                         1, [42,32,14], [15,11,17], [10,11,18]],
    ["door-f",   "Front door",                     1, [44,36,9],  [28,12,10], [25,12,11]],
    ["door-r",   "Rear door",                      1, [52,36,9],  [37,12,10], [39,12,11]],
    ["tailgate", "Tailgate",                       1, [62,34,10], [48,11,12], [53,10,13]],
    ["dash",     "Dashboard module",               2, [46,38,12], [78,12,16], [75,11,17]],
    ["seat",     "Seat",                           2, [52,40,6],  [88,15,8],  [91,15,8]],
    ["elec",     "Wiring harness, battery & ECUs", 3, [55,42,10], [89,42,15], [90,43,16]],
    ["thermal",  "Cooling module",                 5, [38,42,9],  [8,38,13],  [7,38,14]],
    ["steering", "Steering system",                6, [45,44,9],  [11,63,14], [10,64,15]],
    ["engine",   "Engine & transmission",          7, [42,48,13], [28,80,19], [26,82,20]],
    ["chassis",  "Chassis frame",                  9, [50,55,42], [55,66,30], [56,67,32]],
    ["strut",    "Front strut & brake",            8, [42,55,6],  [77,71,8],  [75,66,9]],
    ["strut-r",  "Rear suspension corner",         8, [60,55,8],  [86,67,11], [90,64,12]],
    ["wheel",    "Front wheel & tyre",             8, [38,58,10], [74,88,10], [71,90,11]],
    ["wheel2",   "Rear wheel & tyre",              8, [64,58,10], [86,89,10], [89,91,11]],
  ];
  var LABELS = [ // text, x%, y%
    ["Closures", 30, 3.5], ["Interior", 82, 3.5], ["Body-in-white", 50, 50],
    ["Thermal", 8, 51], ["Electrical", 89, 57], ["Steering", 11, 77],
    ["Powertrain", 28, 93.5], ["Chassis frame", 55, 78], ["Suspension + wheels", 80, 98.5],
  ];

  var SCENE = '<div class="xp-stage">' +
    ITEMS.map(function (it) {
      var f = it[0] === "wheel2" ? "wheel" : it[0];
      var a = it[3], s1 = it[4], s2 = it[5];
      var tuck = it[0] === "biw" ? "" : ";--o0:0;--k0:.35";
      var pd = ({bonnet:0,"door-f":1,"door-r":2,tailgate:3,dash:0,seat:1,strut:0,"strut-r":1,wheel:2,wheel2:3})[it[0]] || 0;
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

  var CONTROLS =
    '<div class="xv-bar" role="group" aria-label="Exploded view controls">' +
    '<button type="button" class="btn btn-primary xv-play">▶ Play teardown</button>' +
    '<div class="xv-stages">' +
    '<button type="button" class="xv-st is-on" data-stage="0">Assembled</button>' +
    '<button type="button" class="xv-st" data-stage="1">Stage 1 · Subassemblies</button>' +
    '<button type="button" class="xv-st" data-stage="2">Stage 2 · Full teardown</button>' +
    "</div>" +
    '<label class="xv-scrolltog"><input type="checkbox" /> <i class="xv-sw"></i> Scroll explode</label>' +
    "</div><p class='xv-cap'></p>";

  var CAPS = [
    "The vehicle as the bench receives it — parts nested inside the body-in-white.",
    "Nine subassemblies separate along their own paths — closures first, then interior, electrical, thermal, steering, powertrain, suspension, and the chassis settles as the datum. This is the order a real teardown bench follows.",
    "Clusters open into individual components — doors, bonnet and tailgate apart; dash from seat; struts from wheels. Every part is now countable, weighable and costable: a digital BOM in one picture.",
  ];

  /* scroll-explode preference: ON by default, explicit toggle persists */
  var SKEY = "vh-xv-scroll";
  function scrollPref() {
    try { var v = localStorage.getItem(SKEY); return v === null ? true : v === "1"; } catch (e) { return true; }
  }

  var widgets = [];

  mounts.forEach(function (mount) {
    mount.insertAdjacentHTML("beforeend", '<div class="xv-scene xp">' + SCENE + "</div>" + CONTROLS);
    var scene = mount.querySelector(".xv-scene");
    var cap = mount.querySelector(".xv-cap");
    var sts = mount.querySelectorAll(".xv-st");
    var tog = mount.querySelector(".xv-scrolltog input");
    var playing = null;
    var w = { scene: scene, on: scrollPref(), paused: false, stage: -1 };
    function setStage(n) {
      if (n === w.stage) return;
      w.stage = n;
      scene.classList.toggle("xp-s1", n >= 1);
      scene.classList.toggle("xp-s2", n >= 2);
      sts.forEach(function (b) { b.classList.toggle("is-on", +b.dataset.stage === n); });
      cap.textContent = CAPS[n];
    }
    w.setStage = setStage;
    tog.checked = w.on;
    scene.classList.toggle("xp-live", w.on);
    tog.addEventListener("change", function () {
      w.on = tog.checked; w.paused = false;
      scene.classList.toggle("xp-live", w.on);
      try { localStorage.setItem(SKEY, w.on ? "1" : "0"); } catch (e) {}
      onScroll();
    });
    sts.forEach(function (b) {
      b.addEventListener("click", function () { clearTimeout(playing); w.paused = true; setStage(+b.dataset.stage); });
    });
    mount.querySelector(".xv-play").addEventListener("click", function () {
      clearTimeout(playing);
      w.paused = true;
      setStage(0);
      playing = setTimeout(function () {
        setStage(1);
        playing = setTimeout(function () { setStage(2); }, 5200);
      }, 450);
    });
    setStage(0);
    widgets.push(w);
  });

  /* scroll driver: assembled at viewport edges, stage 1 approaching centre,
     full teardown at centre — reassembles as the widget scrolls away.
     Manual control pauses driving until the widget leaves the viewport. */
  var ticking = false;
  function drive() {
    ticking = false;
    var vh = window.innerHeight || 1;
    widgets.forEach(function (w) {
      if (!w.on) return;
      var r = w.scene.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) { w.paused = false; return; } // off-screen: reset pause
      if (w.paused) return;
      var d = Math.abs((r.top + r.height / 2) - vh / 2) / vh; // 0 = centred
      w.setStage(d <= 0.34 ? 2 : d <= 0.62 ? 1 : 0);
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(drive); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  drive();
})();
