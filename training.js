/* ════════════════════════════════════════════════════════════
   VAVEhub VE Academy — course engine, exam & certificate
   ════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── State (localStorage) ── */
  const KEY = "vf-academy";
  const state = (() => {
    try { const s = JSON.parse(localStorage.getItem(KEY)); return s && typeof s === "object" && !Array.isArray(s) ? s : {}; } catch { return {}; }
  })();
  // anything of the wrong shape (an old version, a hand edit) is dropped rather than breaking the page
  state.done = Array.isArray(state.done) ? state.done.filter((d) => typeof d === "string") : [];
  if (!state.doneAt || typeof state.doneAt !== "object") state.doneAt = {};
  if (state.exam && (typeof state.exam !== "object" || !state.exam.id || !/^\d{4}-\d{2}-\d{2}/.test(state.exam.date || ""))) delete state.exam;
  if (state.attempts && !Array.isArray(state.attempts)) delete state.attempts;
  let acctName = "";
  // Visit streak — consecutive days the learner showed up.
  (function trackStreak() {
    const day = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    const today = day(Date.now());
    const v = state.visits && typeof state.visits === "object" ? state.visits : {};
    if (v.last !== today) {
      const yesterday = day(Date.now() - 864e5);
      v.streak = v.last === yesterday ? (v.streak || 0) + 1 : 1;
      v.last = today;
      state.visits = v;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    }
  })();
  // C2: the account copy is read and merged before anything is uploaded, so a stale device can't overwrite it
  let cloudReady = !(window.VHCloud && VHCloud.live), cloudPending = false, saveWarned = false;
  const save = () => {
    // the quick-check block below writes state.qc separately; keep its passes
    try { const cur = JSON.parse(localStorage.getItem(KEY)) || {}; if (cur.qc) state.qc = Object.assign({}, cur.qc, state.qc); } catch {}
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    // the review queue and weekly goal (academy-review.js) keep their own key; they travel with the progress
    try { const rv = JSON.parse(localStorage.getItem("vh-review")); if (rv) state.review = rv; } catch {}
    if (window.VHCloud) {
      if (!cloudReady) { cloudPending = true; return; }
      VHCloud.saveProgress(state).then((ok) => {
        // say once if the account couldn't be reached; the next save tries again
        if (ok === false && VHCloud.live && acctName && !saveWarned) { saveWarned = true; toast("Saved in this browser. Your account couldn't be reached, so we'll try again with your next change."); }
        if (ok) saveWarned = false;
      });
    }
  };
  window.VHAcademySync = save;
  // Pull cloud progress on load (cross-device); merge completed modules & keep best exam.
  if (window.VHCloud && VHCloud.live) VHCloud.touchProfile(); // last seen, country estimate (once a day)
    // a certificate whose first save failed is saved again here
  if (window.VHCloud && VHCloud.live && state.exam && state.exam.passed && VHCloud.ensureCertificate) VHCloud.ensureCertificate(state.exam);
  function pullCloud(retry) {
    VHCloud.loadProgress().then((cloud) => {
    if (cloud === false) { if (retry) setTimeout(() => pullCloud(false), 15000); return; } // the read failed: upload nothing
    const pending = cloudPending;
    cloudReady = true; cloudPending = false;
    if (!cloud || typeof cloud !== "object") { if (pending || state.done.length) save(); return; } // nothing in the account yet
    let changed = false;
    const cloudDone = Array.isArray(cloud.done) ? cloud.done.length : 0;
    (Array.isArray(cloud.done) ? cloud.done : []).forEach((m) => { if (typeof m === "string" && !state.done.includes(m)) { state.done.push(m); changed = true; } });
    if (cloud.qc) { state.qc = Object.assign({}, cloud.qc, state.qc); }
    if (cloud.exam && typeof cloud.exam === "object" && cloud.exam.id && (!state.exam || (cloud.exam.score || 0) > (state.exam.score || 0))) { state.exam = cloud.exam; changed = true; }
    if (cloud.role && !state.role) state.role = cloud.role;
    if (cloud.doneAt) state.doneAt = Object.assign({}, cloud.doneAt, state.doneAt);
    if (cloud.review) {
      let local = null; try { local = JSON.parse(localStorage.getItem("vh-review")); } catch {}
      if (!local || (cloud.review.t || 0) > (local.t || 0)) {
        try { localStorage.setItem("vh-review", JSON.stringify(cloud.review)); } catch {}
        state.review = cloud.review; document.dispatchEvent(new Event("vh-review-sync")); renderMyLearn();
      }
    }
    if (Array.isArray(cloud.attempts)) {
      const seen = new Set((state.attempts || []).map((a) => a.t));
      state.attempts = (state.attempts || []).concat(cloud.attempts.filter((a) => !seen.has(a.t)))
        .sort((a, b) => (a.t < b.t ? -1 : 1)).slice(-20);
    }
    if (changed) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} refreshProgress(); toast("✓ Progress restored from your account"); resumeIfUntouched(); }
    if (pending || state.done.length > cloudDone) save(); // upload the merged copy
    });
  }
  if (window.VHCloud && VHCloud.live) pullCloud(true);

  function toast(msg) {
    let t = $("#vhToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "vhToast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 4200);
  }

  /* ── Modules & sidebar ── */
  const mods = $$(".tmod");
  const modNav = $("#modNav");
  const courseMods = mods.filter((m) => m.dataset.mod !== "exam");

  modNav.innerHTML = mods.map((m) => {
    const id = m.dataset.mod, isExam = id === "exam";
    return `<button class="mod-link${isExam ? " mod-exam" : ""}" data-target="${id}">
      <span class="mchk">✓</span>
      <span class="mtxt"><b>${isExam ? "🎓 " : ""}${m.dataset.title}</b><span>${m.dataset.time}</span></span></button>`;
  }).join("");

  /* ── Access gate: Module 1 is a free preview; the rest of the Academy
        (Modules 2–13, the exam and the certificate) requires an account. ── */
  const FREE = new Set(["m1"]);
  function gated(id) { return (id === "exam" || /^m\d+$/.test(id)) && !FREE.has(id); }
  let currentId = null, gateEl = null;
  let initialId = null, openedByLink = false; // where the page first opened, for resume-after-sign-in

  function renderGate(id, scroll) {
    currentId = id;
    mods.forEach((m) => m.classList.remove("is-visible"));
    $$(".mod-link", modNav).forEach((l) => l.classList.toggle("is-active", l.dataset.target === id));
    const mod = mods.find((m) => m.dataset.mod === id);
    const what = id === "exam" ? "the final exam &amp; certificate"
      : (mod ? "Module " + id.slice(1) + " — " + mod.dataset.title : "this module");
    const next = encodeURIComponent("training.html?open=" + id);
    if (!gateEl) { gateEl = document.createElement("section"); gateEl.className = "tmod auth-gate"; gateEl.id = "authGate"; $("#trMain").appendChild(gateEl); }
    if (window.vhTrack) vhTrack("academy-signup-gate"); // how many readers reach the sign-up step
    gateEl.innerHTML = `
      <div class="gate-card">
        <div class="gate-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <h2>Sign in to unlock ${what}</h2>
        <p>Module&nbsp;1 is a free preview. Create your free account to open the rest of the VE Academy — your progress, quick-checks, exam attempts and certificate all save to your account and sync across devices.</p>
        <ul class="gate-list">
          <li>All 13 modules &amp; the final exam (132-question bank)</li>
          <li>Your Certificate of Completion, shareable on LinkedIn</li>
          <li>Progress, points, badges and your review schedule saved to your account</li>
        </ul>
        <div class="gate-actions">
          <a class="btn btn-primary btn-lg" href="auth.html?view=signup&amp;next=${next}">Create a free account →</a>
          <a class="btn btn-ghost" href="auth.html?view=signin&amp;next=${next}">I already have an account</a>
        </div>
        <p class="gate-foot">Free · no card required · <a href="index.html">explore the public site</a></p>
      </div>`;
    gateEl.classList.add("is-visible");
    if (narrow.matches) setSide(false); // phones: fold the course list so the gate is in view
    $("h2", gateEl).setAttribute("tabindex", "-1");
    if (scroll !== false) { gateEl.scrollIntoView({ behavior: "smooth", block: "start" }); $("h2", gateEl).focus({ preventScroll: true }); }
  }
  // I2: the address bar follows the module, so reload and bookmarks open where the learner is
  function setUrl(id) {
    try { const u = new URL(location.href); u.searchParams.set("open", id); history.replaceState(null, "", u.pathname + u.search + u.hash); } catch (e) {}
  }

  /* ── "Was this module helpful?" — anonymous; the rating is sent on click, a comment is optional ── */
  const FB_KEY = "vh-feedback";
  const fbDone = (() => { try { return JSON.parse(localStorage.getItem(FB_KEY)) || {}; } catch { return {}; } })();
  const fbThanks = '<p class="mf-thanks" role="status">Thanks for your feedback. It helps improve the course.</p>';
  courseMods.forEach((mod) => {
    const id = mod.dataset.mod, done = $(".tmod-done", mod);
    if (!done) return;
    const box = document.createElement("div");
    box.className = "mod-feedback";
    box.innerHTML = fbDone[id] ? fbThanks :
      `<p class="mf-q" id="mfq-${id}">Was this module helpful?</p>
      <div class="mf-btns" role="group" aria-labelledby="mfq-${id}">
        <button type="button" class="mf-btn" data-v="1" aria-pressed="false">👍 Yes</button>
        <button type="button" class="mf-btn" data-v="0" aria-pressed="false">👎 Not really</button>
      </div>
      <form class="mf-more" hidden>
        <label for="mfc-${id}">Anything we could improve? <span>Optional and anonymous.</span></label>
        <textarea id="mfc-${id}" maxlength="500" rows="3"></textarea>
        <button type="submit" class="btn btn-ghost mf-send">Send comment</button>
      </form>`;
    done.parentNode.insertBefore(box, done);
    let helpful = null;
    const remember = () => { fbDone[id] = true; try { localStorage.setItem(FB_KEY, JSON.stringify(fbDone)); } catch (e) {} };
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".mf-btn");
      if (!b || helpful !== null) return;
      helpful = b.dataset.v === "1";
      $$(".mf-btn", box).forEach((x) => { x.setAttribute("aria-pressed", String(x === b)); x.disabled = true; });
      remember();
      if (window.VHCloud) VHCloud.sendFeedback(id, helpful, null);
      const form = $(".mf-more", box); form.hidden = false; $("textarea", form).focus();
    });
    box.addEventListener("submit", (e) => {
      e.preventDefault();
      const comment = $("textarea", box).value.trim();
      if (comment && window.VHCloud) VHCloud.sendFeedback(id, helpful, comment);
      box.innerHTML = fbThanks;
    });
  });

  // "Mark complete" buttons say where they lead next
  $$(".tmod-done").forEach((btn) => {
    const i = mods.findIndex((m) => m.dataset.mod === btn.dataset.done), nxt = mods[i + 1];
    if (nxt && nxt.dataset.mod !== "exam") btn.textContent = "Mark complete & go to Module " + (i + 2) + " →";
  });

  function show(id, scroll, focus) {
    if (focus) setUrl(id); // only when the learner chose the module, so a plain reload still resumes where they are
    if (gated(id) && !acctName) { renderGate(id, scroll); return; }
    currentId = id;
    if (gateEl) gateEl.classList.remove("is-visible");
    mods.forEach((m) => m.classList.toggle("is-visible", m.dataset.mod === id));
    $$(".mod-link", modNav).forEach((l) => l.classList.toggle("is-active", l.dataset.target === id));
    if (id === "exam") renderExamGate();
    // phones/tablets: fold the course list away so the lesson comes first
    if (narrow.matches) setSide(false);
    updateSideCur();
    if (scroll !== false) (narrow.matches ? $("#trMain") : $("#trLayout")).scrollIntoView({ behavior: "smooth", block: "start" });
    if (focus) { const h = $(".tmod.is-visible h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
  }

  const narrow = window.matchMedia("(max-width:960px)");
  const sideEl = $("#trSidebar"), sideBtn = $("#sideToggle");
  function setSide(open) {
    sideEl.classList.toggle("is-collapsed", !open);
    sideBtn.setAttribute("aria-expanded", String(open));
  }
  function updateSideCur() {
    const cur = mods.find((m) => m.dataset.mod === currentId);
    const done = state.done.filter((d) => /^m\d+$/.test(d)).length;
    $("#sideCur").textContent = (cur ? cur.dataset.title + " · " : "") + done + "/" + (mods.length - 1);
  }
  sideBtn.addEventListener("click", () => { if (narrow.matches) setSide(sideEl.classList.contains("is-collapsed")); });
  narrow.addEventListener("change", (e) => setSide(!e.matches));
  if (narrow.matches) setSide(false);

  function updateLocks() {
    $$(".mod-link", modNav).forEach((l) => l.classList.toggle("is-locked", !acctName && gated(l.dataset.target)));
  }

  /* ── Gamification: points, ranks, milestone badges ── */
  const RANKS = [[0, "Value Apprentice"], [300, "Value Explorer"], [600, "Value Analyst"], [900, "Value Engineer"], [1200, "Value Champion"], [2000, "Certified Master"]];
  const BADGES = [
    ["🧭", "Foundations", ["m1", "m2"]],
    ["🛠", "Job Plan Master", ["m3", "m4", "m5", "m6", "m7", "m8"]],
    ["📐", "Cost Toolsmith", ["m9", "m10", "m11"]],
    ["🏛", "Programme Leader", ["m12"]],
    ["🎯", "Cost Preventer", ["m13"]],
  ];
  function points() {
    let p = state.done.length * 100;
    if (state.exam && state.exam.passed) p += 800;
    return p;
  }
  function rank(p) { return RANKS.reduce((r, [min, name]) => (p >= min ? name : r), RANKS[0][1]); }

  function refreshProgress() {
    const total = courseMods.length;
    const done = state.done.length;
    const pct = Math.round((done / total) * 100);
    $("#navProgFill").style.width = pct + "%";
    $("#navProgText").textContent = state.exam && state.exam.passed ? "✓ Certified" : pct + "% · " + rank(points());
    $("#sideProgFill").style.width = pct + "%";
    $("#sideProgText").textContent = `${done} / ${total} modules` + (state.exam && state.exam.passed ? " · certified" : "");
    const pts = $("#trPoints");
    if (pts) pts.textContent = points() + " pts · " + rank(points());
    const badgeBox = $("#trBadges");
    if (badgeBox) badgeBox.innerHTML = BADGES.map(([ico, name, req]) =>
      `<span class="tr-badge${req.every((m) => state.done.includes(m)) ? " is-earned" : ""}" title="${name}: complete ${req.join(", ")}">${ico} ${name}</span>`).join("");
    $$(".mod-link", modNav).forEach((l) => {
      const id = l.dataset.target;
      l.classList.toggle("is-done", id === "exam" ? !!(state.exam && state.exam.passed) : state.done.includes(id));
    });
    if (acctName) renderMyLearn();
  }

  /* ── Role-based learning paths ── */
  const ROLE_RECS = {
    design: ["m1", "m3", "m4", "m5", "m7", "m10", "m13"],
    sourcing: ["m1", "m2", "m9", "m10", "m11"],
    manager: ["m1", "m2", "m6", "m8", "m12", "m13"],
    all: [],
  };
  function applyRole(role) {
    state.role = role; save();
    $$(".role-chip").forEach((c) => c.classList.toggle("is-on", c.dataset.role === role));
    const recs = ROLE_RECS[role] || [];
    $$(".mod-link", modNav).forEach((l) => {
      l.classList.toggle("is-rec", recs.includes(l.dataset.target));
      let star = l.querySelector(".mrec");
      if (!star) { star = document.createElement("span"); star.className = "mrec"; star.textContent = "★ for you"; l.appendChild(star); }
    });
  }
  const roleBar = $("#trRoles");
  if (roleBar) {
    roleBar.addEventListener("click", (e) => {
      const c = e.target.closest(".role-chip");
      if (c) applyRole(c.dataset.role);
    });
    if (state.role) applyRole(state.role);
  }

  modNav.addEventListener("click", (e) => {
    const l = e.target.closest(".mod-link");
    if (l) show(l.dataset.target, true, true);
  });

  $$(".tmod-done").forEach((btn) => btn.addEventListener("click", () => {
    const id = btn.dataset.done;
    if (!state.done.includes(id)) { state.done.push(id); (state.doneAt = state.doneAt || {})[id] = new Date().toISOString(); }
    save(); refreshProgress();
    const order = mods.map((m) => m.dataset.mod);
    const next = order[order.indexOf(id) + 1];
    show(next || "exam", true, true);
  }));

  $("#startBtn").addEventListener("click", () => {
    const firstUnread = courseMods.find((m) => !state.done.includes(m.dataset.mod));
    show(firstUnread ? firstUnread.dataset.mod : "exam");
  });

  /* ── Signed-in state: My Learning banner + cert name prefill ── */
  function renderMyLearn() {
    if (!acctName) return;
    let box = $("#myLearn");
    if (!box) {
      box = document.createElement("div");
      box.id = "myLearn"; box.className = "my-learn";
      const anchor = $("#trRoles");
      anchor.parentNode.insertBefore(box, anchor);
    }
    const total = courseMods.length, done = state.done.length;
    const pct = Math.round((done / total) * 100);
    const next = courseMods.find((m) => !state.done.includes(m.dataset.mod));
    const goal = window.VHWeek ? VHWeek.summary() : "";
    const certified = state.exam && state.exam.passed;
    const first = acctName.trim().split(/\s+/)[0].replace(/[<>&"]/g, "");
    box.innerHTML = `
      <div class="ml-ring"><svg viewBox="0 0 60 60"><circle class="mlr-bg" cx="30" cy="30" r="26"/><circle class="mlr-fg" cx="30" cy="30" r="26" style="stroke-dashoffset:${Math.round(163.4 * (1 - pct / 100))}"/></svg><b>${pct}%</b></div>
      <div class="ml-txt">
        <b>Welcome back, ${first} 👋</b>
        <span>${done} of ${total} modules · ${points()} pts · ${rank(points())}${goal ? " · " + goal : ""}${certified ? " · 🎓 Certified" : ""}</span>
      </div>
      <button class="btn btn-primary ml-btn" id="mlGo">${certified ? "View your certificate →" : next ? (done ? "Continue: " + next.dataset.title + " →" : "Start learning →") : "Take the exam →"}</button>`;
    $("#mlGo").addEventListener("click", () => show(certified || !next ? "exam" : next.dataset.mod));
  }
  function onAccount(user) {
    if (user && user.name) {
      acctName = user.name; renderMyLearn();
      const ss = $("#sideSync"); if (ss) ss.remove();
    } else {
      acctName = "";
      const ml = $("#myLearn"); if (ml) ml.remove();
      const foot = $(".tr-side-foot");
      if (foot && !$("#sideSync")) {
        const n = document.createElement("p");
        n.id = "sideSync"; n.className = "side-sync";
        n.innerHTML = '<a href="auth.html">Sign in</a> to unlock the full Academy &amp; sync across devices.';
        foot.appendChild(n);
      }
    }
    updateLocks();
    const gateFocused = !!(gateEl && gateEl.contains(document.activeElement));
    if (currentId) show(currentId, false); // re-gate or reveal now that auth changed
    if (gateFocused) { const h = $(".tmod.is-visible h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } } // the gate that had focus is gone
    resumeIfUntouched();
  }
  // The account and the saved progress arrive a moment after the page opens, so a signed-in
  // learner first sees Module 1. Move them on to where they left off, unless they've already
  // gone somewhere else, scrolled into the page, or arrived by a link to a particular module.
  function resumeIfUntouched() {
    if (!acctName || openedByLink || !initialId || currentId !== initialId || window.scrollY > 200) return;
    const next = courseMods.find((m) => !state.done.includes(m.dataset.mod));
    const target = state.exam && state.exam.passed ? "exam" : (next ? next.dataset.mod : "exam");
    if (target !== currentId) { show(target, false); initialId = target; }
  }
  window.VHAcademyRefresh = renderMyLearn;
  document.addEventListener("vh-account", (e) => onAccount(e.detail));
  if (window.VHAccount && VHAccount.user) onAccount(VHAccount.user);

  /* ── Final exam ──
     The question bank lives on the server (supabase-exam.sql) and is never sent to the page:
     each attempt gets 30 questions without answers (2 from every module + 4 scenario,
     calculation or case-study questions), and the server marks them and issues the certificate. */
  const mount = $("#examMount");
  const examTitles = {};
  courseMods.forEach((m) => { examTitles[m.dataset.mod] = m.dataset.title; });

  function renderExamGate() {
    if (state.exam && state.exam.passed) { renderCertificate(); return; }
    if ($(".ex-q", mount)) return; // an exam is in progress: leave it as it is
    const pc = state.pendingCert;
    if (pc && pc.attempt && Date.now() - (pc.at || 0) < 30 * 864e5) { // passed, but the certificate wasn't created yet
      mount.innerHTML = `<div class="ex-gate"><p class="ex-pass"><strong>You passed with ${+pc.score || 0}%.</strong> Enter your name to create your certificate.</p><div class="ex-actions" id="exPending"></div></div>`;
      VHExamUI.certForm($("#exPending", mount), pc.attempt, acctName, issued);
      $("#certWrap").hidden = true;
      return;
    }
    const todo = courseMods.filter((m) => !state.done.includes(m.dataset.mod));
    const remaining = todo.length, nextMod = todo[0];
    mount.innerHTML = `<div class="ex-gate">
      <p>Thirty questions: two from every module, plus four scenario or calculation questions, drawn from a bank of
      132. You need <strong>80% (24 of 30)</strong> to earn the <strong>VAVEhub Certificate of Completion</strong>.
      If you don't pass, you'll see how you did in each module and can try again after an hour, with new questions.</p>
      <details class="ex-what"><summary>What this certificate is, and isn't</summary><ul>
        <li>A record that you finished about 6 hours of study and passed an exam marked on our server.</li>
        <li>The course follows SAVE International's six-phase job plan, the terms of EN 1325 and, for value management, EN 12973.</li>
        <li>It isn't a SAVE or Institute of Value Management certification (such as VMA, CVS, QVA or PVM), and VAVEhub isn't connected with either body.</li>
        <li>If you hold a PMI certification, you may be able to self-report the hours as PDUs. PMI decides what it accepts.</li>
        <li>Planning to go further? Keep a <a href="toolkit/value-study-logbook.html" target="_blank" rel="noopener">value study logbook</a> from your first real study.</li>
      </ul></details>
      ${remaining > 0
        ? `<p class="ex-warn">The exam opens once you've finished all ${courseMods.length} modules, so your certificate shows you completed the whole course. You have ${remaining} module${remaining > 1 ? "s" : ""} to go.</p>
      <button class="btn btn-primary btn-lg" id="examNextMod">Continue: ${nextMod.dataset.title} →</button>`
        : `<div class="ex-actions"><button class="btn btn-primary btn-lg" id="examStart">Begin the exam →</button>
           <button class="btn btn-ghost" id="examPractice">Try a practice exam first</button></div>
           <p class="ex-note">Want to practise the whole job plan first? Try the <a href="capstone.html">capstone kettle study</a> (about 90 minutes, not marked).</p>`}
    </div>`;
    if (remaining > 0) $("#examNextMod").addEventListener("click", () => show(nextMod.dataset.mod));
    else {
      $("#examStart").addEventListener("click", startExam);
      $("#examPractice").addEventListener("click", () => window.VHPractice && window.VHPractice.open());
    }
    $("#certWrap").hidden = true;
  }

  async function startExam() {
    $("#certWrap").hidden = true;
    // the server checks completed modules against the saved progress, so make sure it's up to date
    if (window.VHCloud && VHCloud.live && acctName && cloudReady) { try { await VHCloud.saveProgress(state); } catch (e) {} }
    VHExamUI.start({
      mount, course: "academy", noun: "exam", titles: examTitles,
      signInHref: "auth.html?next=" + encodeURIComponent("training.html?open=exam"),
      onGoto: (id) => show(id),
      onResult: (res, attempt) => {
        state.attempts = (state.attempts || []).concat([{ t: new Date().toISOString(), s: res.score, p: !!res.passed }]).slice(-20);
        if (res.passed && attempt) state.pendingCert = { attempt, score: res.score, at: Date.now() }; // survives a reload before the name is entered
        save();
      },
      onPass: (res, attempt, box) => VHExamUI.certForm(box, attempt, (state.exam && state.exam.name) || acctName, issued),
      onRetake: startExam,
    });
  }

  function issued(cert) {
    state.exam = Object.assign({ passed: true }, cert);
    delete state.pendingCert;
    save(); refreshProgress(); renderCertificate();
  }

  function certToken(e) {
    const json = JSON.stringify({ n: e.name, s: e.score, d: e.date, id: e.id });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function renderCertificate() {
    const e = state.exam;
    const shareUrl = new URL("certificate.html?c=" + certToken(e), location.href).toString();
    const li = new URL("https://www.linkedin.com/profile/add");
    li.searchParams.set("startTask", "CERTIFICATION_NAME");
    li.searchParams.set("name", "Value Engineering 360° — Certificate of Completion (VAVEhub VE Academy)");
    li.searchParams.set("organizationName", "VAVEhub VE Academy");
    li.searchParams.set("issueYear", e.date.slice(0, 4));
    li.searchParams.set("issueMonth", String(+e.date.slice(5, 7)));
    li.searchParams.set("certUrl", shareUrl);
    li.searchParams.set("certId", e.id);
    mount.innerHTML = `<div class="ex-gate"><p><strong style="color:#34d399">✓ Certified.</strong> Your Certificate of Completion is below —
      add it to LinkedIn, share the link, or save it as a PDF. It's stored in this browser, so you can come back anytime.</p>
      <div class="ex-actions" style="margin-bottom:.6rem">
        <a class="btn btn-primary" href="${li.toString()}" target="_blank" rel="noopener">in&nbsp; Add to LinkedIn profile</a>
        <button class="btn btn-ghost" id="copyShare">🔗 Copy share link</button>
        <button class="btn btn-ghost" id="exRetake">Retake for a better score</button>
      </div></div>`;
    $("#exRetake").addEventListener("click", startExam);
    $("#copyShare").addEventListener("click", () => {
      (navigator.clipboard ? navigator.clipboard.writeText(shareUrl) : Promise.reject())
        .then(() => { $("#copyShare").textContent = "✓ Link copied"; })
        .catch(() => { prompt("Copy your certificate link:", shareUrl); });
    });
    $("#certName").textContent = e.name;
    $("#certScore").textContent = e.score + "%";
    const [cy, cm, cd] = String(e.date).slice(0, 10).split("-").map(Number); // the date as issued, not shifted by time zone
    $("#certDate").textContent = new Date(cy, cm - 1, cd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    $("#certId").textContent = e.id;
    $("#certWrap").hidden = false;
  }

  /* ── Printable one-page module summaries ── */
  courseMods.forEach((mod) => {
    const head = $(".tmod-head", mod);
    if (!head) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tmod-print";
    btn.textContent = "🖨 Module summary";
    btn.title = "Print a one-page recap of this module";
    btn.addEventListener("click", () => printSummary(mod));
    head.appendChild(btn);
  });

  function printSummary(mod) {
    const title = mod.dataset.title;
    const tag = ($(".tmod-tag", mod) || {}).textContent || "";
    const obj = $(".tmod-obj ul", mod), keys = $(".tkey ul", mod), doEl = $(".tdo p", mod);
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title} — module summary · VAVEhub VE Academy</title>
      <style>
        body{font-family:'Segoe UI',system-ui,sans-serif;color:#1a2233;max-width:760px;margin:2rem auto;padding:0 1.2rem;line-height:1.55}
        .brand{font-weight:800;font-size:.95rem}.brand b{color:#2563eb}
        .tag{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#5a6785;margin:.9rem 0 .2rem}
        h1{font-size:1.5rem;margin:0 0 1rem;border-bottom:2px solid #1a2233;padding-bottom:.7rem}
        h2{font-size:.95rem;color:#2563eb;margin:1.3rem 0 .4rem}
        ul{margin:.2rem 0 .2rem 1.2rem}li{margin-bottom:.3rem;font-size:.9rem}
        p{font-size:.9rem}
        .foot{margin-top:2rem;padding-top:.8rem;border-top:1px solid #dde3f0;font-size:.72rem;color:#5a6785}
        @media print{body{margin:0 auto}}
      </style></head><body>
      <div class="brand">VAVE<b>hub</b> · VE Academy — module summary</div>
      <div class="tag">${tag}</div><h1>${title}</h1>
      ${obj ? "<h2>What this module covers</h2><ul>" + obj.innerHTML + "</ul>" : ""}
      ${keys ? "<h2>Key takeaways</h2><ul>" + keys.innerHTML + "</ul>" : ""}
      ${doEl ? "<h2>Hands-on assignment</h2><p>" + doEl.innerHTML + "</p>" : ""}
      <div class="foot">© Avinash Bhosale · VAVEhub VE Academy — free educational summary, personal &amp; internal use with attribution. Full lesson, worked examples and case studies: the free course at VAVEhub.</div>
      <script>window.print()<\/script></body></html>`);
    w.document.close();
  }

  /* ── Init ── */
  refreshProgress();
  updateLocks();
  const firstUnread = courseMods.find((m) => !state.done.includes(m.dataset.mod));
  const startId = acctName
    ? (state.exam && state.exam.passed ? "exam" : (firstUnread ? firstUnread.dataset.mod : "exam"))
    : "m1";
  let openParam = new URLSearchParams(location.search).get("open");
  if (openParam && !mods.some((m) => m.dataset.mod === openParam)) openParam = null; // an old or mistyped link
  openedByLink = !!openParam;
  if (openParam) show(openParam, true, true); else show(startId, false); // a link to a module scrolls to it
  initialId = currentId;
  try { localStorage.setItem("vh-last-course", "academy"); } catch (e) {} // for "My learning"
})();

/* ════════ Per-module quick checks (gate module completion) ════════ */
(function () {
  "use strict";
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const KEY = "vf-academy";
  const state = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  state.qc = state.qc && typeof state.qc === "object" ? state.qc : {};
  state.done = Array.isArray(state.done) ? state.done : [];
  let acctName = "";
  // merge into the latest stored copy: the main Academy block may have saved newer progress since this page loaded
  const save = () => { try { const cur = JSON.parse(localStorage.getItem(KEY)) || {}; cur.qc = Object.assign({}, cur.qc, state.qc); localStorage.setItem(KEY, JSON.stringify(cur)); } catch {} };

  const QUICK = {
    m1: [
      ["A product delivers the same function as its rival but costs 20% less to make. Its value is…", ["Lower", "Higher", "The same", "Impossible to say"], 1, "Same function ÷ lower cost = a higher Function/Cost ratio."],
      ["Which of these is NOT one of the four types of value?", ["Use value", "Esteem value", "Exchange value", "Function value"], 3, "The four types are use, esteem, exchange and cost value. Function is what you divide by cost to measure value. It isn't a type of value."],
    ],
    m2: [
      ["The ideal VE workshop team is…", ["The design engineers who know it", "6–10 people from different departments", "The whole department, so nobody feels left out", "Two senior engineers and an outside consultant"], 1, "Ideas come from people with different jobs challenging each other. Add a trained facilitator who runs the process but doesn't supply the answers."],
      ["The one data item you can't start the workshop without is…", ["A costed parts list checked by finance", "A full set of competitor teardown reports", "Quotes from three other suppliers", "Five years of customer complaint records"], 0, "Without a starting cost you can trust, there's no study. Everything builds on the costed parts list."],
    ],
    m3: [
      ["Before any ideas, the team works through the classic VE questions. Which of these is one of them?", ["What is it worth?", "Who designed it?", "How was it made last time?", "Which supplier is cheapest?"], 0, "The five questions: What is it? What does it do? What does it cost? What is it worth? What else could do the job?"],
      ["Pareto thinking in the Information phase means…", ["Studying the few parts that hold most of the cost", "Giving every part the same share of analysis time", "Dropping every part under £1 from the study", "Starting with the parts that get the most complaints"], 0, "Roughly 20% of the parts carry about 80% of the cost. Put your effort where the money is."],
    ],
    m4: [
      ["'Fasten flange' or 'join components': which is the better function statement?", ["Fasten flange", "Join components", "Both are equally good", "Neither is a valid function"], 1, "'Fasten flange' locks you into bolts or rivets. 'Join components' says less about today's solution, so it lets in welding, adhesives, snap-fits and one-piece designs."],
      ["A function costs £1.00 and its worth is £0.80. Its Value Index is…", ["0.80: healthy", "1.25: watch list", "0.20: healthy", "1.25: attack now"], 1, "VI = cost ÷ worth = £1.00 ÷ £0.80 = 1.25. That's over 1.2 and up to 2.0, so it goes on the watch list."],
    ],
    m5: [
      ["Mid-brainstorm, a manager says 'that will never work'. The facilitator should…", ["Remind the room that judging waits for later", "Ask the manager to explain the objection fully", "Put the idea to a quick vote and move on", "Take the idea off the board to keep things moving"], 0, "Osborn's first rule: no judging while ideas are being generated. The objection can be raised in the Evaluation phase."],
      ["A 6-3-5 brainwriting session produces how many ideas in ~30 minutes?", ["18", "35", "108", "635"], 2, "6 people × 3 ideas × 6 passes = 108 ideas, silently."],
    ],
    m6: [
      ["The Pugh matrix compares candidate concepts against…", ["A theoretical ideal design", "The current design, as a datum", "The cheapest competitor's product", "The target cost set for the product"], 1, "Each concept scores better, same or worse on each criterion than the datum, usually the current design."],
      ["Parked ideas should be…", ["Kept on file, ready for future rounds", "Deleted, so the list stays focused", "Scored again in the same workshop", "Handed to purchasing to follow up"], 0, "Today's 'not yet' could be next year's plan. Park ideas, don't delete them."],
    ],
    m7: [
      ["A change saves £0.30 a unit on 300,000 units a year. Its one-time cost is £52.8k (tooling, validation and engineering). Payback?", ["About 2 months", "About 7 months", "About 18 months", "About 3 years"], 1, "Annual saving = £0.30 × 300,000 = £90k. Payback = £52.8k ÷ £90k = 0.59 years, about 7 months."],
      ["Before reducing an old safety margin, you should…", ["Check it by test and against the standards", "Remove it: old margins are usually waste", "Halve it, then watch the warranty claims closely", "Ask the supplier whether they'd accept it"], 0, "Checking the change with simulation or testing, and against the relevant standards, is what makes the saving real and safe."],
    ],
    m8: [
      ["The real output of the Presentation phase is…", ["Logged decisions with owners and dates", "A polished slide deck the board has seen", "Applause and support from the management team", "A report filed for the next study team"], 0, "A presentation without decisions is a rehearsal."],
      ["Implemented savings are measured against…", ["The fixed starting cost agreed in preparation", "The latest supplier quote, whatever it is", "The cost in this year's budget", "The best competitor's cost estimate"], 0, "Savings are measured against the fixed starting cost. Commodity price swings are taken out with an index, but the baseline itself never moves."],
    ],
    m9: [
      ["Most of your product cost sits in purchased materials. Which groups of levers work best first?", ["Packaging & logistics", "Sourcing + design", "Overhead allocation", "Warranty design"], 1, "Where the cost sits decides the levers. Mostly bought-in parts means should-cost sourcing plus design changes."],
      ["A supplier's plant runs at 60% utilisation. Which should-cost layer inflates?", ["Raw material", "Overhead", "Margin", "Freight"], 1, "Overhead is spread over fewer parts, so you're paying for empty machine time. That's a fact you can raise with the supplier."],
    ],
    m10: [
      ["The FIRST step of a teardown is…", ["Photograph, weigh and measure everything", "Take it apart and time every step", "Scan it to CAD before anything else", "Cost each visible part from the outside"], 0, "Record it before you take it apart. You only get one first teardown."],
      ["Functional benchmarking compares…", ["Performance per pound (lumens per £)", "Top performance figures, side by side", "Feature lists, item by item", "Retail prices across the market"], 0, "Value ratios, not raw figures. That's how VE looks at benchmarking."],
    ],
    m11: [
      ["The right division of labour with AI in VAVE is…", ["AI drafts; people check and decide", "AI decides; people check its working", "AI runs the workshop; people sign off", "AI sets targets; people find the ideas"], 0, "AI speeds up analysis and produces more ideas. Judgement and checking stay with people."],
      ["CT scanning is used in teardowns to…", ["See inside without taking it apart", "Identify the exact material grade", "Measure the assembly time directly", "Estimate each part's cost on its own"], 0, "CT shows wall thicknesses, hidden joints and the internal layout without cutting the part open. It shows density differences, not the material grade, so materials still need a test."],
    ],
    m12: [
      ["The savings funnel should be reviewed…", ["Monthly", "Quarterly", "Yearly", "Only when savings slip"], 0, "A monthly review gives every idea an owner, a stage and a date. That's what stops ideas quietly disappearing."],
      ["SAVE International's two certification levels, from entry level up, are…", ["VMA, then CVS", "CVS, then VMA", "QVA, then PVM", "PVM, then CVS"], 0, "VMA (Value Methodology Associate) is the entry level and CVS (Certified Value Specialist) is the level for leading studies. QVA and PVM are the Institute of Value Management's qualifications in the UK."],
    ],
    m13: [
      ["The net selling price (after VAT and the retailer's share) is £400, and the business needs a 25% margin. Its allowable cost is…", ["£100", "£300", "£375", "£500"], 1, "Allowable cost = net selling price − margin = £400 × (1 − 0.25) = £300. It's set before design, not after."],
      ["The 'cardinal rule' of target costing says…", ["If costs drift up, raise the price", "The target cost is never exceeded", "Suppliers absorb all overruns", "Targets are only guidance until production starts"], 1, "Cooper & Slagmulder's rule: the number stays fixed. If something adds cost, the same amount is saved somewhere else, through features, design or make-or-buy decisions."],
    ],
  };

  // quick-check questions also feed the practice exam
  Object.entries(QUICK).forEach(([mod, qs]) => qs.forEach(([q, opts, c, why]) => (window.VH_PRACTICE = window.VH_PRACTICE || []).push({ mod, q, opts, c, why })));
  // answers appear in a new order each time, so the right one isn't always in the same place
  const qcOrder = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  $$(".qcheck").forEach((box) => {
    const id = box.dataset.qc;
    const qs = QUICK[id];
    if (!qs) return;
    const doneBtn = document.querySelector(`.tmod-done[data-done="${id}"]`);
    const solved = new Set();
    const alreadyCleared = state.done.includes(id) || state.qc[id];

    box.innerHTML = `<div class="qcheck-head"><h4>Quick check</h4><span>${alreadyCleared ? "Cleared ✓" : "Answer both correctly to unlock completion"}</span></div>` +
      qs.map(([q, opts, c, expl], qiIdx) => `<div class="qc-item" data-qi="${qiIdx}">
        <div class="qc-q">${qiIdx + 1}. ${q}</div>
        <div class="qc-opts">${qcOrder(opts.length).map((oi) => `<button class="qc-opt" data-oi="${oi}">${opts[oi]}</button>`).join("")}</div>
        <div class="qc-expl" role="status" aria-live="polite"></div></div>`).join("");

    function gate() {
      if (doneBtn) doneBtn.disabled = !(alreadyCleared || solved.size === qs.length);
    }
    if (!alreadyCleared && doneBtn) doneBtn.disabled = true;

    box.addEventListener("click", (e) => {
      const btn = e.target.closest(".qc-opt");
      if (!btn) return;
      const item = btn.closest(".qc-item");
      const qiIdx = +item.dataset.qi;
      const [, , correct, expl] = qs[qiIdx];
      const expEl = item.querySelector(".qc-expl");
      if (+btn.dataset.oi === correct) {
        btn.classList.add("is-right");
        item.classList.add("is-locked");
        expEl.textContent = "✓ " + expl;
        expEl.className = "qc-expl show-right";
        solved.add(qiIdx);
        if (solved.size === qs.length) {
          state.qc[id] = true; save();
          box.querySelector(".qcheck-head span").textContent = "Cleared ✓";
          gate();
        }
      } else {
        btn.classList.add("is-wrong");
        // the hint gives most of the answer away, so it only appears after a second wrong try
        item.dataset.miss = String((+item.dataset.miss || 0) + 1);
        expEl.textContent = +item.dataset.miss >= 2 ? "✗ Not quite. Hint: " + expl : "✗ Not quite. Try again.";
        expEl.className = "qc-expl show-wrong";
        if (window.VHMistakes) { if (+item.dataset.miss >= 2) VHMistakes.attach(expEl, btn.textContent); else VHMistakes.clear(expEl); }
        setTimeout(() => btn.classList.remove("is-wrong"), 700);
      }
    });
    gate();
  });
})();

/* ════════ Glossary tooltips — first mention per module gets a hover definition ════════ */
(function () {
  "use strict";
  const TERMS = [
    ["FAST", "Function Analysis System Technique — maps functions on a HOW→/←WHY logic axis between scope lines."],
    ["Value Index", "Cost ÷ worth for a function (some texts use worth ÷ cost). Over 1.2, watch it; over 2.0, it's a target."],
    ["should-cost", "A bottom-up estimate of what a part ought to cost: material, cycle time, machine rates, labour, overhead, fair margin."],
    ["cleansheet", "A fully transparent, layer-by-layer should-cost model used for fact-based negotiation."],
    ["LPP", "Linear Performance Pricing — regressing price against a cost driver across a part family to expose outliers."],
    ["target costing", "Market price − required margin = allowable cost, set before design starts and cascaded down."],
    ["design-to-cost", "Managing cost as a design requirement with the same authority as mass, performance or safety."],
    ["kaizen costing", "Continuous, incremental cost reduction during production — the running-change counterpart to target costing."],
    ["teardown", "Systematic disassembly and costing of a product, yours or a competitor's, to find facts and ideas."],
    ["DFMA", "Design for Manufacture & Assembly — minimum-part-count logic and assembly-friendly geometry, quantified."],
    ["buy-to-fly", "Raw material bought ÷ material in the finished part. Aerospace titanium can start at 8:1."],
    ["OEE", "Overall Equipment Effectiveness = availability × performance × quality — the denominator of machine cost per part."],
    ["TCO", "Total Cost of Ownership — purchase price plus lifetime energy, service, warranty and disposal cost."],
    ["PPAP", "Production Part Approval Process: the automotive customer-approval process that most product or process changes must go through."],
    ["TRIZ", "Theory of Inventive Problem Solving — resolves design contradictions using 40 principles distilled from patents."],
    ["Kano", "A way of sorting customer requirements into must-haves, performance features, delighters, things customers don’t care about and things they dislike. It shows which features you can safely remove."],
    ["Pugh matrix", "A way of comparing ideas: score each one as better, worse or the same as the current design on each criterion."],
    ["basic function", "The reason the product exists (\"heat water\"). Remove it and the product is pointless."],
    ["secondary function", "How this particular design happens to work — and therefore where most removable cost hides."],
    ["gain-share", "Contractual split of verified savings with a supplier — the engine of supplier-driven VAVE."],
  ].map(([t, d]) => [new RegExp("(^|[^\\w-])(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")($|[^\\w-])", "i"), t, d]);
  window.VH_TERMS = TERMS.map((t) => [t[1], t[2]]); // flashcard deck

  document.querySelectorAll(".tmod").forEach((mod) => {
    const used = new Set();
    const walker = document.createTreeWalker(mod, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest("h2, h3, h4, .gloss, .tmod-tag, .qcheck, button, a, code")) return NodeFilter.FILTER_REJECT;
        return n.data.trim().length > 3 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      for (const [re, term, def] of TERMS) {
        if (used.has(term)) continue;
        const m = node.data.match(re);
        if (!m) continue;
        const start = m.index + m[1].length;
        const word = m[2];
        const after = node.splitText(start);
        after.data = after.data.slice(word.length);
        const span = document.createElement("span");
        span.className = "gloss";
        span.tabIndex = 0;
        span.setAttribute("data-def", def);
        span.textContent = word;
        // the tooltip is drawn by CSS, so screen readers get the definition from a hidden element
        const dd = document.createElement("span"); dd.hidden = true; dd.id = "gdef-" + used.size; dd.textContent = def;
        document.body.appendChild(dd); span.setAttribute("aria-describedby", dd.id);
        node.parentNode.insertBefore(span, after);
        used.add(term);
        break; // one wrap per text node; later nodes catch the other terms
      }
    });
  });
})();

/* ════════ Module 4 interactives: FAST builder · function library · identification challenge ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── 1. Step-by-step animated FAST diagram ── */
  const fb = $("#fastBuilder");
  if (fb) {
    const CAPTIONS = [
      "Here’s the finished diagram, faded. Press <b>Next step</b> to build it one card at a time.",
      "<b>Step 1 — Draw the scope lines.</b> Two dashed lines mark the edges of your study. Everything you'll analyse goes between them. The logic runs left to right: moving right asks <b>HOW?</b>, moving left asks <b>WHY?</b>",
      "<b>Step 2 — Place the basic function.</b> <i>HEAT WATER</i> goes just inside the left scope line. It's the reason the kettle exists. Remove it and the product is pointless.",
      "<b>Step 3 — Ask HOW?</b> HOW do we heat water? By <i>generating heat</i>. The answer goes just to the right, joined by a line.",
      "<b>Step 4 — Keep asking HOW?</b> HOW do we generate heat? — by <i>conducting current</i> through a resistive element. Each HOW? extends the chain one card to the right.",
      "<b>Step 5 — Stop at the assumed function.</b> HOW do we conduct current? Mains electricity <i>supplies power</i>. That's outside our control, so it sits <b>outside the right scope line</b>. Our study stops here.",
      "<b>Step 6 — Complete the WHY? side.</b> WHY do we heat water? — to <i>prepare a beverage</i>. That's the customer's higher purpose, so it sits <b>outside the left scope line</b>. Now read the chain backwards: every WHY? should make sense.",
      "<b>Step 7 — Float the all-time functions.</b> <i>PROTECT USER</i>, <i>PREVENT SCALDING</i> and <i>CONVEY ESTEEM</i> apply the whole time the kettle is in use, so they float above the main path rather than joining the chain.",
      "<b>Step 8 — Add the WHEN functions.</b> Some functions happen at the same time as the basic function. WHEN we heat water, we also <i>contain water</i>, <i>control temperature</i> and <i>show status</i>. They hang below the function they go with.",
      "<b>Done — now validate.</b> Read it aloud both ways: \"WHY conduct current? To generate heat. WHY generate heat? To heat water. ✓\" and \"HOW to heat water? Generate heat. HOW? Conduct current. ✓\" If a sentence sounds wrong, a card is in the wrong place. Reading it aloud like this is the whole point of FAST.",
    ];
    const LAST = CAPTIONS.length - 1;
    let step = 0;
    const stage = $("#fbStage"), cap = $("#fbCaption"), prev = $("#fbPrev"), next = $("#fbNext"), dots = $("#fbDots");
    dots.innerHTML = CAPTIONS.map((_, i) => `<i class="fb-dot${i === 0 ? " on" : ""}"></i>`).join("");
    function render() {
      $$("[data-fstep]", stage).forEach((el) => el.classList.toggle("fb-in", +el.dataset.fstep <= step));
      stage.classList.toggle("fb-validating", step === LAST);
      stage.classList.toggle("fb-ghost", step === 0); // step 0 shows a faint preview of the finished diagram
      cap.innerHTML = CAPTIONS[step];
      prev.disabled = step === 0;
      next.textContent = step === LAST ? "↻ Replay" : "Next step →";
      $$(".fb-dot", dots).forEach((d, i) => d.classList.toggle("on", i <= step));
      placeArrows();
    }
    // arrows run between the real card edges, so they never cross the card text
    function placeArrows() {
      const box = stage.getBoundingClientRect();
      [["fb-a1", "fb-basic", "fb-f2"], ["fb-a2", "fb-f2", "fb-f3"]].forEach(([a, from, to]) => {
        const el = $("." + a, stage), f = $("." + from, stage).getBoundingClientRect(), t = $("." + to, stage).getBoundingClientRect();
        el.style.left = (f.right - box.left + 4) + "px";
        el.style.width = Math.max(0, t.left - f.right - 10) + "px";
      });
    }
    window.addEventListener("resize", placeArrows);
    next.addEventListener("click", () => { step = step === LAST ? 0 : step + 1; render(); });
    prev.addEventListener("click", () => { if (step > 0) { step--; render(); } });
    render();
  }

  /* ── 2. Function library: active verb + measurable noun ── */
  const LIB = {
    "Mechanical": [
      ["Transmit torque", "carry twisting force from one part to another", "driveshaft, gear, coupling"],
      ["Support load", "hold up a weight or force without failing", "bracket, chassis, table leg"],
      ["Absorb shock", "soak up sudden impact energy", "bumper foam, shoe sole, damper"],
      ["Store energy", "hold energy for later release", "spring, flywheel, battery"],
      ["Position component", "hold a part in exactly the right place", "locating pin, bracket, jig"],
      ["Join components", "hold two or more parts together", "weld, adhesive, snap-fit, bolt"],
      ["Increase friction", "resist sliding between surfaces", "tyre tread, rubber feet, grip tape"],
      ["Reduce friction", "let surfaces slide or roll easily", "bearing, bushing, lubricant"],
      ["Limit travel", "stop movement beyond a set point", "end stop, detent, snap ring"],
      ["Guide motion", "constrain movement along a path", "rail, slot, hinge, linear guide"],
    ],
    "Electrical & electronic": [
      ["Conduct current", "carry electricity from one point to another", "wire, busbar, PCB trace"],
      ["Block current", "stop electricity going where it shouldn't", "insulation, isolator, fuse (when blown)"],
      ["Store charge", "hold electrical energy briefly", "capacitor, battery cell"],
      ["Convert energy", "change one energy form into another", "motor, generator, LED, heater"],
      ["Switch circuit", "open or close an electrical path", "relay, transistor, push button"],
      ["Regulate voltage", "hold electrical pressure steady", "regulator IC, zener diode"],
      ["Amplify signal", "make a weak signal stronger", "op-amp, audio amplifier"],
      ["Suppress interference", "stop unwanted electrical noise", "ferrite bead, shield can, filter"],
    ],
    "Thermal & fluid": [
      ["Generate heat", "produce thermal energy on purpose", "heating element, burner"],
      ["Dissipate heat", "move unwanted heat away", "heat sink, fan, radiator"],
      ["Insulate heat", "slow heat passing through", "foam layer, air gap, double wall"],
      ["Contain fluid", "keep liquid or gas inside a space", "tank, pipe, kettle body"],
      ["Control flow", "set how much fluid passes", "valve, orifice, thermostat"],
      ["Seal interface", "stop leaks where two parts meet", "O-ring, gasket, weld bead"],
      ["Filter particles", "remove unwanted matter from a flow", "air filter, strainer, membrane"],
      ["Circulate air", "move air around a space", "fan, blower, vent"],
    ],
    "Information & control": [
      ["Indicate status", "show the user what state the product is in", "LED, gauge, icon"],
      ["Sense temperature", "measure how hot or cold something is", "thermistor, thermocouple"],
      ["Measure pressure", "quantify force per area in a system", "pressure sensor, gauge"],
      ["Transmit signal", "send information from one place to another", "cable, antenna, optical fibre"],
      ["Store data", "keep information for later use", "memory chip, SD card"],
      ["Control sequence", "decide what happens and when", "controller, timer, cam"],
      ["Emit sound", "produce an audible signal", "buzzer, speaker, chime"],
      ["Emit light", "produce visible light", "LED, bulb, display backlight"],
    ],
    "Protection & durability": [
      ["Resist corrosion", "survive attack by water or chemicals", "coating, stainless steel, anodising"],
      ["Resist wear", "survive repeated rubbing", "hardened surface, wear plate"],
      ["Resist flame", "not catch fire or spread fire", "FR plastic, intumescent coating"],
      ["Protect surface", "shield a surface from damage", "paint, film, case"],
      ["Exclude dust", "keep dirt out of a mechanism", "seal, boot, cover"],
      ["Protect user", "prevent harm to the user (all-time function)", "guard, interlock, insulation"],
      ["Damp vibration", "reduce unwanted shaking", "rubber mount, mass damper"],
      ["Retain fastener", "stop a joint working loose", "thread-locker, lock washer, nyloc"],
    ],
    "Esteem & human": [
      ["Convey quality", "make the product feel well made", "gloss finish, tight gaps, weight"],
      ["Please eye", "look attractive to the customer", "styling line, colour, proportion"],
      ["Convey esteem", "signal status or brand to others", "badge, chrome trim, packaging"],
      ["Reduce effort", "make the product easier to use", "soft-touch grip, assist spring"],
      ["Save time", "let the user finish the task faster", "quick-release, one-touch control"],
      ["Assure user", "give confidence it is working properly", "solid click, progress light"],
      ["Spread pressure", "make contact with the body comfortable", "padding, ergonomic curve"],
      ["Aid grip", "help the hand hold the product", "knurling, rubber overmould"],
    ],
  };
  const lib = $("#fnLib");
  if (lib) {
    const filters = $("#fnFilters"), grid = $("#fnGrid");
    const cats = Object.keys(LIB);
    filters.innerHTML = ['<button class="fn-chip is-on" data-cat="all">All (' + cats.reduce((n, c) => n + LIB[c].length, 0) + ')</button>']
      .concat(cats.map((c) => `<button class="fn-chip" data-cat="${c}">${c} (${LIB[c].length})</button>`)).join("");
    function renderLib(cat) {
      const show = cat === "all" ? cats : [cat];
      grid.innerHTML = show.map((c) =>
        `<div class="fn-cat"><h4>${c}</h4>` + LIB[c].map(([fn, meaning, ex]) =>
          `<div class="fn-item"><b>${fn}</b><span>${meaning}</span><em>e.g. ${ex}</em></div>`).join("") + "</div>").join("");
    }
    filters.addEventListener("click", (e) => {
      const chip = e.target.closest(".fn-chip");
      if (!chip) return;
      $$(".fn-chip", filters).forEach((c) => c.classList.toggle("is-on", c === chip));
      renderLib(chip.dataset.cat);
    });
    renderLib("all");
  }

  /* ── 3. "Name the function" challenge: 8 examples × 4 options ── */
  const FNCHAL = [
    ["The heating element inside an electric kettle", ["Provide heat", "Generate heat", "Make water hot", "Boil kettle"], 1,
     "\"Generate heat\": an active verb and a measurable noun. \"Provide\" is a banned verb; \"make water hot\" is three words and vague; \"boil kettle\" names the product, not the job."],
    ["The rubber feet under a laptop", ["Provide stability", "Hold laptop", "Increase friction", "Stop laptop"], 2,
     "\"Increase friction\" is what the rubber physically does, and friction is measurable. \"Provide stability\" uses a banned verb; \"hold laptop\" describes where the part is, not its job; \"stop laptop\" just names the product."],
    ["A car headlight", ["Enable driving", "Emit light", "Provide visibility", "Shine brightly"], 1,
     "\"Emit light\": you can measure it in lumens. \"Enable\" and \"provide\" are banned verbs, and \"shine brightly\" has no noun, so it doesn't say what is being produced."],
    ["The plastic insulation around a mains wire", ["Ensure protection", "Cover wire", "Make wire safe", "Block current"], 3,
     "\"Block current\" is the measurable job: electricity must not pass through it. \"Ensure\" is banned; \"cover wire\" describes the solution's shape; \"make wire safe\" is vague and can't be measured."],
    ["A water bottle cap", ["Seal container", "Cap bottle", "Provide closure", "Keep water inside"], 0,
     "\"Seal container\": a seal can be tested for pressure and leak rate. \"Cap bottle\" uses the part itself as the verb, so it's a solution, not a function. \"Provide closure\" uses a banned verb, and \"keep water inside\" is three words hiding the same job."],
    ["The handle of a hot coffee mug", ["Provide grip", "Help user", "Transmit force", "Hold mug"], 2,
     "The handle's main job is to \"transmit force\": it carries the lifting force from your hand to the mug (it also has a second function, isolate heat). \"Provide\" is banned; \"help user\" can't be measured; \"hold mug\" is the product in disguise."],
    ["The spring inside a retractable ballpoint pen", ["Store energy", "Retract tip", "Provide clicking", "Make pen work"], 0,
     "The spring itself does one job: \"store energy\" (and release it). Retracting the tip is the combined job of the spring and the latch; \"provide clicking\" is banned and describes a side effect; \"make pen work\" is far too vague."],
    ["The high-gloss paint on a luxury car (beyond protecting the metal)", ["Look good", "Impress people", "Convey quality", "Provide beauty"], 2,
     "\"Convey quality\" is the standard esteem function. You can't measure quality with a gauge, so esteem functions are measured with customer research and price premiums. \"Look good\" has no noun, so it doesn't say what is being made attractive; \"impress people\" can't be tested; \"provide beauty\" uses a banned verb."],
  ];
    FNCHAL.forEach(([q, opts, c, why]) => (window.VH_PRACTICE = window.VH_PRACTICE || []).push({ mod: "m4", q: q + ": which is the correctly written function?", opts, c, why }));
  const mount = $("#fncMount");
  if (mount) {
    let answered, score;
    function renderChal() {
      answered = new Array(FNCHAL.length).fill(false); score = 0;
      // options appear in a new order on every attempt, so the right answer isn't always in the same place
      const order = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      mount.innerHTML = FNCHAL.map(([q, opts], qi) => `
        <div class="fnc-item" data-qi="${qi}">
          <div class="fnc-q"><span class="fnc-n">${qi + 1}</span>${q} — which is the correctly written function?</div>
          <div class="fnc-opts">${order(opts.length).map((oi) => `<button type="button" class="fnc-opt" data-oi="${oi}">${opts[oi]}</button>`).join("")}</div>
          <div class="fnc-expl" role="status" aria-live="polite"></div>
        </div>`).join("") +
        `<div class="fnc-score" id="fncScore" role="status" aria-live="polite"></div>
         <div class="fnc-actions"><button type="button" class="btn btn-ghost" id="fncReset" hidden>↻ Try the challenge again</button></div>`;
      $("#fncReset").addEventListener("click", renderChal);
    }
    mount.addEventListener("click", (e) => {
      const btn = e.target.closest(".fnc-opt");
      if (!btn) return;
      const item = btn.closest(".fnc-item");
      const qi = +item.dataset.qi;
      if (answered[qi]) return;
      answered[qi] = true;
      const [, , correct, expl] = FNCHAL[qi];
      const right = +btn.dataset.oi === correct;
      if (right) score++;
      $$(".fnc-opt", item).forEach((o) => {
        o.disabled = true;
        if (+o.dataset.oi === correct) o.classList.add("is-right");
        else if (o === btn) o.classList.add("is-wrong");
      });
      const ex = $(".fnc-expl", item);
      ex.textContent = (right ? "✓ Correct. " : "✗ Not quite. ") + expl;
      ex.className = "fnc-expl show " + (right ? "ok" : "no");
      if (!right && window.VHMistakes) VHMistakes.attach(ex, btn.textContent);
      if (answered.every(Boolean)) {
        const s = $("#fncScore");
        const msg = score === 8 ? "8 out of 8. You think in functions now." : score >= 6 ? "Strong — review the ones you missed and you're there." : "Good practice — re-read section 4.3 on fake functions and try again.";
        s.innerHTML = `You scored <b>${score} / 8</b>. ${msg}`;
        s.classList.add("show");
        $("#fncReset").hidden = false;
      }
    });
    renderChal();
  }
})();


/* ════════ Rotating quotes about Value Engineering (training hero) ════════ */
(function () {
  "use strict";
  const slide = document.getElementById("tqSlide");
  if (!slide) return;
  const QUOTES = [
    ["All cost is for function.", "— Lawrence D. Miles, father of Value Analysis"],
    ["Value analysis is a potent and completely different procedure for accomplishing far greater results.", "— Lawrence D. Miles, General Electric, 1947"],
    ["Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", "— Antoine de Saint-Exupéry"],
    ["Costs do not exist to be calculated. Costs exist to be reduced.", "— Taiichi Ohno, father of the Toyota Production System"],
    ["The customer never buys a product — they buy the job it does.", "— the first principle of function thinking"],
  ];
  const txt = document.getElementById("tqText"), who = document.getElementById("tqWho");
  let i = 0, paused = false;
  const box = document.getElementById("trQuotes");
  box.addEventListener("mouseenter", () => { paused = true; });
  box.addEventListener("mouseleave", () => { paused = false; });
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  setInterval(() => {
    if (paused) return;
    i = (i + 1) % QUOTES.length;
    slide.classList.add("tq-out");
    setTimeout(() => {
      txt.textContent = QUOTES[i][0];
      who.textContent = QUOTES[i][1];
      slide.classList.remove("tq-out");
    }, 450);
  }, 6500);
})();

/* ════════ Academy extras: cert counter · course search · review mode · community ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const cfg = window.VF_CONFIG || {};
  const KEY = "vf-academy";
  const getState = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

  /* ── 1. live certificates-issued counter (social proof) ── */
  if (window.VHCloud && VHCloud.live && VHCloud.certCount) {
    VHCloud.certCount().then((n) => {
      if (!n || n < 1) return;
      const tile = $("#certCountStat");
      if (tile) { $("#certCountNum").textContent = n; tile.hidden = false; }
    });
  }

  /* ── 2. course search across all modules ── */
  const input = $("#courseSearch"), results = $("#searchResults");
  if (input && results) {
    const mods = $$(".tmod").filter((m) => m.dataset.mod !== "exam");
    const index = [];
    mods.forEach((mod) => {
      $$("h3, h4, p, li", mod).forEach((el) => {
        if (el.closest(".qcheck, button, .vo-bar, .fn-challenge, .fast-builder, .fn-lib, .ve-lab, .concept-viz")) return;
        const text = el.textContent.replace(/\s+/g, " ").trim();
        if (text.length > 8) index.push({ mod: mod.dataset.mod, title: mod.dataset.title, el, text, low: text.toLowerCase() });
      });
    });
    function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
    function run(q) {
      q = q.trim().toLowerCase();
      if (q.length < 3) { results.hidden = true; results.innerHTML = ""; return; }
      const hits = index.filter((e) => e.low.includes(q)).slice(0, 8);
      if (!hits.length) { results.innerHTML = '<div class="sr-none">No match — try a shorter word.</div>'; results.hidden = false; return; }
      results.innerHTML = hits.map((h, i) => {
        const at = h.low.indexOf(q);
        const snippet = esc(h.text.slice(Math.max(0, at - 30), at)) + "<mark>" + esc(h.text.substr(at, q.length)) + "</mark>" + esc(h.text.substr(at + q.length, 46));
        return `<button type="button" class="sr-hit" data-i="${i}"><b>${h.title}</b><span>…${snippet}…</span></button>`;
      }).join("");
      results.hidden = false;
      $$(".sr-hit", results).forEach((btn) => btn.addEventListener("click", () => {
        const h = hits[+btn.dataset.i];
        results.hidden = true; input.value = "";
        const link = $(`.mod-link[data-target="${h.mod}"]`);
        if (link) link.click();
        setTimeout(() => {
          try { h.el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
          h.el.classList.add("search-hit");
          setTimeout(() => h.el.classList.remove("search-hit"), 2600);
        }, 350);
      }));
    }
    input.addEventListener("input", () => run(input.value));
    document.addEventListener("click", (e) => { if (!e.target.closest(".course-search-wrap")) results.hidden = true; });
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") { results.hidden = true; input.blur(); } });
  }

  /* ── 3. practice exam + glossary flashcards ──
     Practice questions come from the quick checks and scenario challenges (already on the page),
     never from the real exam bank, which stays on the server. */
  const foot = $(".tr-side-foot");
  if (foot) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn btn-ghost rev-btn"; btn.id = "revBtn";
    btn.textContent = "↻ Practice & flashcards";
    foot.appendChild(btn);
    btn.addEventListener("click", () => openReview("practice"));
  }
  window.VHPractice = { open: () => openReview("practice") };

  const PRACTICE_N = 20;
  const mixUp = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function openReview(tab) {
    if (window.vhTrack) vhTrack("practice-exam");
    const pool = window.VH_PRACTICE || [];
    const terms = window.VH_TERMS || [];
    let modal = $("#revModal");
    if (modal) { if (modal._close) modal._close(); else modal.remove(); }
    const opener = document.activeElement; // focus goes back here on close
    modal = document.createElement("div");
    modal.id = "revModal"; modal.className = "rev-modal";
    modal.innerHTML = `
      <div class="rev-card" role="dialog" aria-modal="true" aria-label="Practice exam and flashcards">
        <button type="button" class="rev-close" aria-label="Close">✕</button>
        <div class="rev-tabs">
          <button type="button" class="rev-tab is-on" data-tab="missed">Practice exam (${Math.min(PRACTICE_N, pool.length)})</button>
          <button type="button" class="rev-tab" data-tab="cards">Flashcards (${terms.length})</button>
        </div>
        <div class="rev-pane" id="revMissed"></div>
        <div class="rev-pane" id="revCards" hidden></div>
      </div>`;
    document.body.appendChild(modal);
    // a proper dialog for keyboard users: focus moves in, Tab stays inside, Escape closes, focus returns
    function onKey(e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      const f = $$("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])", modal).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function close() {
      modal.remove(); document.removeEventListener("keydown", onKey);
      if (opener && opener.focus && document.contains(opener)) opener.focus();
    }
    document.addEventListener("keydown", onKey);
    modal._close = close;
    $(".rev-close", modal).addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    requestAnimationFrame(() => $(".rev-tab.is-on", modal).focus());
    $$(".rev-tab", modal).forEach((t) => t.addEventListener("click", () => {
      $$(".rev-tab", modal).forEach((x) => x.classList.toggle("is-on", x === t));
      $("#revMissed").hidden = t.dataset.tab !== "missed";
      $("#revCards").hidden = t.dataset.tab !== "cards";
    }));
    if (tab === "cards") $('.rev-tab[data-tab="cards"]', modal).click();

    // practice pane: 20 questions from across the course, with the explanation straight away
    const mp = $("#revMissed", modal);
    let set = [], got = 0, done = 0;
    function deal() {
      set = mixUp(pool).slice(0, PRACTICE_N); got = 0; done = 0;
      mp.innerHTML = `<p class="rev-intro">${set.length} questions from across the course, with the answer explained as you go.
        No certificate and no limit: take a new set whenever you like.</p>` +
        set.map((it, n) => `<div class="rev-q" data-n="${n}"><div class="rev-qt">${n + 1}. ${it.q}</div>
          <div class="rev-opts">${mixUp(it.opts.map((o, oi) => oi)).map((oi) => `<button type="button" class="rev-opt" data-oi="${oi}">${it.opts[oi]}</button>`).join("")}</div>
          <p class="rev-why" role="status" aria-live="polite"></p></div>`).join("") +
        `<div class="rev-score" role="status" aria-live="polite"></div>
         <div class="ex-actions"><button type="button" class="btn btn-ghost" id="revNew">↻ New set of questions</button></div>`;
      $("#revNew", mp).addEventListener("click", deal);
    }
    mp.addEventListener("click", (e) => {
      const ob = e.target.closest(".rev-opt");
      if (!ob) return;
      const qEl = ob.closest(".rev-q"), it = set[+qEl.dataset.n];
      if (qEl.classList.contains("is-done")) return;
      qEl.classList.add("is-done"); done++;
      const right = +ob.dataset.oi === it.c;
      if (right) got++;
      $$(".rev-opt", qEl).forEach((o) => {
        o.disabled = true;
        if (+o.dataset.oi === it.c) o.classList.add("is-right");
        else if (o === ob) o.classList.add("is-wrong");
      });
      $(".rev-why", qEl).textContent = (right ? "✓ Correct. " : "✗ Not quite. ") + (it.why || "");
      if (!right && window.VHMistakes) VHMistakes.attach($(".rev-why", qEl), ob.textContent);
      $(".rev-score", mp).textContent = `${got} of ${done} right so far` + (done === set.length ? `: ${Math.round((100 * got) / set.length)}%. The real exam needs 80%.` : "");
    });
    deal();

    // flashcards pane
    const cp = $("#revCards", modal);
    let ci = 0, flipped = false;
    const deck = terms.slice().sort(() => Math.random() - 0.5);
    function renderCard() {
      const [term, def] = deck[ci] || ["—", "—"];
      cp.innerHTML = `
        <div class="fc-card${flipped ? " is-flipped" : ""}" id="fcCard" role="button" tabindex="0" aria-pressed="${flipped}" aria-describedby="fcHint">
          <div class="fc-face fc-front"${flipped ? ' aria-hidden="true"' : ""}><span>${term}</span><em id="fcHint">tap to reveal</em></div>
          <div class="fc-face fc-back"${flipped ? "" : ' aria-hidden="true"'}><span>${def}</span></div>
        </div>
        <div class="fc-nav">
          <button type="button" class="btn btn-ghost" id="fcPrev" ${ci === 0 ? "disabled" : ""}>← Prev</button>
          <span class="fc-count">${ci + 1} / ${deck.length}</span>
          <button type="button" class="btn btn-primary" id="fcNext" ${ci === deck.length - 1 ? "disabled" : ""}>Next →</button>
        </div>`;
      const card = $("#fcCard", cp);
      // the card is named by the face that is showing, so screen readers hear the term, then the definition
      const flip = () => {
        flipped = !flipped; card.classList.toggle("is-flipped", flipped); card.setAttribute("aria-pressed", String(flipped));
        $(".fc-front", card).setAttribute("aria-hidden", String(flipped)); $(".fc-back", card).setAttribute("aria-hidden", String(!flipped));
      };
      card.addEventListener("click", flip);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      $("#fcPrev", cp).addEventListener("click", () => { if (ci > 0) { ci--; flipped = false; renderCard(); } });
      $("#fcNext", cp).addEventListener("click", () => { if (ci < deck.length - 1) { ci++; flipped = false; renderCard(); } });
    }
    renderCard();
  }

  /* ── 4. community discussion (Giscus) — appears once configured ── */
  if (cfg.giscusRepo && cfg.giscusRepoId && cfg.giscusCategory && cfg.giscusCategoryId) {
    const sec = $("#community");
    if (sec) {
      sec.hidden = false;
      const dark = document.documentElement.dataset.theme !== "light";
      const s = document.createElement("script");
      s.src = "https://giscus.app/client.js";
      s.async = true; s.crossOrigin = "anonymous";
      s.setAttribute("data-repo", cfg.giscusRepo);
      s.setAttribute("data-repo-id", cfg.giscusRepoId);
      s.setAttribute("data-category", cfg.giscusCategory);
      s.setAttribute("data-category-id", cfg.giscusCategoryId);
      s.setAttribute("data-mapping", "specific");
      s.setAttribute("data-term", "VE Academy — course discussion");
      s.setAttribute("data-strict", "0");
      s.setAttribute("data-reactions-enabled", "1");
      s.setAttribute("data-input-position", "top");
      s.setAttribute("data-theme", dark ? "transparent_dark" : "light");
      s.setAttribute("data-lang", "en");
      $("#giscusMount").appendChild(s);
      document.addEventListener("vf-themechange", () => {
        const frame = document.querySelector("iframe.giscus-frame");
        if (frame) frame.contentWindow.postMessage({ giscus: { setConfig: { theme: document.documentElement.dataset.theme === "light" ? "light" : "transparent_dark" } } }, "https://giscus.app");
      });
    }
  }
})();

/* ════════ Module labs: TRIZ navigator & idea sprint (m5) · should-cost calculator (m9) · teardown walkthrough (m10) ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── m5 · TRIZ contradiction navigator ── */
  (function () {
    const imp = $("#trizImp"), wor = $("#trizWor"), out = $("#trizOut");
    if (!imp) return;
    const PARAMS = ["Weight", "Strength / stiffness", "Speed / cycle time", "Reliability", "Cost to make", "Ease of assembly"];
    // curated pairs from the classic contradiction matrix, with a concrete idea each
    const M = {
      "Strength / stiffness|Weight": [[1, "Segmentation", "divide it into parts: a truss or lattice instead of a solid section"], [40, "Composite materials", "glass-filled polymer instead of solid metal"], [15, "Dynamics", "stiff only where and when the load is — variable wall thickness"]],
      "Weight|Strength / stiffness": [[28, "Replace mechanical system", "replace a mechanical part with a field: a magnetic catch instead of a heavy latch"], [27, "Cheap short-lived object", "a light, replaceable insert takes the wear instead of a heavy permanent part"], [18, "Mechanical vibration", "tune the structure's natural frequency so a lighter section survives the real loads"], [40, "Composite materials", "glass- or carbon-fibre composite: strong for its weight"]],
      "Speed / cycle time|Reliability": [[10, "Preliminary action", "pre-position, pre-heat or pre-assemble before the fast step"], [11, "Cushion in advance", "add a self-check or backup so speed can't cause a failure"], [28, "Replace mechanical system", "sensor + servo instead of a rushed mechanical linkage"]],
      "Reliability|Cost to make": [[6, "Universality", "one part doing two jobs fails in fewer interfaces"], [25, "Self-service", "the part maintains itself — self-locking, self-cleaning"], [2, "Taking out", "remove the fragile function from the harsh zone entirely"]],
      "Cost to make|Reliability": [[27, "Cheap short-lived object", "a replaceable £0.10 wear insert instead of a £5 hardened part"], [1, "Segmentation", "isolate the wear zone into a small replaceable element"], [35, "Parameter change", "cheaper grade plus a local coating where it matters"]],
      "Cost to make|Strength / stiffness": [[1, "Segmentation", "stamped and folded sheet replaces a machined billet"], [40, "Composite materials", "over-mould a cheap core with a strong skin"], [10, "Preliminary action", "work-harden or form features in the same press stroke"]],
      "Ease of assembly|Reliability": [[13, "The other way round", "assemble from the other direction — gravity holds it"], [26, "Copying", "one snap-fit geometry copied everywhere: nothing to mix up"], [3, "Local quality", "add a lead-in chamfer — the part aligns itself"]],
      "Ease of assembly|Cost to make": [[6, "Universality", "one fastener family for the whole product"], [1, "Segmentation", "modules assembled offline, mated in one motion"], [2, "Taking out", "eliminate the fastener: a snap-fit gets close, and one moulding instead of two is the ideal result"]],
      "Weight|Cost to make": [[35, "Parameter change", "thinner high-strength grade — less material at slightly higher £/kg"], [2, "Taking out", "delete the part: can a neighbour perform its function?"], [31, "Porous materials", "foamed core where solid adds only weight"]],
      "Speed / cycle time|Cost to make": [[10, "Preliminary action", "combine operations into one tool stroke"], [5, "Merging", "process parts in parallel, not sequence"], [28, "Replace mechanical system", "cure with UV instead of a 20-minute oven"]],
      "Strength / stiffness|Cost to make": [[3, "Local quality", "harden or thicken only the loaded zone"], [17, "Another dimension", "a bend or flange adds stiffness for free"], [40, "Composite materials", "selective reinforcement only along the load path"]],
      "Reliability|Weight": [[11, "Cushion in advance", "small redundant element instead of oversizing everything"], [3, "Local quality", "reinforce the failure point only"], [24, "Intermediary", "sacrificial element takes the abuse"]],
    };
    const FALLBACK = [[1, "Segmentation", "divide the part or process and treat each piece separately"], [2, "Taking out", "remove the troublesome property or part from the zone"], [10, "Preliminary action", "do part of the job before it's needed"], [35, "Parameter change", "change a material property, state or concentration"]];
    PARAMS.forEach((p) => { imp.add(new Option(p, p)); wor.add(new Option(p, p)); });
    imp.value = "Strength / stiffness"; wor.value = "Weight";
    function show() {
      if (imp.value === wor.value) {
        out.innerHTML = '<p class="triz-same">Improving and worsening the <em>same</em> parameter isn\'t a contradiction — pick two different ones.</p>';
        out.hidden = false; return;
      }
      const rec = M[imp.value + "|" + wor.value] || FALLBACK;
      const generic = !M[imp.value + "|" + wor.value];
      out.innerHTML = (generic ? '<p class="triz-note">No curated cell for this exact pair — these four universal principles resolve most contradictions:</p>' : "") +
        rec.map((r) => `<div class="triz-p"><span class="triz-n">${r[0]}</span><div><b>${r[1]}</b><p>${r[2]}</p></div></div>`).join("");
      out.hidden = false;
    }
    imp.addEventListener("change", show);
    wor.addEventListener("change", show);
    show();
  })();

  /* ── m5 · three-minute idea sprint ── */
  (function () {
    const go = $("#sprintGo"), clock = $("#sprintClock"), count = $("#sprintCount"),
      pad = $("#sprintPad"), verdict = $("#sprintVerdict"), fnSel = $("#sprintFn");
    if (!go) return;
    ["Transmit torque", "Contain fluid", "Conduct current", "Protect contents", "Position panel", "Dissipate heat"]
      .forEach((f) => fnSel.add(new Option(f, f)));
    let t = null, left = 180;
    const ideas = () => pad.value.split("\n").map((l) => l.trim()).filter((l) => l.length > 2).length;
    const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    function tick() {
      left--; clock.textContent = fmt(left);
      if (left <= 30) clock.classList.add("is-low");
      if (left <= 0) stop();
    }
    function stop() {
      clearInterval(t); t = null;
      pad.disabled = true;
      go.textContent = "▶ Start 3:00";
      const n = ideas();
      verdict.hidden = false;
      verdict.innerHTML = n >= 9
        ? `<b>${n} ideas in three minutes.</b> You're writing faster than you're judging, which is the point. Now imagine six people doing this.`
        : n >= 5
          ? `<b>${n} ideas: solid.</b> The last few before the buzzer are often the most original. Run it again on the same function and you'll pass nine.`
          : `<b>${n} ideas.</b> Normal for a first sprint — you're still judging your own ideas. Rules: no judging, no deleting, write the silly ones too.`;
    }
    go.addEventListener("click", () => {
      if (t) { stop(); return; }
      left = 180; clock.textContent = fmt(left); clock.classList.remove("is-low");
      verdict.hidden = true; pad.disabled = false; pad.value = ""; pad.focus();
      count.textContent = "0 ideas";
      go.textContent = "■ Stop early";
      t = setInterval(tick, 1000);
    });
    pad.addEventListener("input", () => { count.textContent = ideas() + (ideas() === 1 ? " idea" : " ideas"); });
  })();

  /* ── m9 · live should-cost calculator ── */
  (function () {
    const rows = $("#scRows");
    if (!rows) return;
    const F = ["scMass", "scYield", "scMat", "scCycle", "scRate", "scOps", "scWage", "scScrap", "scOh", "scSga", "scMargin", "scQuote", "scVol"]
      .reduce((o, id) => (o[id] = $("#" + id), o), {});
    const eur = (v) => "£" + v.toFixed(2);
    const COLORS = ["#5aa2ff", "#7ec4ff", "#34d399", "#fbbf24", "#f59e0b", "#a78bfa", "#f472b6"];
    function calc() {
      const v = (id) => Math.max(0, parseFloat(F[id].value) || 0);
      const yieldPc = Math.min(100, Math.max(1, v("scYield")));
      const mat = (v("scMass") / (yieldPc / 100)) * v("scMat");
      const proc = (v("scCycle") / 3600) * v("scRate");
      const lab = (v("scCycle") / 3600) * v("scOps") * v("scWage");
      const scrap = (mat + proc + lab) * v("scScrap") / 100;
      const oh = (mat + proc + lab + scrap) * v("scOh") / 100;
      const sub = mat + proc + lab + scrap + oh;
      const sga = sub * v("scSga") / 100;
      const margin = (sub + sga) * v("scMargin") / 100;
      const total = sub + sga + margin;
      const layers = [["Raw material", mat], ["Process & machine", proc], ["Direct labour", lab], ["Scrap", scrap], ["Overhead", oh], ["SG&A", sga], ["Fair margin", margin]];
      rows.innerHTML = layers.map((l, i) =>
        `<tr><td><i class="sc-dot" style="background:${COLORS[i]}"></i>${l[0]}</td><td>${eur(l[1])}</td></tr>`).join("");
      $("#scTotal").textContent = eur(total);
      $("#scBar").innerHTML = total > 0 ? layers.map((l, i) =>
        `<i style="width:${(l[1] / total * 100).toFixed(1)}%;background:${COLORS[i]}" title="${l[0]} ${eur(l[1])}"></i>`).join("") : "";
      const q = v("scQuote"), vol = v("scVol"), gap = q - total, gapEl = $("#scGap");
      if (q <= 0) { gapEl.innerHTML = ""; return; }
      if (gap > 0.005) {
        const pc = (gap / total * 100).toFixed(0);
        gapEl.className = "sc-gap sc-gap-over";
        gapEl.innerHTML = `Quote ${eur(q)} vs should-cost <b>${eur(total)}</b> → gap <b>${eur(gap)}</b> per part (${pc}% above should).` +
          (vol > 0 ? ` At ${vol.toLocaleString("en-GB")} parts a year, that's up to <b>£${Math.round(gap * vol).toLocaleString("en-GB")}</b> a year to discuss.` : "");
      } else {
        gapEl.className = "sc-gap sc-gap-ok";
        gapEl.innerHTML = `Quote ${eur(q)} is at or below the should-cost of <b>${eur(total)}</b>. Either your buyer is excellent or one of your assumptions is wrong. Check how busy you've assumed the machine is first.`;
      }
    }
    Object.values(F).forEach((el) => el.addEventListener("input", calc));
    calc();
  })();

  /* ── m7 · business-case builder ── */
  (function () {
    const cards = $("#bcCards");
    if (!cards) return;
    const F = ["bcSave", "bcVol", "bcTool", "bcTest", "bcEng", "bcRate", "bcDelay", "bcLife"]
      .reduce((o, id) => (o[id] = $("#" + id), o), {});
    const gbp = (v) => "£" + Math.round(v).toLocaleString("en-GB");
    function calc() {
      const v = (id) => Math.max(0, parseFloat(F[id].value) || 0);
      const annual = v("bcSave") * v("bcVol");
      const oneTime = v("bcTool") + v("bcTest") + v("bcEng") * v("bcRate");
      const delayM = v("bcDelay"), lifeY = Math.max(0.1, v("bcLife"));
      const payback = annual > 0 ? (oneTime / annual) * 12 : Infinity;
      const harvestY = Math.max(0, lifeY - delayM / 12);
      const lifetimeNet = annual * harvestY - oneTime;
      const delayCost = annual / 12;
      cards.innerHTML = [
        [gbp(annual) + "/yr", "gross annual saving"],
        [gbp(oneTime), "one-time cost: tooling + testing + engineering"],
        [isFinite(payback) ? payback.toFixed(1) + " mo" : "—", "payback, from implementation"],
        [gbp(lifetimeNet), "lifetime net saving over " + harvestY.toFixed(1) + " years of savings"],
      ].map((c) => `<div class="bc-card"><b>${c[0]}</b><span>${c[1]}</span></div>`).join("");
      const verdict = $("#bcVerdict");
      if (annual <= 0) {
        verdict.className = "bc-verdict bc-no";
        verdict.innerHTML = "No saving, no case. Every business case starts with a per-unit saving and a volume.";
      } else if (payback <= 12 && lifetimeNet > 0) {
        verdict.className = "bc-verdict bc-go";
        verdict.innerHTML = `<b>Ready for the board.</b> Payback in ${payback.toFixed(1)} months is within the 12-month limit for production
          changes, and the proposal nets ${gbp(lifetimeNet)} over the product's remaining life. Every month of delay
          still costs ${gbp(delayCost)}, so set a date and get going.`;
      } else if (payback <= 24 && lifetimeNet > 0) {
        verdict.className = "bc-verdict bc-mid";
        verdict.innerHTML = `<b>Borderline.</b> ${payback.toFixed(1)} months payback is over the usual 12-month limit for a
          production change. Cut the one-time cost, combine it with related changes to share the testing cost, or save
          it for the next planned design update.`;
      } else {
        verdict.className = "bc-verdict bc-no";
        verdict.innerHTML = `<b>Not worth doing as a production change.</b> ${isFinite(payback) ? "Payback of " + payback.toFixed(1) + " months " : "This cost structure "}
          ${lifetimeNet <= 0 ? "never returns the one-time cost within the product's remaining life" : "is far over any normal limit"}.
          Park it as a requirement for the next-generation design, when new tooling is being bought anyway.`;
      }
    }
    Object.values(F).forEach((el) => el.addEventListener("input", calc));
    calc();
  })();

  /* ── m10 · teardown walkthrough stepper ── */
  (function () {
    const stage = $("#tdStage");
    if (!stage) return;
    const cap = $("#tdCaption"), dots = $("#tdDots"), next = $("#tdNext"), prev = $("#tdPrev");
    const STEPS = [
      { t: "Two mice on the bench — the competitor's next to yours. Nothing has been touched yet; the first move is a camera, not a screwdriver.",
        cards: [["🖱️", "Theirs", "£24 retail"], ["🖱️", "Ours", "£29 retail"]] },
      { t: "Step 1: record it. Photograph, weigh and measure everything before the first screw comes out. You only get one first teardown.",
        cards: [["📷", "48 photos", "every face, every label"], ["⚖️", "87 g vs 112 g", "theirs is 22% lighter"], ["📏", "Dimensions logged", "against a scale reference"]] },
      { t: "Step 2: take it apart, level by level, with a stopwatch. The time it takes is a clue to their assembly cost.",
        cards: [["⏱", "48 s to open", "ours takes 92 s"], ["🔩", "2 screws", "ours has 6 + 2 clip types"], ["🧩", "Snap-fit chassis", "one moulding holds everything"]] },
      { t: "Step 3: record every part. Log each one: material, mass, process evidence, supplier marks, fastener count.",
        cards: [["📋", "9 parts vs 14", "five fewer things to buy, fit and fail"], ["🏷", "PCB supplier mark", "same board house as our B-supplier"], ["🔧", "Tool marks", "2-cavity mould, set up for medium volumes"]] },
      { t: "Step 4: should-cost each part using THEIR assumptions: their region, their volumes, their processes. Give every estimate a range. Differences are reliable even when exact figures aren't, as long as both sides are costed the same way.",
        cards: [["💷", "Their BOM ≈ £3.10", "estimate, ±15%"], ["💷", "Our BOM ≈ £4.60", "same method, same bands"], ["Δ", "Top shell −£0.60", "biggest difference on one part"]] },
      { t: "Step 5: turn findings into ideas. Findings become Creative phase ideas with owners and dates. That's the difference between a real teardown and teardown tourism.",
        cards: [["💡", "Snap-fit chassis", "copy it: remove 4 screws"], ["💡", "Single-screw service path", "adapt to our architecture"], ["🧱", "Cost walk: −£1.50", "design −0.9 · sourcing −0.4 · assembly −0.2"]] },
    ];
    let s = 0;
    dots.innerHTML = STEPS.map((_, i) => `<i data-d="${i}"></i>`).join("");
    function render() {
      const st = STEPS[s];
      stage.innerHTML = st.cards.map((c, i) =>
        `<div class="td-card td-in" style="animation-delay:${i * 0.12}s"><span class="td-ico">${c[0]}</span><b>${c[1]}</b><small>${c[2]}</small></div>`).join("");
      cap.textContent = st.t;
      $$("#tdDots i").forEach((d, i) => d.classList.toggle("is-on", i <= s));
      prev.disabled = s === 0;
      next.textContent = s === 0 ? "Begin the teardown →" : s === STEPS.length - 1 ? "↺ Replay" : "Next step →";
    }
    next.addEventListener("click", () => { s = s === STEPS.length - 1 ? 0 : s + 1; render(); });
    prev.addEventListener("click", () => { if (s > 0) { s--; render(); } });
    render();
  })();
})();


/* ════════ Module 5 & 6 rebuild interactives: SCAMPER · technique challenges · weighted-matrix sandbox ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── shared challenge builder (mirrors the Module-4 FNCHAL pattern) ── */
    function buildChallenge(mountSel, questions, closingMsg) {
    const chMod = (mountSel.match(/#(m\d+)/) || [])[1] || "";
    questions.forEach(([q, opts, c, why]) => (window.VH_PRACTICE = window.VH_PRACTICE || []).push({ mod: chMod, q, opts, c, why })); // practice exam pool
    const mount = $(mountSel);
    if (!mount) return;
    let answered, score;
    const N = questions.length;
    function render() {
      answered = new Array(N).fill(false); score = 0;
      // options appear in a new order on every attempt, so the right answer isn't always in the same place
      const order = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      mount.innerHTML = questions.map(([q, opts], qi) => `
        <div class="fnc-item" data-qi="${qi}">
          <div class="fnc-q"><span class="fnc-n">${qi + 1}</span>${q}</div>
          <div class="fnc-opts">${order(opts.length).map((oi) => `<button type="button" class="fnc-opt" data-oi="${oi}">${opts[oi]}</button>`).join("")}</div>
          <div class="fnc-expl" role="status" aria-live="polite"></div>
        </div>`).join("") +
        `<div class="fnc-score" role="status" aria-live="polite"></div>
         <div class="fnc-actions"><button type="button" class="btn btn-ghost fncReset" hidden>↻ Try the challenge again</button></div>`;
      $(".fncReset", mount).addEventListener("click", render);
    }
    mount.addEventListener("click", (e) => {
      const btn = e.target.closest(".fnc-opt");
      if (!btn) return;
      const item = btn.closest(".fnc-item");
      const qi = +item.dataset.qi;
      if (answered[qi]) return;
      answered[qi] = true;
      const [, , correct, expl] = questions[qi];
      const right = +btn.dataset.oi === correct;
      if (right) score++;
      $$(".fnc-opt", item).forEach((o) => {
        o.disabled = true;
        if (+o.dataset.oi === correct) o.classList.add("is-right");
        else if (o === btn) o.classList.add("is-wrong");
      });
      const ex = $(".fnc-expl", item);
      ex.textContent = (right ? "✓ Correct. " : "✗ Not quite. ") + expl;
      ex.className = "fnc-expl show " + (right ? "ok" : "no");
      if (!right && window.VHMistakes) VHMistakes.attach(ex, btn.textContent);
      if (answered.every(Boolean)) {
        const s = $(".fnc-score", mount);
        const msg = score === N ? "Full marks. You've got the judgement as well as the terms." : score >= N - 2 ? "Strong — review the ones you missed and you're there." : closingMsg;
        s.innerHTML = `You scored <b>${score} / ${N}</b>. ${msg}`;
        s.classList.add("show");
        $(".fncReset", mount).hidden = false;
      }
    });
    render();
  }

  /* ── 0 · toggle buttons announce their state (they follow the visual "is-on" class) ── */
  document.querySelectorAll(".role-chip").forEach((btn) => {
    const sync = () => btn.setAttribute("aria-pressed", String(btn.classList.contains("is-on")));
    sync(); new MutationObserver(sync).observe(btn, { attributes: true, attributeFilter: ["class"] });
  });

  /* ── 1 · SCAMPER explorer (Module 5) ── */
  (function () {
    const row = $("#scamperRow"), panel = $("#scamperPanel");
    if (!row) return;
    const SC = [
      ["S", "Substitute", "What could you swap out — the material, a part, the energy source, the process?",
       "Swap the machined aluminium body for a glass-filled nylon moulding: two-thirds lighter, a third of the cost, and colour moulded in so no anodising step."],
      ["C", "Combine", "What if two parts, features or steps became one?",
       "Combine the reflector and the lens into a single moulded optic — one part instead of two, and no alignment step on the line."],
      ["A", "Adapt", "Who else has solved this? What can you borrow from another product or industry?",
       "Adapt the bayonet mount from a camera lens so the head twists on in a quarter-turn — no threads to cross-thread, faster assembly."],
      ["M", "Modify / Magnify", "What if you made a feature bigger, smaller, or changed its shape?",
       "Magnify the knurling into a full-length grip pattern that doubles as the heat sink — better hold and better cooling from one feature."],
      ["P", "Put to other use", "Could the part do a second job, or serve a different user?",
       "Put the tail-cap to other use as a magnetic base, so the torch sticks to a car bonnet hands-free — new function, near-zero cost."],
      ["E", "Eliminate", "What if this part simply didn't exist? Which neighbour could do its job?",
       "Eliminate the separate on/off switch: a twist of the head completes the circuit. One fewer part, one fewer seal, one fewer thing to fail. (The strongest SCAMPER move in VE.)"],
      ["R", "Reverse", "What if you flipped the order, turned it inside out, or ran it backwards?",
       "Reverse the battery loading — load from the front behind the head instead of the tail — so the tail becomes a solid sealed grip and waterproofing gets easier."],
    ];
    row.innerHTML = SC.map(([l, name], i) =>
      `<button type="button" class="scamper-key${i === 0 ? " is-on" : ""}" data-i="${i}"><b>${l}</b><span>${name}</span></button>`).join("");
    function show(i) {
      const [l, name, q, ex] = SC[i];
      $$(".scamper-key", row).forEach((k) => { k.classList.toggle("is-on", +k.dataset.i === i); k.setAttribute("aria-pressed", String(+k.dataset.i === i)); });
      panel.innerHTML = `<div class="sc-letter">${l}</div><div class="sc-body"><h5>${name}</h5><p class="sc-q">${q}</p><p class="sc-ex"><b>On the torch →</b> ${ex}</p></div>`;
    }
    row.addEventListener("click", (e) => { const k = e.target.closest(".scamper-key"); if (k) show(+k.dataset.i); });
    show(0);
  })();

  /* ── 2 · Module 5 technique challenge ── */
  buildChallenge("#m5ChalMount", [
    ["Your team keeps proposing small tweaks to the current bracket instead of fresh concepts. What's the fix?",
     ["Brainstorm the function, not the part", "Bring in senior engineers who know the bracket", "Give everyone a week to think it over first", "Show the current drawing so ideas stay realistic"], 0,
     "The existing part anchors everyone. Name the function ('support load'), hide the current design, and all the options open up again."],
    ["Two people dominate every brainstorm and the quiet experts never get a word in. Best technique?",
     ["Brainstorming with a firmer chair", "Silent brainwriting (6-3-5)", "An open vote on each idea", "Ask the two talkers to hold back"], 1,
     "6-3-5 is silent and written: everyone writes three ideas per round, so the loudest voice and the quietest expert get the same space."],
    ["You're stuck on 'make it stiffer, but it keeps getting heavier'. Which tool is built for exactly this?",
     ["SCAMPER, one letter at a time", "Morphological analysis", "TRIZ contradiction matrix", "Brainwriting 6-3-5"], 2,
     "'Improve A, worsen B' is a textbook technical contradiction. TRIZ's matrix returns the inventive principles that have resolved it before."],
    ["The flow has dried up and the room is tired, but you still need twenty more ideas. What keeps the ideas coming?",
     ["Run SCAMPER letter by letter", "Switch to a weighted matrix", "Vote on the best ideas so far", "Break for lunch and restart"], 0,
     "SCAMPER is a checklist (Substitute, Combine, Adapt and so on) that keeps producing ideas when people have run dry. Sorting and voting belong to the Evaluation phase."],
    ["A torch has three sub-functions with several options each, and you want to check every combination, including ones nobody on the team has thought of. Which technique?",
     ["Morphological analysis", "Classic brainstorming", "A Pugh matrix against the current torch", "The TRIZ contradiction matrix"], 0,
     "Morphological analysis lists every option for each sub-function and combines them systematically, so untried combinations come to the surface."],
    ["Someone says 'make the bracket out of cardboard' and the room laughs. What should the facilitator do?",
     ["Write it down without comment", "Explain why it can't work", "Ask them to suggest something realistic", "Move on quickly to keep the energy up"], 0,
     "Hold back all judgement. Wild ideas widen the search: 'cardboard bracket' leads to 'how much load does this really see?', which finds the real weight saving."],
    ["You want to deliver 'contain fluid' at a tenth of today's cost. Where do you look first?",
     ["Other industries and nature", "The internal cost database", "The current supplier's cost breakdown", "Last year's VE study on the same part"], 0,
     "Analogy and biomimicry borrow solutions from other industries and from nature. A drinks carton contains fluid for pennies."],
    ["The boss shares their favourite idea first and the room's thinking narrows around it. What went wrong?",
     ["Nothing: leaders should set the direction", "Anchoring: the boss should speak last", "The session needed a warm-up exercise first", "Too few ideas were on the board by then"], 1,
     "Whatever the senior person says first shapes how everyone else thinks. In idea generation, the most senior person speaks last."],
  ], "Worth a second go. Re-read section 5.2 on Osborn's rules and 5.11 on the order of the tools, then try again.");

  /* ── 3 · Module 6 weighted-matrix sandbox ── */
  (function () {
    const wrap = $("#wmWeights"), table = $("#wmTable"), note = $("#wmNote");
    if (!wrap) return;
    const CRIT = [
      { key: "sav", label: "Net savings", w: 40 },
      { key: "risk", label: "Low technical risk", w: 30 },
      { key: "speed", label: "Fast to implement", w: 20 },
      { key: "inv", label: "Low investment", w: 10 },
    ];
    const CONCEPTS = [
      { name: "Spline shaft", s: [8, 7, 9, 8] },
      { name: "Integrated forging", s: [9, 4, 3, 4] },
      { name: "Plastic overmould", s: [9, 5, 6, 5] },
      { name: "Polygon shaft", s: [7, 8, 8, 7] },
    ];
    const DEFAULT_WINNER = "Spline shaft";
    wrap.innerHTML = CRIT.map((c, i) =>
      `<label class="wm-w"><span>${c.label}</span>
        <input type="range" min="0" max="100" step="5" value="${c.w}" data-i="${i}" />
        <b class="wm-pct" data-i="${i}">${c.w}%</b></label>`).join("");
    function calc() {
      const raw = CRIT.map((_, i) => +$(`input[data-i="${i}"]`, wrap).value);
      const sum = raw.reduce((a, b) => a + b, 0) || 1;
      CRIT.forEach((_, i) => { $(`.wm-pct[data-i="${i}"]`, wrap).textContent = Math.round(raw[i] / sum * 100) + "%"; });
      const scored = CONCEPTS.map((c) => ({
        name: c.name, s: c.s,
        total: c.s.reduce((acc, v, i) => acc + v * raw[i], 0) / sum,
      })).sort((a, b) => b.total - a.total);
      const best = scored[0].total;
      table.innerHTML =
        `<thead><tr><th>Concept</th>${CRIT.map((c) => `<th>${c.label.replace("Low ", "").replace("Fast to i", "I").replace("Net s", "S")}</th>`).join("")}<th>Score</th></tr></thead>` +
        "<tbody>" + scored.map((c, r) =>
          `<tr class="${r === 0 ? "wm-win" : ""}"><td>${c.name}${r === 0 ? " 🏆" : ""}</td>${c.s.map((v) => `<td>${v}</td>`).join("")}<td><b>${c.total.toFixed(2)}</b></td></tr>`).join("") +
        "</tbody>";
      if (scored[0].name !== DEFAULT_WINNER) {
        note.className = "wm-note wm-flip";
        note.innerHTML = `⚠ Winner changed to <b>${scored[0].name}</b> (was ${DEFAULT_WINNER} at the default weights). If the ranking changes when you adjust a weight slightly, the decision depends on how much risk you'll accept. <b>Tell the sponsor, don't hide it.</b>`;
      } else {
        note.className = "wm-note";
        note.innerHTML = `At these weights the winner is <b>${scored[0].name}</b> (${best.toFixed(2)}). Drag <em>Net savings</em> up and the other weights down, and watch a riskier, higher-saving concept overtake it.`;
      }
    }
    wrap.addEventListener("input", calc);
    calc();
  })();

  /* ── 4 · Module 6 evaluation challenge ── */
  buildChallenge("#m6ChalMount", [
    ["You have 380 raw ideas from the creative day. What's the very first move?",
     ["Deep-analyse every single one", "Fast triage into go / grow / park", "Let the chief engineer pick favourites", "Build the top three immediately"], 1,
     "Never deep-study 380 ideas: you'll stall by idea 60. The first pass is fast and shallow: go, grow or park, a few seconds each."],
    ["An idea saves £3 per unit but breaks a homologation rule. What do you do with it?",
     ["Screen it out before any scoring starts", "Score it, with a low mark for risk", "Keep it in and let the weights decide", "Hand it to a champion to find a way round"], 0,
     "Safety and regulatory compliance are must-pass checks, not scored criteria. No saving can be traded against them, so the idea is out."],
    ["Your weighted matrix uses BOTH 'annual savings' and 'payback period' as criteria. What's the problem?",
     ["Nothing: more criteria are fairer", "It counts the same money twice", "Payback needs more weight", "Too few criteria overall"], 1,
     "Both criteria measure money, so money is counted twice and dominates unfairly. Pick one and pair it with investment."],
    ["Early concepts are too foggy to score honestly on a 1–9 scale. Which tool fits?",
     ["A Pugh matrix against a datum design", "A weighted matrix with rough scores", "An effort–impact grid scored to one decimal place", "A paired comparison of the concepts' costs"], 0,
     "When exact scores would only be guesses, Pugh compares each concept with a datum as better, same or worse. That's honest and fast."],
    ["A tiny change to one criterion's weight flips your top-ranked concept. What should you do?",
     ["Report the sensitivity to the sponsor", "Hide it and keep the original winner", "Average the two rankings and pick the top one", "Remove the criterion that caused the flip"], 0,
     "A winner that flips on a small weight change means the choice depends on how much risk you'll accept. The sponsor needs to discuss that, so don't hide it."],
    ["When should the evaluation criteria be fixed?",
     ["After seeing the idea list", "Before anyone sees the ideas", "During the final vote", "Once the first ideas are scored"], 1,
     "Criteria chosen after the ideas appear get bent towards someone's favourite. Agree them with the sponsor before the list is revealed."],
    ["You want to separate quick wins from money pits in about ten minutes. Which tool?",
     ["A full FMEA on each idea", "The effort–impact grid", "A weighted matrix with five criteria", "A Pugh matrix against the datum"], 1,
     "The effort–impact grid is the quick first ranking. High impact and low effort are quick wins. Low impact and high effort are money pits: drop them, and record why."],
    ["Evaluation is done and the ideas are ranked. What must every survivor leave with?",
     ["A named champion and a gate date", "A budget code and a list of the team who proposed it", "A patent search on the main idea", "A second score from a different panel"], 0,
     "Ideas handed to 'the team' reappear untouched next year. Every survivor needs one named champion to carry it into development, plus a date."],
  ], "Worth a second go. Re-read sections 6.2–6.7 on the funnel and the ranking tools, then try again.");

  /* ── 5 · Module 10 teardown challenge ── */
  buildChallenge("#m10ChalMount", [
    ["The competitor units just arrived at the lab. What happens first?",
     ["Remove the fasteners while enthusiasm is high", "Photograph, weigh and measure everything", "Should-cost the visible parts", "Send parts to suppliers for quotes"], 1,
     "You get one first teardown. Record every state before changing it: the photo archive settles every argument the study will face."],
    ["Why record how long each step of the disassembly takes?",
     ["It hints at their assembly cost", "To bill the lab hours correctly", "To prove their product is lower quality", "To check the product meets its repair rules"], 0,
     "A product that comes apart in 48 seconds probably went together quickly. One that takes 92 seconds and three tool changes almost certainly cost more to assemble. Treat the time as a clue, then estimate assembly time properly with a DFA method."],
    ["When should-costing the competitor's parts, whose assumptions do you use?",
     ["Their likely region, volumes and processes", "Your own region and volumes, for a fair comparison", "Whichever set gives the bigger saving", "Published industry averages for each process"], 0,
     "Cost their parts at their assumptions, using evidence from the parts themselves. Then compare: differences stay reliable when exact figures don't, as long as both sides are costed the same way."],
    ["Their hinge costs £1.10 ±15% and yours £2.30 ±15%. What can you conclude?",
     ["The numbers are too uncertain to use", "A real gap exists: investigate it", "Their hinge is probably lower quality: check it first", "Ask your supplier to match £1.10"], 1,
     "Even at the worst ends of both bands (about £1.27 against £1.96), a large gap remains. Differences are reliable even when exact figures aren't."],
    ["A friendly shared supplier offers you the competitor's part drawings. You should:",
     ["Refuse the drawings and say why", "Accept: it saves weeks of work", "Look, but keep them out of the report", "Ask for a summary instead"], 0,
     "That's the clearest limit of all. Open-market teardown is lawful; someone else's confidential documents are not, and using them taints the whole study."],
    ["The teardown found their clever snap-fit chassis. It's patented. What can you do?",
     ["Copy it: patents don't cover internal parts", "Study it, then license or design around it", "Nothing: you can't even study a patented idea", "Copy it, then apply for your own patent"], 1,
     "Patents are public documents you should read. Learning from them is free; copying needs a licence or a design-around. Involve your lawyers when you adopt an idea, not when you analyse it."],
    ["Your teardown produced a beautiful 80-page report and nothing else. What went wrong?",
     ["The findings never became ideas", "Nothing: the report is the deliverable", "The report went to too few people", "The parts weren't costed in enough detail"], 0,
     "That's teardown tourism. The bench work is finished only when the differences become Creative-phase ideas with owners, dates and a place in the savings funnel."],
    ["A rival's product is 20% cheaper at retail. What does that alone prove about their cost?",
     ["Almost nothing on its own", "They build it 20% cheaper", "Their margin is 20% lower", "Their parts are 20% cheaper"], 0,
     "Price alone tells you very little: they might be selling at a loss to win market share, or taking a smaller margin. That's why benchmarking looks at six dimensions together: cost, functional, design, process, feature and patent/IP."],
  ], "Worth a second go. Re-read sections 10.3–10.7 on the five steps and 10.11 on the limits, then try again.");

  /* ── 6 · Modules 1–3 foundations challenge ── */
  buildChallenge("#m3ChalMount", [
    ["Marketing calls a product 'too expensive to build'. The VE translation is:",
     ["Its functions cost more than they're worth", "The price is set too low for the market it's in", "Every part needs the same 10% cost cut", "The costliest part should be cut first"], 0,
     "The market caps the price, and your design choices set the cost. Put the complaint in terms of functions and cost, and it becomes an engineering problem you can solve."],
    ["A rival's kettle has identical functions to yours but costs £2.60 less to make. In VE terms, your kettle has:",
     ["Lower value", "Lower quality", "Higher esteem value", "A pricing problem, not an engineering one"], 0,
     "Value = Function ÷ Cost. The same function at a higher cost is lower value, and the rival's kettle proves the gap can be closed."],
    ["Someone proposes deleting the brushed-metal finish customers love, to save £0.80. Which value type is being ignored?",
     ["Use value", "Esteem value", "Exchange value", "Cost value"], 1,
     "Esteem value is real value: customers pay for how a product looks and feels. Ask whether the finish is worth more to customers than it costs. If it is, it stays."],
    ["Your VE study kicks off Monday but the BOM costs are still 'roughly right'. What happens?",
     ["The team argues about the numbers", "Nothing: precision comes later", "Finance corrects the figures afterwards", "The facilitator estimates costs live"], 0,
     "If finance hasn't checked the starting cost, the workshop becomes an argument about the baseline instead of the product. You can't start without a costed parts list checked by finance."],
    ["The only trained facilitator available is also the project's cost engineer. What's the main risk?",
     ["They may steer ideas towards their own views", "They won't understand the product well enough", "Finance won't accept a facilitator's figures", "The workshop will take longer than planned"], 0,
     "A facilitator runs the process but doesn't supply the answers. Someone with a stake in the costs can steer the room without meaning to. Agree up front that someone else speaks for the cost data, or borrow a facilitator from another team."],
    ["Your team has design, manufacturing and purchasing. Which addition matters most for the savings to be believed?",
     ["Someone from finance", "A second design engineer", "A marketing manager", "An outside consultant"], 0,
     "Finance checks the starting cost and the savings. Without them in the room from day one, nobody believes the numbers later."],
    ["The loudest stakeholder insists 'customers absolutely need this feature'. In the Information phase, you should:",
     ["Check the evidence behind the claim", "Add it to the spec to avoid a row", "Overrule them so the study can move on", "Defer to the most senior person present"], 0,
     "Requirements should rest on evidence, such as usage data, the Kano category and warranty returns, not on who is loudest. That evidence settles in minutes what people would otherwise argue about for hours."],
    ["Where is most of the cost you can remove?",
     ["In the secondary functions", "In the basic function", "In the supplier's profit margin", "In packaging and freight"], 0,
     "You can't remove the basic function, though you can change how it's delivered. Most secondary functions exist only because of this design, so most can be changed or removed. The exceptions are those required by law or safety standards."],
  ], "Worth a second go. Re-read sections 1.1–1.5 on value, 2.2 on the team and 3.3 on requirements, then try again.");

  /* ── 7 · Module 8 implementation gauntlet ── */
  buildChallenge("#m8ChalMount", [
    ["Your idea saves £0.30 a unit on 160,000 units a year, and needs £60,000 one-time. Payback?",
     ["About 15 months", "About 10 months", "About 5 months", "About 2 years"], 0,
     "Annual saving = £0.30 × 160,000 = £48k. Payback = £60k ÷ £48k × 12 = 15 months. That's over the usual 12-month limit, so cut the one-time cost or bundle it with another change."],
    ["The decision board loved the presentation, applauded, and moved to the next agenda item. What's missing?",
     ["A logged decision for each proposal", "A longer question-and-answer session", "Slides the board can take away afterwards", "A vote of thanks recorded in the minutes"], 0,
     "Applause isn't an output. A Phase 6 that ends without logged decisions is a rehearsal: every proposal needs a yes or no, an owner and a date."],
    ["Purchasing claims the same £180k saving your VE study claims. What prevents this?",
     ["One shared, reconciled savings ledger", "Whoever logs it first keeps it", "Splitting the claim 50/50 each time", "Asking the CFO to decide each case"], 0,
     "Double counting destroys a programme's credibility faster than any failed idea. Keep one savings ledger, matched with purchasing's records, under the agreed measurement rules."],
    ["Copper prices spiked and wiped out your £0.30 design saving on paper. The savings check should:",
     ["Report the saving as lost", "Take the copper price change out with an index", "Wait for copper prices to fall again", "Reset the starting cost to today's prices"], 1,
     "Measure against the fixed starting cost, with commodity price changes taken out using an index. The £0.30 design saving is real whether copper rises or falls, and the rules must show it."],
    ["An approved idea has sat at L3 for four months; its champion left the company. The funnel review should:",
     ["Give it a new owner and a new date", "Leave it at L3 until someone volunteers", "Send it back to L1 to be checked again", "Ask the board to approve it again"], 0,
     "A champion leaving is cause number five. The monthly review exists to give ownerless ideas a new owner within a month, or to drop them on purpose, never to let them fade."],
    ["A saving appears in the monthly report. At what point should it be counted as real?",
     ["At L4, in production and checked by finance", "When the business case is approved", "When the tooling has been ordered", "When the workshop's report is signed off"], 0,
     "L1 ideas and L3 approvals are potential. Only savings in production, checked by finance against the fixed starting cost, are real. That discipline is why people believe the numbers."],
    ["Two sceptical executives sit on the decision board. The best move before the meeting is:",
     ["Go through it with each of them beforehand", "Send them a longer pack to read in advance", "Put their proposals last on the agenda", "Ask the sponsor to answer their questions"], 0,
     "Surprises make executives defensive, and defensive executives say no. Briefing them one-to-one first brings objections out while they can still be fixed."],
    ["The second round of your programme is running slower and costing more than the first. The likeliest cause is:",
     ["Lessons weren't fed back into the system", "The products in round two are harder", "The team is tired after the first round", "Suppliers had already given their best prices"], 0,
     "The second round should be cheaper and faster: reused ideas, updated design rules, refreshed should-costs. If it isn't, the review after each round and the feedback of lessons are being skipped."],
  ], "Worth a second go. Re-read sections 8.4–8.7 on the one-pager, the checking rules and the five causes, then try again.");

  /* ── 8 · Module 9 should-cost challenge ── */
  buildChallenge("#m9ChalMount", [
    ["A supplier refuses to share their cost breakdown. Your move?",
     ["Build your own should-cost model", "Accept the quote: there's no other data", "Threaten to move the business", "Ask three other suppliers to quote"], 0,
     "That's the point of should-costing: material mass, cycle-time physics and published rates rebuild their cost structure without a single confidential number."],
    ["Which steel price belongs in the material layer of a cleansheet?",
     ["A commodity index for the grade", "The steel mill's published list price", "Last year's contract price, plus inflation", "The lowest price you've paid this year"], 0,
     "List prices are negotiating positions, not costs. A commodity index is honest and easy to update, and it sets up the index clause for the contract."],
    ["Your cleansheet says £1.42; the quote is £1.85. The WRONG next move is:",
     ["A joint session going through the layers", "Email it and ask them to explain the gap", "Checking your own utilisation assumption", "Preparing questions layer by layer"], 1,
     "'Explain the gap' by email makes a supplier defensive. Share the method and go through the layers together. Suppliers who feel checked up on hide things; suppliers who feel like partners offer them."],
    ["Bracket F sits 25% above your LPP regression line. Before targeting it you must:",
     ["Check its spec against the others", "Ask the supplier for 25% off", "Refit the line without it and move on", "Move it to a cheaper supplier"], 0,
     "LPP finds the odd ones out, not the answers. F's special coating was justified; bracket D's premium wasn't. Check the spec first, then negotiate."],
    ["A supplier's plant is busy for 55% of its hours instead of a normal 85%. Roughly how much more overhead does each part carry?",
     ["About 1.5 times", "About 3 times", "About 30% more", "No more: overhead is fixed"], 0,
     "Fixed costs are spread over the hours actually worked. 85 ÷ 55 ≈ 1.5, so each part carries about 1.5 times the overhead it would at a normal 85%. You shouldn't pay for their empty machine time. Raise it as a question, not an accusation."],
    ["In the three-way split of a should-cost negotiation, the supplier's fair margin is:",
     ["Respected, not cut", "Squeezed first", "Cut to match yours", "Traded for volume"], 0,
     "Squeezing a fair margin buys one cheap year and a resentful supplier. The savings come from indexing material and taking waste out of processing costs, and gain-share keeps their ideas coming."],
    ["Your machine-rate assumption uses 85% utilisation; the supplier's plant runs at 60%. Your should-cost is:",
     ["Below their real cost, but a fair basis to talk", "Wrong: rebuild it at 60% before you talk to them", "Right: it predicts what they'll quote", "Too high: their quote should come in lower"], 0,
     "The model shows what the part should cost at competent utilisation. The gap against their reality is the discussion: why should your part pay for their empty hours?"],
    ["An AI engine returns £4.12 for a housing in under a minute. That number is best used as:",
     ["A guide to check against real quotes", "The target price for the contract", "Proof the supplier is overcharging", "A replacement for the request for quotes"], 0,
     "AI should-costs are a guide: good for ranking designs and preparing for a negotiation, never a substitute for checked quotes. Sounding confident isn't the same as being accurate."],
  ], "Worth a second go. Re-read section 9.1 on why should-cost matters, 9.5 on the seven steps and 9.7 on negotiation, then try again.");

  /* ── 9 · Module 11 AI-era challenge ── */
  buildChallenge("#m11ChalMount", [
    ["An engineer pastes the full supplier-quoted BOM into a public chatbot to 'find savings'. This is:",
     ["A breach of confidentiality", "Fine, if part names are removed", "Fine, if the chat is deleted", "Good practice for speed"], 0,
     "Treat a pasted BOM like an emailed one: confidential data never goes into public tools. Use your company's approved tools; the capability is the same, the exposure isn't."],
    ["The LLM's business-case draft claims a '23% typical saving for this commodity'. Before it reaches the board you must:",
     ["Check it against a real source", "Ask the model to double-check itself", "Keep it, but mark it as an AI estimate", "Replace it with your own best guess"], 0,
     "Every number that reaches a business case gets a human check against a real source. AI tools sound confident even when they're wrong, which is why checking is a hard rule."],
    ["Your AI should-cost engine's estimates drifted 12% away from real quotes over a year. The likely cause is:",
     ["Out-of-date rates and model updates", "Engineers rounding the inputs", "A new buyer collecting the quotes", "The CAD files getting larger over time"], 0,
     "Rate libraries age and models update without notice. Compare against real quotes every quarter to catch drift; teams that don't slowly lose finance's trust in every AI number."],
    ["The best FIRST investment for a team starting its digital cost tools is:",
     ["Spend analysis and LPP on your own data", "An AI assistant licence for every engineer", "A CT scanner for competitor teardowns", "A linked database of parts, costs and suppliers"], 0,
     "Crawl before you run. Spend analysis needs no new tools, finds outliers in weeks, and its savings pay for what follows. Buying tools first just produces well-formatted guesses."],
    ["A feature-based engine returns different costs for the same part from two CAD files. Why?",
     ["The CAD models differ in detail", "The engine has a fault in its maths", "The engine adds random noise to its estimates", "Each file was costed in a different currency"], 0,
     "The engine reads manufacturing features from the geometry. Missing draft angles or wrong wall thicknesses change the simulated process: poor CAD, wrong cost."],
    ["Where should the human stay in charge in an AI-assisted workshop?",
     ["Judging, deciding and signing off", "Drafting the first idea list", "Grouping ideas into themes", "Counting and sorting the votes"], 0,
     "AI drafts, counts and groups; engineers judge, check and sign off. People always make the decisions."],
    ["Your team wants to automate function analysis before ever having run one manually. The risk is:",
     ["Nobody can tell when the output is wrong", "None: that's what the tools are for", "The software licences cost too much", "The tool needs your past studies to learn"], 0,
     "A drafted function tree is only useful to someone who can spot where it's wrong. Learn the manual method first; then AI speeds you up instead of being a black box."],
    ["Which change is most likely to cut both cost and carbon?",
     ["Making the part lighter", "Longer payment terms", "Moving production closer to home", "Shipping by air to cut stock"], 0,
     "Cost and carbon share physics: less material means less money and less embodied CO₂e. Moving production closer to home usually cuts transport emissions but may cost more. A kgCO₂e column in the cleansheet shows which is which."],
  ], "Worth a second go. Re-read sections 11.4 on the engines, 11.8 on the order to adopt tools and 11.9 on the ground rules, then try again.");

  // Modules 1, 2, 7, 12 and 13
  buildChallenge("#m1ChalMount", [
    ["Your boss says \"take 10% out of every part\". What's the value-engineering response?",
     ["Agree, and spread the cut evenly", "Find where cost is higher than worth", "Ask every supplier for a 10% discount", "Remove the most expensive part first"], 1,
     "Cutting every part equally ignores what each part does. VE asks what each part does and looks for the functions that cost more than they're worth, while protecting the ones customers pay for."],
    ["You want to reduce the cost of a product that's already in production. Which is it?",
     ["Value Analysis (VA)", "Value Engineering (VE)", "Value Management (VM)", "None of these"], 0,
     "VA works on products already in production. VE works during design, before the cost is fixed. VM is the management system that keeps both going."],
    ["Someone suggests removing the chrome trim to save £1.20. What should you ask first?",
     ["Can we buy cheaper chrome?", "Is it worth more than it costs?", "Will engineering approve the change?", "Do our competitors still use chrome?"], 1,
     "Esteem value is real value, because customers pay for it. So the question isn't \"can we get rid of it?\" but \"is it worth more to customers than it costs?\""],
    ["Which of these is NOT one of the five ways to improve value?",
     ["Same function, lower cost", "More function, same cost", "Less of a valued function, lower cost", "Remove functions customers don't value"], 2,
     "Cutting a function customers value, just to save money, is how cost-cutting damages brands. Starting from functions is what prevents it."],
    ["When does an hour of VE effort usually save the most?",
     ["After launch, in a cost-down project", "At a design review, before the concept is frozen", "During the yearly supplier negotiation", "Near the end of the product's life"], 1,
     "A figure often quoted is that 70–80% of lifecycle cost is committed by the end of concept design. The exact number is debated, but the direction isn't: later stages can only work within decisions already made."],
    ["A kettle sells for £35 and costs £18 to make. Which of the two does your design control most?",
     ["The price", "The cost", "Both equally", "Neither"], 1,
     "The market sets the price. Your design and supplier choices set the cost, and that's where VE works."],
  ], "Worth a second go. Re-read sections 1.2 on the five ways to improve value, 1.3 on VA, VE and VM, and 1.6 on why VE pays, then try again.");
  buildChallenge("#m2ChalMount", [
    ["The workshop is in two weeks and nobody senior has agreed to sponsor it. What do you do?",
     ["Run it anyway and find a sponsor afterwards", "Postpone until a sponsor is named", "Let the facilitator sponsor it", "Shorten it to one day and report upwards"], 1,
     "No sponsor, no study. Without someone who can provide people and money and act on the decisions, a study produces slides and nothing else."],
    ["The team is eight design engineers. What's the problem?",
     ["It's too big to manage well", "It's all from one department", "It's too small for a full study", "There's no problem: they know it best"], 1,
     "A team from one department comes up with the same kind of ideas. The best ideas come when people from different departments challenge each other, so add manufacturing, purchasing, quality, finance and a key supplier."],
    ["Who is best placed to run the workshop?",
     ["The chief engineer, who knows it best", "A trained facilitator from outside the project", "The sponsor, who has the authority", "The cost engineer who built the BOM"], 1,
     "Experts tend to defend the current design. The facilitator runs the process and keeps time but doesn't supply the answers, and the team supplies the ideas."],
    ["The target says \"cut 20%, because the CEO wants it\". What's missing?",
     ["Nothing: a clear number is enough", "Evidence behind the number", "A bigger number, to stretch the team", "A deadline and a named owner"], 1,
     "A target set because someone senior picked a number, with no evidence behind it, isn't believed. Base it on a competitor gap, the margin you need, or what an earlier review found."],
    ["Finance hasn't checked the costed parts list. What's the risk?",
     ["None: engineers know the costs", "Nobody will believe the savings", "The supplier will object to the figures", "Ideas will be slower to come"], 1,
     "The workshop turns into an argument about the numbers, and the savings won't be believed. Involve finance from day one so nobody says \"those numbers aren't real\" later."],
    ["The product is complex and some data is missing. Which workshop format fits?",
     ["A five-day week, back to back", "A three-day version, days merged", "A split: two days, a break, two more", "A one-day sprint with the data you have"], 2,
     "The split format suits complex products: the two-week break is for gathering the missing data. The one thing you can't shorten is keeping the phases separate."],
  ], "Worth a second go. Re-read sections 2.1 on scope and sponsorship, 2.2 on the team and 2.6 on the starting cost and target, then try again.");
  buildChallenge("#m7ChalMount", [
    ["A change saves 20p a unit on 150,000 units a year and has a one-time cost of £15,000. What's the payback?",
     ["2 months", "6 months", "12 months", "18 months"], 1,
     "Annual saving = 20p × 150,000 = £30,000. Payback = £15,000 ÷ £30,000 = half a year, so 6 months."],
    ["A packaging specification change. How far up the testing ladder should it go?",
     ["All five steps", "A desk check", "A field trial", "A rig test"], 1,
     "Match the testing to the risk, not to habit. A packaging change needs step 1 only, and too much testing slowly destroys the payback."],
    ["A thinner wall raises occurrence from 2 to 4 on a failure with severity 8. What now?",
     ["Note it and review it at launch", "Act on it before counting the saving", "Ignore it: occurrence 4 is still low", "Drop every change in the study"], 1,
     "Score the change from the current design. A rise like this on a severe failure needs action, such as a redesign or added controls. A small rise on a minor failure just needs a note."],
    ["The new tooling takes 14 weeks; the tests take 10. When do you order the tooling?",
     ["After every test has passed", "Alongside the tests, with clear stop points", "Before any testing starts, with no stop points", "Once the first rig test has passed"], 1,
     "Start long-lead items at the same time as testing, with clear stop points, rather than waiting until every test has passed."],
    ["One option saves early on a falling volume; another saves later on a rising one. How should you compare them?",
     ["Their NPV at the company's required return", "Simple payback, months to break even", "Total gross saving over the life", "Saving per unit at today's volume"], 0,
     "Payback is a quick screen. When options differ in timing, life or volume profile, compare them by NPV at the company's required return."],
    ["Two ideas save the same amount, one this quarter and one in 18 months. Which is worth more?",
     ["The one in 18 months", "The one this quarter", "They're worth the same", "The later one, as it's less risky"], 1,
     "A saving that arrives in 18 months is worth less than one that arrives this quarter: money now can earn a return, and later savings carry more risk. Always put a date on savings."],
  ], "Worth a second go. Re-read sections 7.3 on the business case, 7.4 on the testing ladder, 7.5 on FMEA and 7.6 on the money, then try again.");
  buildChallenge("#m12ChalMount", [
    ["Twelve studies have run in three years, but savings in production are flat. What's wrong?",
     ["They count activity, not results", "Too few studies for the product range", "Too many ideas spread too thin", "The facilitator lacks experience"], 0,
     "Measuring activity (studies run) instead of results (checked savings in production) is a classic way programmes fail."],
    ["The programme has a £2M savings target, but no engineering time has been funded. What happens?",
     ["The target will be missed, and morale suffers", "The team will find the time somehow", "Suppliers will make up the difference", "Nothing: stretch targets motivate people"], 0,
     "Never set a savings target higher than the engineering time you've paid for. Fund the time or lower the target, or morale suffers too."],
    ["Who should the value office report to?",
     ["The engineering director", "The purchasing director", "A neutral director, such as finance", "The head of the biggest product line"], 2,
     "A value office under engineering ignores sourcing, and one under purchasing ignores design. A neutral sponsor, such as the finance or operations director, keeps both sides balanced."],
    ["Funnel coverage is 35% of product cost. What's the usual target?",
     ["60% or more", "About 10%", "100%", "35% is fine"], 0,
     "Funnel coverage, the share of product cost being actively studied, should be at least 60%."],
    ["Which savings should earn rewards?",
     ["Ideas approved at the workshop", "Gross savings at the idea stage", "Checked net savings in production", "The number of workshops each person runs"], 2,
     "Reward savings that are checked, net and actually in production, or people will chase big numbers that only exist on paper."],
    ["The first round found 12%. Should the programme stop there?",
     ["Yes: the main savings are done", "No: later rounds find 3–5% a year", "Only if the next target is approved", "Switch to a different method next"], 1,
     "Established programmes keep finding 3–5% a year. Stopping after the first round, just before the savings start to build up, is a common mistake."],
  ], "Worth a second go. Re-read sections 12.1 on running the programme, 12.4 on organising it and 12.5 on targets and rewards, then try again.");
  buildChallenge("#m13ChalMount", [
    ["The net selling price is £20,000 and the business needs a 15% margin. What's the allowable cost?",
     ["£3,000", "£17,000", "£23,000", "£20,000"], 1,
     "Allowable cost = net selling price − required margin = £20,000 − £3,000 = £17,000."],
    ["The motor's drifting cost is £1,214 and its target is £1,052. What's the value gap?",
     ["£1,052", "£162", "£1,214", "£2,266"], 1,
     "Value gap = drifting cost − allowable (target) cost = £1,214 − £1,052 = £162."],
    ["A new feature adds £40 to a product that's already at its target. What does the cardinal rule say?",
     ["Add it; the budget will absorb it", "Save £40 somewhere else first", "Raise the target by £40", "Ask purchasing to find the £40"], 1,
     "The target cost can never be exceeded. If a feature has to be added, its cost must be saved somewhere else."],
    ["Who should own each part of the target?",
     ["The purchasing department", "A named engineer", "The supplier", "Finance"], 1,
     "Make a named engineer, not a department, the owner of every target. Nobody owns a number they were never given."],
    ["At a design review the cost status is red and there's no recovery plan. What happens?",
     ["It passes; fix it later", "It doesn't pass until there's a plan", "Raise the target to match", "Leave cost out of the review"], 1,
     "Manage cost the way aircraft makers manage weight: a review with a red cost status and no recovery plan doesn't pass until there is one."],
    ["Production has started. What takes over from target costing?",
     ["Target costing, unchanged", "Kaizen costing, in small steps", "Nothing: the cost is now fixed", "Cost-plus pricing"], 1,
     "Target costing sets where cost starts, and kaizen costing brings it down in small, continuous steps. Those reductions still need the Development phase checks on function and quality."],
  ], "Worth a second go. Re-read sections 13.1 and 13.2 on allowable cost, the value gap and the cardinal rule, 13.3 on splitting the target and 13.4 on design-to-cost, then try again.");
})();

/* ════════ Course-at-a-glance catalogue: open modules via the sidebar (keeps sign-in gating) ════════ */
(function () {
  "use strict";
  const wrap = document.getElementById("catWrap");
  if (!wrap) return;
  // returning learners: collapse the catalogue so it doesn't push their modules down
  try {
    const st = JSON.parse(localStorage.getItem("vf-academy")) || {};
    if ((st.done || []).length) wrap.open = false;
  } catch (e) {}
  wrap.addEventListener("click", (e) => {
    const card = e.target.closest(".cat-card");
    if (!card) return;
    const link = document.querySelector(`#modNav .mod-link[data-target="${card.dataset.open}"]`);
    if (link) link.click();
    const layout = document.getElementById("trLayout");
    if (layout) layout.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
