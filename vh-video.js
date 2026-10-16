/* Course videos: show the thumbnail, load the YouTube player only on click
   (same behaviour as the homepage video in app.js). */
(function () {
  "use strict";
  document.querySelectorAll(".vid-facade[data-yt]").forEach(function (btn) {
    var id = btn.dataset.yt, img = btn.querySelector("img");
    if (img) img.addEventListener("load", function () { if (img.naturalWidth <= 120) img.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; });
    btn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
      f.title = btn.getAttribute("aria-label").replace(/^Play the video: /, "");
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      f.className = "vid-frame";
      btn.replaceWith(f);
      f.focus();
    });
  });
})();

/* "You haven't watched … yet": a gentle note above "Mark complete" for each of the
   module's own videos not yet watched to (nearly) the end. It never blocks completion. */
(function () {
  "use strict";
  var KEY = "vh-watched";
  var seen = {};
  try { seen = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  var keyOf = function (v) { var s = v.querySelector("source"); return ((s && s.getAttribute("src")) || v.getAttribute("src") || v.getAttribute("poster") || "").replace(/^.*\//, ""); };
  var nameOf = function (v) { return (v.getAttribute("aria-label") || "the video").replace(/^Video:\s*/, ""); };
  var mods = document.querySelectorAll(".tmod");
  var notes = [];
  mods.forEach(function (mod) {
    var done = mod.querySelector(".tmod-done");
    var vids = Array.prototype.slice.call(mod.querySelectorAll(".tvid video"));
    if (!done || !vids.length) return;
    var note = document.createElement("p");
    note.className = "vw-remind";
    note.hidden = true;
    done.parentNode.insertBefore(note, done);
    notes.push({ note: note, vids: vids });
  });
  function render() {
    notes.forEach(function (n) {
      var left = n.vids.filter(function (v) { return !seen[keyOf(v)]; });
      n.note.hidden = !left.length;
      if (!left.length) return;
      n.note.innerHTML = "📺 You haven't watched " + (left.length === 1 ? "this module's video" : "these videos") + " yet: " +
        left.map(function (v, i) { return '<button type="button" data-i="' + i + '">' + nameOf(v) + "</button>"; }).join(", ") +
        ". You can still mark the module complete.";
      n.note.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          var v = left[+b.dataset.i];
          v.scrollIntoView({ block: "center", behavior: "smooth" });
          v.play().catch(function () {});
        });
      });
    });
  }
  document.querySelectorAll(".tvid video").forEach(function (v) {
    var mark = function () {
      var k = keyOf(v);
      if (!k || seen[k]) return;
      seen[k] = true;
      try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {}
      render();
    };
    v.addEventListener("ended", mark);
    v.addEventListener("timeupdate", function () { if (v.duration && v.currentTime / v.duration >= 0.9) mark(); });
  });
  render();
})();
