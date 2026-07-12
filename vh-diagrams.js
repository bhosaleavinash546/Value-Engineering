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

/* ── Exploded-view SUV teardown (two-stage, staggered Bézier cascade) ──
   Renders into every [data-xview] mount. Stage 1: subassemblies explode
   along owned axes (clearance-ordered stagger). Stage 2: each subassembly
   explodes into parts, parent vector preserved. Pure SVG/CSS — the
   transforms live in style.css; this builds the scene + controls. */
(function () {
  "use strict";
  var mounts = document.querySelectorAll("[data-xview]");
  if (!mounts.length) return;

  var LABELS = [];
  function g(sub, d, s1x, s1y, label, lx, ly, inner) {
    LABELS.push('<g class="xv-lab"><line x1="' + lx + '" y1="' + ly + '" x2="' + (lx + 14) + '" y2="' + ly + '"/>' +
      '<text x="' + (lx + 19) + '" y="' + (ly + 4) + '">' + label + "</text></g>");
    return '<g data-sub="' + sub + '" style="--d:' + d + ';--s1x:' + s1x + 'px;--s1y:' + s1y + 'px">' + inner + "</g>";
  }
  function part(s2x, s2y, pd, inner) {
    return '<g data-part style="--s2x:' + s2x + 'px;--s2y:' + s2y + 'px;--pd:' + pd + '">' + inner + "</g>";
  }

  var SVG =
  '<svg class="xv-svg" viewBox="0 0 1180 860" role="img" aria-label="Exploded view of an SUV: subassemblies then parts">' +
  '<g class="xv-world" transform="translate(110,60)">' +
  '<ellipse class="xv-shadow" cx="480" cy="580" rx="330" ry="11"/>' +

  // 10 · chassis — settles down (datum)
  g("chassis", 9, 0, 85, "Chassis frame", 925, 695,
    part(0, 0, 0, '<rect x="190" y="506" width="580" height="13" rx="5"/>') +
    part(-45, 22, 1, '<rect x="212" y="521" width="112" height="11" rx="4"/>') +
    part(45, 22, 2, '<rect x="636" y="521" width="112" height="11" rx="4"/>')) +

  // 9 · suspension — corners down
  g("susp", 8, 0, 152, "Suspension + wheels", 470, 792,
    part(-24, 34, 0, '<circle class="xv-tyre" cx="285" cy="540" r="46"/><circle class="xv-hub" cx="285" cy="540" r="17"/>') +
    part(24, 34, 1, '<circle class="xv-tyre" cx="675" cy="540" r="46"/><circle class="xv-hub" cx="675" cy="540" r="17"/>') +
    part(-24, -14, 2, '<path d="M271,486 h28 m-26,7 h24 m-22,7 h20 m-18,7 h16"/>') +
    part(24, -14, 3, '<path d="M661,486 h28 m-26,7 h24 m-22,7 h20 m-18,7 h16"/>')) +

  // 8 · powertrain — forward-down
  g("power", 7, -92, 58, "Powertrain", 60, 640,
    part(-28, 0, 0, '<rect x="222" y="446" width="78" height="52" rx="6"/><rect x="228" y="432" width="64" height="14" rx="4"/>') +
    part(10, 24, 1, '<rect x="302" y="460" width="66" height="30" rx="9"/>') +
    part(66, 10, 2, '<rect x="370" y="470" width="290" height="6" rx="3"/>')) +

  // 7 · steering — forward-up
  g("steer", 6, -52, -52, "Steering", 330, 330,
    part(-14, -22, 0, '<circle cx="384" cy="398" r="15"/>') +
    part(0, 0, 1, '<line x1="392" y1="410" x2="416" y2="446"/>') +
    part(16, 30, 2, '<rect x="336" y="452" width="128" height="7" rx="3.5"/>')) +

  // 6 · thermal — far forward
  g("thermal", 5, -156, 14, "Thermal systems", 60, 618,
    part(-26, 0, 0, '<rect x="176" y="440" width="20" height="58" rx="4"/>') +
    part(14, 24, 1, '<circle cx="215" cy="468" r="17"/><path d="M215,455 v26 M202,468 h26 M206,459 l18,18 M224,459 l-18,18"/>')) +

  // 5 · body-in-white — the lift-off
  g("biw", 4, 0, -172, "Body-in-white", 930, 200,
    part(0, 0, 0,
      '<path d="M312,352 L352,262 Q357,250 371,250 L634,250 Q648,250 655,263 L700,352"/>' +
      '<path d="M188,428 Q186,398 214,392 L302,378 L312,352 L700,352 L716,380 L770,392 Q788,396 788,424 L788,452 Q788,462 778,462 L748,462 M210,462 L198,462 Q188,462 188,452 Z"/>' +
      '<line x1="392" y1="262" x2="380" y2="350"/><line x1="510" y1="260" x2="510" y2="350"/><line x1="620" y1="261" x2="630" y2="350"/>')) +

  // 4 · electrical — aft
  g("elec", 3, 96, 22, "Electrical", 945, 555,
    part(24, 16, 0, '<rect x="586" y="452" width="44" height="28" rx="4"/><line x1="594" y1="452" x2="594" y2="446"/><line x1="622" y1="452" x2="622" y2="446"/>') +
    part(-16, 26, 1, '<rect x="544" y="462" width="27" height="19" rx="3"/>') +
    part(0, -16, 2, '<path d="M260,462 q60,-14 120,0 t120,0 t120,0 t80,-4" stroke-dasharray="5 5"/>')) +

  // 3 · interior — rises under BIW
  g("interior", 2, 0, -52, "Interior modules", 330, 522,
    part(-26, -10, 0, '<path d="M330,416 h44 v14 h-30 q-14,0 -14,-14 Z"/>') +
    part(0, -22, 1, '<path d="M452,470 v-46 q0,-9 9,-9 h7 q9,0 9,9 v22 h26 q9,0 9,9 v15 Z"/>') +
    part(26, -10, 2, '<path d="M584,470 v-46 q0,-9 9,-9 h7 q9,0 9,9 v22 h26 q9,0 9,9 v15 Z"/>')) +

  // 2 · closures — hinge-normal spread
  g("closures", 1, 0, 0, "Closures", 850, 300,
    part(-92, -116, 0, '<path d="M212,398 L306,382 L306,396 L220,412 Z"/>') +
    part(-136, -34, 1, '<rect x="322" y="360" width="132" height="118" rx="9"/><path d="M334,370 h108 v40 h-108 Z"/>') +
    part(136, -34, 2, '<rect x="462" y="360" width="128" height="118" rx="9"/><path d="M474,370 h104 v40 h-104 Z"/>') +
    part(104, -96, 3, '<path d="M756,362 L782,366 L786,470 L760,466 Z"/>')) +

  // 1 · ADAS — top of the stack
  g("adas", 0, 0, -238, "ADAS + infotainment", 470, 66,
    part(0, -14, 0, '<rect x="496" y="264" width="22" height="12" rx="3"/><path d="M507,276 l-7,10 m7,-10 l7,10"/>') +
    part(-26, 8, 1, '<rect x="196" y="452" width="16" height="20" rx="3"/><path d="M188,462 q-8,-8 0,-16 M182,466 q-14,-12 0,-28" fill="none"/>') +
    part(26, -6, 2, '<path d="M596,250 q10,-16 26,-16 l-8,16 Z"/>')) +
  "</g>" + LABELS.join("") + "</svg>";

  var CONTROLS =
    '<div class="xv-bar" role="group" aria-label="Exploded view controls">' +
    '<button type="button" class="btn btn-primary xv-play">▶ Play teardown</button>' +
    '<div class="xv-stages">' +
    '<button type="button" class="xv-st is-on" data-stage="0">Assembled</button>' +
    '<button type="button" class="xv-st" data-stage="1">Stage 1 · Subassemblies</button>' +
    '<button type="button" class="xv-st" data-stage="2">Stage 2 · Full teardown</button>' +
    "</div></div><p class='xv-cap'></p>";

  var CAPS = [
    "The complete vehicle — locked engineering view, nothing moving yet.",
    "Ten subassemblies separate along their own axes — closures first, then interior, body-in-white lift-off, and the chassis settles as the datum. This is the order a real teardown bench follows.",
    "Each subassembly opens into its parts — parent moves first, children follow, hierarchy preserved. Every part is now countable, weighable and costable: a digital BOM in one picture.",
  ];

  mounts.forEach(function (mount) {
    mount.insertAdjacentHTML("beforeend", '<div class="xv-scene">' + SVG + "</div>" + CONTROLS);
    var scene = mount.querySelector(".xv-scene");
    var cap = mount.querySelector(".xv-cap");
    var sts = mount.querySelectorAll(".xv-st");
    var playing = null;
    function setStage(n) {
      scene.classList.toggle("xv-s1", n >= 1);
      scene.classList.toggle("xv-s2", n >= 2);
      sts.forEach(function (b) { b.classList.toggle("is-on", +b.dataset.stage === n); });
      cap.textContent = CAPS[n];
    }
    mount.querySelectorAll(".xv-st").forEach(function (b) {
      b.addEventListener("click", function () { clearTimeout(playing); setStage(+b.dataset.stage); });
    });
    mount.querySelector(".xv-play").addEventListener("click", function () {
      clearTimeout(playing);
      setStage(0);
      playing = setTimeout(function () {
        setStage(1);
        playing = setTimeout(function () { setStage(2); }, 5200);
      }, 450);
    });
    setStage(0);
  });
})();
