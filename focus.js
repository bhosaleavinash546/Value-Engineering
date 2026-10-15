/* Focus mode for the VE Academy and VAVE for Leaders.
   Hides the site chrome so only the lesson is on screen, with a slim top bar (contents, text size, exit),
   a bottom bar (previous / next module) and, where the browser allows, real full screen.
   It drives each course through its own module list (#modNav), so locks, sign-in gates and progress
   keep working exactly as they do outside focus mode. */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const modNav = $("#modNav"), layout = $("#trLayout");
  if (!modNav || !layout) return;

  const KEY = "vh-focus", SIZE_KEY = "vh-focus-size";
  const SIZES = ["Normal", "Large", "Extra large"];
  const root = document.documentElement;
  const course = /leaders/.test(location.pathname) ? "VAVE for Leaders" : "VE Academy";
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const canFs = !!(document.fullscreenEnabled && root.requestFullscreen);

  const IC = {
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    shrink: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 8 6l5 12M5 14h6M14 18l3.5-8 3.5 8M15.2 15.5h4.6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  };

  const links = () => $$(".mod-link", modNav);
  const modOf = (id) => $(`.tmod[data-mod="${id}"]`);
  const tagOf = (id) => {
    const t = ($(".tmod-tag", modOf(id) || document.createElement("i")) || {}).textContent || "";
    return t.split("·")[0].trim();
  };
  const titleOf = (id) => (modOf(id) || {}).dataset ? modOf(id).dataset.title : "";
  const activeIndex = () => links().findIndex((l) => l.classList.contains("is-active"));

  /* ── "Focus mode" button on every module, beside "Module summary" ── */
  $$(".tmod-head").forEach((head) => {
    const tools = document.createElement("div");
    tools.className = "tmod-tools";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "fm-open";
    b.innerHTML = IC.expand + "<span>Focus mode</span>";
    b.title = "Hide everything except the lesson (F)";
    b.addEventListener("click", () => enter(true));
    tools.appendChild(b);
    const print = $(".tmod-print", head);
    if (print) tools.appendChild(print);
    head.appendChild(tools);
  });

  /* ── bars and contents panel ── */
  const bar = document.createElement("div");
  bar.className = "fm-bar fm-ui";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Focus mode");
  bar.innerHTML = `
    <button type="button" class="fm-ic" id="fmMenu" aria-label="Course contents" aria-expanded="false" aria-controls="fmDrawer">${IC.list}</button>
    <div class="fm-title"><small id="fmKicker"></small><b id="fmName"></b></div>
    <button type="button" class="fm-ic" id="fmSize" aria-label="Text size: Normal">${IC.text}</button>
    <button type="button" class="fm-exit" id="fmExit">${IC.shrink}<span>Exit focus</span><kbd>Esc</kbd></button>
    <i class="fm-prog" aria-hidden="true"><i id="fmProg"></i></i>`;
  const foot = document.createElement("nav");
  foot.className = "fm-foot fm-ui";
  foot.setAttribute("aria-label", "Module navigation");
  foot.innerHTML = `<button type="button" class="fm-nav" id="fmPrev"></button><span class="fm-where" id="fmWhere"></span><button type="button" class="fm-nav fm-next" id="fmNext"></button>`;
  const shade = document.createElement("div");
  shade.className = "fm-shade fm-ui";
  shade.hidden = true;
  const drawer = document.createElement("nav");
  drawer.className = "fm-drawer fm-ui";
  drawer.id = "fmDrawer";
  drawer.setAttribute("aria-label", "Course contents");
  drawer.hidden = true;
  const live = document.createElement("p");
  live.className = "sr-only";
  live.setAttribute("role", "status");
  document.body.append(bar, foot, shade, drawer, live);

  const menuBtn = $("#fmMenu"), sizeBtn = $("#fmSize");
  let active = false, fsByUs = false;

  function update() {
    if (!active) return;
    const ls = links(), i = activeIndex(), cur = ls[i];
    if (!cur) return;
    const id = cur.dataset.target;
    $("#fmKicker").textContent = course + " · " + tagOf(id);
    $("#fmName").textContent = titleOf(id);
    const prev = ls[i - 1], next = ls[i + 1];
    const pb = $("#fmPrev"), nb = $("#fmNext");
    pb.innerHTML = "<span aria-hidden=\"true\">←</span> " + (prev ? tagOf(prev.dataset.target) : "Course overview");
    pb.setAttribute("aria-label", prev ? "Previous: " + tagOf(prev.dataset.target) + ", " + titleOf(prev.dataset.target) : "Leave focus mode and go to the course overview");
    nb.hidden = !next;
    if (next) {
      nb.innerHTML = tagOf(next.dataset.target) + " <span aria-hidden=\"true\">→</span>";
      nb.setAttribute("aria-label", "Next: " + tagOf(next.dataset.target) + ", " + titleOf(next.dataset.target));
    }
    progress();
  }

  function progress() {
    if (!active) return;
    const mod = $(".tmod.is-visible");
    let pct = 0;
    if (mod) {
      const r = mod.getBoundingClientRect(), span = r.height - innerHeight + 140;
      pct = span > 0 ? Math.min(100, Math.max(0, Math.round(((80 - r.top) / span) * 100))) : 100;
    }
    $("#fmProg").style.width = pct + "%";
    const i = activeIndex(), cur = links()[i];
    if (cur) $("#fmWhere").textContent = tagOf(cur.dataset.target) + " · " + pct + "% read";
  }

  // keep the reader on the same paragraph when the page around it appears or disappears
  function anchor() {
    const mod = $(".tmod.is-visible");
    if (!mod) return null;
    const items = $$("h3, p, li, figure, .qcheck, .ve-lab, table", mod).filter((e) => e.getClientRects().length);
    // the first block that starts on screen; a big diagram cut off at the top would make the page jump
    const el = items.find((e) => e.getBoundingClientRect().top >= 60) || items.find((e) => e.getBoundingClientRect().bottom > 90);
    return el ? { el, top: el.getBoundingClientRect().top } : null;
  }
  function restore(a) {
    if (!a) return;
    const want = Math.max(a.top, 72);
    scrollTo({ top: a.el.getBoundingClientRect().top + scrollY - want, behavior: "instant" });
  }

  function enter(byUser) {
    if (active) return;
    const a = anchor();
    active = true;
    root.classList.add("vh-focus");
    store(KEY, "1");
    applySize();
    update();
    restore(a);
    if (byUser && canFs && !document.fullscreenElement) {
      root.requestFullscreen({ navigationUI: "hide" }).then(() => { fsByUs = true; }).catch(() => {});
    }
    if (byUser) { live.textContent = "Focus mode on. Press Escape to leave."; $("#fmExit").focus({ preventScroll: true }); }
  }

  function exit(toOverview) {
    if (!active) return;
    closeDrawer(false);
    const a = toOverview ? null : anchor();
    active = false;
    root.classList.remove("vh-focus", "fm-t1", "fm-t2");
    store(KEY, "0");
    if (document.fullscreenElement && fsByUs) document.exitFullscreen().catch(() => {});
    fsByUs = false;
    live.textContent = "Focus mode off.";
    if (toOverview) {
      const cat = $(".tr-catalog") || $(".tr-hero");
      if (cat) cat.scrollIntoView({ behavior: "instant", block: "start" });
    } else {
      restore(a);
      const h = $(".tmod.is-visible .fm-open");
      if (h) h.focus({ preventScroll: true });
    }
  }

  function go(link) {
    if (!link) return;
    link.click(); // the course's own handler: locks, sign-in gate and progress all apply
    scrollTo({ top: 0, behavior: "instant" });
    const h = $(".tmod.is-visible h2, .auth-gate.is-visible h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  /* ── text size ── */
  function applySize() {
    const s = Math.min(2, Math.max(0, parseInt(read(SIZE_KEY), 10) || 0));
    root.classList.toggle("fm-t1", active && s === 1);
    root.classList.toggle("fm-t2", active && s === 2);
    sizeBtn.setAttribute("aria-label", "Text size: " + SIZES[s] + ". Change text size");
    sizeBtn.dataset.size = String(s);
    return s;
  }
  sizeBtn.addEventListener("click", () => {
    const a = anchor();
    store(SIZE_KEY, String((applySize() + 1) % 3));
    const s = applySize();
    restore(a);
    live.textContent = "Text size: " + SIZES[s];
  });

  /* ── contents panel ── */
  function buildDrawer() {
    drawer.innerHTML = '<p class="fm-dh">Course contents</p>' + links().map((l) => {
      const id = l.dataset.target, tag = tagOf(id), n = (tag.match(/\d+/) || [""])[0];
      const state = l.classList.contains("is-locked") ? `<span class="fm-st" title="Sign in to open">${IC.lock}</span>`
        : l.classList.contains("is-done") ? '<span class="fm-st fm-done" title="Completed">✓</span>' : "";
      return `<button type="button" class="fm-item${l.classList.contains("is-active") ? " is-on" : ""}" data-target="${id}"${l.classList.contains("is-active") ? ' aria-current="true"' : ""}>
        <i>${n ? n.padStart(2, "0") : "🎓"}</i><span>${titleOf(id)}</span>${state}</button>`;
    }).join("");
  }
  function openDrawer() {
    buildDrawer();
    drawer.hidden = shade.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    root.classList.add("fm-drawer-open");
    const on = $(".fm-item.is-on", drawer) || $(".fm-item", drawer);
    if (on) on.focus();
  }
  function closeDrawer(returnFocus) {
    if (drawer.hidden) return;
    drawer.hidden = shade.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    root.classList.remove("fm-drawer-open");
    if (returnFocus !== false) menuBtn.focus();
  }
  menuBtn.addEventListener("click", () => (drawer.hidden ? openDrawer() : closeDrawer()));
  shade.addEventListener("click", () => closeDrawer());
  drawer.addEventListener("click", (e) => {
    const b = e.target.closest(".fm-item");
    if (!b) return;
    closeDrawer(false);
    go(links().find((l) => l.dataset.target === b.dataset.target));
  });
  drawer.addEventListener("keydown", (e) => { // keep Tab inside the open panel
    if (e.key !== "Tab") return;
    const items = $$(".fm-item", drawer), first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); menuBtn.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); menuBtn.focus(); }
  });

  /* ── buttons and keys ── */
  $("#fmExit").addEventListener("click", () => exit(false));
  $("#fmPrev").addEventListener("click", () => {
    const ls = links(), i = activeIndex();
    if (i > 0) go(ls[i - 1]); else exit(true);
  });
  $("#fmNext").addEventListener("click", () => { const ls = links(); go(ls[activeIndex() + 1]); });

  const typing = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    if ($(".rev-modal") || typing(e.target)) return; // a dialog or a text box has its own Esc
    if (e.key === "Escape" && active) {
      if (!drawer.hidden) closeDrawer(); else exit(false);
      e.preventDefault();
    } else if ((e.key === "f" || e.key === "F") && !e.repeat) {
      if (active) exit(false); else enter(true);
      e.preventDefault();
    }
  });
  // leaving the browser's full screen (its own Esc) also leaves focus mode
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && fsByUs) { fsByUs = false; exit(false); }
  });

  new MutationObserver(() => { update(); if (!drawer.hidden) buildDrawer(); })
    .observe(modNav, { subtree: true, attributes: true, attributeFilter: ["class"] });
  let ticking = false;
  addEventListener("scroll", () => {
    if (!active || ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; progress(); });
  }, { passive: true });
  addEventListener("resize", () => progress(), { passive: true });

  applySize();
  if (read(KEY) === "1") enter(false); // remembered from last time on this device
})();
