/* ════════════════════════════════════════════════════════════
   VAVEhub — motion & interaction engine
   Framer-Motion-grade springs, reveals & canvas — dependency-free
   Designed & Developed by Avinash Bhosale
   ════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ── Preloader ── */
  const preloader = $("#preloader");
  function done() { document.body.classList.add("is-loaded"); }
  (function preload() {
    const fill = $("#preloaderFill");
    const count = $("#preloaderCount");
    if (!preloader) return done();
    if (reduced) { preloader.remove(); return done(); }
    let p = 0;
    const tick = () => {
      p = Math.min(100, p + Math.random() * 18 + 16);
      fill.style.width = p + "%";
      count.textContent = Math.floor(p) + "%";
      if (p < 100) setTimeout(tick, 55);
      else setTimeout(() => { preloader.classList.add("is-done"); done(); setTimeout(() => preloader.remove(), 1200); }, 120);
    };
    setTimeout(tick, 60);
  })();
  // Safety: never leave the page hidden if something above failed.
  setTimeout(() => {
    document.body.classList.add("is-loaded");
    if (preloader && document.body.contains(preloader) && !preloader.classList.contains("is-done")) {
      preloader.classList.add("is-done");
      setTimeout(() => preloader.remove(), 1200);
    }
  }, 3200);

  /* ── Hero headline word stagger delays ── */
  $$(".hero-title .w").forEach((w, i) => w.style.setProperty("--d", (0.08 + i * 0.045).toFixed(3) + "s"));

  /* ── Reveal engine (spring reveals with auto-stagger) ── */
  $$("[data-stagger]").forEach((group) => {
    $$("[data-reveal]", group).forEach((el, i) => el.style.setProperty("--rd", i * 70 + "ms"));
  });
  $$("[data-reveal][data-delay]").forEach((el) => el.style.setProperty("--rd", el.dataset.delay + "ms"));
  const revealIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); revealIO.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  $$("[data-reveal]").forEach((el) => revealIO.observe(el));

  /* ── Counters ── */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target, target = parseFloat(el.dataset.count), dur = 1600, t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(target * ease);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => { el.textContent = "0"; countIO.observe(el); });

  /* ── Scroll progress + nav state ── */
  const progress = $("#scrollProgress"), nav = $("#nav");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
      nav.classList.toggle("is-scrolled", scrollY > 40);
      ticking = false;
    });
  }, { passive: true });

  /* ── Scroll-spy ── */
  const spyLinks = $$(".nav-links a[data-spy]").filter((a) => (a.getAttribute("href") || "").startsWith("#"));
  const spyIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      spyLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  spyLinks.forEach((a) => { const sec = $(a.getAttribute("href")); if (sec) spyIO.observe(sec); });

  /* ── Mobile nav ── */
  const navToggle = $("#navToggle"), navLinks = $("#navLinks");
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open);
    document.body.classList.toggle("nav-open", open);
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    }
  });

  /* ── Custom cursor ── */
  if (finePointer && !reduced) {
    const dot = $("#cursorDot"), ring = $("#cursorRing");
    let mx = -100, my = -100, rx = -100, ry = -100;
    document.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", (e) => {
      ring.classList.toggle("is-hover", !!e.target.closest("a,button,input,.lever,.idea,.tech-card"));
    });
  } else {
    const d = $("#cursorDot"), r = $("#cursorRing");
    if (d) d.remove(); if (r) r.remove();
  }

  /* ── Hero particle network ── */
  const canvas = $("#heroCanvas");
  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    let W, H, parts = [], mouse = { x: -9999, y: -9999 };
    const palette = () => document.documentElement.dataset.theme === "light"
      ? ["rgba(29,78,216,", "rgba(30,86,176,", "rgba(150,99,18,"]
      : ["rgba(90,162,255,", "rgba(46,111,232,", "rgba(217,164,74,"];
    let COLORS = palette();
    function resize() {
      W = canvas.width = canvas.offsetWidth * devicePixelRatio;
      H = canvas.height = canvas.offsetHeight * devicePixelRatio;
      const n = Math.min(110, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 16000));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35 * devicePixelRatio,
        vy: (Math.random() - 0.5) * 0.35 * devicePixelRatio,
        r: (Math.random() * 1.6 + 0.6) * devicePixelRatio,
        c: COLORS[(Math.random() * COLORS.length) | 0],
      }));
    }
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("vf-themechange", () => { COLORS = palette(); resize(); });
    canvas.parentElement.addEventListener("mousemove", (e) => {
      const b = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - b.left) * devicePixelRatio;
      mouse.y = (e.clientY - b.top) * devicePixelRatio;
    });
    canvas.parentElement.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });
    let heroVisible = true;
    new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; }).observe(canvas);
    const LINK = 130 * devicePixelRatio;
    (function draw() {
      requestAnimationFrame(draw);
      if (!heroVisible) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        // gentle mouse repulsion
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy, R = 140 * devicePixelRatio;
        if (d2 < R * R && d2 > 0.01) {
          const d = Math.sqrt(d2), f = ((R - d) / R) * 0.6;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        p.vx *= 0.985; p.vy *= 0.985;
        const min = 0.06 * devicePixelRatio;
        if (Math.abs(p.vx) < min) p.vx += (Math.random() - 0.5) * 0.08;
        if (Math.abs(p.vy) < min) p.vy += (Math.random() - 0.5) * 0.08;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c + "0.8)";
        ctx.fill();
      }
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = COLORS[1] + (1 - d / LINK) * 0.22 + ")";
            ctx.lineWidth = devicePixelRatio * 0.7;
            ctx.stroke();
          }
        }
      }
    })();
  }

  /* ── Magnetic buttons ── */
  if (finePointer && !reduced) {
    $$(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const b = el.getBoundingClientRect();
        const x = (e.clientX - b.left - b.width / 2) * 0.25;
        const y = (e.clientY - b.top - b.height / 2) * 0.35;
        el.style.transform = `translate(${x}px,${y}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform .5s cubic-bezier(.22,1.6,.36,1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 500);
      });
    });
  }

  /* ── 3D tilt cards ── */
  if (finePointer && !reduced) {
    $$(".tilt").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const b = el.getBoundingClientRect();
        const px = (e.clientX - b.left) / b.width - 0.5;
        const py = (e.clientY - b.top) / b.height - 0.5;
        el.style.transform = `perspective(800px) rotateX(${-py * 7}deg) rotateY(${px * 9}deg) translateY(-4px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* ── Spotlight follow on tech cards ── */
  $$(".tech-card").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const b = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - b.left + "px");
      el.style.setProperty("--my", e.clientY - b.top + "px");
    });
  });

  /* ── Generic tab engine (job-plan stepper + industries) ── */
  function wireTabs(tabSel, panelSel, indicator) {
    const tabs = $$(tabSel);
    const panels = $$(panelSel);
    if (!tabs.length) return;
    function activate(i) {
      tabs.forEach((t, k) => t.classList.toggle("is-active", k === i));
      panels.forEach((p, k) => p.classList.toggle("is-active", k === i));
      if (indicator) {
        const t = tabs[i], parent = t.parentElement.getBoundingClientRect(), b = t.getBoundingClientRect();
        indicator.style.left = b.left - parent.left + "px";
        indicator.style.width = b.width + "px";
      }
      // trigger bar animations inside the newly shown panel
      $$("[data-bar]", panels[i]).forEach((bar) => requestAnimationFrame(() => bar.classList.add("is-in")));
    }
    tabs.forEach((t, i) => t.addEventListener("click", () => activate(i)));
    activate(0);
    if (indicator) window.addEventListener("resize", () => {
      const i = tabs.findIndex((t) => t.classList.contains("is-active"));
      if (i >= 0) activate(i);
    });
  }
  wireTabs(".save-tab", ".save-panel", $("#saveInd"));
  wireTabs(".ind-tab", ".ind-panel", null);

  /* ── Lever filters ── */
  const filterBar = $("#leverFilters");
  if (filterBar) {
    filterBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      $$(".chip", filterBar).forEach((c) => c.classList.toggle("is-active", c === btn));
      const f = btn.dataset.filter;
      $$("#leverGrid .lever").forEach((card, i) => {
        const show = f === "all" || card.dataset.cat === f;
        card.classList.toggle("is-hidden", !show);
        if (show) {
          card.classList.remove("is-in");
          card.style.setProperty("--rd", (i % 9) * 45 + "ms");
          requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("is-in")));
        }
      });
    });
  }

  /* ── Animated bars & waterfall on scroll ── */
  const barIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      barIO.unobserve(e.target);
      if (e.target.id === "wfChart") e.target.classList.add("is-in");
      else e.target.classList.add("is-in");
    });
  }, { threshold: 0.35 });
  $$("[data-bar]").forEach((b) => barIO.observe(b));
  const wf = $("#wfChart");
  if (wf) barIO.observe(wf);

  /* ── Value Index calculator ── */
  const fS = $("#fSlider"), cS = $("#cSlider");
  if (fS && cS) {
    const fV = $("#fVal"), cV = $("#cVal"), num = $("#viNum"), ring = $("#ringFg"), verdict = $("#viVerdict");
    const CIRC = 2 * Math.PI * 52;
    function update() {
      const f = +fS.value, c = +cS.value, vi = f / c;
      fV.textContent = f; cV.textContent = c;
      num.textContent = vi.toFixed(2);
      const k = Math.min(1, vi / 3); // gauge tops out at VI = 3
      ring.style.strokeDashoffset = CIRC * (1 - k);
      let color, msg;
      if (vi < 0.8) { color = "#f87171"; msg = "Poor value. It costs more than it delivers, so it’s a prime target for a VE study."; }
      else if (vi < 1.2) { color = "#f59e0b"; msg = "Balanced. Now try to raise the function or lower the cost."; }
      else if (vi < 2) { color = "#22d3ee"; msg = "Good value. Benchmark it to confirm, then protect it."; }
      else { color = "#34d399"; msg = "Excellent value. This is what a VE success looks like, so use it more widely."; }
      ring.style.stroke = color; num.style.color = color;
      verdict.textContent = msg;
    }
    fS.addEventListener("input", update);
    cS.addEventListener("input", update);
    update();
  }

  /* ── Deep links: show the linked item straight away (no slide-in), so the browser's jump to it
        measures its real position and it lands just below the fixed nav ── */
  if (location.hash.length > 1) {
    let el = null;
    try { el = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) {}
    if (el) [el, el.closest("[data-reveal]")].forEach((n) => { if (n) { n.style.transition = "none"; n.classList.add("is-in"); } });
  }

  /* ── Footer year ── */
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
})();

