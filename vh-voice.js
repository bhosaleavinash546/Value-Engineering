/* ════════════════════════════════════════════════════════════
   VAVEhub VE Academy — lesson voiceover
   Reads the visible module aloud with the browser's built-in
   speech synthesis (Web Speech API): play/pause/stop, speed and
   voice controls, live paragraph highlighting, and a master
   on/off switch persisted in localStorage. No audio files, no
   external services — narration always matches the content.
   ════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const synth = window.speechSynthesis;
  const KEY = "vh-voice";

  const mods = $$(".tmod").filter((m) => m.dataset.mod !== "exam");
  if (!mods.length || !synth || typeof SpeechSynthesisUtterance === "undefined") return;

  /* ── preferences ── */
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  if (typeof prefs.enabled !== "boolean") prefs.enabled = true;
  prefs.rate = +prefs.rate || 1;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} };

  /* ── voices (load async — Chrome populates them late) ── */
  let voices = [];
  function loadVoices() {
    voices = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
    $$(".vo-voice").forEach((sel) => {
      if (!voices.length) { sel.hidden = true; return; }
      sel.hidden = false;
      sel.innerHTML = voices.map((v) =>
        `<option value="${v.name.replace(/"/g, "&quot;")}"${v.name === prefs.voice ? " selected" : ""}>${v.name.replace(/\s*\(.*\)$/, "").slice(0, 28)}</option>`).join("");
    });
  }
  loadVoices();
  if ("onvoiceschanged" in synth) synth.addEventListener("voiceschanged", loadVoices);

  /* ── playback state ── */
  let queue = [], qi = 0, playingBar = null, paused = false, token = 0;

  function collect(mod) {
    return $$("h2, h3, h4, p, li", mod).filter((el) => {
      if (el.closest(".qcheck, button, .vo-bar, .gate-card")) return false;
      if ($$("p, li", el).length) return false; // containers — children are read instead
      return el.textContent.trim().length > 2;
    });
  }

  function clean(t) {
    return t.replace(/\s+/g, " ")
      .replace(/[·—]/g, ", ")
      .replace(/→/g, " to ")
      .replace(/✓|✗|🖨|🔒|🎓/g, "")
      .trim();
  }

  function highlight(i) {
    $$(".is-reading").forEach((el) => el.classList.remove("is-reading"));
    const el = queue[i];
    if (!el) return;
    el.classList.add("is-reading");
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try { el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" }); } catch (e) {}
  }

  function status() {
    if (playingBar) $(".vo-status", playingBar).textContent = (qi + 1) + " / " + queue.length;
  }

  function setBtn(bar, mode) { // idle | playing | paused
    const b = $(".vo-play", bar);
    b.classList.toggle("is-playing", mode === "playing");
    $(".vo-play-ico", b).textContent = mode === "playing" ? "⏸" : "▶";
    $(".vo-play-txt", b).textContent = mode === "playing" ? "Pause" : (mode === "paused" ? "Resume" : "Listen");
    $(".vo-stop", bar).hidden = mode === "idle";
    if (mode === "idle") $(".vo-status", bar).textContent = "";
  }

  function speakFrom(i) {
    const my = ++token;
    synth.cancel();
    qi = i;
    if (qi >= queue.length) { stop(); return; }
    highlight(qi); status();
    const u = new SpeechSynthesisUtterance(clean(queue[qi].textContent));
    u.rate = prefs.rate;
    const v = voices.find((x) => x.name === prefs.voice);
    if (v) u.voice = v;
    u.onend = u.onerror = () => {
      if (my !== token || paused) return;
      if (qi + 1 < queue.length) speakFrom(qi + 1); else stop();
    };
    // slight delay after cancel() — some browsers drop an immediate speak()
    setTimeout(() => { if (my === token) synth.speak(u); }, 60);
  }

  function stop() {
    token++;
    paused = false;
    synth.cancel();
    $$(".is-reading").forEach((el) => el.classList.remove("is-reading"));
    if (playingBar) setBtn(playingBar, "idle");
    playingBar = null; queue = []; qi = 0;
  }

  /* Chrome quirk: long sessions silently stall unless resume() is poked */
  setInterval(() => { if (playingBar && !paused && synth.speaking) synth.resume(); }, 8000);

  /* ── build a player bar per module ── */
  mods.forEach((mod) => {
    const bar = document.createElement("div");
    bar.className = "vo-bar";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Lesson voiceover");
    bar.innerHTML =
      '<button type="button" class="vo-play"><span class="vo-play-ico">▶</span> <span class="vo-play-txt">Listen</span></button>' +
      '<button type="button" class="vo-stop" aria-label="Stop narration" hidden>⏹</button>' +
      '<select class="vo-rate" aria-label="Reading speed">' +
        [0.75, 1, 1.25, 1.5].map((r) => `<option value="${r}"${r === prefs.rate ? " selected" : ""}>${r}×</option>`).join("") +
      "</select>" +
      '<select class="vo-voice" aria-label="Narration voice" hidden></select>' +
      '<span class="vo-status" role="status" aria-live="polite"></span>';
    const head = $(".tmod-head", mod);
    head.parentNode.insertBefore(bar, head.nextSibling);

    $(".vo-play", bar).addEventListener("click", () => {
      if (playingBar === bar && !paused) {           // playing → pause
        paused = true; synth.pause(); setBtn(bar, "paused"); return;
      }
      if (playingBar === bar && paused) {            // paused → resume
        paused = false; synth.resume(); setBtn(bar, "playing");
        // if the utterance was lost while paused (mobile), restart the paragraph
        setTimeout(() => { if (playingBar === bar && !paused && !synth.speaking) speakFrom(qi); }, 350);
        return;
      }
      stop();                                        // idle (or another module) → start
      playingBar = bar; paused = false;
      queue = collect(mod);
      if (!queue.length) { stop(); return; }
      setBtn(bar, "playing");
      speakFrom(0);
    });
    $(".vo-stop", bar).addEventListener("click", stop);
    $(".vo-rate", bar).addEventListener("change", (e) => {
      prefs.rate = +e.target.value; save();
      $$(".vo-rate").forEach((s) => { s.value = String(prefs.rate); });
      if (playingBar && !paused) speakFrom(qi);
    });
    $(".vo-voice", bar).addEventListener("change", (e) => {
      prefs.voice = e.target.value; save();
      $$(".vo-voice").forEach((s) => { s.value = prefs.voice; });
      if (playingBar && !paused) speakFrom(qi);
    });
  });
  loadVoices(); // fill the selects that now exist

  /* ── master on/off switch (sidebar) ── */
  const foot = $(".tr-side-foot");
  if (foot) {
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

  /* ── stop cleanly on navigation ── */
  document.addEventListener("click", (e) => {
    if (e.target.closest(".mod-link, .tmod-done, #startBtn, #mlGo, .tr-back, .brand")) stop();
  });
  window.addEventListener("pagehide", () => synth.cancel());
})();
