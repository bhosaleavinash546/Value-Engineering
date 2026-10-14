/* ═══════════════════════════════════════════════════════════
   VAVEhub — exam and quiz screens, shared by the VE Academy exam
   (training.js) and the VAVE for Leaders quiz (course.js).
   Papers come from VHCloud.examStart() without answers and are marked by
   VHCloud.examSubmit() on the server, so nothing here knows the right answers.
   Expose: window.VHExamUI.start(opts)
   ═══════════════════════════════════════════════════════════ */
window.VHExamUI = (function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clock = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const minsTo = (iso) => Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / 60000));

  /* opts: {
       mount, course: "academy" | "leaders", noun: "exam" | "quiz",
       titles: { m1: "Foundations…", … },     module names for the results
       signInHref,                              where "Sign in" goes
       onGoto(moduleId),                        open a module
       onResult(res),                           record the attempt locally
       onPass(res, attempt, actionsEl),         offer the certificate
       onRetake()                               start again (optional)
     } */
  function start(o) {
    const m = o.mount;
    const busy = (msg) => { m.innerHTML = `<div class="ex-gate"><p class="ex-busy" role="status">${msg}</p></div>`; };
    const problem = (html, retry) => {
      m.innerHTML = `<div class="ex-gate"><p role="alert">${html}</p><div class="ex-actions">${retry ? '<button class="btn btn-primary" id="exAgain">Try again</button>' : ""}</div></div>`;
      if (retry) $("#exAgain", m).addEventListener("click", () => start(o));
    };
    busy(`Preparing your ${o.noun}…`);
    VHCloud.examStart(o.course).then((r) => {
      if (!r || r.error) {
        if (r && r.error === "signin") {
          m.innerHTML = `<div class="ex-gate"><p>Please sign in (or create a free account) to take the ${o.noun}. You'll come straight back here.</p>
            <div class="ex-actions"><a class="btn btn-primary" href="${esc(o.signInHref)}">Sign in →</a></div></div>`;
          return;
        }
        problem(`The ${o.noun} couldn't be loaded just now. Check your connection and try again.`, true);
        return;
      }
      if (r.need_modules) {
        problem(`Your account doesn't show all ${Object.keys(o.titles).length} modules as complete yet. Mark the remaining modules complete (or refresh the page so your progress syncs), then start the ${o.noun}.`, true);
        return;
      }
      if (r.wait_until) {
        m.innerHTML = `<div class="ex-gate"><p>After an attempt that doesn't pass there's a one-hour break, so the next try is a real test.
          You can start again at <strong>${clock(r.wait_until)}</strong> (in about ${minsTo(r.wait_until)} minutes).</p>
          <p class="ex-note">Use the time to revisit the modules you found hardest.</p></div>`;
        return;
      }
      run(o, r);
    });
  }

  function run(o, paper) {
    const m = o.mount, qs = paper.questions || [], N = qs.length;
    const picks = new Array(N).fill(null);
    let qi = 0;
    function renderQ(focus) {
      const q = qs[qi];
      m.innerHTML = `
        <div class="ex-q-head"><span>Question ${qi + 1} / ${N}</span><div class="ex-bar"><i style="width:${(qi / N) * 100}%"></i></div></div>
        <div class="ex-q" tabindex="-1">${q.q}</div>
        <div class="ex-opts" role="group" aria-label="Answers">${q.options.map((t, pos) =>
          `<button class="ex-opt${picks[qi] === pos ? " is-picked" : ""}" data-pos="${pos}" aria-pressed="${picks[qi] === pos}"><span class="eo-key">${"ABCDEF"[pos]}</span><span>${t}</span></button>`).join("")}</div>
        <div class="ex-nav">
          <button class="btn btn-ghost" id="exPrev" ${qi === 0 ? "disabled" : ""}>← Previous</button>
          <button class="btn btn-primary" id="exNext" ${picks[qi] === null ? "disabled" : ""}>${qi === N - 1 ? `Submit ${o.noun} ✓` : "Next →"}</button>
        </div>`;
      $$(".ex-opt", m).forEach((b) => b.addEventListener("click", () => {
        picks[qi] = +b.dataset.pos;
        $$(".ex-opt", m).forEach((x) => { x.classList.toggle("is-picked", x === b); x.setAttribute("aria-pressed", String(x === b)); });
        $("#exNext", m).disabled = false;
      }));
      $("#exPrev", m).addEventListener("click", () => { if (qi > 0) { qi--; renderQ(true); } });
      $("#exNext", m).addEventListener("click", () => { if (qi < N - 1) { qi++; renderQ(true); } else submit(); });
      if (focus) $(".ex-q", m).focus(); // keyboard and screen-reader users land on the new question
    }
    function submit() {
      m.innerHTML = `<div class="ex-gate"><p class="ex-busy" role="status">Marking your ${o.noun}…</p></div>`;
      VHCloud.examSubmit(paper.attempt, picks).then((res) => {
        if (!res || res.error) {
          m.innerHTML = `<div class="ex-gate"><p role="alert">Your answers couldn't be sent. Check your connection, then try again.</p>
            <div class="ex-actions"><button class="btn btn-primary" id="exResend">Send my answers again</button></div></div>`;
          $("#exResend", m).addEventListener("click", submit);
          return;
        }
        result(o, res, paper.attempt);
      });
    }
    renderQ(false);
  }

  function result(o, res, attempt) {
    const m = o.mount, passed = !!res.passed, pct = res.score;
    if (o.onResult) o.onResult(res);
    const color = passed ? "#34d399" : "#f87171";
    const by = res.by_module || {};
    const order = Object.keys(o.titles).filter((k) => by[k]);
    const weak = order.filter((k) => by[k][0] < by[k][1]);
    const table = `<div class="ex-review ex-bymod"><h4>How you did in each module</h4>${order.map((k) => {
      const [r, t] = by[k], miss = r < t;
      return `<div class="ex-mod-row${miss ? " is-weak" : ""}"><span>${esc(o.titles[k])}</span><b>${r} / ${t}</b>${miss && !passed ? `<button class="btn btn-ghost ex-goto" data-goto="${k}">Revisit</button>` : ""}</div>`;
    }).join("")}</div>`;
    const review = passed && res.review && res.review.length
      ? `<div class="ex-review"><h4>Worth a second look (${res.review.length})</h4>${res.review.map((x) =>
          `<div class="ex-review-item"><b>${x.q}</b>${x.yours ? `<span class="wrong">✗ ${x.yours}</span> &nbsp;→&nbsp; ` : ""}<span class="right">✓ ${x.right}</span>${x.why ? `<span class="ex-expl">${x.why}</span>` : ""}</div>`).join("")}</div>`
      : "";
    m.innerHTML = `<div class="ex-result">
      <div class="ex-ring"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="rbg" cx="80" cy="80" r="72"/><circle class="rfg" id="exRing" cx="80" cy="80" r="72" style="stroke:${color}"/></svg>
      <div class="rnum"><b style="color:${color}">${pct}%</b><span>${res.right} / ${res.total}</span></div></div>
      <div class="ex-verdict ${passed ? "pass" : "fail"}" tabindex="-1">${passed ? "Well done, you passed!" : `Not this time: ${res.pass}% needed`}</div>
      <p class="ex-note">${passed
        ? "Enter your name below to create your certificate."
        : `You scored ${pct}%. ${weak.length ? `Focus on the module${weak.length > 1 ? "s" : ""} marked below. ` : ""}You can try again at <strong>${clock(res.wait_until)}</strong>, with a new set of questions.`}</p>
      ${passed ? review : table}
      <div class="ex-actions" id="exActions"></div></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const ring = $("#exRing", m); if (ring) ring.style.strokeDashoffset = String(452 * (1 - pct / 100)); }));
    $(".ex-verdict", m).focus();
    $$(".ex-goto", m).forEach((b) => b.addEventListener("click", () => o.onGoto && o.onGoto(b.dataset.goto)));
    const actions = $("#exActions", m);
    if (passed && o.onPass) o.onPass(res, attempt, actions);
    if (passed && o.onRetake) {
      const again = document.createElement("button");
      again.className = "btn btn-ghost"; again.textContent = "Retake for a better score";
      again.addEventListener("click", o.onRetake);
      actions.appendChild(again);
    }
  }

  /* name box + button that asks the server for the certificate */
  function certForm(box, attempt, defaultName, onIssued) {
    const wrap = document.createElement("div"); wrap.className = "ex-name";
    const input = document.createElement("input");
    input.id = "certNameInput"; input.maxLength = 60; input.placeholder = "Your full name, as it should appear"; input.value = defaultName || "";
    input.setAttribute("aria-label", "Your name for the certificate");
    wrap.appendChild(input);
    const b = document.createElement("button"); b.className = "btn btn-primary"; b.id = "genCert"; b.textContent = "🎓 Get my certificate";
    const msg = document.createElement("p"); msg.className = "ex-note"; msg.setAttribute("role", "status");
    b.addEventListener("click", () => {
      const name = input.value.trim();
      if (name.length < 2) { input.focus(); input.placeholder = "Please enter your name first"; return; }
      b.disabled = true; msg.textContent = "Creating your certificate…";
      VHCloud.examIssue(attempt, name).then((c) => {
        b.disabled = false;
        if (!c || c.error) { msg.textContent = (c && c.error && c.error !== "offline") ? c.error : "The certificate couldn't be created just now. Please try again."; return; }
        msg.textContent = "";
        onIssued({ id: c.id, name: c.name, score: c.score, date: c.date });
      });
    });
    box.append(wrap, b, msg);
  }

  return { start, certForm };
})();