/* ════════ World-class upgrades: dotnav, glossary, FAQ, FAST, funnel ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── Animated draw-in for FAST diagram, should-cost bar & funnel ── */
  const drawIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      drawIO.unobserve(e.target);
      e.target.classList.add("is-in");
      $$("[data-bar]", e.target).forEach((b) => b.classList.add("is-in"));
    });
  }, { threshold: 0.3 });
  ["#fastSvg", "#scBar", "#funnelChart", ".matrix"].forEach((sel) => {
    const el = $(sel);
    if (el) drawIO.observe(el);
  });

  /* ── Glossary live search ── */
  const gSearch = $("#gSearch");
  if (gSearch) {
    const terms = $$("#gGrid .g-term");
    const empty = $("#gEmpty");
    gSearch.addEventListener("input", () => {
      const q = gSearch.value.trim().toLowerCase();
      let shown = 0;
      terms.forEach((t) => {
        const hit = !q || t.textContent.toLowerCase().includes(q);
        t.classList.toggle("is-hidden", !hit);
        if (hit) shown++;
      });
      empty.hidden = shown > 0;
    });
  }

  /* ── FAQ: close others when one opens ── */
  const faqs = $$(".faq-item");
  faqs.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (d.open) faqs.forEach((o) => { if (o !== d && o.open) o.open = false; });
    });
  });

  /* ── Section dot navigation ── */
  const dotnav = $("#dotnav");
  if (dotnav) {
    const SECTIONS = [
      ["top", "Home"], ["about", "Value Engineering"], ["playbook", "The Playbook"],
      ["faq", "FAQ"], ["diagnose", "Diagnosis"], ["engage", "Begin"],
    ].filter(([id]) => document.getElementById(id));
    dotnav.innerHTML = SECTIONS.map(([id, label]) =>
      `<a href="#${id}" data-label="${label}" aria-label="${label}"></a>`).join("");
    const dots = $$("a", dotnav);
    const dotIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        dots.forEach((d) => d.classList.toggle("is-active", d.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-38% 0px -58% 0px" });
    SECTIONS.forEach(([id]) => dotIO.observe(document.getElementById(id)));
  }

  /* ── Back to top ── */
  const toTop = $("#toTop");
  if (toTop) {
    window.addEventListener("scroll", () => {
      toTop.classList.toggle("is-visible", scrollY > 700);
    }, { passive: true });
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ── Keyboard arrows on tab lists ── */
  [[".save-tab"], [".ind-tab"]].forEach(([sel]) => {
    const tabs = $$(sel);
    tabs.forEach((t, i) => {
      t.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { e.preventDefault(); next.focus(); next.click(); }
      });
    });
  });
})();

