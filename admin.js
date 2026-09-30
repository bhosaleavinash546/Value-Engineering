/* ════════════════════════════════════════════════════════════
   VAVEhub owner dashboard (admin.html)
   Data comes from one Supabase function, admin_dashboard(), which only
   answers for accounts listed in public.admins (see supabase-setup.sql).
   Everything learners typed (names, comments, sources) is inserted with
   textContent, never as HTML.
   Without Supabase (or with ?sample) it shows clearly labelled sample data.
   ════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const MODS = Array.from({ length: 13 }, (_, i) => "m" + (i + 1));
  const LMODS = Array.from({ length: 7 }, (_, i) => "l" + i); // VAVE for Leaders
  const LTITLE = ["Welcome", "Why VAVE, and why now", "VAVE in plain words", "How a VAVE study runs", "What VAVE delivers", "Why everyone, and why leaders", "Your first 90 days"];
  const isLeadersCert = (id) => /^VL-/.test(id || "");
  const DAY = 864e5;
  const REFRESH_MS = 60e3;
  const PAGE = 25;
  const params = new URLSearchParams(location.search);

  /* ── tiny DOM helper: h("div", {class: "x"}, "text", child) ── */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }
  const SVG = "http://www.w3.org/2000/svg";
  function s(tag, attrs) { const el = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v); return el; }

  /* ── formatting ── */
  const nf = new Intl.NumberFormat("en-GB");
  const fmtN = (n) => nf.format(Math.round(n || 0));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
  const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
  function ago(d) {
    if (!d) return "Never";
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 90) return "Just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    const days = Math.round(s / 86400);
    if (days < 31) return days + (days === 1 ? " day ago" : " days ago");
    return fmtDate(d);
  }
  const flag = (cc) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐");
  const countryName = (cc) => (cc ? window.VH_TZ.name(cc) : "Unknown");
  const ROLE = { design: "Design engineer", sourcing: "Buyer / sourcing", manager: "Manager / leader", all: "Chose 'show everything'" };
  const modName = (m) => (m[0] === "l" ? "Leaders module " : "Module ") + m.slice(1);

  /* ── turn the raw function result into learner records ── */
  function countryOf(tz, lang) {
    const byTz = tz && window.VH_TZ.country(tz);
    if (byTz) return byTz;
    const m = /^[a-z]{2,3}-([A-Z]{2})\b/.exec(lang || "");
    return m ? m[1] : null;
  }
  function normalise(raw) {
    const certs = (raw.certificates || []).map((c) => ({ id: c.id, userId: c.user_id, name: c.full_name, score: c.score, at: c.issued_at }));
    const certByUser = {};
    const leadCertByUser = {};
    certs.forEach((c) => {
      const map = isLeadersCert(c.id) ? leadCertByUser : certByUser;
      if (c.userId && (!map[c.userId] || c.score > map[c.userId].score)) map[c.userId] = c;
    });
    const users = (raw.users || []).map((u) => {
      const p = u.progress || {};
      const done = MODS.filter((m) => (p.done || []).includes(m));
      const seen = [u.last_seen_at, u.last_sign_in_at, u.progress_at].filter(Boolean).map((d) => +new Date(d));
      const cc = countryOf(u.timezone, u.language);
      const attempts = (p.attempts || []).filter((a) => a && a.t);
      const best = attempts.reduce((m, a) => Math.max(m, a.s || 0), p.exam && p.exam.score ? p.exam.score : 0);
      return {
        id: u.id, email: u.email || "", name: (u.name || "").trim() || (u.email || "").split("@")[0],
        created: u.created_at, lastSignIn: u.last_sign_in_at, lastSeen: u.last_seen_at,
        lastActive: seen.length ? new Date(Math.max(...seen)).toISOString() : null,
        confirmed: !!u.confirmed, tz: u.timezone, lang: u.language, device: u.device, source: u.source,
        cc, country: countryName(cc),
        done, doneAt: p.doneAt || {}, role: p.role || null, streak: (p.visits && p.visits.streak) || 0,
        quick: Object.keys(p.qc || {}).length,
        attempts, best, passed: !!(p.exam && p.exam.passed) || attempts.some((a) => a.p),
        cert: certByUser[u.id] || null,
        leaders: (() => {
          const L = (u.courses && u.courses.leaders) || null;
          if (!L) return null;
          const q = L.quiz || {};
          return { done: LMODS.filter((m) => (L.done || []).includes(m)), doneAt: L.doneAt || {}, attempts: (q.attempts || []).filter((a) => a && a.t),
            best: q.best || 0, passed: !!q.passed, at: L.updated_at || null, cert: leadCertByUser[u.id] || null };
        })(),
      };
    });
    const feedback = (raw.feedback || []).map((f) => ({ module: f.module, helpful: !!f.helpful, comment: f.comment || "", at: f.created_at }));
    return { at: raw.generated_at || new Date().toISOString(), users, certs, feedback };
  }

  /* ── sample data (no Supabase, or ?sample) ── */
  function sample() {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const PLACES = [["Asia/Kolkata", "en-IN", 30], ["Europe/London", "en-GB", 18], ["America/New_York", "en-US", 12], ["Europe/Berlin", "de-DE", 7], ["Asia/Dubai", "en-AE", 6],
      ["America/Chicago", "en-US", 5], ["Asia/Singapore", "en-SG", 4], ["Australia/Sydney", "en-AU", 4], ["Europe/Paris", "fr-FR", 3], ["Asia/Tokyo", "ja-JP", 3],
      ["America/Sao_Paulo", "pt-BR", 3], ["Africa/Johannesburg", "en-ZA", 2], ["Europe/Stockholm", "sv-SE", 2], [null, "en-US", 1]];
    const bag = PLACES.flatMap(([tz, lang, w]) => Array(w).fill([tz, lang]));
    const FIRST = ["Aarav", "Priya", "Rahul", "Sneha", "James", "Olivia", "Mohammed", "Fatima", "Lukas", "Anna", "Wei", "Yuki", "Carlos", "Maria", "Tom", "Emma", "Arjun", "Kavya", "Daniel", "Sofia"];
    const LAST = ["Sharma", "Patel", "Smith", "Brown", "Khan", "Müller", "Chen", "Tanaka", "Silva", "Jones", "Iyer", "Nair", "Garcia", "Wilson", "Kumar"];
    const SRC = ["direct", "direct", "direct", "google.com", "google.com", "linkedin.com", "linkedin.com", "youtube.com", "bing.com", "newsletter", "chatgpt.com"];
    const now = Date.now(), users = [], certs = [], feedback = [];
    for (let i = 0; i < 160; i++) {
      const created = now - 3 * 3600e3 - Math.pow(rnd(), 1.25) * 210 * DAY;
      const [tz, lang] = pick(bag);
      const fn = pick(FIRST), ln = pick(LAST), id = "sample-" + i;
      const depth = Math.min(13, Math.floor(Math.pow(rnd(), 0.9) * 15));
      const done = MODS.slice(0, depth), doneAt = {};
      done.forEach((m, k) => { doneAt[m] = new Date(Math.min(now, created + (k + 1) * rnd() * 3 * DAY)).toISOString(); });
      const attempts = [];
      if (depth === 13 && rnd() < 0.85) {
        let t = created + 14 * DAY * rnd() + 5 * DAY;
        for (let a = 0; a < 3; a++) {
          const sc = Math.round(55 + rnd() * 45); attempts.push({ t: new Date(Math.min(now, t)).toISOString(), s: sc, p: sc >= 80 });
          if (sc >= 80) break; t += 2 * DAY * rnd() + DAY;
        }
      }
      const passed = attempts.some((a) => a.p);
      const last = Math.min(now, created + rnd() * (now - created));
      users.push({ id, email: (fn + "." + ln + i).toLowerCase().replace(/ü/g, "u") + "@example.com", name: fn + " " + ln, created_at: new Date(created).toISOString(),
        last_sign_in_at: new Date(last).toISOString(), last_seen_at: new Date(last).toISOString(), confirmed: rnd() > 0.06, timezone: tz, language: lang,
        device: rnd() < 0.42 ? "phone" : rnd() < 0.08 ? "tablet" : "computer", source: pick(SRC),
        progress: { done, doneAt, attempts, role: rnd() < 0.7 ? pick(["design", "sourcing", "manager", "all"]) : undefined, visits: { streak: 1 + Math.floor(rnd() * 6) },
          qc: Object.fromEntries(done.map((m) => [m, true])), exam: passed ? { passed: true, score: Math.max(...attempts.map((a) => a.s)) } : undefined },
        courses: rnd() < 0.35 ? (() => {
          const n = 1 + Math.floor(rnd() * 7), ld = LMODS.slice(0, n), qa = [];
          if (n === 7 && rnd() < 0.8) { const sc = 50 + Math.round(rnd() * 5) * 10; qa.push({ t: new Date(Math.min(now, created + 2 * DAY)).toISOString(), s: sc, p: sc >= 70 }); }
          if (qa[0] && qa[0].p && rnd() < 0.7) certs.push({ id: "VL-S" + i.toString(36).toUpperCase(), user_id: id, full_name: fn + " " + ln, score: qa[0].s, issued_at: qa[0].t });
          return { leaders: { done: ld, doneAt: Object.fromEntries(ld.map((m) => [m, new Date(Math.min(now, created + DAY)).toISOString()])),
            quiz: { attempts: qa, best: qa[0] ? qa[0].s : 0, passed: !!(qa[0] && qa[0].p) }, updated_at: new Date(last).toISOString() } };
        })() : undefined });
      if (passed) { const best = attempts.find((a) => a.p); certs.push({ id: "VH-S" + i.toString(36).toUpperCase(), user_id: id, full_name: fn + " " + ln, score: best.s, issued_at: best.t }); }
    }
    const COMMENTS = ["More worked examples please", "The FAST diagram lab finally made it click.", "A bit long, but very clear.", "Would love a downloadable summary.", "Great case study.", "Audio was really helpful on my commute.", "Could use a video for this one."];
    for (let i = 0; i < 90; i++) {
      const m = i % 5 === 0 ? "l" + Math.floor(rnd() * 7) : "m" + (1 + Math.floor(Math.pow(rnd(), 1.4) * 13));
      feedback.push({ module: m, helpful: rnd() < 0.84, comment: rnd() < 0.15 ? pick(COMMENTS) : null, created_at: new Date(now - rnd() * 180 * DAY).toISOString() });
    }
    feedback.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { generated_at: new Date().toISOString(), users, certificates: certs, feedback };
  }

  /* ── state ── */
  const st = { data: null, range: "30", country: "all", sort: { key: "created", dir: -1 }, q: "", page: 0, tables: {}, sample: false, email: "" };
  try { const saved = JSON.parse(localStorage.getItem("vh-admin-view")) || {}; if (saved.range) st.range = saved.range; } catch (e) {}

  /* ── the filtered slice every card uses ── */
  function slice() {
    const d = st.data, now = Date.now();
    const days = st.range === "all" ? null : +st.range;
    const first = d.users.reduce((m, u) => Math.min(m, +new Date(u.created)), now);
    const from = days ? now - days * DAY : Math.min(first, now - DAY);
    const prevFrom = days ? from - days * DAY : null;
    const inC = (u) => st.country === "all" || (u.cc || "??") === st.country;
    const all = d.users.filter(inC);
    const byId = Object.fromEntries(d.users.map((u) => [u.id, u]));
    const within = (t) => t && +new Date(t) >= from;
    return {
      days, from, prevFrom, all,
      fresh: all.filter((u) => within(u.created)),
      prev: days ? all.filter((u) => +new Date(u.created) >= prevFrom && +new Date(u.created) < from) : null,
      active: all.filter((u) => within(u.lastActive)),
      certs: d.certs.filter((c) => within(c.at) && (st.country === "all" || (byId[c.userId] && inC(byId[c.userId])))),
      attempts: all.flatMap((u) => u.attempts.filter((a) => within(a.t))),
      feedback: d.feedback.filter((f) => within(f.at)),
    };
  }
  const periodName = () => ({ 7: "the last 7 days", 30: "the last 30 days", 90: "the last 90 days", 365: "the last 12 months" }[st.range] || "since launch");
  const inPeriod = () => (st.range === "all" ? "since launch" : "in " + periodName()); // "in the last 30 days" / "since launch"

  /* ── tooltip (hover and keyboard focus) ── */
  const tip = $("#tip");
  function showTip(target, value, label, evt) {
    tip.replaceChildren(h("b", {}, value), h("span", {}, label));
    tip.classList.add("show");
    const r = target.getBoundingClientRect();
    const x = evt && evt.clientX != null ? evt.clientX : r.left + r.width / 2;
    const y = evt && evt.clientY != null ? evt.clientY : r.top;
    const w = tip.offsetWidth, hgt = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + "px";
    tip.style.top = Math.max(8, y - hgt - 12) + "px";
  }
  const hideTip = () => tip.classList.remove("show");
  function hover(el, value, label) {
    el.addEventListener("pointermove", (e) => showTip(el, value, label, e));
    el.addEventListener("pointerleave", hideTip);
    el.addEventListener("focus", () => showTip(el, value, label));
    el.addEventListener("blur", hideTip);
  }

  /* ── building blocks ── */
  function tile(label, value, sub, extra) {
    return h("div", { class: "tile" + (extra && extra.hero ? " hero" : "") },
      h("p", { class: "tile-label" }, label), h("div", { class: "tile-value" }, value), sub ? h("div", { class: "tile-sub" }, sub) : null,
      extra && extra.meter != null ? h("div", { class: "meter", role: "img", "aria-label": extra.meter + "%" }, h("i", { style: `width:${Math.min(100, extra.meter)}%` })) : null);
  }
  function delta(now, before) {
    if (before == null) return null;
    if (!before) return now ? h("span", { class: "delta up" }, "▲ new") : null;
    const d = Math.round(((now - before) / before) * 100);
    if (!d) return h("span", { class: "delta" }, "no change");
    return h("span", { class: "delta " + (d > 0 ? "up" : "down") }, (d > 0 ? "▲ " : "▼ ") + Math.abs(d) + "%");
  }
  // A chart card with a "Table" toggle so every value is readable without hovering.
  function card(key, title, sub, chart, table, opts) {
    const showTable = !!st.tables[key];
    const btn = h("button", { class: "btn", type: "button", "aria-pressed": String(showTable) }, showTable ? "Chart" : "Table");
    const body = h("div", {});
    const paint = () => body.replaceChildren(st.tables[key] ? tableView(table) : chart());
    btn.addEventListener("click", () => { st.tables[key] = !st.tables[key]; btn.textContent = st.tables[key] ? "Chart" : "Table"; btn.setAttribute("aria-pressed", String(!!st.tables[key])); paint(); });
    paint();
    return h("section", { class: "card" + (opts && opts.wide ? " wide" : ""), "aria-label": title },
      h("div", { class: "card-h" }, h("div", {}, h("h2", {}, title), sub ? h("p", {}, sub) : null), table && table.rows.length ? btn : null), body);
  }
  function tableView(t) {
    if (!t.rows.length) return h("p", { class: "empty" }, "Nothing to show for this period.");
    return h("div", { class: "tbl-wrap chart-table" }, h("table", {},
      h("thead", {}, h("tr", {}, t.cols.map((c, i) => h("th", { class: i ? "num" : "", scope: "col" }, c)))),
      h("tbody", {}, t.rows.map((r) => h("tr", {}, r.map((v, i) => h(i ? "td" : "th", { class: i ? "num" : "", scope: i ? null : "row" }, v)))))));
  }

  // Horizontal bars: one series, one colour, value at the tip.
  function hbars(rows, opts) {
    if (!rows.length) return h("p", { class: "empty" }, (opts && opts.empty) || "Nothing to show for this period.");
    const max = Math.max(1, ...rows.map((r) => r.v));
    return h("div", { class: "hbars", role: "list" }, rows.map((r) => {
      const bar = h("span", { class: "hb-bar", style: `width:calc((100% - 5.5rem) * ${r.v / max})` });
      const row = h("div", { class: "hb", role: "listitem", tabindex: "0", "aria-label": `${r.label}: ${r.text || fmtN(r.v)}` },
        h("span", { class: "hb-l", title: r.label }, r.icon ? h("span", { "aria-hidden": "true" }, r.icon + " ") : null, r.label),
        h("span", { class: "hb-r" }, bar, h("span", { class: "hb-v" }, r.text || fmtN(r.v))));
      hover(row, r.text || fmtN(r.v), r.tip || r.label);
      return row;
    }));
  }
  const top = (map, n) => {
    const rows = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (rows.length <= n) return rows;
    const rest = rows.slice(n - 1).reduce((sum, r) => sum + r[1], 0);
    return rows.slice(0, n - 1).concat([["Other", rest]]);
  };
  const tally = (list, fn) => list.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m; }, {});
  const niceMax = (v) => {
    if (v <= 4) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(v / 4)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((st) => st * 4 >= v);
    return step * 4;
  };

  // Columns over time (SVG): ≤24px bars, 4px rounded tops, hairline grid.
  function columns(buckets, label) {
    const wrap = h("div", {});
    const draw = () => {
      const W = Math.max(280, wrap.clientWidth || 700), H = 230, L = 36, B = 26, T = 8, R = 4;
      const pw = W - L - R, ph = H - B - T, n = buckets.length;
      const max = niceMax(Math.max(1, ...buckets.map((b) => b.v)));
      const svg = s("svg", { class: "cols", width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label });
      for (let i = 0; i <= 4; i++) {
        const y = T + ph - (ph * i) / 4;
        svg.append(s("line", { class: i ? "gl" : "base", x1: L, x2: W - R, y1: y, y2: y }));
        const t = s("text", { class: "tick", x: L - 6, y: y + 4, "text-anchor": "end" }); t.textContent = fmtN((max * i) / 4); svg.append(t);
      }
      const slot = pw / n, bw = Math.max(2, Math.min(24, slot * 0.7));
      const every = Math.ceil(n / Math.max(1, Math.floor(pw / 64)));
      buckets.forEach((b, i) => {
        const cx = L + slot * i + slot / 2, bh = (ph * b.v) / max, x = cx - bw / 2, y = T + ph - bh;
        const hit = s("rect", { class: "hit", role: "img", x: L + slot * i, y: T, width: slot, height: ph, tabindex: "0", "aria-label": `${b.full}: ${fmtN(b.v)} sign-ups` });
        const r = Math.min(4, bw / 2, bh);
        const bar = s("path", { class: "bar", d: bh > 0 ? `M${x},${T + ph} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${T + ph} Z` : "" });
        svg.append(hit, bar);
        hover(hit, fmtN(b.v) + (b.v === 1 ? " sign-up" : " sign-ups"), b.full);
        if (i % every === 0 || i === n - 1 && n < 10) {
          const t = s("text", { class: "tick", x: cx, y: H - 8, "text-anchor": "middle" }); t.textContent = b.label; svg.append(t);
        }
      });
      wrap.replaceChildren(svg);
    };
    requestAnimationFrame(draw);
    new ResizeObserver(() => draw()).observe(wrap);
    return wrap;
  }
  function signupBuckets(sl) {
    const now = Date.now(), span = now - sl.from;
    const unit = span <= 31 * DAY ? "day" : span <= 190 * DAY ? "week" : "month";
    const start = new Date(sl.from); start.setHours(0, 0, 0, 0);
    if (unit === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    if (unit === "month") start.setDate(1);
    const buckets = [];
    for (let d = new Date(start); d <= now; ) {
      const next = new Date(d);
      if (unit === "day") next.setDate(d.getDate() + 1); else if (unit === "week") next.setDate(d.getDate() + 7); else next.setMonth(d.getMonth() + 1);
      const lab = unit === "month" ? d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const full = unit === "day" ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
        : unit === "week" ? "Week of " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      buckets.push({ from: +d, to: +next, label: lab, full, v: 0 });
      d = next;
    }
    sl.fresh.forEach((u) => { const t = +new Date(u.created); const b = buckets.find((x) => t >= x.from && t < x.to); if (b) b.v++; });
    return { buckets, unit };
  }

  /* ── render ── */
  function render() {
    const d = st.data, sl = slice(), dash = $("#dash");
    const verified = sl.all.filter((u) => u.confirmed).length;
    const started = sl.all.filter((u) => u.done.length > 0).length;
    const finished = sl.all.filter((u) => u.done.length === 13).length;
    const passes = sl.attempts.filter((a) => a.p).length;
    const helpful = sl.feedback.filter((f) => f.helpful).length;
    const period = periodName(), inP = inPeriod();

    // filters: one row above everything they scope
    const ranges = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["365", "12 months"], ["all", "All time"]];
    const seg = h("div", { class: "seg", role: "group", "aria-label": "Time period" }, ranges.map(([k, t]) =>
      h("button", { type: "button", "aria-pressed": String(st.range === k), onclick: () => { st.range = k; st.page = 0; try { localStorage.setItem("vh-admin-view", JSON.stringify({ range: k })); } catch (e) {} render(); } }, t)));
    const ccCounts = tally(d.users, (u) => u.cc || "??");
    const sel = h("select", { id: "fCountry", onchange: (e) => { st.country = e.target.value; st.page = 0; render(); } },
      h("option", { value: "all" }, "All countries"),
      Object.entries(ccCounts).sort((a, b) => b[1] - a[1]).map(([cc, n]) => h("option", { value: cc, selected: st.country === cc }, `${cc === "??" ? "Unknown" : countryName(cc)} (${n})`)));
    const filters = h("div", { class: "filters" }, seg, h("label", { class: "fl", for: "fCountry" }, "Country", sel));

    const kpi1 = h("div", { class: "kpis" },
      tile("Learners signed up", fmtN(sl.all.length), `${fmtN(verified)} verified their email · ${fmtN(sl.all.length - verified)} haven't yet`, { hero: true }),
      tile("New sign-ups", fmtN(sl.fresh.length), sl.prev ? h("span", {}, delta(sl.fresh.length, sl.prev.length), ` vs the ${sl.days} days before (${fmtN(sl.prev.length)})`) : "Since the first sign-up"),
      tile("Active learners", fmtN(sl.active.length), `Used the site ${inP}`),
      tile("Certificates issued", fmtN(sl.certs.length), st.range === "all" ? "Since launch" : `${inP[0].toUpperCase() + inP.slice(1)} · ${fmtN(d.certs.length)} in total`));
    const kpi2 = h("div", { class: "kpis kpis-2" },
      tile("Started the course", pct(started, sl.all.length) + "%", `${fmtN(started)} of ${fmtN(sl.all.length)} finished at least one module`, { meter: pct(started, sl.all.length) }),
      tile("Finished all 13 modules", fmtN(finished), `${pct(finished, sl.all.length)}% of learners`, { meter: pct(finished, sl.all.length) }),
      tile("Exam pass rate", sl.attempts.length ? pct(passes, sl.attempts.length) + "%" : "—", sl.attempts.length ? `${fmtN(passes)} passes from ${fmtN(sl.attempts.length)} attempts · average score ${Math.round(sl.attempts.reduce((a, x) => a + x.s, 0) / sl.attempts.length)}%` : `No exam attempts ${inP}`),
      tile("Modules rated helpful", sl.feedback.length ? pct(helpful, sl.feedback.length) + "%" : "—", sl.feedback.length ? `${fmtN(helpful)} of ${fmtN(sl.feedback.length)} ratings ${inP}` : `No ratings ${inP}`));

    // sign-ups over time
    const { buckets, unit } = signupBuckets(sl);
    const cSign = card("signups", "Sign-ups over time", `New learners per ${unit}, ${period}`,
      () => (sl.fresh.length ? columns(buckets, `New sign-ups per ${unit}`) : h("p", { class: "empty" }, "No sign-ups in this period.")),
      { cols: [unit[0].toUpperCase() + unit.slice(1), "Sign-ups"], rows: buckets.filter((b) => b.v).map((b) => [b.full, fmtN(b.v)]) }, { wide: true });

    // who signed up in this period
    const cRows = top(tally(sl.fresh, (u) => u.cc || "??"), 10).map(([cc, v]) => ({ label: cc === "Other" ? "Other countries" : cc === "??" ? "Unknown" : countryName(cc), icon: cc === "Other" || cc === "??" ? "🌐" : flag(cc), v, text: `${fmtN(v)} · ${pct(v, sl.fresh.length)}%` }));
    const cCountry = card("country", "Countries", "Learners who signed up in this period, estimated from their device's time zone",
      () => hbars(cRows), { cols: ["Country", "Learners"], rows: cRows.map((r) => [r.label, r.text]) });

    const funnel = MODS.map((m) => ({ label: modName(m), v: sl.fresh.filter((u) => u.done.includes(m)).length }))
      .concat([{ label: "Passed the exam", v: sl.fresh.filter((u) => u.passed).length }]);
    funnel.forEach((r) => { r.text = `${fmtN(r.v)} · ${pct(r.v, sl.fresh.length)}%`; r.tip = `${r.label}: ${pct(r.v, sl.fresh.length)}% of learners who signed up in this period`; });
    const cFunnel = card("funnel", "Course progress", "How far this period's learners have got: completed each module",
      () => (sl.fresh.length ? hbars(funnel) : h("p", { class: "empty" }, "No sign-ups in this period.")), { cols: ["Stage", "Learners"], rows: funnel.map((r) => [r.label, r.text]) });

    const srcRows = top(tally(sl.fresh, (u) => u.source || "Not recorded yet"), 8).map(([k, v]) => ({ label: k === "direct" ? "Typed the address / bookmark" : k, v, text: `${fmtN(v)} · ${pct(v, sl.fresh.length)}%` }));
    const cSrc = card("source", "How they found VAVEhub", "The website that first sent each learner here",
      () => hbars(srcRows), { cols: ["Source", "Learners"], rows: srcRows.map((r) => [r.label, r.text]) });

    const devRows = top(tally(sl.fresh, (u) => u.device || "Not recorded yet"), 4).map(([k, v]) => ({ label: k[0].toUpperCase() + k.slice(1), icon: k === "phone" ? "📱" : k === "tablet" ? "📱" : k === "computer" ? "💻" : "❔", v, text: `${fmtN(v)} · ${pct(v, sl.fresh.length)}%` }));
    const cDev = card("device", "Phone or computer", "What learners used most recently",
      () => hbars(devRows), { cols: ["Device", "Learners"], rows: devRows.map((r) => [r.label, r.text]) });

    const roleRows = top(tally(sl.fresh, (u) => (u.role ? ROLE[u.role] || u.role : "Didn't choose")), 6).map(([k, v]) => ({ label: k, v, text: `${fmtN(v)} · ${pct(v, sl.fresh.length)}%` }));
    const cRole = card("role", "Learner roles", "The role picked in the Academy's 'Tailor the course' chips",
      () => hbars(roleRows), { cols: ["Role", "Learners"], rows: roleRows.map((r) => [r.label, r.text]) });

    // feedback per module: helpful vs not (two series → legend)
    const fb = MODS.map((m) => { const l = sl.feedback.filter((f) => f.module === m); const y = l.filter((f) => f.helpful).length; return { m, y, n: l.length - y, t: l.length }; });
    const fbChart = () => {
      if (!sl.feedback.length) return h("p", { class: "empty" }, "No ratings in this period.");
      const rows = fb.filter((r) => r.t);
      return h("div", {},
        h("div", { class: "legend" }, h("span", {}, h("i", { class: "s1" }), "👍 Helpful"), h("span", {}, h("i", { class: "s2" }), "👎 Not really")),
        h("div", { class: "hbars", role: "list" }, rows.map((r) => {
          const row = h("div", { class: "hb", role: "listitem", tabindex: "0", "aria-label": `${modName(r.m)}: ${r.y} helpful, ${r.n} not really` },
            h("span", { class: "hb-l" }, modName(r.m)),
            h("span", { class: "hb-r" }, h("span", { class: "stk", style: "width:calc(100% - 5.5rem)" }, r.y ? h("b", { class: "s1", style: `flex:${r.y}` }) : null, r.n ? h("b", { class: "s2", style: `flex:${r.n}` }) : null),
              h("span", { class: "hb-v" }, pct(r.y, r.t) + "% ", h("small", {}, `of ${r.t}`))));
          hover(row, `${pct(r.y, r.t)}% helpful`, `${modName(r.m)}: ${r.y} 👍 · ${r.n} 👎`);
          return row;
        })));
    };
    const comments = sl.feedback.filter((f) => f.comment).slice(0, 30);
    const cFb = card("feedback", "Module feedback", "Answers to 'Was this module helpful?' (anonymous, so the country filter doesn't apply)",
      () => h("div", {}, fbChart(), comments.length ? h("h3", { class: "sr-only" }, "Comments") : null,
        comments.length ? h("ul", { class: "comments", "aria-label": "Latest comments" }, comments.map((f) => h("li", {}, "“" + f.comment + "”",
          h("div", { class: "meta" }, `${f.helpful ? "👍" : "👎"} ${modName(f.module)} · ${fmtDate(f.at)}`)))) : null),
      { cols: ["Module", "Helpful", "Not really", "Helpful %"], rows: fb.filter((r) => r.t).map((r) => [modName(r.m), fmtN(r.y), fmtN(r.n), pct(r.y, r.t) + "%"]) });

    // recent certificates
    const byId = Object.fromEntries(d.users.map((u) => [u.id, u]));
    const cCert = card("certs", "Recent certificates", `Issued ${inP}`,
      () => (sl.certs.length ? h("ul", { class: "comments" }, sl.certs.slice(0, 20).map((c) => h("li", {},
        h("strong", {}, c.name), ` scored ${c.score}%`,
        h("div", { class: "meta" }, `${byId[c.userId] ? flag(byId[c.userId].cc) + " " + byId[c.userId].country + " · " : ""}${fmtDate(c.at)} · `,
          h("a", { href: "verify.html?id=" + encodeURIComponent(c.id), target: "_blank", rel: "noopener" }, c.id))))) : h("p", { class: "empty" }, "No certificates in this period.")),
      { cols: ["Name", "Score", "Issued", "Certificate"], rows: sl.certs.map((c) => [c.name, c.score + "%", fmtDate(c.at), c.id]) });

    // VAVE for Leaders (the 1-hour course): signed-in learners only
    const lead = sl.all.filter((u) => u.leaders && u.leaders.done.length);
    const leadNew = lead.filter((u) => +new Date(u.leaders.at || u.created) >= sl.from);
    const lFinished = lead.filter((u) => u.leaders.done.length === 7).length;
    const lPassed = lead.filter((u) => u.leaders.passed).length;
    const lCerts = sl.certs.filter((c) => isLeadersCert(c.id)).length;
    const lFunnel = LMODS.map((m, i) => ({ label: `Module ${i} · ${LTITLE[i]}`, v: lead.filter((u) => u.leaders.done.includes(m)).length }))
      .concat([{ label: "Passed the quiz", v: lPassed }]);
    lFunnel.forEach((r) => { r.text = `${fmtN(r.v)} · ${pct(r.v, lead.length)}%`; });
    const lfb = LMODS.map((m, i) => { const l = sl.feedback.filter((f) => f.module === m); const y = l.filter((f) => f.helpful).length; return { m, i, y, t: l.length }; }).filter((r) => r.t);
    const cLead = card("leaders", "VAVE for Leaders", "The 1-hour crash course. Only learners who signed in are counted; anyone can take it without an account.",
      () => h("div", {},
        h("div", { class: "kpis kpis-2", style: "margin-bottom:1rem" },
          tile("Learners on the course", fmtN(lead.length), `${fmtN(leadNew.length)} active ${inP}`),
          tile("Finished all 7 modules", fmtN(lFinished), `${pct(lFinished, lead.length)}% of them`),
          tile("Passed the quiz", fmtN(lPassed), `${pct(lPassed, lead.length)}% of them`),
          tile("Leaders certificates", fmtN(lCerts), `Issued ${inP}`)),
        lead.length ? hbars(lFunnel) : h("p", { class: "empty" }, "No signed-in learners have started the course yet."),
        lfb.length ? h("div", { style: "margin-top:1rem" }, h("h3", { class: "tile-label" }, "Module ratings"),
          hbars(lfb.map((r) => ({ label: `Module ${r.i} · helpful`, v: Math.max(1, pct(r.y, r.t)), text: `${pct(r.y, r.t)}% of ${r.t}`, tip: `${r.y} of ${r.t} said it was helpful` })))) : null),
      { cols: ["Stage", "Learners"], rows: lFunnel.map((r) => [r.label, r.text]) }, { wide: true });

    dash.classList.remove("refetching");
    dash.replaceChildren(
      st.sample ? h("p", { class: "sample-note", role: "note" }, h("strong", {}, "Sample data. "), "These learners are made up so you can see how the dashboard works. ",
        st.live ? h("a", { href: "admin.html" }, "Show real data") : "Real data appears once Supabase is connected.") : null,
      h("h1", { class: "sr-only" }, "Owner dashboard"),
      filters, kpi1, kpi2,
      h("div", { class: "grid" }, cSign, cCountry, cFunnel, cSrc, cDev, cRole, cFb, cCert, cLead),
      usersCard(sl),
      h("p", { class: "foot-note" }, "Countries are estimated from each learner's time zone (or their browser language if the time zone is missing). Details are recorded when a learner next opens the Academy, so people who haven't been back since this dashboard launched show as \"Unknown\" or \"Not recorded yet\"."));
  }

  /* ── learners table ── */
  const COLS = [
    ["name", "Learner", (u) => u.name.toLowerCase()],
    ["country", "Country", (u) => u.country],
    ["created", "Signed up", (u) => +new Date(u.created)],
    ["active", "Last active", (u) => (u.lastActive ? +new Date(u.lastActive) : 0)],
    ["progress", "Modules", (u) => u.done.length],
    ["exam", "Best exam score", (u) => u.best],
  ];
  function usersCard(sl) {
    const q = st.q.trim().toLowerCase();
    let list = sl.fresh.filter((u) => !q || [u.name, u.email, u.country, u.source || "", u.cert ? u.cert.id : ""].join(" ").toLowerCase().includes(q));
    const col = COLS.find((c) => c[0] === st.sort.key) || COLS[2];
    list = list.slice().sort((a, b) => { const x = col[2](a), y = col[2](b); return (x > y ? 1 : x < y ? -1 : 0) * st.sort.dir; });
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    st.page = Math.min(st.page, pages - 1);
    const rows = list.slice(st.page * PAGE, st.page * PAGE + PAGE);

    const search = h("input", { type: "search", placeholder: "Search name, email, country, source or certificate", "aria-label": "Search learners", value: st.q });
    search.addEventListener("input", () => { st.q = search.value; st.page = 0; const card = usersCard(slice()); $("#usersCard").replaceWith(card); const s2 = $("#usersCard input[type=search]"); s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); });
    const csv = h("button", { class: "btn", type: "button", onclick: () => downloadCsv(list) }, "⬇ Download CSV");

    const head = h("tr", {}, COLS.map(([k, t]) => {
      const on = st.sort.key === k;
      return h("th", { scope: "col", class: k === "progress" || k === "exam" ? "num" : "", "aria-sort": on ? (st.sort.dir > 0 ? "ascending" : "descending") : "none" },
        h("button", { type: "button", onclick: () => { st.sort = { key: k, dir: on ? -st.sort.dir : (k === "name" || k === "country" ? 1 : -1) }; $("#usersCard").replaceWith(usersCard(slice())); $(`#usersCard th[aria-sort]:not([aria-sort="none"]) button`).focus(); } },
          t, h("span", { "aria-hidden": "true" }, on ? (st.sort.dir > 0 ? "▲" : "▼") : "")));
    }), h("th", { scope: "col" }, "Certificate"));
    const body = rows.map((u) => h("tr", { class: "clickable", onclick: (e) => { if (!e.target.closest("button,a")) openDetail(u); } },
      h("td", {}, h("button", { type: "button", class: "u-btn", style: "all:unset;cursor:pointer", onclick: () => openDetail(u), "aria-label": "Open details for " + u.name },
        h("div", { class: "u-name" }, u.name), h("div", { class: "u-mail" }, u.email))),
      h("td", {}, h("span", { "aria-hidden": "true" }, flag(u.cc) + " "), u.country),
      h("td", { title: fmtDateTime(u.created) }, fmtDate(u.created), u.confirmed ? null : h("div", {}, h("span", { class: "chip muted" }, "✉ Email not verified"))),
      h("td", { title: fmtDateTime(u.lastActive) }, ago(u.lastActive)),
      h("td", { class: "num" }, h("span", { class: "prog" }, `${u.done.length}/13`, h("span", { class: "meter", "aria-hidden": "true" }, h("i", { style: `width:${(u.done.length / 13) * 100}%` })))),
      h("td", { class: "num" }, u.attempts.length || u.best ? h("span", {}, u.best + "% ", u.passed ? h("span", { class: "chip good" }, "✓ Passed") : h("span", { class: "chip bad" }, "✗ Not yet")) : "—"),
      h("td", {}, u.cert ? h("a", { href: "verify.html?id=" + encodeURIComponent(u.cert.id), target: "_blank", rel: "noopener" }, u.cert.id) : "—")));

    const pager = h("div", { class: "pager" },
      `${list.length ? st.page * PAGE + 1 : 0}–${Math.min(list.length, (st.page + 1) * PAGE)} of ${fmtN(list.length)}`,
      h("button", { class: "btn", type: "button", disabled: st.page === 0, onclick: () => { st.page--; $("#usersCard").replaceWith(usersCard(slice())); } }, "← Previous"),
      h("button", { class: "btn", type: "button", disabled: st.page >= pages - 1, onclick: () => { st.page++; $("#usersCard").replaceWith(usersCard(slice())); } }, "Next →"));

    return h("section", { class: "card wide", id: "usersCard", "aria-label": "Learners", style: "margin-top:12px" },
      h("div", { class: "card-h" }, h("div", {}, h("h2", {}, "Learners"), h("p", {}, `Everyone who signed up ${inPeriod()}. Select a learner to see everything about them.`))),
      h("div", { class: "users-tools" }, search, csv),
      list.length ? h("div", { class: "tbl-wrap" }, h("table", {}, h("caption", { class: "sr-only" }, "Learners, sortable by column"), h("thead", {}, head), h("tbody", {}, body)))
        : h("p", { class: "empty" }, q ? "No learners match your search." : "No sign-ups in this period."),
      list.length > PAGE ? pager : null);
  }

  function downloadCsv(list) {
    const cell = (v) => { let t = v == null ? "" : String(v); if (/^[=+\-@]/.test(t)) t = "'" + t; return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const rows = [["Name", "Email", "Email verified", "Country", "Time zone", "Language", "Device", "Source", "Signed up", "Last active", "Modules completed", "Best exam score", "Passed exam", "Exam attempts", "Certificate", "Role", "Leaders modules", "Leaders quiz best", "Leaders certificate"]]
      .concat(list.map((u) => [u.name, u.email, u.confirmed ? "Yes" : "No", u.country, u.tz || "", u.lang || "", u.device || "", u.source || "", u.created, u.lastActive || "",
        u.done.length, u.best || "", u.passed ? "Yes" : "No", u.attempts.length, u.cert ? u.cert.id : "", u.role ? ROLE[u.role] || u.role : "",
        u.leaders ? u.leaders.done.length : 0, u.leaders && u.leaders.attempts.length ? u.leaders.best : "", u.leaders && u.leaders.cert ? u.leaders.cert.id : ""]));
    const blob = new Blob(["﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `vavehub-learners-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ── one learner in detail ── */
  const dlg = $("#detail");
  function openDetail(u) {
    const fact = (k, v) => h("div", {}, h("dt", {}, k), h("dd", {}, v == null || v === "" ? "—" : v));
    const close = h("button", { class: "btn", type: "button", onclick: () => dlg.close() }, "Close");
    dlg.replaceChildren(
      h("div", { class: "detail-h" }, h("div", {}, h("h2", { id: "detailName" }, u.name), h("p", {}, u.email)), close),
      h("div", { class: "detail-b" },
        h("dl", { class: "facts" },
          fact("Country (estimated)", flag(u.cc) + " " + u.country),
          fact("Time zone", u.tz), fact("Language", u.lang), fact("Device", u.device ? u.device[0].toUpperCase() + u.device.slice(1) : null),
          fact("Found us via", u.source === "direct" ? "Typed the address / bookmark" : u.source),
          fact("Signed up", fmtDateTime(u.created)), fact("Email verified", u.confirmed ? "✓ Yes" : "✗ Not yet"),
          fact("Last signed in", fmtDateTime(u.lastSignIn)), fact("Last active", ago(u.lastActive)),
          fact("Role", u.role ? ROLE[u.role] || u.role : "Didn't choose"), fact("Visit streak", u.streak ? u.streak + (u.streak === 1 ? " day" : " days") : null),
          fact("Quick checks passed", u.quick + " of 13")),
        h("h3", {}, `Modules completed: ${u.done.length} of 13`),
        h("div", { class: "mods" }, MODS.map((m) => h("span", { class: u.done.includes(m) ? "on" : "" }, (u.done.includes(m) ? "✓ " : "") + modName(m),
          h("small", {}, u.doneAt[m] ? fmtDate(u.doneAt[m]) : u.done.includes(m) ? "Done" : "Not yet")))),
        h("h3", {}, "Exam attempts"),
        u.attempts.length ? h("div", { class: "tbl-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Date"), h("th", { class: "num", scope: "col" }, "Score"), h("th", { scope: "col" }, "Result"))),
          h("tbody", {}, u.attempts.slice().reverse().map((a) => h("tr", {}, h("td", {}, fmtDateTime(a.t)), h("td", { class: "num" }, a.s + "%"),
            h("td", {}, a.p ? h("span", { class: "chip good" }, "✓ Passed") : h("span", { class: "chip bad" }, "✗ Below 80%")))))))
          : h("p", { class: "empty", style: "text-align:left;padding:0" }, u.best ? `Best score ${u.best}% (attempt history started when this dashboard launched).` : "No exam attempts yet."),
        h("h3", {}, "VAVE for Leaders"),
        u.leaders ? h("p", {}, `${u.leaders.done.length} of 7 modules · quiz ${u.leaders.attempts.length ? "best " + u.leaders.best + "%" + (u.leaders.passed ? " ✓ passed" : "") : "not taken yet"}`,
          u.leaders.cert ? h("span", {}, " · ", h("a", { href: "verify.html?id=" + encodeURIComponent(u.leaders.cert.id), target: "_blank", rel: "noopener" }, "Verify " + u.leaders.cert.id)) : null)
          : h("p", { class: "empty", style: "text-align:left;padding:0" }, "Not started (or taken without signing in)."),
        h("h3", {}, "Academy certificate"),
        u.cert ? h("p", {}, `${u.cert.name}, ${u.cert.score}%, issued ${fmtDate(u.cert.at)} · `, h("a", { href: "verify.html?id=" + encodeURIComponent(u.cert.id), target: "_blank", rel: "noopener" }, "Verify " + u.cert.id))
          : h("p", { class: "empty", style: "text-align:left;padding:0" }, "No certificate yet.")));
    dlg.showModal();
    close.focus();
  }
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  /* ── gate messages ── */
  function gate(title, text, actions) {
    $("#dash").hidden = true;
    const g = $("#gate"); g.hidden = false;
    g.replaceChildren(h("h1", {}, title), ...(Array.isArray(text) ? text : [h("p", {}, text)]), actions ? h("p", {}, actions) : null);
  }

  /* ── loading ── */
  let client = null, timer = null, busy = false;
  async function fetchData() {
    if (st.sample) return sample();
    const { data, error } = await client.rpc("admin_dashboard");
    if (error) throw error;
    return data;
  }
  async function load(first) {
    if (busy) return; busy = true;
    const btn = $("#refresh"), dash = $("#dash");
    document.body.classList.add("is-loading");
    if (!first) dash.classList.add("refetching"); // hold the previous render, no flash
    try {
      const raw = await fetchData();
      st.data = normalise(raw);
      $("#gate").hidden = true; dash.hidden = false; btn.hidden = false;
      render();
      $("#updated").textContent = "Updated " + new Date(st.data.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      handleError(e);
    } finally {
      busy = false; document.body.classList.remove("is-loading"); dash.classList.remove("refetching");
    }
  }
  function handleError(e) {
    const msg = String((e && (e.message || e.code)) || e);
    if (e && e.code === "42501" || /only the site owner|permission denied/i.test(msg)) {
      clearInterval(timer);
      gate("This account can't open the dashboard", `You're signed in as ${st.email || "a learner account"}, which isn't an owner account.`,
        h("button", { class: "btn btn-primary", type: "button", onclick: signOut }, "Sign out and use another account"));
    } else if (e && (e.code === "PGRST202" || e.code === "42883") || /could not find the function|does not exist/i.test(msg)) {
      clearInterval(timer);
      gate("One setup step left", [h("p", {}, "The dashboard needs a new piece of database setup before it can show your learners."),
        h("ol", {}, h("li", {}, "Open supabase.com/dashboard → your project → SQL Editor → New query."),
          h("li", {}, "Paste the whole of ", h("code", {}, "supabase-setup.sql"), " from the website's code, and click Run."),
          h("li", {}, "Come back here and refresh the page."))],
        h("a", { class: "btn", href: "admin.html?sample" }, "Preview with sample data"));
    } else if (st.data) {
      $("#updated").textContent = "Couldn't refresh. Showing earlier data.";
    } else {
      gate("Couldn't load the dashboard", /failed to fetch|network/i.test(msg)
        ? "We couldn't reach Supabase. Check your connection. If it keeps happening, open supabase.com/dashboard and make sure the project isn't paused."
        : "Something went wrong: " + msg, h("button", { class: "btn btn-primary", type: "button", onclick: () => load(true) }, "Try again"));
    }
  }
  async function signOut() { try { if (window.VHCloud) await VHCloud.signOut(); } catch (e) {} location.href = "auth.html?next=admin.html"; }

  /* ── theme toggle ── */
  const themeBtn = $("#theme");
  const paintTheme = () => { themeBtn.textContent = document.documentElement.dataset.theme === "light" ? "☀️" : "🌙"; };
  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("vf-theme", next); } catch (e) {}
    paintTheme();
  });
  paintTheme();
  $("#refresh").addEventListener("click", () => load(false));
  $("#signout").addEventListener("click", signOut);

  /* ── start ── */
  (async function start() {
    st.live = !!(window.VHCloud && VHCloud.live);
    st.sample = !st.live || params.has("sample");
    if (!st.sample) {
      await VHCloud.ready;
      client = VHCloud.client();
      if (!client) return gate("Couldn't load the dashboard", "The sign-in library didn't load. Check your connection and refresh the page.");
      const { data } = await client.auth.getSession();
      const session = data && data.session;
      if (!session) {
        return gate("Sign in to see your dashboard", "This page is only for the site owner. Sign in with your owner account and you'll come straight back here.",
          h("a", { class: "btn btn-primary", href: "auth.html?next=admin.html" }, "Sign in"));
      }
      st.email = session.user && session.user.email;
      $("#signout").hidden = false;
    }
    await load(true);
    timer = setInterval(() => { if (document.visibilityState === "visible") load(false); }, REFRESH_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && st.data && Date.now() - new Date(st.data.at) > REFRESH_MS) load(false);
    });
  })();
})();
