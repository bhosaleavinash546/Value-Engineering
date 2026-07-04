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
      p = Math.min(100, p + Math.random() * 16 + 5);
      fill.style.width = p + "%";
      count.textContent = Math.floor(p) + "%";
      if (p < 100) setTimeout(tick, 90);
      else setTimeout(() => { preloader.classList.add("is-done"); done(); setTimeout(() => preloader.remove(), 1200); }, 250);
    };
    setTimeout(tick, 120);
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
  $$(".hero-title .w").forEach((w, i) => w.style.setProperty("--d", 0.25 + i * 0.07 + "s"));

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
  const spyLinks = $$(".nav-links a[data-spy]");
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

  /* ── Generic tab engine (SAVE stepper + industries) ── */
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
      if (vi < 0.8) { color = "#f87171"; msg = "Value destroyer — cost outweighs function. Prime SAVE-study target."; }
      else if (vi < 1.2) { color = "#f59e0b"; msg = "Balanced — now engineer the ratio: function up, cost down."; }
      else if (vi < 2) { color = "#22d3ee"; msg = "Healthy value — benchmark it to prove it, then protect it."; }
      else { color = "#34d399"; msg = "Exceptional value — this is what a VE win looks like. Scale it."; }
      ring.style.stroke = color; num.style.color = color;
      verdict.textContent = msg;
    }
    fS.addEventListener("input", update);
    cS.addEventListener("input", update);
    update();
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
      ["top", "Home"], ["about", "Value Engineering"], ["save", "SAVE Job Plan"],
      ["fast", "Function Analysis"], ["levers", "Cost Levers"], ["ideation", "Ideation"],
      ["tech", "Technology"], ["benchmark", "Benchmarking"], ["industries", "Industries"],
      ["governance", "Savings Funnel"], ["toolkit", "Toolkit"], ["glossary", "Glossary"], ["faq", "FAQ"], ["diagnose", "Diagnosis"], ["engage", "Begin"],
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
    shouldcost: ["Should-Cost / Cleansheet Negotiation", "Sourcing", "Model what parts should cost and negotiate the gap with facts.", "5–15% on quoted price"],
    lpp: ["Linear Performance Pricing", "Sourcing", "Regress price vs. cost drivers across the family; attack the outliers.", "3–8% category spend"],
    rfq: ["Competitive RFQ & E-Auctions", "Sourcing", "Refresh the competitive set; auction spec-stable commodities.", "5–20% tendered scope"],
    bundle: ["Supplier Consolidation & Bundling", "Sourcing", "Fewer, better suppliers in exchange for step-change pricing.", "5–12% bundled spend"],
    bcc: ["Best-Cost-Country Sourcing", "Sourcing", "Total-landed-cost sourcing across best-cost regions.", "15–40% vs. high-cost base"],
    supvave: ["Supplier VAVE Workshops", "Sourcing", "Gain-share programmes surface ideas internal teams can't see.", "3–7% supplier spend"],
    index: ["Raw-Material Indexation & Hedging", "Sourcing", "Index the raw material, negotiate the conversion, claw back windfalls.", "kills 2–5% volatility"],
    matsub: ["Material Substitution", "Design", "Validated switches: metal→polymer, grade optimisation, recyclates.", "10–40% part cost"],
    partcount: ["Part-Count Reduction & Integration", "Design", "Combine parts via snap-fits, multi-functional geometry, castings.", "5–15% assembly cost"],
    dfma: ["DFM / DFA (DFMA)", "Design", "Minimum-part criteria, self-locating features, one-axis assembly.", "10–30% assembly time"],
    despec: ["Feature Rationalisation / De-speccing", "Design", "Remove features customers don't value — backed by data.", "3–10% unit cost"],
    tol: ["Tolerance & Spec Optimisation", "Design", "Open non-functional tolerances; kill redundant callouts.", "5–20% machining"],
    safety: ["Safety-Factor Right-Sizing", "Design", "Replace stacked legacy margins with CAE-validated factors.", "5–15% material"],
    platform: ["Modular Architecture & Platforms", "Design", "Common cores, standard interfaces, late differentiation.", "15–30% dev + unit"],
    standard: ["Standardisation & Carry-Over", "Design", "Preferred parts, proven modules, reuse over reinvention.", "scale + quality gains"],
    auto: ["Automation & Robotics", "Manufacturing", "Cobots, vision inspection, automated packing — cycle-time economics.", "20–60% direct labour"],
    process: ["Process Substitution", "Manufacturing", "Re-pick the process for today's volume: casting vs machining etc.", "15–40% conversion"],
    makebuy: ["Make-vs-Buy Rebalancing", "Manufacturing", "Re-run the math with current wages, utilisation and freight.", "10–20% moved scope"],
    yield: ["Yield & First-Pass Quality", "Manufacturing", "Attack scrap and rework Paretos with DOE, SPC, error-proofing.", "2–8% COGS"],
    tooling: ["Low-Cost Intelligent Tooling", "Manufacturing", "Right-size tool life; family moulds; printed jigs & fixtures.", "30–50% tooling capex"],
    pack: ["Packaging Spec Optimisation", "Pack & Log", "Right-size board grade, remove layers, redesign dunnage.", "10–30% packaging"],
    returnable: ["Returnable Packaging", "Pack & Log", "Durable totes and racks on closed loops replace one-way corrugate.", "30–60% per-trip"],
    cube: ["Cube Utilisation & Mode Shift", "Pack & Log", "Fill the container: knock-down designs, sea over air, milk runs.", "10–25% freight"],
    sku: ["SKU & Variant Rationalisation", "Complexity", "Kill the long tail; release inventory, changeovers and admin.", "2–5% total COGS"],
    common: ["Commonality & Reuse Index", "Complexity", "Manage % common parts as a KPI, rewarded at design gates.", "compounding gains"],
    warranty: ["Warranty & Lifecycle Cost Design", "Complexity", "Design out warranty Paretos; design in serviceability.", "20–40% warranty spend"],
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
    { id: "symptom", part: "Symptoms", q: "What is the primary problem you're facing?", sub: "Pick the one that hurts most right now.", opts: [
      ["cost", "Product cost is too high", "versus target cost or competitor price points"],
      ["margin", "Margins are shrinking", "price pressure, inflation, unfavourable mix"],
      ["warranty", "Warranty & quality costs are rising", "field failures, claims, rework, recalls"],
      ["price", "We're losing deals on price", "competitors deliver similar function for less"],
      ["complexity", "Too many variants / SKUs", "complexity is taxing engineering, inventory and quality"],
      ["npd", "New product is over its cost target", "still in development — hasn't launched yet"],
    ]},
    { id: "margin", part: "Symptoms", q: "How are product margins trending?", sub: "Against your target margin, over the last 2–3 years.", opts: [
      ["healthy", "Healthy and stable", "at or above target margin"],
      ["pressure", "Flat, but under pressure", "price increases no longer stick"],
      ["below", "Below target and sliding", "cost inflation is outpacing our pricing"],
      ["loss", "Some products lose money", "we ship negative-margin SKUs and know it"],
    ]},
    { id: "warranty", part: "Symptoms", q: "What's your warranty & quality cost situation?", sub: "Claims, rework, scrap, field campaigns.", opts: [
      ["low", "Under control", "stable, and below ~1% of revenue"],
      ["creep", "Creeping upward", "claims trending up year on year"],
      ["pain", "A significant cost line", "warranty visibly hurts the P&L"],
      ["crisis", "Acute — recalls or field campaigns", "we've had major quality events"],
    ]},
    { id: "price", part: "Symptoms", q: "How does your price compare for similar function?", sub: "Same performance, feature for feature.", opts: [
      ["win", "We win on value", "customers accept our premium"],
      ["par", "At par with the market", "we neither win nor lose on price"],
      ["expensive", "We're 5–15% more expensive", "and it's costing us deals"],
      ["unknown", "We honestly don't know", "no structured feature-price benchmarking"],
    ]},
    /* ── Part B · Product & cost exposures ── */
    { id: "overspec", part: "Exposures", q: "What's the strongest sign of over-engineering in your product?", sub: "Over-specification is invisible cost — most products carry some.", opts: [
      ["none", "None that we know of", "specs feel right-sized and challenged regularly"],
      ["safety", "Legacy safety factors", "margins stacked over generations, never revisited"],
      ["features", "Features customers don't use", "we suspect unvalued content in the product"],
      ["tolerance", "Tolerances tighter than needed", "print callouts nobody can justify anymore"],
      ["material", "Premium materials by habit", "grades chosen once and never challenged"],
    ]},
    { id: "complexity", part: "Exposures", q: "How complex is your product portfolio?", sub: "Variants, SKUs, engineer-to-order share.", opts: [
      ["standard", "Few, standardised products", "high commonality across the range"],
      ["managed", "Manageable variants", "some platform sharing, some proliferation"],
      ["tail", "A long tail of variants", "many low-volume SKUs nobody dares to kill"],
      ["custom", "Almost everything is custom", "engineer-to-order dominates our business"],
    ]},
    { id: "material", part: "Exposures", q: "How exposed are you to raw-material price swings?", sub: "Steel, copper, resins, electronics, energy.", opts: [
      ["hedged", "Indexed and hedged", "contracts split raw material from conversion"],
      ["partial", "Partially covered", "some indexation, plenty of leakage"],
      ["exposed", "Fully exposed", "supplier increases pass straight through to us"],
      ["unknown", "We don't track it", "no visibility of the material share in our prices"],
    ]},
    { id: "volume", part: "Exposures", q: "Have volumes changed significantly since the product was designed?", sub: "Processes chosen at design volumes drift off-optimum.", opts: [
      ["same", "Roughly as planned", "the process still fits the volume"],
      ["up", "Grown significantly", "2× or more — the process may be outgrown"],
      ["down", "Dropped significantly", "tooling and automation are now oversized"],
      ["mixed", "Shifted across variants", "the mix looks nothing like the plan"],
    ]},
    { id: "where", part: "Exposures", q: "Where does most of the product cost sit?", sub: "Your best guess is fine.", opts: [
      ["bom", "Purchased materials & components", "the BOM dominates — suppliers hold the cost"],
      ["mfg", "In-house manufacturing", "machining, moulding, welding, forming, finishing"],
      ["labour", "Assembly labour", "manual assembly hours drive the cost"],
      ["logistics", "Packaging & logistics", "freight, packaging and warehousing are heavy"],
      ["unknown", "Honestly — we don't know precisely", "we've never split cost down properly"],
    ]},
    /* ── Part C · Capability & readiness ── */
    { id: "shouldcost", part: "Readiness", q: "How well do you know what your parts should cost?", sub: "Not what you pay — what they should cost.", opts: [
      ["models", "We have should-cost models for most spend", "cleansheets or software-based models"],
      ["some", "Some ad-hoc estimates", "a few parts, when negotiations get tough"],
      ["quotes", "We rely on supplier quotes only", "the quote is the price — we can't challenge it"],
    ]},
    { id: "teardown", part: "Readiness", q: "When did you last tear down a competitor's product?", sub: "Physically, part by part, with costs attached.", opts: [
      ["recent", "Within the last 12 months", "benchmarking is part of our rhythm"],
      ["old", "Years ago", "we did it once — the insights are stale"],
      ["never", "Never", "we've never systematically torn one down"],
    ]},
    { id: "stage", part: "Readiness", q: "Where is the product in its lifecycle?", sub: "This decides whether it's VE (design) or VA (production).", opts: [
      ["dev", "In development — before production start", "requirements and design still movable"],
      ["early", "Early production", "launched recently, ramping volumes"],
      ["mature", "Mature, high-volume", "stable design, years of production ahead"],
      ["legacy", "Legacy / declining", "old product, still meaningful volumes"],
    ]},
    { id: "maturity", part: "Readiness", q: "Have you run structured VAVE before?", sub: "Honest answer — it shapes the starting point.", opts: [
      ["never", "Never", "cost work has been ad-hoc negotiations and budget cuts"],
      ["oneoff", "One-off workshops", "we've tried it — results faded without follow-up"],
      ["program", "A regular programme", "we run waves — looking to raise the game"],
    ]},
  ];

  const SYMPTOM_VERDICT = {
    cost: ["Classic cost-out territory — and highly solvable.", "A gap to target or competitor cost is exactly what the SAVE job plan was built for: baseline the cost, analyse the functions, and attack the mismatches part by part."],
    margin: ["Margin erosion needs a full value wave, not a discount hunt.", "When price can't move up, cost must move down without touching customer value — that's function-based cost optimisation across design, sourcing and complexity at once."],
    warranty: ["Your cost problem is a value mismatch in disguise.", "Rising warranty means certain functions are under-delivering while others are over-specified. Function analysis on the failure Paretos finds both — and warranty savings usually dwarf piece-price savings."],
    price: ["You need to know their cost, not just their price.", "Losing on price means a competitor delivers the same function for less. Teardown benchmarking plus should-cost tells you exactly where their advantage lives — then VE closes the gap."],
    complexity: ["Complexity is a cost lever hiding in plain sight.", "Variant proliferation quietly taxes every function. SKU rationalisation, platforming and commonality typically release 2–5% of total COGS with zero customer-visible change."],
    npd: ["Perfect timing — 80% of cost is committed in design.", "Value Engineering during development is worth roughly double what the same effort returns after launch. Design-to-cost targets plus function analysis at the next gate is the move."],
  };

  function buildRecs(a) {
    const recs = [];
    const add = (t, d, href, label) => { if (!recs.some((r) => r[0] === t)) recs.push([t, d, href, label]); };

    // Lifecycle anchor play
    if (a.stage === "dev") add("Run VE at the next design gate", "Cost is still movable — cascade design-to-cost targets to subsystems and run function analysis before the design freezes.", "#save", "SAVE Job Plan");
    else if (a.stage === "early") add("Stabilise, then optimise", "Lock quality first, then launch a focused VA wave — early-production products usually carry launch-rush cost that never got engineered out.", "#save", "SAVE Job Plan");
    else add("Run a VA wave on the running product", "Teardown your own product, baseline the cost, and harvest running-change savings with sub-12-month paybacks.", "#save", "SAVE Job Plan");

    // Urgent P&L symptoms
    if (a.margin === "loss") add("Triage the loss-makers first", "Pareto margin by SKU and fix, re-price or kill negative-margin products — the fastest P&L relief available.", "#levers", "Complexity Levers");
    if (a.warranty === "pain" || a.warranty === "crisis" || a.symptom === "warranty") add("Function-analyse your failure Paretos", "Map warranty claims to functions, not parts — then redesign the under-performing functions and de-spec the over-performing ones.", "#fast", "Function Analysis");
    if (a.symptom === "price" || a.price === "expensive" || a.price === "unknown") { if (a.teardown !== "recent") add("Tear down the competitor that's beating you", "Digitise their BOM, should-cost every part, and find exactly where their cost advantage lives.", "#benchmark", "Benchmarking"); }

    // Over-engineering
    if (a.overspec && a.overspec !== "none") {
      const focus = { safety: "CAE-validated safety-factor right-sizing", features: "data-backed feature rationalisation", tolerance: "tolerance and surface-spec optimisation", material: "material-grade optimisation" }[a.overspec];
      add("De-spec with data, not opinion", `Your flag: ${focus}. Over-engineering is invisible cost — function analysis makes it visible, validation makes it safe to remove.`, "#levers", "Design Levers");
    }

    // Complexity
    if (a.complexity === "tail" || a.complexity === "custom" || a.symptom === "complexity") add("Attack the variant long tail", a.complexity === "custom" ? "Move from engineer-to-order to configure-to-order: modular architecture, standard interfaces, controlled options." : "Pareto margin by SKU, kill or merge the tail, and platform what remains — complexity levers pay across the whole chain.", "#levers", "Complexity Levers");

    // Commodity exposure
    if (a.material === "exposed" || a.material === "unknown") add("Split raw material from conversion cost", "Index the material share, negotiate the conversion, hedge the volatile — and claw back windfalls when indices fall.", "#levers", "Sourcing Levers");

    // Volume drift
    if (a.volume === "up") add("Re-pick processes for today's volume", "Processes chosen at launch volumes are off-optimum after 2× growth: casting vs. machining, automation level, tooling class all deserve a re-run.", "#levers", "Manufacturing Levers");
    else if (a.volume === "down") add("Right-size tooling and make-vs-buy", "Falling volumes flip the economics: family tooling, outsourcing commodity steps and asset consolidation stop the overhead bleed.", "#levers", "Manufacturing Levers");

    // Cost concentration
    if (a.where === "bom") add("Get fact-based with suppliers", "Should-cost your top-spend parts and negotiate the gap with cleansheets and linear performance pricing — typically 5–15% on quoted prices.", "#levers", "Sourcing Levers");
    else if (a.where === "labour") add("DFMA the assembly", "Part-count reduction and design-for-assembly typically cut 10–30% of assembly time — before any automation spend.", "#levers", "Design Levers");
    else if (a.where === "mfg") add("Attack conversion cost", "Process substitution, cycle-time, OEE and yield levers bite hardest when cost sits in your own plants.", "#levers", "Manufacturing Levers");
    else if (a.where === "logistics") add("Value-engineer the packaging & freight", "Pack spec, returnables and cube utilisation are the fastest-payback levers in the book.", "#levers", "Packaging Levers");
    else if (a.where === "unknown") add("Build cost transparency first", "You can't optimise what you can't see: build a costed BOM and cleansheet your top 20 parts — everything else follows from that baseline.", "#tech", "Cost Technology");

    // Capability
    if (a.shouldcost === "quotes") add("Stop negotiating blind", "Relying on quotes alone leaves 5–15% on the table. Start should-cost modelling your A-parts — software or cleansheets.", "#tech", "Should-Cost Stack");
    if (a.teardown === "never") add("Make teardown benchmarking a habit", "One competitive teardown per year feeds your idea pipeline better than any brainstorm — see the 5-step process.", "#benchmark", "Benchmarking");

    // Programme
    if (a.maturity === "never") add("Start with one product, one SAVE study", "Pick your highest-volume line, run the 6-phase job plan with a trained facilitator, and let the first wave's 8–15% build the case.", "training.html", "VE Academy");
    else if (a.maturity === "oneoff") add("Install the operating system", "Your workshops worked — the follow-through didn't. A governed savings funnel with owners, stages and monthly reviews is what makes savings stick.", "#governance", "Governance & KPIs");
    else add("Add AI to your cost stack", "You have the discipline — now compress the analysis: AI should-costing, spend cubes and LLM-assisted ideation multiply a mature programme.", "#tech", "Technology Stack");

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
    if (gaps >= 7) return ["12–18%", "major untapped headroom across several fronts"];
    if (gaps >= 4) return ["10–15%", "large first-wave potential"];
    if (gaps >= 2) return ["8–12%", "solid first-wave potential"];
    return ["3–5% / yr", "mature-programme territory — compound it annually"];
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
    const phase = answers.stage === "dev" ? "VE — engineer it out in design" : "VA — optimise the running product";
    const start = answers.maturity === "never" ? "One focused SAVE study" : answers.maturity === "oneoff" ? "Governed savings funnel" : "AI-augmented programme";
    const mailBody = encodeURIComponent(
      "Hi Avinash,\n\nI ran the Value Diagnosis on VAVEhub. My situation:\n" +
      QUESTIONS.map((Q) => `- ${Q.q} ${Q.opts.find((o) => o[0] === answers[Q.id])[1]}`).join("\n") +
      `\n\nIndicated opportunity: ${opp}.\n\nI'd like to discuss how Value Engineering could help.\n`);
    stage.innerHTML = `<div class="wiz-result">
      <div class="wr-verdict"><h3>${head}</h3><p>${body}</p></div>
      <div class="wr-stats">
        <div class="wr-stat"><b>${opp}</b><span>indicated cost opportunity — ${oppNote}</span></div>
        <div class="wr-stat"><b>${phase.split(" — ")[0]}</b><span>${phase.split(" — ")[1]}</span></div>
        <div class="wr-stat"><b>${start}</b><span>recommended starting point</span></div>
      </div>
      <h4>Your recommended plays</h4>
      <div class="wr-recs">${recs.map(([t, d, href, label], i) =>
        `<div class="wr-rec"><i>${i + 1}</i><span><b>${t}</b><small>${d} → <a href="${href}">${label}</a></small></span></div>`).join("")}</div>
      <div class="wr-actions">
        <a class="btn btn-primary" href="training.html">🎓 Learn how to fix this — free course</a>
        <a class="btn btn-ghost" href="#toolkit">Get the free toolkit</a>
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