/* ════════ Lever Selector & Savings Estimator ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── Lever Selector ── */
  const LEVERS = {
    shouldcost: ["Should-Cost / Cleansheet Negotiation", "Sourcing", "Work out what parts should cost and negotiate the difference with facts.", "5–15% on quoted price"],
    lpp: ["Linear Performance Pricing", "Sourcing", "Plot price against weight or size across a part family and target the outliers.", "3–8% category spend"],
    rfq: ["Competitive RFQ & E-Auctions", "Sourcing", "Bring in qualified new suppliers and use e-auctions for stable commodities.", "5–20% tendered scope"],
    bundle: ["Supplier Consolidation & Bundling", "Sourcing", "Give more business to fewer, better suppliers in return for lower prices.", "5–12% bundled spend"],
    bcc: ["Best-Cost-Country Sourcing", "Sourcing", "Source from lower-cost regions, comparing the full landed cost.", "15–40% vs. high-cost base"],
    supvave: ["Supplier VAVE Workshops", "Sourcing", "Share savings with suppliers to get ideas your own team can’t see.", "3–7% supplier spend"],
    index: ["Raw-Material Indexation & Hedging", "Sourcing", "Link material prices to an index, negotiate the rest, and recover windfalls.", "avoids 2–5% lost to price swings"],
    matsub: ["Material Substitution", "Design", "Switch to cheaper materials that still do the job, such as plastic for metal.", "10–40% part cost"],
    partcount: ["Part-Count Reduction & Integration", "Design", "Combine parts using snap-fits, multi-purpose features or single castings.", "5–15% assembly cost"],
    dfma: ["DFM / DFA (DFMA)", "Design", "Keep only the parts you need, make them self-locating, assemble from one side.", "10–30% assembly time"],
    despec: ["Feature Rationalisation / De-speccing", "Design", "Remove features customers don’t value, based on real data.", "3–10% unit cost"],
    tol: ["Tolerance & Spec Optimisation", "Design", "Loosen tolerances that don’t matter and remove duplicate callouts.", "5–20% machining"],
    safety: ["Safety-Factor Right-Sizing", "Design", "Replace piled-up safety margins with ones checked by simulation.", "5–15% material"],
    platform: ["Modular Architecture & Platforms", "Design", "Build on shared cores with standard interfaces and late variation.", "15–30% dev + unit"],
    standard: ["Standardisation & Carry-Over", "Design", "Use preferred parts and reuse proven modules instead of new designs.", "savings from scale and quality"],
    auto: ["Automation & Robotics", "Manufacturing", "Use cobots, camera inspection and automated packing where cycle time justifies it.", "20–60% direct labour"],
    process: ["Process Substitution", "Manufacturing", "Pick the process that suits today’s volume, such as casting instead of machining.", "15–40% conversion"],
    makebuy: ["Make-vs-Buy Rebalancing", "Manufacturing", "Redo the make-or-buy sums with current wages, machine use and freight.", "10–20% moved scope"],
    yield: ["Yield & First-Pass Quality", "Manufacturing", "Cut scrap and rework with DOE, SPC and error-proofing.", "2–8% COGS"],
    tooling: ["Low-Cost Intelligent Tooling", "Manufacturing", "Match tool life to real volumes, and use family moulds and printed fixtures.", "30–50% tooling capex"],
    pack: ["Packaging Spec Optimisation", "Pack & Log", "Use the right board grade, remove layers and redesign the inner packing.", "10–30% packaging"],
    returnable: ["Returnable Packaging", "Pack & Log", "Replace one-way cardboard with reusable totes and racks.", "30–60% per-trip"],
    cube: ["Cube Utilisation & Mode Shift", "Pack & Log", "Fill containers better, ship by sea instead of air, and run milk runs.", "10–25% freight"],
    sku: ["SKU & Variant Rationalisation", "Complexity", "Cut low-selling variants to free up stock and changeovers.", "2–5% total COGS"],
    common: ["Commonality & Reuse Index", "Complexity", "Track shared parts as a KPI and reward reuse at design reviews.", "savings that grow over time"],
    warranty: ["Warranty & Lifecycle Cost Design", "Complexity", "Design out common warranty problems and make products easier to service.", "20–40% warranty spend"],
  };
  const PAIN_MAP = {
    bom: { shouldcost: 3, matsub: 3, lpp: 2, bcc: 2, supvave: 2, index: 1 },
    supplier: { shouldcost: 3, rfq: 3, index: 2, bundle: 2, lpp: 2, bcc: 1 },
    labour: { dfma: 3, partcount: 3, auto: 3, process: 2, makebuy: 1 },
    variants: { sku: 3, platform: 3, common: 3, standard: 2, despec: 1 },
    overspec: { despec: 3, safety: 3, tol: 3, matsub: 2, standard: 1 },
    warranty: { warranty: 3, yield: 3, tol: 2, dfma: 1, standard: 1 },
    logistics: { pack: 3, returnable: 3, cube: 3, bcc: 1, sku: 1 },
    lowvol: { platform: 3, standard: 2, tooling: 3, makebuy: 2, process: 2 },
  };
  const IND_BONUS = {
    auto: { supvave: 1.5, platform: 1.5, partcount: 1 },
    consumer: { pack: 1.5, sku: 1.5, matsub: 1 },
    heavy: { process: 1.5, safety: 1.5, platform: 1 },
    appliance: { platform: 1.5, standard: 1, matsub: 1 },
    aero: { matsub: 1.5, process: 1, shouldcost: 1 },
    electronics: { rfq: 1.5, shouldcost: 1, partcount: 1 },
    medical: { pack: 1.5, standard: 1, matsub: 1 },
    industrial: { index: 1.5, standard: 1, safety: 1 },
  };
  const selPains = $("#selPains");
  if (selPains) {
    const results = $("#selResults"), hint = $("#selHint"), industry = $("#selIndustry");
    function update() {
      const on = $$(".pain.is-on", selPains).map((b) => b.dataset.pain);
      $$(".pain", selPains).forEach((b) =>
        b.classList.toggle("is-off", on.length >= 3 && !b.classList.contains("is-on")));
      if (!on.length) { hint.hidden = false; results.innerHTML = ""; return; }
      hint.hidden = true;
      const score = {};
      on.forEach((p) => Object.entries(PAIN_MAP[p] || {}).forEach(([k, v]) => (score[k] = (score[k] || 0) + v)));
      Object.entries(IND_BONUS[industry.value] || {}).forEach(([k, v]) => { if (score[k]) score[k] += v; });
      const top = Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, 5);
      results.innerHTML = top.map(([k]) => {
        const [name, fam, desc, impact] = LEVERS[k];
        return `<li><b>${name}</b><small>${desc}</small><span class="sel-fam">${fam} · impact ${impact}</span></li>`;
      }).join("");
    }
    selPains.addEventListener("click", (e) => {
      const b = e.target.closest(".pain");
      if (!b || b.classList.contains("is-off")) return;
      b.classList.toggle("is-on");
      update();
    });
    industry.addEventListener("change", update);
  }

  /* ── Savings Estimator ── */
  const RANGES = { auto: [3, 8], consumer: [5, 12], heavy: [8, 15], appliance: [6, 12], aero: [5, 10], electronics: [10, 20], medical: [5, 10], industrial: [8, 15] };
  const eVol = $("#estVol");
  if (eVol) {
    const eCur = $("#estCur"), eCost = $("#estCost"), eInd = $("#estInd"), eWave = $("#estWave");
    const oSpend = $("#estSpend"), oSave = $("#estSave"), oUnit = $("#estUnit");
    const fmt = (n, cur) => {
      if (!isFinite(n)) return "—";
      const a = Math.abs(n);
      const s = a >= 1e9 ? (n / 1e9).toFixed(2) + "B" : a >= 1e6 ? (n / 1e6).toFixed(2) + "M" : a >= 1e3 ? (n / 1e3).toFixed(1) + "k" : n.toFixed(2);
      return cur + s;
    };
    function calc() {
      const vol = +eVol.value || 0, cost = +eCost.value || 0, cur = eCur.value;
      let [lo, hi] = RANGES[eInd.value] || [5, 12];
      if (eWave.value === "mature") { lo = 3; hi = 5; }
      const spend = vol * cost;
      oSpend.textContent = fmt(spend, cur);
      oSave.textContent = spend ? fmt(spend * lo / 100, cur) + " – " + fmt(spend * hi / 100, cur) : "—";
      oUnit.textContent = cost ? fmt(cost * lo / 100, cur) + " – " + fmt(cost * hi / 100, cur) + " per unit" : "—";
    }
    [eCur, eVol, eCost, eInd, eWave].forEach((el) => { el.addEventListener("input", calc); el.addEventListener("change", calc); });
    calc();
  }
})();

