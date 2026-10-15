/* ═══════════════════════════════════════════════════════════
   VAVEhub VE Academy — "Your week": spaced review and a weekly goal.
   · Each finished module comes back for review 1, 3, 7 and 21 days later.
     Three questions a day at most; a missed question returns the next day.
   · A weekly goal (modules a week), counted Monday to Sunday, instead of a daily streak.
   · A weekly calendar reminder (.ics), so no email service is needed.
   Data: localStorage "vh-review"; training.js copies it into the synced progress.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const track = (n) => { if (window.vhTrack) window.vhTrack(n); };
  const KEY = "vh-review", PER_DAY = 3;
  const GAPS = [2, 4, 14]; // days to the next review after stages 1–3 (so 1, 3, 7 and 21 days after finishing)
  const anchor = $("#trRoles");
  const POOL = window.VH_PRACTICE || [];
  if (!anchor || !POOL.length) return;

  // ── dates as local YYYY-MM-DD ──
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
  // when the next review is: anything already due rolls over to tomorrow once today's three are done
  const when = (s) => {
    const t = today(), tm = addDays(t, 1);
    if (s <= tm) return "tomorrow";
    const d = new Date(s + "T12:00:00");
    return "on " + d.toLocaleDateString("en-GB", s <= addDays(t, 6) ? { weekday: "long" } : { weekday: "long", day: "numeric", month: "long" });
  };
  const monday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };

  const keyOf = (q) => { let h = 5381; for (let i = 0; i < q.length; i++) h = ((h << 5) + h + q.charCodeAt(i)) | 0; return "q" + (h >>> 0).toString(36); };
  const BYKEY = {};
  POOL.forEach((x) => { BYKEY[keyOf(x.q)] = x; });

  const academy = () => { try { return JSON.parse(localStorage.getItem("vf-academy")) || {}; } catch { return {}; } };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  function store(rv) {
    rv.t = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(rv)); } catch {}
    if (window.VHAcademySync) window.VHAcademySync(); // training.js copies it into the cloud progress
  }

  // every finished module gets a review schedule, starting the day after it was finished
  function seed(rv) {
    const st = academy(), done = st.done || [], at = st.doneAt || {};
    rv.mods = rv.mods || {}; rv.miss = rv.miss || {};
    let changed = false;
    done.forEach((m) => {
      if (rv.mods[m] || !POOL.some((x) => x.mod === m)) return;
      const finished = at[m] ? iso(new Date(at[m])) : today();
      rv.mods[m] = { stage: 0, next: addDays(finished, 1) };
      changed = true;
    });
    return changed;
  }

  // today's questions: missed ones first, then one at a time from each module that is due
  function todaysSet(rv) {
    const d = today();
    const day = rv.day && rv.day.d === d ? rv.day : { d, keys: [], from: [], done: [], right: 0 };
    rv.day = day;
    // top up a set that was started before more became due (for example, before the first module was finished)
    if ((day.keys.length && day.done.length >= day.keys.length) || day.keys.length >= PER_DAY) return day;
    const keys = day.keys, from = day.from;
    Object.entries(rv.miss).filter(([k, due]) => due <= d && BYKEY[k] && !keys.includes(k)).sort((a, b) => (a[1] < b[1] ? -1 : 1))
      .forEach(([k]) => { if (keys.length < PER_DAY) keys.push(k); });
    const due = Object.entries(rv.mods).filter(([, s]) => s.stage < 4 && s.next <= d).sort((a, b) => (a[1].next < b[1].next ? -1 : 1)).map(([m]) => m);
    const recent = new Set((rv.seen || []).slice(-30));
    let guard = 0;
    while (keys.length < PER_DAY && due.length && guard++ < 50) {
      for (const m of due) {
        if (keys.length >= PER_DAY) break;
        const opts = POOL.filter((x) => x.mod === m).map((x) => keyOf(x.q)).filter((k) => !keys.includes(k));
        if (!opts.length) continue;
        const fresh = opts.filter((k) => !recent.has(k));
        const pick = (fresh.length ? fresh : opts)[Math.floor(Math.random() * (fresh.length ? fresh : opts).length)];
        keys.push(pick); if (!from.includes(m)) from.push(m);
      }
      if (due.every((m) => !POOL.some((x) => x.mod === m && !keys.includes(keyOf(x.q))))) break;
    }
    return day;
  }
  function nextDue(rv) {
    const dates = Object.values(rv.mods).filter((s) => s.stage < 4).map((s) => s.next).concat(Object.values(rv.miss));
    return dates.length ? dates.sort()[0] : null;
  }

  // ── weekly goal ──
  function week(rv) {
    const at = academy().doneAt || {}, start = monday().getTime();
    const n = Object.values(at).filter((t) => new Date(t).getTime() >= start).length;
    const left = 7 - ((new Date().getDay() + 6) % 7);
    return { n, goal: rv.goal || 0, left };
  }
  window.VHWeek = { summary: () => { const w = week(load()); return w.goal ? `This week: ${Math.min(w.n, w.goal)} of ${w.goal} module${w.goal > 1 ? "s" : ""}${w.n >= w.goal ? " ✓" : ""}` : ""; } };

  // ── calendar reminder (.ics) ──
  // calendar lines longer than 75 characters continue on the next line after a space (RFC 5545)
  const fold = (line) => { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = s.slice(74); } out.push(s); return out.join("\r\n "); };
  function ics(dow, time) {
    const [hh, mm] = time.split(":").map(Number);
    const d = new Date(); d.setHours(hh, mm, 0, 0);
    while (d.getDay() !== dow || d <= new Date()) d.setDate(d.getDate() + 1);
    const p = (n) => String(n).padStart(2, "0");
    const stamp = (x) => `${x.getFullYear()}${p(x.getMonth() + 1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`;
    const end = new Date(d.getTime() + 20 * 60000);
    const now = new Date(), utc = `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}00Z`;
    const url = "https://valueengineeringhub.com/training.html?review=1";
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VAVEhub//VE Academy//EN", "BEGIN:VEVENT",
      `UID:vavehub-review-${Date.now()}@valueengineeringhub.com`, `DTSTAMP:${utc}`, `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`,
      "RRULE:FREQ=WEEKLY", "SUMMARY:VE Academy: review and next module (20 min)",
      `DESCRIPTION:Three review questions and your next module.\\n${url}`, `URL:${url}`,
      "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:VE Academy", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].map(fold).join("\r\n");
  }

  // ── the panel ──
  const box = document.createElement("section");
  box.id = "vhWeek"; box.className = "vh-week"; box.setAttribute("aria-labelledby", "vhWeekTitle");
  anchor.insertAdjacentElement("afterend", box);

  function render() {
    const rv = load(), was = JSON.stringify(rv.day || null), seeded = seed(rv);
    const set = todaysSet(rv);
    if (seeded || JSON.stringify(rv.day) !== was) store(rv); // only save (and sync) when something changed
    const left = set.keys.filter((k) => !set.done.includes(k)).length;
    const w = week(rv), nd = nextDue(rv), anyDone = (academy().done || []).length > 0;
    let rev;
    if (!anyDone) rev = `<p>Finish a module and its questions come back for a quick review 1, 3, 7 and 21 days later. Short, spaced reviews are what make it stick.</p>`;
    else if (left) rev = `<p><b>${left} question${left > 1 ? "s" : ""} due today</b>, from ${set.from.length ? set.from.map((m) => esc(modTitle(m))).join(", ") : "questions you missed"}. About ${left} minute${left > 1 ? "s" : ""}.</p>
        <button type="button" class="btn btn-primary" id="rvStart">${set.done.length ? "Carry on" : "Start today's review"} →</button>`;
    else if (set.keys.length) rev = `<p>✓ Today's review is done: ${set.right} of ${set.keys.length} right.${nd ? ` Next one ${when(nd)}.` : ""}</p>`;
    else rev = `<p>Nothing due today.${nd ? ` Your next review is ${when(nd)}.` : " Every module you've finished has had all four reviews."}</p>`;
    const pct = w.goal ? Math.min(100, Math.round((w.n / w.goal) * 100)) : 0;
    box.innerHTML = `<h2 id="vhWeekTitle" class="vh-week-h">Your week</h2>
      <div class="vh-week-grid">
        <div class="vw-col"><h3>Review</h3>${rev}<div id="rvMount"></div></div>
        <div class="vw-col"><h3>Weekly goal</h3>
          ${w.goal ? `<p><b>${Math.min(w.n, w.goal)} of ${w.goal}</b> module${w.goal > 1 ? "s" : ""} this week${w.n >= w.goal ? ". Goal met ✓" : `, ${w.left} day${w.left > 1 ? "s" : ""} left`}.</p>
            <div class="vw-bar" role="progressbar" aria-label="Weekly goal" aria-valuemin="0" aria-valuemax="${w.goal}" aria-valuenow="${Math.min(w.n, w.goal)}"><i style="width:${pct}%"></i></div>`
          : `<p>People who set a weekly target finish far more often than those who just "fit it in".</p>`}
          <label class="vw-goal">Modules a week <select id="vwGoal"><option value="0">No goal</option>${[1, 2, 3, 4].map((n) => `<option value="${n}"${n === w.goal ? " selected" : ""}>${n}</option>`).join("")}</select></label>
          <details class="vw-cal"><summary>Add a weekly reminder to your calendar</summary>
            <div class="vw-cal-row"><label>Day <select id="vwDay">${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => `<option value="${(i + 1) % 7}"${i === 0 ? " selected" : ""}>${d}</option>`).join("")}</select></label>
            <label>Time <input type="time" id="vwTime" value="08:30" /></label>
            <button type="button" class="btn btn-ghost" id="vwIcs">⤓ Download (.ics)</button></div>
            <p class="vw-small">Opens in Outlook, Google Calendar or Apple Calendar. It repeats every week and links straight to your review.</p></details>
        </div>
      </div>`;
    const st = $("#rvStart", box); if (st) st.addEventListener("click", () => run());
    $("#vwGoal", box).addEventListener("change", (e) => { const r = load(); r.goal = +e.target.value || 0; store(r); track("goal-set"); render(); if (window.VHAcademyRefresh) window.VHAcademyRefresh(); });
    $("#vwIcs", box).addEventListener("click", () => {
      const blob = new Blob([ics(+$("#vwDay", box).value, $("#vwTime", box).value || "08:30")], { type: "text/calendar" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ve-academy-weekly.ics";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      track("calendar-reminder");
    });
  }
  function modTitle(m) { const s = document.querySelector(`.tmod[data-mod="${m}"]`); return s ? s.dataset.title : m; }

  // one question at a time; answers marked straight away, with the explanation
  function run() {
    const rv = load(), set = todaysSet(rv), mount = $("#rvMount", box);
    const queue = set.keys.filter((k) => !set.done.includes(k));
    if (!queue.length) { render(); return; }
    if (!set.done.length) track("review-start");
    const k = queue[0], q = BYKEY[k];
    const order = [...q.opts.keys()].sort(() => Math.random() - 0.5);
    mount.innerHTML = `<div class="rv-q"><p class="rv-meta">Question ${set.done.length + 1} of ${set.keys.length} · ${esc(modTitle(q.mod))}</p>
      <p class="rv-text" tabindex="-1">${q.q}</p>
      <div class="fd-self-opts" role="group" aria-label="Answers">${order.map((i) => `<button type="button" class="fnc-opt" data-i="${i}">${q.opts[i]}</button>`).join("")}</div>
      <p class="rv-fb" role="status" aria-live="polite"></p><div class="fd-actions rv-next"></div></div>`;
    const st = $("#rvStart", box); if (st) st.hidden = true;
    $(".rv-text", mount).focus();
    mount.addEventListener("click", function onPick(e) {
      const b = e.target.closest(".fnc-opt");
      if (!b) return;
      mount.removeEventListener("click", onPick);
      const right = +b.dataset.i === q.c, r = load(), day = todaysSet(r);
      $$(".fnc-opt", mount).forEach((o) => { o.disabled = true; if (+o.dataset.i === q.c) o.classList.add("is-right"); else if (o === b) o.classList.add("is-wrong"); });
      const fb = $(".rv-fb", mount);
      fb.textContent = (right ? "✓ Right. " : "✗ Not quite. It'll come back tomorrow. ") + (q.why || "");
      if (!right && window.VHMistakes) VHMistakes.attach(fb, b.textContent);
      day.done.push(k); if (right) day.right++;
      if (right) delete r.miss[k]; else r.miss[k] = addDays(today(), 1);
      r.seen = (r.seen || []).concat(k).slice(-60);
      r.hist = r.hist || {}; r.hist[day.d] = [day.right, day.done.length];
      const finished = day.done.length >= day.keys.length;
      if (finished) {
        // a module moves to its next, longer gap only if today's question on it was right; otherwise it stays put
        const missed = new Set(day.keys.filter((x) => r.miss[x] && BYKEY[x]).map((x) => BYKEY[x].mod));
        day.from.forEach((m) => {
          const s = r.mods[m]; if (!s || s.stage >= 4) return;
          if (missed.has(m)) { s.next = addDays(today(), 2); return; } // the missed question itself comes back tomorrow
          s.stage++; s.next = s.stage < 4 ? addDays(today(), GAPS[s.stage - 1]) : null;
        });
        track("review-done");
      }
      store(r);
      const nx = $(".rv-next", mount);
      nx.innerHTML = finished ? `<p class="fd-well">Done for today: ${day.right} of ${day.keys.length} right.</p><button type="button" class="btn btn-ghost">Close</button>`
        : '<button type="button" class="btn btn-primary">Next question →</button>';
      $("button", nx).addEventListener("click", () => (finished ? render() : run()));
      $("button", nx).focus();
    });
  }

  render();
  if (window.VHAcademyRefresh) window.VHAcademyRefresh(); // the welcome banner shows the weekly goal
  // keep it current: a module finished, the goal changed, progress arrived from another device
  document.addEventListener("click", (e) => { if (e.target.closest(".tmod-done")) setTimeout(render, 80); });
  document.addEventListener("vh-review-sync", render);
  if (/[?&]review=1\b/.test(location.search)) {
    setTimeout(() => { box.scrollIntoView({ block: "center" }); const s = $("#rvStart", box); if (s) s.click(); }, 400);
  }
})();
