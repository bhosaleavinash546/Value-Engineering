/* ════════════════════════════════════════════════════════════
   ValueForge — motion & interaction engine
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
    const COLORS = ["rgba(34,211,238,", "rgba(139,92,246,", "rgba(245,158,11,"];
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
            ctx.strokeStyle = "rgba(139,92,246," + (1 - d / LINK) * 0.22 + ")";
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
      ["governance", "Savings Funnel"], ["toolkit", "Toolkit"], ["glossary", "Glossary"], ["faq", "FAQ"], ["engage", "Begin"],
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