/* ════════ Value Diagnosis wizard ════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const stage = $("#wizStage");
  if (!stage) return;

  const QUESTIONS = [
    /* ── Part A · Symptoms ── */
    { id: "symptom", part: "Symptoms", q: "What's the main problem you're facing?", sub: "Pick the one that matters most right now.", opts: [
      ["cost", "Product cost is too high", "compared with your target cost or competitors' prices"],
      ["margin", "Margins are shrinking", "because of price pressure, inflation or selling more low-margin products"],
      ["warranty", "Warranty and quality costs are rising", "failures, claims, rework and recalls"],
      ["price", "We're losing deals on price", "competitors offer something similar for less"],
      ["complexity", "Too many product variants", "the extra complexity costs you in engineering, stock and quality"],
      ["npd", "A new product is over its cost target", "still in development and not launched yet"],
    ]},
    { id: "margin", part: "Symptoms", q: "How have your margins changed?", sub: "Compared with your target margin, over the last two to three years.", opts: [
      ["healthy", "Healthy and stable", "at or above your target"],
      ["pressure", "Steady, but under pressure", "customers won't accept price rises any more"],
      ["below", "Below target and falling", "costs are rising faster than our prices"],
      ["loss", "Some products lose money", "we know some products are sold at a loss"],
    ]},
    { id: "warranty", part: "Symptoms", q: "How are your warranty and quality costs?", sub: "Think about claims, rework, scrap and recalls.", opts: [
      ["low", "Under control", "steady, and under about 1% of revenue"],
      ["creep", "Slowly rising", "claims go up a little every year"],
      ["pain", "A big cost", "warranty is clearly hurting profits"],
      ["crisis", "Serious: recalls or field fixes", "we've had major quality problems"],
    ]},
    { id: "price", part: "Symptoms", q: "How does your price compare with similar products?", sub: "Compare products that do the same job, feature for feature.", opts: [
      ["win", "We win on value", "customers are happy to pay more for ours"],
      ["par", "About the same as others", "price doesn't win or lose us deals"],
      ["expensive", "We're 5–15% more expensive", "and it's costing us deals"],
      ["unknown", "We honestly don't know", "we've never compared features and prices properly"],
    ]},
    /* ── Part B · Cost risks ── */
    { id: "overspec", part: "Cost risks", q: "Where is your product most likely over-engineered?", sub: "Over-engineering is hidden cost, and most products have some.", opts: [
      ["none", "None that we know of", "our specs are about right and we review them regularly"],
      ["safety", "Old safety margins", "margins added over the years and never reviewed"],
      ["features", "Features customers don't use", "we think some features aren't valued by customers"],
      ["tolerance", "Tolerances tighter than needed", "drawing requirements nobody can explain any more"],
      ["material", "Expensive materials out of habit", "material grades chosen once and never questioned"],
    ]},
    { id: "complexity", part: "Cost risks", q: "How many different products and variants do you make?", sub: "Think about variants, SKUs and how much is custom-made.", opts: [
      ["standard", "A few standard products", "lots of shared parts across the range"],
      ["managed", "A manageable number of variants", "some shared platforms, some variants creeping in"],
      ["tail", "A long tail of variants", "many low-selling variants nobody wants to drop"],
      ["custom", "Almost everything is custom", "most orders are designed specially for the customer"],
    ]},
    { id: "material", part: "Cost risks", q: "How much do raw material price changes affect you?", sub: "For example steel, copper, plastics, electronics and energy.", opts: [
      ["hedged", "Linked to indices and hedged", "contracts separate material cost from processing cost"],
      ["partial", "Partially covered", "some prices are linked to indices, but we still lose money"],
      ["exposed", "Not protected at all", "supplier price rises are passed straight on to us"],
      ["unknown", "We don't track it", "we don't know how much of our prices is material cost"],
    ]},
    { id: "volume", part: "Cost risks", q: "Have your volumes changed a lot since the product was designed?", sub: "Processes chosen for the original volumes may no longer be the best fit.", opts: [
      ["same", "About as planned", "the process still suits the volume"],
      ["up", "Grown a lot", "doubled or more, so the process may no longer fit"],
      ["down", "Dropped a lot", "our tooling and automation are now more than we need"],
      ["mixed", "Shifted between variants", "the mix is very different from the plan"],
    ]},
    { id: "where", part: "Cost risks", q: "Where is most of the product's cost?", sub: "Your best guess is fine.", opts: [
      ["bom", "Bought-in parts and materials", "most of the cost is in what we buy from suppliers"],
      ["mfg", "In-house manufacturing", "machining, moulding, welding, forming, finishing"],
      ["labour", "Assembly labour", "the hours spent assembling by hand"],
      ["logistics", "Packaging and logistics", "freight, packaging and storage cost a lot"],
      ["unknown", "We don't know exactly", "we've never broken the cost down properly"],
    ]},
    /* ── Part C · Readiness ── */
    { id: "shouldcost", part: "Readiness", q: "How well do you know what your parts should cost?", sub: "Not what you pay, but what they ought to cost.", opts: [
      ["models", "We have should-cost estimates for most of what we buy", "from cleansheet models or software"],
      ["some", "A few rough estimates", "for some parts, when negotiations get difficult"],
      ["quotes", "We only have supplier quotes", "we accept the quote because we can't check it"],
    ]},
    { id: "teardown", part: "Readiness", q: "When did you last take apart a competitor's product?", sub: "Physically, part by part, with a cost for each part.", opts: [
      ["recent", "Within the last 12 months", "we do it regularly"],
      ["old", "Years ago", "we did it once and the findings are out of date"],
      ["never", "Never", "we've never done a proper teardown"],
    ]},
    { id: "stage", part: "Readiness", q: "What stage is the product at?", sub: "This decides whether you need value engineering (design) or value analysis (production).", opts: [
      ["dev", "In development", "not yet in production, and the design can still change"],
      ["early", "Early production", "launched recently, volumes still rising"],
      ["mature", "Established, high volume", "settled design with years of production ahead"],
      ["legacy", "Older, declining", "an old product that still sells in useful numbers"],
    ]},
    { id: "maturity", part: "Readiness", q: "Have you run proper VE studies before?", sub: "Be honest: it decides where to start.", opts: [
      ["never", "Never", "cost work has been one-off negotiations and budget cuts"],
      ["oneoff", "One-off workshops", "we tried it, but the results faded without follow-up"],
      ["program", "A regular programme", "we run regular rounds and want to do better"],
    ]},
  ];

  const SYMPTOM_VERDICT = {
    cost: ["This is a classic cost problem, and it can be solved.", "A gap between your cost and your target, or a competitor's cost, is exactly what the six-step job plan is for: work out your current cost, analyse the functions, and go after the mismatches part by part."],
    margin: ["Falling margins need a proper VE round, not a hunt for discounts.", "When you can't raise prices, you have to lower cost without taking away anything customers value. That means looking at design, sourcing and complexity together, based on what the product does."],
    warranty: ["Your cost problem is really a value problem.", "Rising warranty costs mean some functions aren't doing their job, while others are over-engineered. Function analysis of your most common failures finds both, and warranty savings are usually much bigger than savings on part prices."],
    price: ["You need to know their cost, not just their price.", "Losing on price means a competitor does the same job for less. A teardown and should-cost estimate show exactly where their advantage comes from, and VE then closes the gap."],
    complexity: ["Too many variants is a hidden cost you can fix.", "Every extra variant adds cost across the business. Cutting variants, sharing platforms and using common parts usually saves 2–5% of total cost of goods, with no change customers would notice."],
    npd: ["Good timing: 80% of the cost is decided during design.", "VE during development is worth about twice as much as the same effort after launch. Set cost targets for each part of the design and run function analysis at the next design review."],
  };

  function buildRecs(a) {
    const recs = [];
    const add = (t, d, href, label) => { if (!recs.some((r) => r[0] === t)) recs.push([t, d, href, label]); };

    // Lifecycle anchor play
    if (a.stage === "dev") add("Run VE at your next design review", "Cost can still be changed. Set cost targets for each part of the design and do function analysis before the design is frozen.", "job-plan/", "The job plan");
    else if (a.stage === "early") add("Fix quality first, then reduce cost", "Sort out quality first, then run a focused VA round. New products usually carry cost from the rush to launch that was never engineered out.", "job-plan/", "The job plan");
    else add("Run a VA round on the product you make now", "Take your own product apart, work out its current cost, and make changes in production that pay back within 12 months.", "job-plan/", "The job plan");

    // Urgent P&L symptoms
    if (a.margin === "loss") add("Deal with the loss-making products first", "Rank products by margin, then fix, re-price or drop the ones that lose money. It's the quickest way to improve profit.", "cost-levers/", "Cost levers");
    if (a.warranty === "pain" || a.warranty === "crisis" || a.symptom === "warranty") add("Analyse your most common failures by function", "Link warranty claims to functions, not parts. Then redesign the functions that fall short, and scale back the ones that are over-engineered.", "function-analysis/", "Function Analysis");
    if (a.symptom === "price" || a.price === "expensive" || a.price === "unknown") { if (a.teardown !== "recent") add("Take apart the competitor that's beating you", "Record their parts list, estimate what every part costs, and find exactly where their cost advantage comes from.", "benchmarking/", "Benchmarking"); }

    // Over-engineering
    if (a.overspec && a.overspec !== "none") {
      const focus = { safety: "safety margins, checked by simulation", features: "features customers don't value, backed by data", tolerance: "tolerances and surface finishes", material: "material grades" }[a.overspec];
      add("Remove over-engineering based on data, not opinion", `Where to look: ${focus}. Over-engineering is hidden cost. Function analysis shows where it is, and testing makes it safe to remove.`, "cost-levers/", "Cost levers");
    }

    // Complexity
    if (a.complexity === "tail" || a.complexity === "custom" || a.symptom === "complexity") add("Cut the low-selling variants", a.complexity === "custom" ? "Move from designing every order from scratch to building orders from standard modules, with standard interfaces and a controlled list of options." : "Rank variants by margin, drop or merge the ones at the bottom, and build the rest on shared platforms. The savings show up right across the business.", "cost-levers/", "Cost levers");

    // Commodity exposure
    if (a.material === "exposed" || a.material === "unknown") add("Separate material cost from processing cost", "Link the material part of the price to an index, negotiate the processing part, hedge the most volatile materials, and get money back when prices fall.", "cost-levers/", "Cost levers");

    // Volume drift
    if (a.volume === "up") add("Choose processes that suit today's volume", "Processes chosen for launch volumes are no longer the best fit once volumes double. Review casting versus machining, how much is automated, and the type of tooling.", "cost-levers/", "Cost levers");
    else if (a.volume === "down") add("Match tooling and make-or-buy to lower volumes", "Lower volumes change the numbers. Family tooling, outsourcing commodity steps and combining equipment stop overheads eating into margin.", "cost-levers/", "Cost levers");

    // Cost concentration
    if (a.where === "bom") add("Negotiate with suppliers using facts", "Estimate what your highest-spend parts should cost, and negotiate the difference using cleansheets and linear performance pricing. This typically saves 5–15% on quoted prices.", "cost-levers/", "Cost levers");
    else if (a.where === "labour") add("Design for easier assembly (DFMA)", "Using fewer parts and designing for easy assembly typically cuts assembly time by 10–30%, before you spend anything on automation.", "cost-levers/", "Cost levers");
    else if (a.where === "mfg") add("Reduce the cost of making it", "When most of the cost is in your own factories, the best levers are changing processes, cutting cycle times, and improving machine use (OEE) and yield.", "cost-levers/", "Cost levers");
    else if (a.where === "logistics") add("Apply VE to packaging and freight", "Packaging specs, reusable packaging and filling containers properly are the quickest levers to pay back.", "cost-levers/", "Cost levers");
    else if (a.where === "unknown") add("Find out where your cost is first", "You can't improve what you can't see. Build a costed parts list and a should-cost for your top 20 parts. Everything else builds on that.", "technology/", "Cost technology");

    // Capability
    if (a.shouldcost === "quotes") add("Stop negotiating without the facts", "Relying only on quotes leaves 5–15% on the table. Start building should-cost estimates for your most important parts, using software or cleansheets.", "technology/", "Cost technology");
    if (a.teardown === "never") add("Make competitor teardowns a habit", "One competitor teardown a year gives you more good ideas than any brainstorm. See the five-step process.", "benchmarking/", "Benchmarking");

    // Programme
    if (a.maturity === "never") add("Start with one product and one proper VE study", "Pick your highest-volume product, run the six-step job plan with a trained facilitator, and let the 8–15% from the first round make the case for more.", "training.html", "VE Academy");
    else if (a.maturity === "oneoff") add("Put a proper process in place", "Your workshops worked, but the follow-up didn't. A savings funnel with owners, stages and monthly reviews is what makes savings stick.", "governance/", "Savings funnel & KPIs");
    else add("Add AI tools to your cost work", "You already have the discipline. Now speed up the analysis with AI should-cost tools, spend analysis and AI-assisted idea generation.", "technology/", "Cost technology");

    return recs.slice(0, 5);
  }

  function opportunity(a) {
    let gaps = 0;
    if (a.shouldcost === "quotes") gaps += 2; else if (a.shouldcost === "some") gaps += 1;
    if (a.teardown === "never") gaps += 2; else if (a.teardown === "old") gaps += 1;
    if (a.maturity === "never") gaps += 2; else if (a.maturity === "oneoff") gaps += 1;
    if (a.where === "unknown") gaps += 1;
    if (a.overspec && a.overspec !== "none") gaps += 1;
    if (a.complexity === "tail" || a.complexity === "custom") gaps += 1;
    if (a.material === "exposed" || a.material === "unknown") gaps += 1;
    if (a.volume && a.volume !== "same") gaps += 1;
    if (a.margin === "below" || a.margin === "loss") gaps += 1;
    if (a.warranty === "pain" || a.warranty === "crisis") gaps += 1;
    if (a.price === "expensive" || a.price === "unknown") gaps += 1;
    if (gaps >= 7) return ["12–18%", "lots of untapped savings in several areas"];
    if (gaps >= 4) return ["10–15%", "big savings likely from a first round"];
    if (gaps >= 2) return ["8–12%", "good savings likely from a first round"];
    return ["3–5% / yr", "typical for an established programme, saved again every year"];
  }

  let step = 0;
  const answers = {};
  const stepLabel = $("#wizStep"), fill = $("#wizFill"), back = $("#wizBack"), restart = $("#wizRestart");

  function renderQuestion() {
    const Q = QUESTIONS[step];
    stepLabel.textContent = `${Q.part} · Question ${step + 1} of ${QUESTIONS.length}`;
    fill.style.width = (step / QUESTIONS.length) * 100 + "%";
    back.hidden = step === 0;
    restart.hidden = true;
    stage.innerHTML = `<div class="wiz-q">${Q.q}</div><div class="wiz-sub">${Q.sub}</div>
      <div class="wiz-opts">${Q.opts.map(([v, t, d]) =>
        `<button class="wiz-opt${answers[Q.id] === v ? " is-picked" : ""}" data-v="${v}"><span class="wo-dot"></span><span><b>${t}</b><small>${d}</small></span></button>`).join("")}</div>`;
    stage.querySelectorAll(".wiz-opt").forEach((btn) => btn.addEventListener("click", () => {
      answers[Q.id] = btn.dataset.v;
      btn.classList.add("is-picked");
      setTimeout(() => { step++; step < QUESTIONS.length ? renderQuestion() : renderResult(); }, 220);
    }));
  }

  function renderResult() {
    stepLabel.textContent = "Your diagnosis";
    fill.style.width = "100%";
    back.hidden = false;
    restart.hidden = false;
    const [head, body] = SYMPTOM_VERDICT[answers.symptom];
    const [opp, oppNote] = opportunity(answers);
    const recs = buildRecs(answers);
    const phase = answers.stage === "dev" ? ["VE", "design the cost out now"] : ["VA", "improve the product already in production"];
    const start = answers.maturity === "never" ? "One focused VE study" : answers.maturity === "oneoff" ? "A savings funnel with regular reviews" : "Add AI tools to your programme";
    const mailBody = encodeURIComponent(
      "Hi Avinash,\n\nI ran the Value Diagnosis on VAVEhub. My situation:\n" +
      QUESTIONS.map((Q) => `- ${Q.q} ${Q.opts.find((o) => o[0] === answers[Q.id])[1]}`).join("\n") +
      `\n\nPossible saving: ${opp}.\n\nI'd like to discuss how Value Engineering could help.\n`);
    stage.innerHTML = `<div class="wiz-result">
      <div class="wr-verdict"><h3>${head}</h3><p>${body}</p></div>
      <div class="wr-stats">
        <div class="wr-stat"><b>${opp}</b><span>possible cost saving: ${oppNote}</span></div>
        <div class="wr-stat"><b>${phase[0]}</b><span>${phase[1]}</span></div>
        <div class="wr-stat"><b>${start}</b><span>recommended starting point</span></div>
      </div>
      <h4>What we suggest you do</h4>
      <div class="wr-recs">${recs.map(([t, d, href, label], i) =>
        `<div class="wr-rec"><i>${i + 1}</i><span><b>${t}</b><small>${d} → <a href="${href}">${label}</a></small></span></div>`).join("")}</div>
      <div class="wr-actions">
        <a class="btn btn-primary" href="training.html">🎓 Learn how to fix this with the free course</a>
        <a class="btn btn-ghost" href="toolkit/">Get the free toolkit</a>
        <a class="btn btn-ghost" href="mailto:bhosale.avinash546@gmail.com?subject=${encodeURIComponent("Question about my Value Diagnosis")}&body=${mailBody}">Ask a question</a>
      </div></div>`;
  }

  back.addEventListener("click", () => { step = step >= QUESTIONS.length ? QUESTIONS.length - 1 : Math.max(0, step - 1); renderQuestion(); });
  restart.addEventListener("click", () => { step = 0; for (const k in answers) delete answers[k]; renderQuestion(); });
  renderQuestion();
})();

