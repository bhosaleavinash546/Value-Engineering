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
