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
      ["governance", "Savings Funnel"], ["glossary", "Glossary"], ["faq", "FAQ"], ["engage", "Begin"],
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