/* ════════ Newsletter, contact form & booking (config-driven) ════════ */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const cfg = window.VF_CONFIG || {};

  /* Calendly booking button appears when configured */
  const cal = $("#calendlyBtn");
  if (cal && cfg.calendlyUrl) { cal.href = cfg.calendlyUrl; cal.hidden = false; }

  /* Newsletter: Buttondown when configured, email-draft fallback otherwise */
  const nlForm = $("#nlForm");
  if (nlForm) {
    nlForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#nlEmail").value.trim();
      if (!email) return;
      if (cfg.buttondownUser) {
        const f = document.createElement("form");
        f.method = "POST";
        f.action = "https://buttondown.com/api/emails/embed-subscribe/" + cfg.buttondownUser;
        f.target = "_blank";
        const inp = document.createElement("input");
        inp.name = "email"; inp.value = email;
        f.appendChild(inp); document.body.appendChild(f); f.submit(); f.remove();
        nlForm.innerHTML = '<p class="nl-done">✓ Almost there — confirm the email we just sent you.</p>';
      } else {
        location.href = "mailto:bhosale.avinash546@gmail.com?subject=" +
          encodeURIComponent("Subscribe me to VAVEhub insights") +
          "&body=" + encodeURIComponent("Please add " + email + " to the monthly VE insights list.");
      }
    });
  }

  /* Contact form: Formspree when configured, email-draft fallback otherwise */
  const cform = $("#contactForm");
  if (cform) {
    cform.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#cfName").value.trim(), email = $("#cfEmail").value.trim(), msg = $("#cfMsg").value.trim();
      const status = $("#cfStatus"), btn = $("#cfSubmit");
      if (cfg.formspreeId) {
        btn.disabled = true; status.textContent = "Sending…";
        try {
          const res = await fetch("https://formspree.io/f/" + cfg.formspreeId, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ name, email, message: msg }),
          });
          if (!res.ok) throw new Error();
          cform.innerHTML = '<p class="cf-done">✓ Message sent — Avinash will get back to you shortly.</p>';
        } catch {
          status.textContent = "Couldn't send — try the email button above.";
          btn.disabled = false;
        }
      } else {
        location.href = "mailto:bhosale.avinash546@gmail.com?subject=" +
          encodeURIComponent("VAVEhub enquiry from " + name) +
          "&body=" + encodeURIComponent(msg + "\n\n— " + name + " (" + email + ")");
      }
    });
  }
})();

/* ── Timeline marquee: duplicate the lane once for a seamless right→left loop ── */
(function () {
  "use strict";
  const lane = document.getElementById("tlLane");
  if (!lane) return;
  const originals = Array.from(lane.children);
  originals.forEach((el) => {
    const clone = el.cloneNode(true);
    clone.classList.add("tl-clone");
    clone.setAttribute("aria-hidden", "true");
    lane.appendChild(clone);
  });
  // Keyboard focus inside a card pauses via :focus-within (CSS); nothing else needed.
})();
