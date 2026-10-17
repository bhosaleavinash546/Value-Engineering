/* VAVEhub welcome — helps a first-time visitor find what they came for.
   1. On a first visit to the homepage, one question: what brings you here? (student, practitioner, leader, exploring)
   2. A three-step path for that answer: a spotlight on the right part of the site, ending on a page worth opening.
   3. A small "Your first 10 minutes" checklist that ticks itself as they do each thing, on any page with this script.
   4. One-off hints on deeper features (the 3D projector, read-aloud, focus mode), the first time they're seen.
   5. Two short steps after a brand-new account's first sign-in.
   Shown once: finishing or skipping is remembered in this browser. "/?tour=1" (footer, account menu) shows it again;
   "/?for=students" skips the question and starts the student path. Counts (start, path, finish, skip) go to the
   site's database as anonymous events, if set up (supabase-welcome.sql); nothing personal is sent. */
(function () {
  "use strict";
  if (window.VH_CAPTURE) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const KEY = "vh-welcome";
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  S.items = S.items || {}; S.hints = S.hints || {};
  if (!S.vid) { S.vid = Math.random().toString(36).slice(2, 12); save(); }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // the stylesheet sits beside this script
  const me = document.currentScript && document.currentScript.src;
  if (me) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = me.replace(/welcome\.js.*$/, "welcome.css"); document.head.appendChild(l); }

  const page = location.pathname.replace(/index\.html$/, "");
  const isHome = page === "/" || page === "";
  const q = new URLSearchParams(location.search);

  // ── anonymous counts (no-op until the database function exists) ──
  function track(event, path) {
    const c = window.VF_CONFIG;
    if (!c || !c.supabaseUrl || !c.supabaseAnonKey) return;
    try {
      fetch(c.supabaseUrl + "/rest/v1/rpc/log_welcome", {
        method: "POST", keepalive: true,
        headers: { apikey: c.supabaseAnonKey, Authorization: "Bearer " + c.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_visitor: S.vid, p_event: event, p_path: path || S.path || null, p_page: page.slice(0, 80) }),
      }).catch(() => {});
    } catch (e) {}
  }

  // ── the four paths ──
  const NAV = (href) => () => document.querySelector('#navLinks a[href$="' + href + '"]');
  const PATHS = {
    student: {
      label: "🎓 I'm a student",
      steps: [
        { el: () => $(".hc-acad"), t: "Start with the VE Academy", d: "13 short modules, about 6 hours in all, with quick checks, an exam and a free certificate you can share." },
        { el: NAV("case-study.html"), t: "Then see it done on a real product", d: "A classroom projector taken through all six steps of a value study, in 3D, with a video for every step." },
      ],
      end: { t: "Ready when you are", d: "Module 1 takes about 20 minutes. Your progress is saved as you go.", href: "/training.html", go: "Start Module 1" },
    },
    pro: {
      label: "🛠 I work on product cost",
      steps: [
        { el: () => document.querySelector('#navLinks a[href$="#playbook"]'), t: "Ten step-by-step guides", d: "The job plan, FAST diagrams, cost levers, should-costing, teardown and more, each with worked examples." },
        { el: NAV("toolkit/"), t: "15 free templates", d: "Function worksheets, idea registers, evaluation matrices and business cases. Download them and use them today." },
      ],
      end: { t: "Pick up a template", d: "Everything in the toolkit is free, with no sign-up needed.", href: "/toolkit/", go: "Open the toolkit" },
    },
    leader: {
      label: "📊 I lead a team",
      steps: [
        { el: () => $(".hc-lead"), t: "VAVE for Leaders", d: "One hour, seven short modules: what value engineering delivers, what to ask for, and how to keep the savings. With a certificate." },
        { el: NAV("case-study.html"), t: "See the business result", d: "A real product study: 24 ideas, 17% off the landed cost, with the business cases and the decision pack." },
      ],
      end: { t: "One hour well spent", d: "Start the leaders' course, or come back to the case study any time from the top bar.", href: "/leaders.html", go: "Start the 1-hour course" },
    },
    explore: {
      label: "👀 Just exploring",
      steps: [
        { el: () => $(".ve-video"), t: "Start here", d: "What value engineering is, and why it works, explained in 4 minutes." },
        { el: NAV("case-study.html"), t: "Then take a projector apart", d: "Turn it, explode it and see where every pound of its cost goes, in 3D." },
      ],
      end: { t: "Have a look around", d: "The case study is the quickest way to see value engineering in action.", href: "/case-study.html", go: "Explore the case study" },
    },
  };

  // ── checklist: four things to try, ticked as they happen ──
  const signedIn = () => { try { return !!localStorage.getItem("vh-session") || Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)); } catch (e) { return false; } };
  const qc1 = () => { try { const a = JSON.parse(localStorage.getItem("vf-academy")) || {}; return !!((a.qc && a.qc.m1) || (a.done || []).includes("m1")); } catch (e) { return false; } };
  const GUIDES = /^\/(job-plan|cost-levers|ideation|benchmarking|function-analysis|governance|technology|industries|value-engineering|value-analysis|vave|product-cost-reduction|product-cost-optimisation)\/$/;
  const ITEM = {
    video: { t: "Watch the 4-minute intro", href: "/#about" },
    explode: { t: "Take the 3D projector apart", href: "/case-study.html" },
    qc1: { t: "Pass Module 1's quick check", href: "/training.html", test: qc1 },
    signin: { t: "Sign in to save your progress", href: "/auth.html?view=signup", test: signedIn },
    guide: { t: "Read a step-by-step guide", href: "/job-plan/", test: () => GUIDES.test(page) },
    template: { t: "Download a template", href: "/toolkit/" },
    leaders: { t: "Start the 1-hour course", href: "/leaders.html", test: () => page === "/leaders.html" },
    result: { t: "See the case study's result", href: "/case-study.html#p6", test: () => page === "/case-study.html" },
    playbook: { t: "Open the leaders' playbook", href: "/leaders-playbook.html", test: () => page === "/leaders-playbook.html" },
    academy: { t: "Look inside the Academy", href: "/training.html", test: () => page === "/training.html" },
  };
  const LIST = { student: ["video", "explode", "qc1", "signin"], pro: ["guide", "template", "explode", "signin"],
    leader: ["leaders", "result", "playbook", "signin"], explore: ["video", "explode", "academy", "signin"] };

  function tick(id, quiet) {
    if (!S.path || S.items[id] || !LIST[S.path].includes(id)) return;
    S.items[id] = Date.now(); save(); track("item:" + id);
    const n = LIST[S.path].filter((x) => S.items[x]).length;
    if (n === 4 && !S.listDone) { S.listDone = Date.now(); save(); track("checklist_done"); }
    if (!quiet) toast(n === 4 ? "🎉 That's all four. You've found your way around." : "✓ " + ITEM[id].t + " · " + n + " of 4");
    renderList();
  }
  function checkAll(quiet) { if (S.path) LIST[S.path].forEach((id) => { if (ITEM[id].test && ITEM[id].test()) tick(id, quiet); }); }

  // things that happen on the page
  document.addEventListener("play", (e) => { if (e.target && e.target.tagName === "VIDEO") tick("video"); }, true);
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest(".vid-facade, [data-act=explode], a[download], a[href$='.xlsx'], a[href$='.docx'], a[href$='.pptx'], a[href$='.pdf'], a[href$='.csv']");
    if (!t) return;
    if (t.matches(".vid-facade")) tick("video");
    else if (t.matches("[data-act=explode]")) tick("explode");
    else if (page === "/toolkit/" || t.hasAttribute("download")) tick("template");
  }, true);
  document.addEventListener("input", (e) => { if (e.target.matches && e.target.matches(".pj-slider") && +e.target.value >= 60) tick("explode"); }, true);
  document.addEventListener("vh-account", (e) => { if (e.detail) { tick("signin"); firstSignin(e.detail); } });
  window.addEventListener("storage", () => checkAll());

  // ── the checklist panel ──
  let listEl = null;
  function renderList() {
    if (!S.path || S.listHidden || (S.listDone && Date.now() - S.listDone > 8000) || !S.tourEnded) { if (listEl) listEl.remove(), (listEl = null); return; }
    const ids = LIST[S.path], n = ids.filter((x) => S.items[x]).length;
    if (!listEl) {
      listEl = document.createElement("aside");
      listEl.className = "vw-list"; listEl.setAttribute("aria-label", "Your first 10 minutes");
      document.body.appendChild(listEl);
      listEl.addEventListener("click", (e) => {
        if (e.target.closest(".vw-list-toggle")) { S.listOpen = !S.listOpen; save(); renderList(); }
        if (e.target.closest(".vw-list-hide")) { S.listHidden = true; save(); track("checklist_hidden"); renderList(); }
      });
    }
    const open = !!S.listOpen;
    listEl.classList.toggle("is-open", open);
    listEl.innerHTML =
      '<button type="button" class="vw-list-toggle" aria-expanded="' + open + '"><span class="vw-list-ring" style="--p:' + n / 4 + '"><b>' + n + "/4</b></span>" +
      "<span>Your first 10 minutes</span><i aria-hidden=\"true\">" + (open ? "▾" : "▴") + "</i></button>" +
      (open ? '<ol class="vw-list-items">' + ids.map((id) => '<li class="' + (S.items[id] ? "is-done" : "") + '"><a href="' + ITEM[id].href + '"><i aria-hidden="true">' + (S.items[id] ? "✓" : "") + "</i>" + esc(ITEM[id].t) +
        (S.items[id] ? '<span class="vw-sr"> (done)</span>' : "") + "</a></li>").join("") + '</ol><button type="button" class="vw-list-hide">Hide this list</button>' : "");
  }

  let toastT = 0;
  function toast(msg) {
    let t = $(".vw-toast");
    if (!t) { t = document.createElement("div"); t.className = "vw-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("is-on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("is-on"), 3600);
  }

  // ── the spotlight tour ──
  let T = null;   // { steps, i, ov, spot, card, lastFocus, menuOpened, onEnd }
  const nav = () => $("#navToggle");
  const menuCollapsed = () => { const b = nav(); return !!(b && getComputedStyle(b).display !== "none"); };
  function openMenuFor(el) {
    const links = $("#navLinks");
    if (!el || !links || !links.contains(el) || !menuCollapsed()) return false;
    if (nav().getAttribute("aria-expanded") !== "true") { nav().click(); return true; }
    return false;
  }
  function closeMenu() { if (T && T.menuOpened && nav() && nav().getAttribute("aria-expanded") === "true") nav().click(); if (T) T.menuOpened = false; }

  function tour(steps, opts) {
    endTour(true);
    const ov = document.createElement("div"); ov.className = "vw-ov";
    ov.innerHTML = '<div class="vw-spot"></div><div class="vw-ring"></div>';
    const card = document.createElement("div");
    card.className = "vw-card"; card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "false"); card.setAttribute("aria-labelledby", "vwTitle");
    document.body.append(ov, card);
    T = { steps, i: 0, ov, spot: $(".vw-spot", ov), ring: $(".vw-ring", ov), card, lastFocus: document.activeElement, opts: opts || {} };
    document.addEventListener("keydown", keys);
    addEventListener("resize", place); addEventListener("scroll", place, { passive: true });
    show(0);
  }
  function keys(e) {
    if (!T) return;
    if (e.key === "Escape") { e.preventDefault(); close("close"); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
  }
  function next() { if (T.i < T.steps.length - 1) show(T.i + 1); else close("finish_tour"); }
  function back() { if (T.i > 0) show(T.i - 1); }
  function close(ev) { const o = T && T.opts; endTour(); if (o && o.onEnd) o.onEnd(ev); }
  function endTour(silent) {
    if (!T) return;
    closeMenu();
    document.removeEventListener("keydown", keys); removeEventListener("resize", place); removeEventListener("scroll", place);
    const t = T; T = null;
    t.ov.classList.add("is-out"); t.card.classList.add("is-out");
    setTimeout(() => { t.ov.remove(); t.card.remove(); }, reduce ? 0 : 260);
    if (!silent && t.lastFocus && t.lastFocus.focus) try { t.lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }

  function show(i) {
    if (!T) return;
    if (T.target) T.target.classList.remove("vw-target");
    closeMenu();
    T.i = i;
    const s = T.steps[i], last = i === T.steps.length - 1;
    let el = s.el ? s.el() : null;
    if (el) { T.menuOpened = openMenuFor(el); }
    if (el && (!el.getClientRects().length)) el = null;     // hidden: show the card on its own
    T.target = el;
    if (el) el.classList.add("vw-target");
    const dots = T.steps.map((_, j) => '<i class="' + (j === i ? "is-on" : "") + '"></i>').join("");
    T.card.innerHTML =
      '<p class="vw-k">' + esc(s.k || "Step " + (i + 1) + " of " + T.steps.length) + "</p>" +
      '<h2 id="vwTitle" tabindex="-1">' + esc(s.t) + "</h2><p class=\"vw-d\">" + esc(s.d) + "</p>" +
      '<div class="vw-foot"><span class="vw-dots" aria-hidden="true">' + dots + "</span>" +
      (i > 0 ? '<button type="button" class="vw-btn vw-back">Back</button>' : "") +
      (s.href ? '<a class="vw-btn vw-go" href="' + s.href + '">' + esc(s.go) + ' <span aria-hidden="true">→</span></a>'
              : '<button type="button" class="vw-btn vw-next">' + (last ? esc(s.done || "Done") : "Next") + "</button>") +
      "</div>" + (s.href ? '<button type="button" class="vw-stay">' + esc(s.stay || "Stay on this page") + "</button>" : "") +
      '<button type="button" class="vw-x" aria-label="Close the tour">×</button>';
    const c = T.card;
    c.querySelector(".vw-x").onclick = () => close("close");
    if (c.querySelector(".vw-next")) c.querySelector(".vw-next").onclick = next;
    if (c.querySelector(".vw-back")) c.querySelector(".vw-back").onclick = back;
    if (c.querySelector(".vw-stay")) c.querySelector(".vw-stay").onclick = () => close("stay");
    if (c.querySelector(".vw-go")) c.querySelector(".vw-go").onclick = () => { const o = T.opts; if (o.onGo) o.onGo(); endTour(true); };
    if (el && T.menuOpened) setTimeout(() => { el.scrollIntoView({ block: "center", behavior: "auto" }); place(); }, 380);   // inside the phone menu, which scrolls
    if (el && !T.menuOpened) {
      const r = el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > innerHeight - 40) el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
    T.ov.classList.toggle("is-free", !el);
    place(); setTimeout(place, 60); setTimeout(place, reduce ? 0 : 450);
    setTimeout(() => { const h = c.querySelector("#vwTitle"); if (h) h.focus({ preventScroll: true }); }, 30);
    if (T.opts.onStep) T.opts.onStep(i);
  }

  function place() {
    if (!T) return;
    const c = T.card, el = T.target, W = innerWidth, H = innerHeight, phone = W < 640;
    c.classList.toggle("is-sheet", phone);
    if (!el) {
      Object.assign(T.spot.style, { left: W / 2 + "px", top: H / 2 + "px", width: "0px", height: "0px" });
      T.ring.style.opacity = 0;
      if (!phone) { c.style.left = Math.max(12, (W - c.offsetWidth) / 2) + "px"; c.style.top = Math.max(12, (H - c.offsetHeight) / 2) + "px"; }
      c.removeAttribute("data-side");
      return;
    }
    const r = el.getBoundingClientRect(), pad = 8;
    const box = { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
    Object.assign(T.spot.style, { left: box.left + "px", top: box.top + "px", width: box.width + "px", height: box.height + "px" });
    Object.assign(T.ring.style, { left: box.left + "px", top: box.top + "px", width: box.width + "px", height: box.height + "px", opacity: 1 });
    // phones: the card is a sheet at the bottom, or at the top when the item is low on the screen
    if (phone) { c.classList.toggle("is-top", r.bottom > H - c.offsetHeight - 24 && r.top > c.offsetHeight + 24); return; }
    const cw = c.offsetWidth, ch = c.offsetHeight, gap = 16;
    let side = r.bottom + gap + ch < H - 8 ? "below" : r.top - gap - ch > 8 ? "above" : "below";
    let top = side === "below" ? box.top + box.height + gap : box.top - gap - ch;
    top = Math.min(Math.max(8, top), H - ch - 8);
    let left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), W - cw - 12);
    c.style.left = left + "px"; c.style.top = top + "px"; c.dataset.side = side;
    c.style.setProperty("--ax", Math.min(Math.max(22, r.left + r.width / 2 - left), cw - 22) + "px");
  }

  // ── first visit: the question ──
  function ask(student) {
    if ($(".vw-ask")) return;
    track("shown");
    const box = document.createElement("div");
    box.className = "vw-ask"; box.setAttribute("role", "dialog"); box.setAttribute("aria-labelledby", "vwAskT");
    box.innerHTML = student
      ? `<p class="vw-k">Welcome</p><h2 id="vwAskT">Hello, and welcome to VAVEhub 👋</h2><p class="vw-d">You're here to learn value engineering. Here's where to start, in three quick steps.</p>` +
        '<div class="vw-foot"><button type="button" class="vw-btn vw-go" data-p="student">Show me <span aria-hidden="true">→</span></button><button type="button" class="vw-skip">Not now</button></div>'
      : `<p class="vw-k">Welcome to VAVEhub</p><h2 id="vwAskT">What brings you here?</h2><p class="vw-d">Pick one and we'll show you where to start. It takes 20 seconds.</p>` +
        '<div class="vw-choices">' + Object.entries(PATHS).map(([k, p]) => '<button type="button" class="vw-choice" data-p="' + k + '">' + esc(p.label) + "</button>").join("") + "</div>" +
        '<button type="button" class="vw-skip">Skip</button>';
    box.insertAdjacentHTML("beforeend", '<button type="button" class="vw-x" aria-label="Close">×</button>');
    document.body.appendChild(box);
    requestAnimationFrame(() => box.classList.add("is-on"));
    const done = () => { box.classList.remove("is-on"); setTimeout(() => box.remove(), reduce ? 0 : 300); };
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-p]");
      if (b) { done(); start(b.dataset.p); return; }
      if (e.target.closest(".vw-skip, .vw-x")) { done(); S.skipped = Date.now(); save(); track("skip"); }
    });
    setTimeout(() => { const f = box.querySelector("[data-p]"); if (f) f.focus({ preventScroll: true }); }, 350);
  }

  function start(path) {
    const p = PATHS[path]; if (!p) return;
    S.path = path; S.started = Date.now(); delete S.tourEnded; save(); track("path", path);
    const steps = p.steps.concat([{ k: "Step 3 of 3", t: p.end.t, d: p.end.d, href: p.end.href, go: p.end.go }]);
    tour(steps, {
      onStep: (i) => track("step" + (i + 1)),
      onGo: () => { S.tourEnded = Date.now(); save(); track("finish"); },
      onEnd: (ev) => { S.tourEnded = Date.now(); save(); track(ev === "stay" ? "finish_stay" : "close"); checkAll(true); renderList(); },
    });
  }

  // ── after a new account's first sign-in ──
  function firstSignin(user) {
    if (S.signinDone) return;
    const fresh = user && user.created && Date.now() - Date.parse(user.created) < 3 * 864e5;
    if (!fresh) { S.signinDone = 1; save(); return; }
    setTimeout(() => {
      if (T || $(".vw-ask")) return;
      const cta = $(".nav-cta"), acct = $(".acct-btn");
      if (!cta && !acct) return;
      S.signinDone = Date.now(); save(); track("signin_tour");
      tour([
        { el: () => $(".nav-cta"), t: "My learning", d: "Takes you straight back to where you left off, on any device you sign in on." },
        { el: () => $(".acct-btn"), t: "Your account", d: "Your progress, certificates and settings live here. You can replay this welcome from here too.", done: "Got it" },
      ]);
    }, 1500);
  }

  // ── one-off hints on deeper features ──
  const HINTS = {
    "/case-study.html": [
      { id: "cs-turn", el: () => $("#pjViewer canvas"), t: "Drag to turn it, scroll to zoom", at: "center" },
      { id: "cs-explode", el: () => $(".pj-slider"), t: "Drag to take it apart" },
    ],
    "/training.html": [
      { id: "ac-listen", el: () => [...document.querySelectorAll(".vo-play")].find((b) => b.getClientRects().length), t: "Tap Listen to have the lesson read to you" },
      { id: "ac-focus", el: () => [...document.querySelectorAll(".fm-open")].find((b) => b.getClientRects().length), t: "Focus mode hides everything except the lesson" },
    ],
  };
  let hintEl = null, hintFor = null;
  function hints() {
    const list = (HINTS[page] || []).filter((h) => !S.hints[h.id]);
    if (!list.length || T || $(".vw-ask") || hintEl) return;
    const h = list[0], el = h.el();
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || !r.width) return;   // only once it's on screen
    hintFor = { h, el };
    hintEl = document.createElement("div"); hintEl.className = "vw-hint";
    hintEl.innerHTML = '<span class="vw-hint-dot" aria-hidden="true"></span><span class="vw-hint-t" role="status">' + esc(h.t) + '</span><button type="button" aria-label="Dismiss the hint">×</button>';
    document.body.appendChild(hintEl);
    const gone = () => { if (!hintEl) return; S.hints[h.id] = Date.now(); save(); hintEl.remove(); hintEl = null; hintFor = null; setTimeout(hints, 1200); };
    hintEl.querySelector("button").onclick = gone;
    ["pointerdown", "click", "input", "keydown"].forEach((ev) => el.addEventListener(ev, gone, { once: true }));
    placeHint();
  }
  function placeHint() {
    if (!hintEl || !hintFor) return;
    const r = hintFor.el.getBoundingClientRect();
    const x = hintFor.h.at === "center" ? r.left + r.width / 2 : r.left + 14, y = hintFor.h.at === "center" ? r.top + r.height / 2 : r.bottom + 18;   // just below the control, not over it
    hintEl.style.left = Math.min(Math.max(8, x), innerWidth - 8) + "px"; hintEl.style.top = Math.max(8, y) + "px";
    hintEl.classList.toggle("is-off", r.bottom < 0 || r.top > innerHeight);
  }
  addEventListener("scroll", () => { placeHint(); if (!hintEl) hints(); }, { passive: true });
  addEventListener("resize", placeHint);

  // ── start-up ──
  function boot() {
    checkAll(true);
    renderList();
    setTimeout(hints, 2500);
    if (!isHome) return;
    const forced = q.get("tour") === "1", student = q.get("for") === "students";
    if (student && !S.path) { setTimeout(() => ask(true), 900); return; }
    if (forced) { setTimeout(() => ask(false), 600); return; }
    if (S.path || S.skipped) return;
    if (location.hash && location.hash !== "#top") return;     // came for a particular section
    // only after they've had a moment to look around, and never over a playing video
    let shown = false;
    const playing = () => [...document.querySelectorAll("video")].some((v) => !v.paused && !v.ended && !v.muted);
    const go = () => { if (shown || document.hidden || playing() || signedIn()) return; shown = true; ask(false); };   // learners get the sign-in steps instead
    setTimeout(go, 3500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  window.VHWelcome = { replay: () => ask(false), state: S };
})();
