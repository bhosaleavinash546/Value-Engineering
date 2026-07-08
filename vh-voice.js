/* ════════════════════════════════════════════════════════════
   VAVEhub VE Academy — lesson narration player
   Plays studio-generated neural narration (one consistent voice
   for everyone) from /audio/<module>.mp3, produced by the
   narration workflow (.github/workflows/narration.yml).
   Features: play/pause/stop, seek bar, 0.75–1.5× speed,
   follow-along paragraph highlighting via audio/timings.json,
   and a master on/off switch persisted in localStorage.
   ════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const KEY = "vh-voice";

  const mods = $$(".tmod").filter((m) => m.dataset.mod !== "exam");
  if (!mods.length) return;

  /* ── text extraction (shared with the narration generator) ──
     The workflow loads this page and calls VHVoice.extractAll(),
     so the audio blocks always match this exact collection. */
  function collect(mod) {
    return $$("h2, h3, h4, p, li", mod).filter((el) => {
      if (el.closest(".qcheck, button, .vo-bar, .gate-card, .fast-builder, .fn-lib, .fn-challenge, .ve-lab, .concept-viz")) return false;
      if ($$("p, li", el).length) return false; // containers — children are read instead
      return el.textContent.trim().length > 2;
    });
  }
  function clean(t) {
    return t.replace(/\s+/g, " ")
      .replace(/[·—]/g, ", ")
      .replace(/→/g, " to ")
      .replace(/÷/g, " divided by ")
      .replace(/✓|✗|🖨|🔒|🎓|★/g, "")
      .trim();
  }
  window.VHVoice = {
    extractAll() {
      return mods.map((m) => ({
        id: m.dataset.mod,
        title: m.dataset.title,
        blocks: collect(m).map((el) => clean(el.textContent)),
      }));
    },
  };

  /* ── preferences ── */
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  if (typeof prefs.enabled !== "boolean") prefs.enabled = true;
  prefs.rate = +prefs.rate || 1;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} };

  /* ── narration data — bars only appear once real audio exists ── */
  fetch("audio/timings.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((T) => { if (T) init(T); })
    .catch(() => {});

  function fmt(s) {
    s = Math.max(0, Math.round(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function init(T) {
    const audio = new Audio();
    audio.preload = "none";
    let activeBar = null, activeMod = null, blocks = [];

    function highlightAt(t) {
      let el = null;
      for (let i = 0; i < blocks.length; i++) {
        if (t >= blocks[i][0] && t < blocks[i][1]) { el = collect(activeMod)[i]; break; }
      }
      $$(".is-reading").forEach((x) => { if (x !== el) x.classList.remove("is-reading"); });
      if (el && !el.classList.contains("is-reading")) {
        el.classList.add("is-reading");
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        try { el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" }); } catch (e) {}
      }
    }

    function setBtn(bar, mode) { // idle | playing | paused
      const b = $(".vo-play", bar);
      b.classList.toggle("is-playing", mode === "playing");
      $(".vo-play-ico", b).textContent = mode === "playing" ? "⏸" : "▶";
      $(".vo-play-txt", b).textContent = mode === "playing" ? "Pause" : (mode === "paused" ? "Resume" : "Listen");
    }

    function stop() {
      audio.pause();
      try { audio.currentTime = 0; } catch (e) {}
      $$(".is-reading").forEach((x) => x.classList.remove("is-reading"));
      if (activeBar) {
        setBtn(activeBar, "idle");
        $(".vo-seek", activeBar).value = "0";
        $(".vo-time", activeBar).textContent = fmt(0) + " / " + fmt(+$(".vo-seek", activeBar).max);
      }
      activeBar = null; activeMod = null; blocks = [];
    }

    audio.addEventListener("timeupdate", () => {
      if (!activeBar) return;
      $(".vo-seek", activeBar).value = String(audio.currentTime);
      $(".vo-time", activeBar).textContent = fmt(audio.currentTime) + " / " + fmt(+$(".vo-seek", activeBar).max);
      highlightAt(audio.currentTime);
    });
    audio.addEventListener("ended", stop);
    audio.addEventListener("error", () => { if (activeBar) { $(".vo-time", activeBar).textContent = "audio unavailable"; setBtn(activeBar, "idle"); } });

    mods.forEach((mod) => {
      const id = mod.dataset.mod;
      const meta = T[id];
      if (!meta || !meta.blocks) return;
      const bar = document.createElement("div");
      bar.className = "vo-bar";
      bar.setAttribute("role", "group");
      bar.setAttribute("aria-label", "Lesson narration");
      bar.innerHTML =
        '<button type="button" class="vo-play"><span class="vo-play-ico">▶</span> <span class="vo-play-txt">Listen</span></button>' +
        '<input type="range" class="vo-seek" min="0" max="' + meta.dur + '" step="0.1" value="0" aria-label="Seek narration" />' +
        '<span class="vo-time">' + fmt(0) + " / " + fmt(meta.dur) + "</span>" +
        '<select class="vo-rate" aria-label="Playback speed">' +
          [0.75, 1, 1.25, 1.5].map((r) => '<option value="' + r + '"' + (r === prefs.rate ? " selected" : "") + ">" + r + "×</option>").join("") +
        "</select>";
      const head = $(".tmod-head", mod);
      head.parentNode.insertBefore(bar, head.nextSibling);

      $(".vo-play", bar).addEventListener("click", () => {
        if (activeBar === bar) {
          if (audio.paused) { audio.play(); setBtn(bar, "playing"); }
          else { audio.pause(); setBtn(bar, "paused"); }
          return;
        }
        stop();
        activeBar = bar; activeMod = mod; blocks = meta.blocks;
        audio.src = "audio/" + id + ".mp3";
        audio.playbackRate = prefs.rate;
        audio.play().then(() => setBtn(bar, "playing")).catch(() => {
          $(".vo-time", bar).textContent = "audio unavailable";
          stop();
        });
        setBtn(bar, "playing");
      });
      $(".vo-seek", bar).addEventListener("input", (e) => {
        if (activeBar !== bar) return;
        audio.currentTime = +e.target.value;
        highlightAt(audio.currentTime);
      });
      $(".vo-rate", bar).addEventListener("change", (e) => {
        prefs.rate = +e.target.value; save();
        $$(".vo-rate").forEach((s) => { s.value = String(prefs.rate); });
        audio.playbackRate = prefs.rate;
      });
    });

    /* master on/off switch (sidebar) */
    const foot = $(".tr-side-foot");
    if (foot && !$(".vo-master")) {
      const label = document.createElement("label");
      label.className = "vo-master";
      label.innerHTML = '<span>🔊 Voiceover</span><input type="checkbox" aria-label="Voiceover on or off"><i class="vo-sw" aria-hidden="true"></i>';
      foot.appendChild(label);
      const box = $("input", label);
      box.checked = prefs.enabled;
      document.body.classList.toggle("vo-off", !prefs.enabled);
      box.addEventListener("change", () => {
        prefs.enabled = box.checked; save();
        document.body.classList.toggle("vo-off", !prefs.enabled);
        if (!prefs.enabled) stop();
      });
    }

    /* stop cleanly on navigation */
    document.addEventListener("click", (e) => {
      if (e.target.closest(".mod-link, .tmod-done, #startBtn, #mlGo, .tr-back, .brand")) stop();
    });
    window.addEventListener("pagehide", () => audio.pause());
  }
})();
