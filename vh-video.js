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
