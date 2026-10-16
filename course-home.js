/* Course page openers (VE Academy and VAVE for Leaders):
   - "Try it in 60 seconds": a one-question taste of the method in the page's opening section
   - "About this course": a returning learner starts on their learner home; this shows the introduction again
   - which view people get, and what they do with the try-it, are counted (GoatCounter events) */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const track = (n) => { if (window.vhTrack) window.vhTrack(n); };
  const leaders = /leaders/.test(location.pathname);
  const cfg = window.VF_CONFIG || {};
  const LIVE = !!(window.VHCloud && VHCloud.live);
  const quotesOn = !LIVE || cfg.quotes === true; // the demo (no database) always shows them, for testing
  const course = leaders ? "leaders" : "academy";
  const start = () => { const b = $("#startBtn"); if (b) b.click(); };

  /* ── About this course ── */
  const about = $("#trAboutBtn");
  if (about) about.addEventListener("click", () => {
    const open = !document.body.classList.contains("show-about");
    document.body.classList.toggle("show-about", open);
    about.setAttribute("aria-expanded", String(open));
    about.textContent = open ? "Hide the introduction" : "About this course";
    if (open) { track(course + "/about-opened"); const h = $("#trHero"); if (h) h.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  // which view the page opened in (the learner view is set a moment later, once progress is known)
  setTimeout(() => track(course + (document.body.classList.contains("is-learner") ? "/view-learner" : "/view-visitor")), 2500);

  /* ── the trailer: the button appears once the video has been made (tools/trailer) ── */
  const tb = $("#trailerBtn");
  if (tb && window.fetch && cfg.trailers === true) {
    const base = "videos/trailer-" + course;
    fetch(base + ".mp4", { method: "HEAD" }).then((r) => {
      if (!r.ok) return;
      tb.hidden = false;
      let dlg = null;
      tb.addEventListener("click", () => {
        track(course + "/trailer-play");
        if (!dlg) {
          dlg = document.createElement("dialog");
          dlg.className = "tr-trailer";
          dlg.setAttribute("aria-label", "Course trailer");
          dlg.innerHTML = `<button type="button" class="tr-trailer-x" aria-label="Close the trailer">✕</button>
            <video controls playsinline preload="metadata" poster="${base}.webp"><source src="${base}.mp4" type="video/mp4" />
            <track kind="captions" src="${base}.vtt" srclang="en" label="English" /></video>`;
          document.body.appendChild(dlg);
          const v = $("video", dlg);
          const close = () => { v.pause(); dlg.close(); };
          $(".tr-trailer-x", dlg).addEventListener("click", close);
          dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
          dlg.addEventListener("close", () => { v.pause(); tb.focus(); });
          v.addEventListener("ended", () => { track(course + "/trailer-finished"); });
        }
        dlg.showModal();
        const v = $("video", dlg); v.currentTime = 0; v.play().catch(() => {});
      });
    }).catch(() => {});
  }

  /* ── on a phone, a first-time visitor sees the module list folded (it's 14 cards long) ── */
  const cat = $("#catWrap");
  if (cat && window.matchMedia("(max-width:640px)").matches && !document.body.classList.contains("is-learner")) cat.open = false;

  /* ── Verified learner quotes: shown once approved; each links to the learner's certificate ── */
  const esc = (x) => String(x == null ? "" : x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const live = $("#trQuotesLive");
  if (live && quotesOn && window.VHCloud && VHCloud.quotes) {
    VHCloud.quotes(course).then((q) => {
      if (!q || !q.length) return;
      live.innerHTML = `<p class="tr-author-tag">What learners say</p>` + q.slice(0, 3).map((x) =>
        `<figure class="tr-quote"><blockquote>“${esc(x.quote)}”</blockquote><figcaption>${esc(x.display_name)}${x.role ? ", " + esc(x.role) : ""} · <a href="verify.html?id=${encodeURIComponent(x.cert_id)}">✓ verified certificate</a></figcaption></figure>`).join("");
      live.hidden = false;
    }).catch(() => {});
  }

  /* ── After passing: an optional quote for the course page, with consent ── */
  const certWrap = $("#certWrap");
  if (certWrap && quotesOn && window.VHCloud && VHCloud.quoteSubmit) {
    const offer = () => {
      if (certWrap.hidden || $("#quoteBox", certWrap)) return;
      const certId = ($("#certId") || {}).textContent || "", name = ($("#certName") || {}).textContent || "";
      if (!certId || certId === "—") return;
      const box = document.createElement("form");
      box.id = "quoteBox"; box.className = "quote-box";
      box.innerHTML = `<h3>Would you recommend this course?</h3>
        <p>A sentence or two in your own words helps other engineers decide. It's optional, and nothing is shown until it has been checked.</p>
        <label for="qbText">Your words</label>
        <textarea id="qbText" maxlength="400" rows="3" required minlength="15"></textarea>
        <div class="qb-row"><label>Name to show <input id="qbName" maxlength="80" required /></label><label>Role <span>(optional)</span> <input id="qbRole" maxlength="80" placeholder="e.g. Design engineer" /></label></div>
        <label class="qb-ok"><input type="checkbox" id="qbConsent" required /> VAVEhub may show these words with my name and role, linked to my certificate.</label>
        <div class="qb-acts"><button type="submit" class="btn btn-primary">Send</button><span class="qb-msg" role="status"></span></div>`;
      certWrap.appendChild(box);
      $("#qbName", box).value = name.trim();
      box.addEventListener("submit", async (e) => {
        e.preventDefault();
        const msg = $(".qb-msg", box), btn = $("button", box);
        btn.disabled = true; msg.textContent = "Sending…";
        const r = await VHCloud.quoteSubmit(course, certId.trim(), $("#qbText", box).value.trim(), $("#qbName", box).value.trim(), $("#qbRole", box).value.trim());
        if (r && r.error) { btn.disabled = false; msg.textContent = /sign in/i.test(r.error) || r.error === "signin" ? "Please sign in first." : "Sorry, that didn't send. Please try again."; return; }
        track(course + "/quote-sent");
        box.innerHTML = `<h3>Thank you</h3><p>We'll check it and add it to the course page. Your certificate stays exactly as it is.</p>`;
      });
    };
    new MutationObserver(offer).observe(certWrap, { attributes: true, attributeFilter: ["hidden"] });
    offer();
  }

  /* ── Try it in 60 seconds ── */
  const box = $("#trTry"), out = $("#tryOut");
  if (!box || !out) return;
  const opts = $$(".tr-try-opt", box);

  const ACADEMY = {
    heat: { ok: false, title: "That's where most people look first.",
      body: "Heat water costs the most, £2.10, but it's worth about £2.00: the cheapest reliable way to boil water costs nearly the same. Its value index (cost ÷ worth) is 1.05, so there's little to find. The biggest cost isn't always the poorest value." },
    contain: { ok: false, title: "Good eye: that one is worth watching.",
      body: "The body costs £1.70 to contain water that could be held for about 90p. A value index of 1.9 is a real gap, but there's a bigger one." },
    esteem: { ok: true, title: "Spot on. That's the poorest value.",
      body: "The chrome trim and finish cost £1.30 but are worth about 30p: a value index of 4.3. A buyer survey found 60% of buyers don't care about the chrome. Moulded-in colour does the same job and saves 62p a kettle, which is £155,000 a year on 250,000 kettles." },
  };
  const LEADERS = {
    a: { ok: false, title: "It's a lot more than that.", body: "" },
    b: { ok: false, title: "Closer, but still short.", body: "" },
    c: { ok: true, title: "Exactly: £1.25 million.", body: "" },
  };
  const leadersBody = "At an 8% margin, every £1 of extra sales brings in 8p of profit, so £100,000 of profit needs £100,000 ÷ 0.08 = £1.25 million of new sales: twelve and a half times the saving, and every bit as hard to win. The 50p saving drops straight to profit. That's why the cheapest growth is often already inside your products.";

  let answered = false;
  opts.forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.k, r = (leaders ? LEADERS : ACADEMY)[k];
    if (!r) return;
    if (!answered) { answered = true; track(course + "/tryit-answered"); }
    if (r.ok) track(course + "/tryit-right");
    opts.forEach((o) => { o.classList.toggle("is-picked", o === b); o.setAttribute("aria-pressed", String(o === b)); });
    box.classList.add("is-revealed"); // the Academy version now shows what each job is worth
    opts.forEach((o) => o.classList.toggle("is-best", ((leaders ? LEADERS : ACADEMY)[o.dataset.k] || {}).ok));
    const body = leaders ? leadersBody : r.body;
    const tip = leaders ? (r.ok ? "" : "Have another go, or read on.")
      : (r.ok ? "" : "Try another, or read on.");
    out.innerHTML = `<p class="tr-try-verdict ${r.ok ? "is-ok" : "is-no"}"><b></b></p><p class="tr-try-body"></p>` +
      (leaders ? `<p class="tr-try-next">Module 1 shows why most of this profit is decided long before production.</p>`
               : `<p class="tr-try-next">That's function analysis: what each job costs against what it's worth. It's how every module of this course works.</p>`) +
      `<div class="tr-try-acts"><button type="button" class="btn btn-primary" id="tryGo">${leaders ? "Start the course →" : "Start Module 1 free →"}</button>${tip ? `<span class="tr-try-tip">${tip}</span>` : ""}</div>`;
    $("b", out).textContent = r.title;
    $(".tr-try-body", out).textContent = body;
    $("#tryGo", out).addEventListener("click", () => { track(course + "/tryit-start"); start(); });
  }));
  opts.forEach((o) => o.setAttribute("aria-pressed", "false"));
})();
