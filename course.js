/* ════════════════════════════════════════════════════════════
   VAVEhub course engine — runs a short course from its settings
   (window.VH_COURSE, e.g. leaders-data.js) and the page's .tmod sections.
   Handles: sidebar and module navigation, progress (this browser, plus the
   learner's account when signed in), quick checks that unlock "Mark complete",
   "Was this module helpful?", the final quiz, and the certificate.
   Uses the same markup and styles as the VE Academy (training.css).
   ════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const C = window.VH_COURSE;
  if (!C) return;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const LIVE = !!(window.VHCloud && VHCloud.live);

  /* ── state: this browser first, then the account copy (merged) ── */
  const state = (() => { try { return JSON.parse(localStorage.getItem(C.storageKey)) || {}; } catch { return {}; } })();
  state.done = state.done || []; state.doneAt = state.doneAt || {}; state.qc = state.qc || {};
  state.quiz = state.quiz || { attempts: [], best: 0, passed: false };
  let acctName = "";
  const save = () => {
    try { localStorage.setItem(C.storageKey, JSON.stringify(state)); } catch {}
    if (LIVE && acctName) VHCloud.saveCourse(C.id, state);
  };
  function mergeCloud(cloud) {
    if (!cloud) return false;
    let changed = false;
    (cloud.done || []).forEach((m) => { if (!state.done.includes(m)) { state.done.push(m); changed = true; } });
    state.doneAt = Object.assign({}, cloud.doneAt, state.doneAt);
    state.qc = Object.assign({}, cloud.qc, state.qc);
    const q = cloud.quiz || {};
    const seen = new Set((state.quiz.attempts || []).map((a) => a.t));
    state.quiz.attempts = (state.quiz.attempts || []).concat((q.attempts || []).filter((a) => !seen.has(a.t))).sort((a, b) => (a.t < b.t ? -1 : 1)).slice(-20);
    state.quiz.best = Math.max(state.quiz.best || 0, q.best || 0);
    if (q.passed && !state.quiz.passed) { state.quiz.passed = true; changed = true; }
    if (cloud.cert && !state.cert) { state.cert = cloud.cert; changed = true; }
    return changed;
  }

  /* ── modules & sidebar ── */
  const mods = $$(".tmod");
  const courseMods = mods.filter((m) => !m.classList.contains("tmod-exam"));
  const quizId = (mods.find((m) => m.classList.contains("tmod-exam")) || {}).dataset.mod;
  const modNav = $("#modNav");
  modNav.innerHTML = mods.map((m) => {
    const id = m.dataset.mod, isQuiz = id === quizId;
    return `<button class="mod-link${isQuiz ? " mod-exam" : ""}" data-target="${id}">
      <span class="mchk">✓</span>
      <span class="mtxt"><b>${isQuiz ? "🎓 " : ""}${m.dataset.title}</b><span>${m.dataset.time}</span></span></button>`;
  }).join("");

  let currentId = null;
  const narrow = window.matchMedia("(max-width:960px)");
  const sideEl = $("#trSidebar"), sideBtn = $("#sideToggle");
  function setSide(open) { sideEl.classList.toggle("is-collapsed", !open); sideBtn.setAttribute("aria-expanded", String(open)); }
  sideBtn.addEventListener("click", () => { if (narrow.matches) setSide(sideEl.classList.contains("is-collapsed")); });
  narrow.addEventListener("change", (e) => setSide(!e.matches));
  if (narrow.matches) setSide(false);

  function show(id, scroll) {
    currentId = id;
    mods.forEach((m) => m.classList.toggle("is-visible", m.dataset.mod === id));
    $$(".mod-link", modNav).forEach((l) => l.classList.toggle("is-active", l.dataset.target === id));
    if (id === quizId) renderQuizGate();
    if (narrow.matches) setSide(false);
    updateSideCur();
    if (scroll !== false) (narrow.matches ? $("#trMain") : $("#trLayout")).scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function updateSideCur() {
    const cur = mods.find((m) => m.dataset.mod === currentId);
    $("#sideCur").textContent = (cur ? cur.dataset.title + " · " : "") + doneCount() + "/" + courseMods.length;
  }
  const doneCount = () => courseMods.filter((m) => state.done.includes(m.dataset.mod)).length;

  function refreshProgress() {
    const total = courseMods.length, done = doneCount(), pct = Math.round((done / total) * 100);
    $("#navProgFill").style.width = pct + "%";
    $("#navProgText").textContent = state.quiz.passed ? "✓ Quiz passed" : pct + "% complete";
    $("#sideProgFill").style.width = pct + "%";
    $("#sideProgText").textContent = `${done} / ${total} modules` + (state.quiz.passed ? " · quiz passed" : "");
    $$(".mod-link", modNav).forEach((l) => {
      const id = l.dataset.target;
      l.classList.toggle("is-done", id === quizId ? !!state.quiz.passed : state.done.includes(id));
    });
    updateSideCur();
  }

  modNav.addEventListener("click", (e) => { const l = e.target.closest(".mod-link"); if (l) show(l.dataset.target); });
  $$(".cat-card").forEach((c) => c.addEventListener("click", () => { $("#catWrap").open = false; show(c.dataset.open); }));
  $("#startBtn").addEventListener("click", () => {
    const next = courseMods.find((m) => !state.done.includes(m.dataset.mod));
    show(next ? next.dataset.mod : quizId);
  });

  // "Mark complete" buttons say where they lead next
  $$(".tmod-done").forEach((btn) => {
    const i = mods.findIndex((m) => m.dataset.mod === btn.dataset.done), nxt = mods[i + 1];
    if (i > 0 && nxt && nxt.dataset.mod !== quizId) btn.textContent = "Mark complete & go to Module " + (i + 1) + " →";
    btn.addEventListener("click", () => {
      const id = btn.dataset.done;
      if (!state.done.includes(id)) { state.done.push(id); state.doneAt[id] = new Date().toISOString(); }
      save(); refreshProgress();
      show(nxt ? nxt.dataset.mod : quizId);
    });
  });

  /* ── quick checks: answer both correctly to unlock "Mark complete" ── */
  $$(".qcheck").forEach((box) => {
    const id = box.dataset.qc, qs = C.quick[id];
    if (!qs) return;
    const doneBtn = $(`.tmod-done[data-done="${id}"]`);
    const solved = new Set();
    const cleared = () => state.done.includes(id) || state.qc[id];
    box.innerHTML = `<div class="qcheck-head"><h4>Quick check</h4><span>${cleared() ? "Cleared ✓" : "Answer both correctly to unlock completion"}</span></div>` +
      qs.map(([q, opts], qi) => `<div class="qc-item" data-qi="${qi}">
        <div class="qc-q">${qi + 1}. ${q}</div>
        <div class="qc-opts">${opts.map((o, oi) => `<button class="qc-opt" data-oi="${oi}">${o}</button>`).join("")}</div>
        <div class="qc-expl" role="status" aria-live="polite"></div></div>`).join("");
    if (doneBtn && !cleared()) doneBtn.disabled = true;
    box.addEventListener("click", (e) => {
      const btn = e.target.closest(".qc-opt");
      if (!btn) return;
      const item = btn.closest(".qc-item"), qi = +item.dataset.qi, [, , correct, expl] = qs[qi];
      const out = $(".qc-expl", item);
      if (+btn.dataset.oi === correct) {
        btn.classList.add("is-right"); item.classList.add("is-locked");
        out.textContent = "✓ " + expl; out.className = "qc-expl show-right";
        solved.add(qi);
        if (solved.size === qs.length) {
          state.qc[id] = true; save();
          $(".qcheck-head span", box).textContent = "Cleared ✓";
          if (doneBtn) doneBtn.disabled = false;
        }
      } else {
        btn.classList.add("is-wrong");
        out.textContent = "✗ Not quite. Try again. Hint: " + expl; out.className = "qc-expl show-wrong";
      }
    });
  });

  /* ── "Was this module helpful?" (anonymous) ── */
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
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".mf-btn");
      if (!b || helpful !== null) return;
      helpful = b.dataset.v === "1";
      $$(".mf-btn", box).forEach((x) => { x.setAttribute("aria-pressed", String(x === b)); x.disabled = true; });
      fbDone[id] = true; try { localStorage.setItem(FB_KEY, JSON.stringify(fbDone)); } catch (err) {}
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

  /* ── final quiz ── */
  const mount = $("#examMount");
  const Q = C.quiz, N = Q.length, NEED = Math.ceil(N * C.passMark);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let order = [], perm = [], picks = [], qi = 0;

  function renderQuizGate() {
    $("#certWrap").hidden = true;
    if (state.quiz.passed) { renderPassed(); return; }
    mount.innerHTML = `<div class="ex-gate">
      <p>${N} questions covering all seven modules. You need <strong>${NEED} of ${N} (${Math.round(C.passMark * 100)}%)</strong>
      to pass. The questions and answers are shuffled on every attempt, you can retake the quiz as often as you like, and
      you'll see the right answer to anything you missed.</p>
      ${doneCount() < courseMods.length ? `<p class="ex-note">You've finished ${doneCount()} of ${courseMods.length} modules. You can take the quiz now, but it's easier after all seven.</p>` : ""}
      <button class="btn btn-primary btn-lg" id="examStart">Start the quiz →</button></div>`;
    $("#examStart").addEventListener("click", startQuiz);
  }
  function startQuiz() {
    order = shuffle(Q.map((_, i) => i));
    perm = Q.map((q) => shuffle(q[1].map((_, i) => i)));
    picks = new Array(N).fill(null); qi = 0;
    $("#certWrap").hidden = true;
    renderQ();
  }
  function renderQ() {
    const bi = order[qi], [q, opts] = Q[bi];
    mount.innerHTML = `
      <div class="ex-q-head"><span>Question ${qi + 1} / ${N}</span><div class="ex-bar"><i style="width:${(qi / N) * 100}%"></i></div></div>
      <div class="ex-q" tabindex="-1">${q}</div>
      <div class="ex-opts">${perm[bi].map((i, pos) =>
        `<button class="ex-opt${picks[bi] === i ? " is-picked" : ""}" data-i="${i}"><span class="eo-key">${"ABCD"[pos]}</span><span>${opts[i]}</span></button>`).join("")}</div>
      <div class="ex-nav">
        <button class="btn btn-ghost" id="exPrev" ${qi === 0 ? "disabled" : ""}>← Previous</button>
        <button class="btn btn-primary" id="exNext" ${picks[bi] === null ? "disabled" : ""}>${qi === N - 1 ? "Submit quiz ✓" : "Next →"}</button>
      </div>`;
    $$(".ex-opt", mount).forEach((b) => b.addEventListener("click", () => {
      picks[bi] = +b.dataset.i;
      $$(".ex-opt", mount).forEach((o) => o.classList.toggle("is-picked", o === b));
      $("#exNext").disabled = false;
    }));
    $("#exPrev").addEventListener("click", () => { if (qi > 0) { qi--; renderQ(); $(".ex-q", mount).focus(); } });
    $("#exNext").addEventListener("click", () => { if (qi < N - 1) { qi++; renderQ(); $(".ex-q", mount).focus(); } else finishQuiz(); });
  }
  function finishQuiz() {
    let score = 0; const wrong = [];
    order.forEach((bi) => {
      const [q, opts, c, expl] = Q[bi];
      if (picks[bi] === c) score++; else wrong.push([q, opts[picks[bi]] ?? "—", opts[c], expl]);
    });
    const pct = Math.round((score / N) * 100), passed = score >= NEED;
    state.quiz.attempts = (state.quiz.attempts || []).concat([{ t: new Date().toISOString(), s: pct, p: passed }]).slice(-20);
    state.quiz.best = Math.max(state.quiz.best || 0, pct);
    if (passed) state.quiz.passed = true;
    save(); refreshProgress();
    const color = passed ? "#34d399" : "#f87171";
    mount.innerHTML = `<div class="ex-result">
      <div class="ex-ring"><svg viewBox="0 0 160 160"><circle class="rbg" cx="80" cy="80" r="72"/><circle class="rfg" id="exRing" cx="80" cy="80" r="72" style="stroke:${color}"/></svg>
      <div class="rnum"><b style="color:${color}">${pct}%</b><span>${score} / ${N}</span></div></div>
      <div class="ex-verdict ${passed ? "pass" : "fail"}">${passed ? "Well done, you passed!" : `Not this time: ${NEED} of ${N} needed`}</div>
      ${wrong.length ? `<div class="ex-review"><h4>${passed ? "Worth a second look" : "Where you lost marks"} (${wrong.length})</h4>${wrong.map(([q, y, r, e]) =>
        `<div class="ex-review-item"><b>${q}</b><span class="wrong">✗ ${y}</span> &nbsp;→&nbsp; <span class="right">✓ ${r}</span><span class="ex-expl">${e}</span></div>`).join("")}</div>` : ""}
      <div class="ex-actions" id="quizNext"></div></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { $("#exRing").style.strokeDashoffset = String(452 * (1 - pct / 100)); }));
    const actions = $("#quizNext");
    if (passed) certOffer(actions);
    const retake = document.createElement("button");
    retake.className = "btn btn-ghost"; retake.textContent = passed ? "Retake for a better score" : "↻ Retake the quiz";
    retake.addEventListener("click", startQuiz);
    actions.appendChild(retake);
  }

  /* ── certificate: sign in (live sites) to get it ── */
  function renderPassed() {
    if (state.cert) { renderCertificate(); return; }
    mount.innerHTML = `<div class="ex-gate"><p><strong style="color:#34d399">✓ You passed</strong> with a best score of
      ${state.quiz.best}%.</p><div class="ex-actions" id="quizNext"></div></div>`;
    certOffer($("#quizNext"));
  }
  function certOffer(box) {
    if (state.cert) {
      const b = document.createElement("button"); b.className = "btn btn-primary"; b.textContent = "View your certificate →";
      b.addEventListener("click", renderCertificate); box.appendChild(b); return;
    }
    if (LIVE && !acctName) {
      const p = document.createElement("p"); p.className = "ex-note";
      p.textContent = "Sign in (or create a free account) to get your certificate. You'll come straight back here.";
      const a = document.createElement("a"); a.className = "btn btn-primary"; a.href = "auth.html?next=" + encodeURIComponent(C.signInNext);
      a.textContent = "Sign in to get your certificate →";
      box.append(p, a); return;
    }
    const wrap = document.createElement("div"); wrap.className = "ex-name";
    const input = document.createElement("input");
    input.id = "certNameInput"; input.maxLength = 60; input.placeholder = "Your full name, as it should appear"; input.value = acctName || "";
    input.setAttribute("aria-label", "Your name for the certificate");
    wrap.appendChild(input);
    const b = document.createElement("button"); b.className = "btn btn-primary"; b.id = "genCert"; b.textContent = "🎓 Get my certificate";
    b.addEventListener("click", () => {
      const name = input.value.trim();
      if (!name) { input.focus(); input.placeholder = "Please enter your name first"; return; }
      state.cert = { name, score: state.quiz.best, date: new Date().toISOString().slice(0, 10), id: C.certPrefix + Date.now().toString(36).toUpperCase() };
      save();
      if (window.VHCloud) VHCloud.registerCertificate(state.cert);
      renderCertificate();
    });
    box.append(wrap, b);
  }
  function certToken(e) {
    const json = JSON.stringify({ n: e.name, s: e.score, d: e.date, id: e.id, k: "L" });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function renderCertificate() {
    const e = state.cert;
    const shareUrl = new URL("certificate.html?c=" + certToken(e), location.href).toString();
    const li = new URL("https://www.linkedin.com/profile/add");
    li.searchParams.set("startTask", "CERTIFICATION_NAME");
    li.searchParams.set("name", "VAVE for Leaders — Certificate of Completion (VAVEhub)");
    li.searchParams.set("organizationName", "VAVEhub");
    li.searchParams.set("issueYear", e.date.slice(0, 4));
    li.searchParams.set("issueMonth", String(+e.date.slice(5, 7)));
    li.searchParams.set("certUrl", shareUrl);
    li.searchParams.set("certId", e.id);
    mount.innerHTML = `<div class="ex-gate"><p><strong style="color:#34d399">✓ Certificate ready.</strong> Add it to LinkedIn,
      share the link, or save it as a PDF. It's saved, so you can come back to it any time.</p>
      <div class="ex-actions" style="margin-bottom:.6rem">
        <a class="btn btn-primary" href="${li.toString()}" target="_blank" rel="noopener">in&nbsp; Add to LinkedIn profile</a>
        <button class="btn btn-ghost" id="copyShare">🔗 Copy share link</button>
        <button class="btn btn-ghost" id="exRetake">Retake the quiz</button>
      </div></div>`;
    $("#exRetake").addEventListener("click", startQuiz);
    $("#copyShare").addEventListener("click", () => {
      (navigator.clipboard ? navigator.clipboard.writeText(shareUrl) : Promise.reject())
        .then(() => { $("#copyShare").textContent = "✓ Link copied"; })
        .catch(() => { prompt("Copy your certificate link:", shareUrl); });
    });
    $("#certName").textContent = e.name;
    $("#certScore").textContent = e.score + "%";
    $("#certDate").textContent = new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    $("#certId").textContent = e.id;
    $("#certWrap").hidden = false;
  }

  /* ── account: sync progress when signed in ── */
  function onAccount(user) {
    acctName = user && user.name ? user.name : "";
    if (acctName && LIVE) {
      VHCloud.touchProfile();
      VHCloud.loadCourse(C.id).then((cloud) => {
                const changed = mergeCloud(cloud);
        save(); // push anything done before signing in
        if (state.cert && VHCloud.ensureCertificate) VHCloud.ensureCertificate(state.cert); // retry a failed first save
        if (changed) refreshProgress();
        if (currentId === quizId) renderQuizGate();
      });
    }
    if (currentId === quizId) renderQuizGate();
  }
  document.addEventListener("vh-account", (e) => onAccount(e.detail));
  if (window.VHAccount && VHAccount.user) onAccount(VHAccount.user);

  /* ── start ── */
  refreshProgress();
  const wanted = new URLSearchParams(location.search).get("open");
  if (wanted && mods.some((m) => m.dataset.mod === wanted)) { $("#catWrap").open = false; show(wanted); }
  else if (state.done.length) { $("#catWrap").open = false; show((courseMods.find((m) => !state.done.includes(m.dataset.mod)) || { dataset: { mod: quizId } }).dataset.mod, false); }
  else show(courseMods[0].dataset.mod, false);

  window.VHCourse = { show, state };
})();
