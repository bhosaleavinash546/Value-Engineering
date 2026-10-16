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

  const mods = $$(".tmod").filter((m) => m.dataset.mod !== "exam" && !m.classList.contains("tmod-exam"));
  if (!mods.length) return;

  /* ── text extraction (shared with the narration generator) ──
     The workflow loads this page and calls VHVoice.extractAll(),
     so the audio blocks always match this exact collection. */
  function collect(mod) {
    return $$("h2, h3, h4, p, li", mod).filter((el) => {
      if (el.closest(".qcheck, button, .vo-bar, .gate-card, .fast-builder, .fn-lib, .fn-challenge, .ve-lab, .concept-viz, .mod-feedback, .tmpl-box, .tcap, .lc-src, .lc-chart, .lc-metrics, .tvid, .vw-remind")) return false;
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
  if (typeof prefs.stops !== "boolean") prefs.stops = true; // pause at videos, animations, diagrams and labs
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
    let activeBar = null, activeMod = null, blocks = [], els = [], raf = 0;

    function highlightAt(t) {
      // the block being read; it stays lit through the short pause before the next block (no flicker)
      let el = null;
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (t >= blocks[i][0]) { if (i + 1 < blocks.length || t < blocks[i][1] + 1) el = els[i] || null; break; }
      }
      $$(".is-reading").forEach((x) => { if (x !== el) x.classList.remove("is-reading"); });
      if (el && !el.classList.contains("is-reading")) {
        el.classList.add("is-reading");
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        try { el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" }); } catch (e) {}
      }
    }


    /* ── Stops: the narration waits at every video, animation, diagram and lab ──
       The audio is one recording per module, and these items have no narration of
       their own, so without stops the follow-along scroll carries the learner straight
       past them. Each stop sits at the end of the paragraph just before the item. */
    // (the small number tiles beside a case study, .lc-metrics, sit next to the paragraph that explains
    // them, so the narration reads on rather than stopping before the story is told)
    const STOP_SEL = ".tvid, .concept-viz, .ve-lab, .fast-builder, .fn-lib, .fn-challenge, .tphoto, .tcap, .lc-chart";
    const LAB_SEL = ".ve-lab, .fast-builder, .fn-challenge"; // the function library (.fn-lib) is a reference list: a timed look
    let groups = [], nextG = 0, hold = null, holdToken = 0;
    const D = () => window.VHDiagrams || {};

    function kindOf(el) {
      if (el.matches(".tvid")) return el.querySelector("video") ? "video" : "youtube";
      if (D().hasStages && D().hasStages(el)) return "stages";
      if (el.matches(LAB_SEL)) return "lab";
      if (el.matches(".tphoto")) return "photo";
      if (el.matches(".tcap")) return "note";
      return "diagram";
    }
    function buildGroups(mod) {
      const all = $$(STOP_SEL, mod);
      const tops = all.filter((e) => !all.some((x) => x !== e && x.contains(e)));
      const byT = new Map();
      tops.forEach((el) => {
        let k = -1;
        for (let i = 0; i < els.length; i++) if (els[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) k = i;
        const b = blocks[Math.min(k, blocks.length - 1)];
        const t = k < 0 || !b ? 0.05 : b[1] + 0.12;
        if (!byT.has(t)) byT.set(t, []);
        byT.get(t).push({ el, kind: kindOf(el) });
      });
      return [...byT.entries()].sort((a, b) => a[0] - b[0]).map(([t, items]) => ({ t, items }));
    }
    function seekStops() { nextG = groups.findIndex((g) => g.t > audio.currentTime + 0.05); if (nextG < 0) nextG = groups.length; }
    function checkStop() {
      if (!prefs.stops || hold || !activeBar || nextG >= groups.length) return;
      if (audio.currentTime >= groups[nextG].t) {
        const g = groups[nextG++];
        audio.pause();
        runGroups([g]).then((ok) => { if (ok && activeBar) audio.play().then(() => setBtn(activeBar, "playing")).catch(() => {}); });
      }
    }

    /* the "Narration paused" card */
    const card = document.createElement("div");
    card.className = "vs-card"; card.hidden = true;
    card.setAttribute("role", "region"); card.setAttribute("aria-label", "Narration paused");
    card.innerHTML = '<span class="vs-ring" aria-hidden="true"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5"/><circle class="vs-arc" cx="18" cy="18" r="15.5"/></svg><b></b></span>' +
      '<p class="vs-msg" role="status"></p><button type="button" class="vs-btn vs-replay">Replay</button><button type="button" class="vs-btn vs-go">Continue <span aria-hidden="true">▸</span></button>';
    document.body.appendChild(card);
    const msg = $(".vs-msg", card), ring = $(".vs-ring", card), arc = $(".vs-arc", card), replayBtn = $(".vs-replay", card);

    // a pause the Continue button (or a cancelled hold) can cut short
    function holdWait(ms, countdown) {
      return new Promise((ok) => {
        const token = holdToken, t0 = performance.now();
        let id = 0;
        if (hold && (hold.skip || hold.again)) return ok(); // Continue or Replay was pressed: finish this step now
        const done = () => { cancelAnimationFrame(id); hold && (hold.cut = null); ok(); };
        if (hold) hold.cut = done;
        ring.hidden = !countdown;
        const tick = () => {
          if (token !== holdToken) return done();
          const left = ms - (performance.now() - t0);
          if (countdown) { $("b", ring).textContent = String(Math.max(1, Math.ceil(left / 1000))); arc.style.strokeDashoffset = String(97.4 * (1 - Math.max(0, left) / ms)); }
          if (left <= 0) return done();
          id = requestAnimationFrame(tick);
        };
        tick();
      });
    }
    const forever = () => holdWait(1e9, false);
    function show(text, opts) {
      msg.textContent = text;
      replayBtn.hidden = !(opts && opts.replay);
      $(".vs-go", card).innerHTML = (opts && opts.go ? opts.go : "Continue") + ' <span aria-hidden="true">▸</span>';
      card.hidden = false;
      setBtn(activeBar, "paused");
    }
    function center(el) {
      const r = el.getBoundingClientRect(), tall = r.height > innerHeight * 0.7;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try { el.scrollIntoView({ block: tall ? "start" : "center", behavior: smooth ? "smooth" : "auto" }); } catch (e) {}
      return new Promise((ok) => setTimeout(ok, smooth ? 650 : 50));
    }
    const words = (el) => (el.textContent || "").trim().split(/\s+/).length;

    async function playItem(it, token) {
      const el = it.el;
      if (!el.getClientRects().length) return; // hidden (for example a lab not unlocked yet)
      if (it.kind === "stages" && D().take) D().take(el); // take it over before scrolling, so it starts assembled
      await center(el);
      if (token !== holdToken) return;
      if (it.kind === "video") {
        const v = $("video", el);
        show("Narration paused while the video plays.", { go: "Skip video" });
        hold.video = v;
        if (v.ended || (v.duration && v.currentTime >= v.duration - 0.5)) v.currentTime = 0;
        const ended = new Promise((ok) => v.addEventListener("ended", ok, { once: true }));
        v.play().catch(() => { msg.textContent = "Press play on the video, or Continue to move on."; });
        await Promise.race([ended, forever()]);
        if (token === holdToken && !v.paused) v.pause();
      } else if (it.kind === "youtube") {
        const fac = $(".vid-facade", el);
        show("Narration paused. This optional video plays on YouTube. Watch it now, or Continue.", { go: "Continue" });
        hold.yt = fac;
        replayBtn.hidden = !fac; replayBtn.textContent = "Play video";
        await forever();
        replayBtn.textContent = "Replay";
      } else if (it.kind === "stages") {
        show("Narration paused: watch it come apart.", { replay: true });
        do {
          hold.again = false;
          await D().playStages(el, (ms) => holdWait(ms, false));
        } while (hold && hold.again && !hold.skip && token === holdToken);
        if (token === holdToken) D().release(el);
      } else if (it.kind === "lab") {
        show("Narration paused. Try the activity, then press Continue.", {});
        await forever();
      } else {
        // diagrams, charts, photos: play any animation, then a short look with a countdown
        if (el.matches(".concept-viz") && D().reveal) {
          if (el.classList.contains("in-view") && D().replay) D().replay(el); else D().reveal(el);
        }
        const what = it.kind === "photo" ? "the photo" : it.kind === "note" ? "this note" : el.matches(".fn-lib") ? "the function library" : el.matches(".lc-chart") ? "the chart" : "the diagram";
        show("Narration paused: take a look at " + what + ".", { replay: el.matches(".concept-viz") });
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
        const anims = el.getAnimations ? el.getAnimations({ subtree: true }).filter((a) => a.playState === "running") : [];
        if (anims.length) await Promise.race([Promise.all(anims.map((a) => a.finished.catch(() => {}))), holdWait(4500, false)]);
        if (token !== holdToken) return;
        const ms = it.kind === "photo" ? 5000 : it.kind === "note" ? 6000 : Math.round(Math.min(10, Math.max(5, 3 + words(el) / 12)) * 1000);
        await holdWait(ms, true);
      }
    }
    async function runGroups(gs) {
      const token = ++holdToken;
      hold = { cut: null, video: null, yt: null, item: null };
      for (const g of gs) for (const it of g.items) {
        if (token !== holdToken) return false;
        hold.item = it; hold.skip = false; hold.again = false; hold.video = null; hold.yt = null;
        await playItem(it, token);
      }
      if (token !== holdToken) return false;
      hold = null; card.hidden = true;
      return true;
    }
    function cancelHold() {
      if (!hold) return;
      holdToken++;
      if (hold.video && !hold.video.paused) hold.video.pause();
      if (hold.item && hold.item.kind === "stages" && D().release) D().release(hold.item.el);
      if (hold.cut) hold.cut();
      hold = null; card.hidden = true;
    }
    $(".vs-go", card).addEventListener("click", () => {
      if (!hold) return;
      hold.skip = true;
      if (hold.video && !hold.video.paused) hold.video.pause();
      if (hold.cut) hold.cut();
    });
    replayBtn.addEventListener("click", () => {
      if (!hold || !hold.item) return;
      const it = hold.item;
      if (it.kind === "youtube" && hold.yt) { hold.yt.click(); replayBtn.hidden = true; return; }
      if (it.kind === "stages") { hold.again = true; if (hold.cut) hold.cut(); return; }
      if (it.el.matches(".concept-viz") && D().replay) D().replay(it.el);
    });

    function setBtn(bar, mode) { // idle | playing | paused
      if (!bar) return;
      const b = $(".vo-play", bar);
      b.classList.toggle("is-playing", mode === "playing");
      $(".vo-play-ico", b).textContent = mode === "playing" ? "⏸" : "▶";
      $(".vo-play-txt", b).textContent = mode === "playing" ? "Pause" : (mode === "paused" ? "Resume" : "Listen");
    }

    function stop() {
      cancelHold();
      audio.pause();
      try { audio.currentTime = 0; } catch (e) {}
      $$(".is-reading").forEach((x) => x.classList.remove("is-reading"));
      if (activeBar) {
        setBtn(activeBar, "idle");
        $(".vo-seek", activeBar).value = "0";
        $(".vo-time", activeBar).textContent = fmt(0) + " / " + fmt(+$(".vo-seek", activeBar).max);
      }
      activeBar = null; activeMod = null; blocks = []; els = []; groups = []; nextG = 0;
    }

    // follow the audio every frame while playing: timeupdate only fires ~4×/s, which lags the highlight
    function follow() {
      if (activeBar && !audio.paused) { highlightAt(audio.currentTime); checkStop(); if (!audio.paused) raf = requestAnimationFrame(follow); else raf = 0; }
      else raf = 0;
    }
    audio.addEventListener("playing", () => { if (!raf) raf = requestAnimationFrame(follow); });

    audio.addEventListener("timeupdate", () => {
      if (!activeBar) return;
      $(".vo-seek", activeBar).value = String(audio.currentTime);
      $(".vo-time", activeBar).textContent = fmt(audio.currentTime) + " / " + fmt(+$(".vo-seek", activeBar).max);
      highlightAt(audio.currentTime);
      checkStop();
    });
    // anything after the last paragraph (a video at the very end) still gets its stop
    audio.addEventListener("ended", () => {
      if (prefs.stops && nextG < groups.length && activeBar) runGroups(groups.slice(nextG)).then((ok) => { if (ok) stop(); });
      else stop();
    });
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
        "</select>" +
        '<label class="vo-stops" title="Pause the narration at each video, animation, diagram and activity"><input type="checkbox"' + (prefs.stops ? " checked" : "") + ' /> <span>Pause at videos &amp; activities</span></label>';
      const head = $(".tmod-head", mod);
      head.parentNode.insertBefore(bar, head.nextSibling);

      $(".vo-play", bar).addEventListener("click", () => {
        if (activeBar === bar) {
          if (hold) { cancelHold(); audio.play(); setBtn(bar, "playing"); return; } // skip the rest of this stop
          if (audio.paused) { audio.play(); setBtn(bar, "playing"); }
          else { audio.pause(); setBtn(bar, "paused"); }
          return;
        }
        stop();
        activeBar = bar; activeMod = mod; blocks = meta.blocks; els = collect(mod);
        groups = buildGroups(mod); nextG = 0;
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
        const held = !!hold;
        cancelHold();
        audio.currentTime = +e.target.value;
        seekStops();
        highlightAt(audio.currentTime);
        if (held) audio.play().then(() => setBtn(bar, "playing")).catch(() => {});
      });
      $(".vo-stops input", bar).addEventListener("change", (e) => {
        prefs.stops = e.target.checked; save();
        $$(".vo-stops input").forEach((c) => { c.checked = prefs.stops; });
        if (!prefs.stops && hold) { cancelHold(); if (activeBar) audio.play().then(() => setBtn(activeBar, "playing")).catch(() => {}); }
        if (prefs.stops && activeBar) seekStops();
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
