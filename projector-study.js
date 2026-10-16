/* VAVEhub · the VH-3600 value study, phases 1–6 (case-study.html).
   Everything is worked out from projector-data.js: the report's bill of materials, its 20 VAVE ideas and its
   factory data. Function costs are each part's cost shared out among the jobs it does. Worth is the lowest
   cost shown to do the same job reliably, so cost ÷ worth (the value index) shows where money is being lost. */
(function () {
  const D = window.VH_PROJ; if (!D || !D.funcs) return;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const gbp = (v, dp = 2) => (v < 0 ? "−" : "") + "£" + Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const k = (v) => (v >= 1e6 ? "£" + (v / 1e6).toFixed(2) + "m" : "£" + Math.round(v / 1e3) + "k");
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  const r2 = (v) => Math.round(v * 100) / 100;
  const R = D.report, UNITS = R.volume;
  const C = window.VH_COST || {};
  const BOM = C.BOM || sum(D.lines, (l) => l.ext), LANDED = C.DDP || BOM + 27.60 + 9.90;
  const FN = Object.fromEntries(D.funcs.map((f) => [f.id, f]));
  const V = D.ideas.filter((x) => !x.extra), X = D.ideas.filter((x) => x.extra);
  const CORE = V.filter((x) => +x.id.slice(1) <= 12), EXT = V.filter((x) => +x.id.slice(1) > 12);
  const payback = (nreK, save) => (save > 0 ? nreK * 1000 / (save * UNITS) * 12 : Infinity);
  const ideaFns = (x) => Object.keys(x.f || {}).map((id) => FN[id].fn).concat(x.proc ? ["Factory process"] : [], x.frt ? ["Freight"] : []);
  const partBtn = (ns, label) => (ns.length ? `<button type="button" class="st-3d" data-parts="${ns.join(",")}" aria-label="Show ${esc(label)} in 3D">3D</button>` : "");

  // ── Phase 1: the factory audit, tooling and volume tables from the report ──
  const proc = $("#stProcess");
  if (proc) {
    const L = sum(D.process, (p) => p[4]), E = sum(D.process, (p) => p[5]);
    proc.innerHTML = `<table class="cs-tbl st-proc"><caption>The factory, stage by stage: 667 projectors a day, 300 days a year (report section 8)</caption>
      <thead><tr><th scope="col">Stage</th><th scope="col">What happens</th><th scope="col" class="num">People</th><th scope="col" class="num">Minutes</th><th scope="col" class="num">Labour</th><th scope="col" class="num">Equipment</th><th scope="col" class="num">Total</th></tr></thead>
      <tbody>${D.process.map(([s, w, n, m, l, e]) => `<tr><th scope="row">${esc(s)}</th><td>${esc(w)}</td><td class="num">${n}</td><td class="num">${m.toFixed(1)}</td><td class="num">${gbp(l)}</td><td class="num">${gbp(e)}</td><td class="num"><b>${gbp(l + e)}</b></td></tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row" colspan="2">Direct conversion</th><td class="num">${sum(D.process, (p) => p[2])}</td><td class="num">${sum(D.process, (p) => p[3]).toFixed(1)}</td><td class="num">${gbp(L)}</td><td class="num">${gbp(E)}</td><td class="num">${gbp(L + E)}</td></tr>
      <tr><th scope="row" colspan="6">+ tooling £2.20 − SMT £0.60 already in the board price = conversion in the cost build-up</th><td class="num">${gbp(L + E + 2.20 - 0.60)}</td></tr></tfoot></table>`;
  }
  const tool = $("#stTooling");
  if (tool) {
    const t = sum(D.tooling, (x) => x[2]);
    tool.innerHTML = `<table class="cs-tbl"><caption>Tooling, paid off over 400,000 projectors (report section 9)</caption>
      <thead><tr><th scope="col">Tool</th><th scope="col">Detail</th><th scope="col" class="num">Cost</th><th scope="col" class="num">A projector</th></tr></thead>
      <tbody>${D.tooling.map(([n, d, c]) => `<tr><th scope="row">${esc(n)}</th><td>${esc(d)}</td><td class="num">£${c}k</td><td class="num">${gbp(c * 1000 / 400000, 3)}</td></tr>`).join("")}
      <tr class="st-flag"><th scope="row">Not itemised</th><td>The report's total is £${R.toolTotal}k, but the tools it lists add up to £${t}k</td><td class="num">£${R.toolTotal - t}k</td><td class="num">${gbp((R.toolTotal - t) * 1000 / 400000, 3)}</td></tr></tbody>
      <tfoot><tr><th scope="row" colspan="2">Total tooling</th><td class="num">£${R.toolTotal}k</td><td class="num">${gbp(R.toolTotal * 1000 / 400000)}</td></tr></tfoot></table>`;
  }
  const sens = $("#stSens");
  if (sens) sens.innerHTML = `<table class="cs-tbl"><caption>What volume does to the cost (report section 11, report figures)</caption>
    <thead><tr><th scope="col">A year</th><th scope="col" class="num">Parts</th><th scope="col" class="num">Tooling</th><th scope="col" class="num">Conversion and overheads</th><th scope="col" class="num">Ex-works</th><th scope="col" class="num">Landed</th><th scope="col" class="num">Landed after all 20 ideas</th></tr></thead>
    <tbody>${D.sens.map((s) => `<tr${s[0] === UNITS ? ' class="st-base"' : ""}><th scope="row">${s[0].toLocaleString("en-GB")}${s[0] === UNITS ? " (base)" : ""}</th>${s.slice(1).map((v) => `<td class="num">${gbp(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  // ── Phase 2: function cost, worth and value index ──
  // worth = cost less the savings the team can show (from benchmarks, suppliers and the report), never below a floor
  const FLOOR = { emc: 0.05, info: 0.03 };
  const WHY = {
    enl: "Plastic aspheres for two of the glass elements give the same throw for £1.35 less (V04).",
    comb: "Nothing cheaper does the same job. DLP needs no X-cube, but it fails on colour brightness (H3).",
    mod: "Organic polarisers on red and blue, where it's cooler (V05). DLP's imager is £8.20 cheaper, but at about 1,400 colour lumens it fails a must-be, so it can't set the worth.",
    sep: "Local optical glass for the relay lenses (V06).",
    cond: "Local optical glass for the fly's-eye arrays (V06).",
    gen: "Local reflector glass (V06), and the ballast sharing a board with the power supply (V03).",
    pow: "One board for power and ballast (V03); a 1.2 m mains cord is long enough (V19).",
    sig: "A 4-layer board (V02), fewer port circuits (V01), an integrated chip (V13), flat cables (V17), the shutter sensor on the board (V18).",
    rcv: "HDMI, one VGA, LAN and USB cover nearly every classroom (V01). Most never use the VGA cable (V10). The LAN interface can sit inside the video chip (V13).",
    encl: "Thinner walls in part-recycled resin (V07); snap fits and no steel board cage (V09).",
    heat: "Two fans can do the work of three (V08).",
    align: "Cheaper resin at the cool end of the light pipe (V14).",
    prot: "A safety function: required, and already lean.",
    buy: "An esteem function: small, and it helps sell the product.",
    emc: "Spread-spectrum clocks do the job in firmware (V16), so almost nothing needs spending on parts.",
    dust: "Already lean.", ctrl: "One IR receiver and touch keys (V15).", snd: "Kept as it is: teachers in small rooms rely on it (H4).",
    mute: "A two-piece slider does the same job (V18).", level: "Already lean.", svc: "Already lean.",
    info: "A QR code does the job of the printed manuals (V19).", pack: "Moulded pulp protects as well as foam (V10).",
  };
  D.funcs.forEach((f) => {
    f.save = r2(sum(V.filter((x) => x.f && x.f[f.id]), (x) => x.f[f.id]));
    f.ideas = V.filter((x) => x.f && x.f[f.id]).map((x) => x.id);
    f.worth = f.kind === "basic" ? 0 : Math.max(FLOOR[f.id] || 0, r2(f.cost - f.save));
    f.vi = f.worth ? f.cost / f.worth : null;
    f.parts = Object.keys(f.alloc).map(Number);
  });
  const viClass = (vi) => (vi == null ? "" : vi >= 1.5 ? "vi-hot" : vi >= 1.25 ? "vi-warm" : "vi-ok");
  const viTxt = (vi) => (vi > 10 ? "over 10" : vi.toFixed(2));
  const FUN = D.funcs.filter((f) => f.kind !== "basic");
  const PROC_SAVE = r2(sum(V, (x) => (x.proc || 0))), FRT_SAVE = r2(sum(V, (x) => (x.frt || 0)));

  const ft = $("#stFunctions");
  if (ft) {
    const rows = FUN.slice().sort((a, b) => b.cost - a.cost);
    const maxVi = 4;
    ft.innerHTML = `<table class="cs-tbl st-fn"><caption>Cost, worth and value index of each function (£ a projector)</caption>
      <thead><tr><th scope="col">Function</th><th scope="col" class="num">Cost</th><th scope="col" class="num">Share</th><th scope="col" class="num">Worth</th><th scope="col">Value index (cost ÷ worth)</th><th scope="col">How we know it can cost less</th><th scope="col"><span class="sr">3D</span></th></tr></thead>
      <tbody>${rows.map((f) => `<tr class="${viClass(f.vi)}">
        <th scope="row">${esc(f.fn)}<small>items ${f.parts.join(", ")}</small></th><td class="num">${gbp(f.cost)}</td><td class="num">${f.cost / BOM < 0.005 ? "under 1%" : (f.cost / BOM * 100).toFixed(1) + "%"}</td><td class="num">${gbp(f.worth)}</td>
        <td><span class="vi-bar"><i style="width:${Math.min(100, f.vi / maxVi * 100).toFixed(0)}%"></i></span><b class="vi-n">${viTxt(f.vi)}</b></td>
        <td class="why">${esc(WHY[f.id] || "")}</td><td>${partBtn(f.parts, "the parts for " + f.fn)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row">All functions</th><td class="num">${gbp(sum(FUN, (f) => f.cost))}</td><td class="num">100%</td><td class="num">${gbp(sum(FUN, (f) => f.worth))}</td><td colspan="3">Value index for the whole product: ${(sum(FUN, (f) => f.cost) / sum(FUN, (f) => f.worth)).toFixed(2)}</td></tr></tfoot></table>
      <p class="cs-small">Function costs add up to the bill of materials (${gbp(BOM)}). A further ${gbp(PROC_SAVE)} of savings sit in the factory process and ${gbp(FRT_SAVE)} in freight; they change how the projector is made and shipped, not what it does, so they're kept out of the function table.</p>`;
  }

  // the FAST diagram, drawn as SVG; boxes are coloured by value index
  const fast = $("#stFast");
  if (fast) {
    const W = 112, H = 58, X0 = 175, DX = 125, Y = 205;
    const box = (x, y, f, opt = {}) => {
      const label = opt.label || f.fn, sub = opt.sub ?? (f && f.vi != null ? `${gbp(f.cost)} · VI ${f.vi > 10 ? ">10" : f.vi.toFixed(2)}` : "");
      const words = label.split(" ");
      return `<g class="fx ${opt.cls || (f ? viClass(f.vi) : "")}" ${f && f.parts && f.parts.length ? `data-parts="${f.parts.join(",")}" tabindex="0" role="button" aria-label="${esc(label)}: show the parts in 3D"` : ""}>
        <rect x="${x}" y="${y}" width="${W}" height="${H}" rx="8"/>
        <text x="${x + W / 2}" y="${y + (sub ? 20 : 25)}">${esc(words[0])}</text><text x="${x + W / 2}" y="${y + (sub ? 34 : 41)}">${esc(words.slice(1).join(" "))}</text>
        ${sub ? `<text class="fx-sub" x="${x + W / 2}" y="${y + 50}">${sub}</text>` : ""}</g>`;
    };
    const path = ["proj", "enl", "comb", "mod", "sep", "cond", "gen", "pow"];
    let s = `<g class="fx-axis"><line x1="210" y1="22" x2="1150" y2="22"/><path d="M1150 16 L1164 22 L1150 28Z"/><text x="1172" y="27" style="text-anchor:start">HOW?</text>
      <path d="M210 36 L196 42 L210 48Z"/><line x1="210" y1="42" x2="1150" y2="42"/><text x="188" y="47" style="text-anchor:end">WHY?</text></g>`;
    s += `<line class="fx-scope" x1="${X0 - 14}" y1="58" x2="${X0 - 14}" y2="520"/><line class="fx-scope" x1="${X0 + DX * 7 + W + 12}" y1="58" x2="${X0 + DX * 7 + W + 12}" y2="520"/>
      <text class="fx-lbl" x="${X0 - 14}" y="536">scope</text><text class="fx-lbl" x="${X0 + DX * 7 + W + 12}" y="536">scope</text>`;
    s += box(30, Y, null, { label: "Communicate information", sub: "higher-order", cls: "fx-out" });
    s += box(X0 + DX * 8 + 20, Y, null, { label: "Receive power", sub: "input", cls: "fx-out" });
    path.forEach((id, i) => {
      const x = X0 + i * DX;
      if (i) s += `<line class="fx-link" x1="${x - DX + W}" y1="${Y + H / 2}" x2="${x}" y2="${Y + H / 2}"/>`;
      s += box(x, Y, FN[id], id === "proj" ? { sub: "basic function", cls: "fx-basic" } : {});
    });
    s += `<line class="fx-link" x1="${30 + W}" y1="${Y + H / 2}" x2="${X0}" y2="${Y + H / 2}"/><line class="fx-link fx-dash" x1="${X0 + DX * 7 + W}" y1="${Y + H / 2}" x2="${X0 + DX * 8 + 20}" y2="${Y + H / 2}"/>`;
    s += `<text class="fx-lbl" x="${X0 + DX * 3.5 + W / 2}" y="${Y - 14}">critical path</text>`;
    s += `<text class="fx-lbl fx-left" x="${X0}" y="76">all the time</text>`;
    ["encl", "heat", "align", "prot", "buy", "emc", "dust"].forEach((id, i) => (s += box(X0 + i * DX, 86, FN[id])));
    const mx = X0 + 3 * DX;
    s += `<line class="fx-link" x1="${mx + W / 2}" y1="${Y + H}" x2="${mx + W / 2}" y2="334"/><text class="fx-lbl fx-left" x="${mx + W / 2 + 6}" y="${Y + H + 22}">when</text>`;
    s += box(mx, 334, FN.sig) + `<line class="fx-link" x1="${mx + W}" y1="${334 + H / 2}" x2="${mx + DX}" y2="${334 + H / 2}"/>` + box(mx + DX, 334, FN.rcv);
    s += `<text class="fx-lbl fx-left" x="${X0}" y="${334 + H + 34}">supporting</text>`;
    ["ctrl", "snd", "mute", "level", "svc", "info", "pack"].forEach((id, i) => (s += box(X0 + i * DX, 334 + H + 44, FN[id])));
    fast.innerHTML = `<div class="fx-scroll"><svg viewBox="0 0 1310 550" role="group" aria-labelledby="fxT fxD"><title id="fxT">FAST diagram for the VH-3600 projector</title>
      <desc id="fxD">Read left to right to answer how, right to left to answer why. Communicate information, the higher-order function, is achieved by Project image, the basic function, then Enlarge image, Combine colours, Modulate light, Separate colours, Condition light, Generate light and Convert power, with Receive power as the input. Above, all the time: Enclose components, Remove heat, Align optics, Protect user, Attract buyer, Limit emissions and Exclude dust. Below: Process signal happens when light is modulated, and is fed by Receive signal. Supporting functions: Enable control, Emit sound, Mute image, Level image, Allow service, Inform user and Protect product.</desc>${s}</svg></div>
      <p class="fx-key"><span class="vi-ok">good value (VI under 1.25)</span><span class="vi-warm">worth a look (1.25–1.5)</span><span class="vi-hot">poor value (1.5 or more)</span><span class="fx-hint">Click a box to see its parts in 3D.</span></p>`;
  }

  // ── Phase 3: the ideas ──
  const OUT = { accept: "Taken forward: customer value, no cost to the maker", park: "Parked for the next platform: it adds cost", reject: "Rejected: fails a must-be (colour brightness)", drop: "Dropped: teachers in small rooms need it" };
  const it = $("#stIdeas");
  if (it) it.innerHTML = `<table class="cs-tbl st-ideas"><caption>All ${D.ideas.length} ideas, linked to the functions and parts they change</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Idea</th><th scope="col">Functions</th><th scope="col">Parts</th><th scope="col">Where it came from</th><th scope="col" class="num">A projector</th><th scope="col">Screening</th></tr></thead>
    <tbody>${D.ideas.map((x) => `<tr class="${x.extra && x.extra !== "accept" ? "is-out" : ""}"><td><b>${x.id}</b></td><td><b>${esc(x.t)}</b><small>${esc(x.d)}</small></td>
      <td class="fn">${x.extra ? "–" : ideaFns(x).map(esc).join("<br>")}</td>
      <td class="st-parts">${x.parts.length ? x.parts.join(", ") + " " + partBtn(x.parts, "the parts for " + x.id) : "process only"}</td><td>${esc(x.tech)}</td>
      <td class="num">${x.extra === "park" ? "+" + gbp(x.add) + " cost" : x.extra === "accept" ? "£0" : x.extra ? gbp(x.save) : gbp(x.save)}</td>
      <td>${x.extra ? esc(OUT[x.extra]) : "Taken forward"}</td></tr>`).join("")}</tbody></table>`;

  // ── Phase 4: weighted scoring (1–5, where 5 is always good) ──
  const CRIT = [["Saving", 0.30], ["Risk", 0.25], ["What the customer gets", 0.20], ["One-off cost", 0.15], ["Speed", 0.10]];
  const sSave = (v) => (v >= 3 ? 5 : v >= 1.5 ? 4 : v >= 1.0 ? 3 : v >= 0.6 ? 2 : 1);
  const sRisk = (r) => ({ "Very low": 5, Low: 4, "Low to medium": 3, Medium: 2 }[r] || 1);
  const sNre = (n) => (n <= 15 ? 5 : n <= 25 ? 4 : n <= 40 ? 3 : n <= 70 ? 2 : 1);
  const sSpeed = (h) => (/^Immediate/.test(h) ? 5 : /^Short/.test(h) ? 4 : /^Medium/.test(h) ? 3 : 2);
  const CUST = { V01: [2, "Some schools still use the second VGA input or RS-232 room control"], V10: [3, "Buyers who need a VGA cable must order one"], V19: [3, "The manual moves online; the cord is shorter"],
    V04: [4, "Same picture; tested for sharpness"], V05: [4, "Same picture; tested for colour over life"], V08: [4, "Fan noise to be checked"], V15: [4, "Touch keys feel different"], V18: [4, "Shutter feel changes"] };
  const scoreOf = (x) => [sSave(x.save), sRisk(x.risk), (CUST[x.id] || [5])[0], sNre(x.nre), sSpeed(x.h)];
  const scored = V.concat(X.filter((x) => x.extra === "accept")).map((x) => {
    const sc = x.extra ? [1, 5, 5, 5, 5] : scoreOf(x), tot = r2(sum(sc.map((s, i) => s * CRIT[i][1]), (v) => v));
    return { ...x, sc, tot, go: tot >= 3.0 ? "go" : tot >= 2.5 ? "check" : "hold" };
  }).sort((a, b) => b.tot - a.tot);
  const ev = $("#stEval");
  if (ev) ev.innerHTML = `<table class="cs-tbl st-eval"><caption>Weighted scoring: each idea scored 1–5 against each criterion, then weighted</caption>
    <thead><tr><th scope="col">Idea</th>${CRIT.map(([c, w]) => `<th scope="col" class="num">${esc(c)}<small>${Math.round(w * 100)}%</small></th>`).join("")}<th scope="col" class="num">Score</th><th scope="col">Decision</th></tr></thead>
    <tbody>${scored.map((x) => `<tr class="w-${x.go}"><th scope="row"><b>${x.id}</b> ${esc(x.t)}${CUST[x.id] ? `<small>${esc(CUST[x.id][1])}</small>` : ""}</th>${x.sc.map((s) => `<td class="num"><span class="dot d${s}">${s}</span></td>`).join("")}
      <td class="num"><b>${x.tot.toFixed(2)}</b></td><td class="dec">${x.go === "go" ? "Go" : x.go === "check" ? "Go after a feasibility check" : "Hold"}</td></tr>`).join("")}</tbody></table>
    <p class="cs-small"><b>How the scores were set.</b> Saving: £3 or more scores 5, £1.50 scores 4, £1 scores 3, 60p scores 2, less scores 1. Risk: very low 5, low 4, low to medium 3, medium 2 (the report's own rating).
    One-off cost: up to £15k scores 5, £25k 4, £40k 3, £70k 2, more 1. Speed: immediate 5, short 4, medium 3, long 2. A score of 3.0 or more is a go; 2.5 to 3.0 is a go once a feasibility check is passed.</p>`;

  // ── Phase 5: business cases, waves and the platform questions ──
  const CASES = [
    { id: "V01", h: "Drop the legacy ports",
      body: "The report's biggest single saving. Five kinds of legacy port go, with the circuits behind them, and the board shrinks by 22%, which in turn makes the 4-layer board (V02) possible. Together V01 and V02 are worth £5.25 a projector.",
      risks: "Some schools still run a second VGA source or RS-232 room control. Room control can move to the LAN port, which stays. The sales team checks the installed base before launch, and a connectivity version stays possible if a big customer needs it.",
      tests: "EMC (EN 55032 and EN 55035), HDMI compliance, network control with common room-control systems, a field trial in five schools." },
    { id: "V03", h: "One board for power and ballast",
      body: "Two boards become one, sharing the mains filter, PFC controller, heatsink and steel carrier. The saving is £2.10 a projector. It needs the most care of the shortlisted ideas because the 3.5 kV ignition pulse sits next to the low-voltage supply.",
      risks: "Creepage and clearance around the igniter; heat concentrated on one board; lamp ignition at low mains voltage and from cold.",
      tests: "Safety to IEC 62368-1 (hi-pot, creepage), EMC, ignition at 90 V and 0 °C, thermal mapping, a 1,000-hour life test on 30 units." },
    { id: "V10", h: "No VGA cable, moulded pulp packaging",
      body: "The quickest win. Over 90% of classrooms connect over HDMI, so the VGA cable becomes an accessory. Moulded pulp replaces foam, the carton shrinks by 14% and more projectors fit in each container.",
      risks: "Pulp must protect a 3 kg projector as well as foam does; some buyers will want the cable.",
      tests: "Transport drop and vibration tests (ISTA 3A), carton compression, a cable listed as an accessory on day one." },
  ];
  const cs = $("#stCases");
  if (cs) {
    const byId = Object.fromEntries(D.ideas.map((x) => [x.id, x]));
    cs.innerHTML = CASES.map((c) => {
      const x = byId[c.id], annual = x.save * UNITS;
      return `<article class="st-case"><p class="st-case-k">${c.id} · ${ideaFns(x).map(esc).join(", ")} ${partBtn(x.parts, "the parts for " + c.id)}</p><h4>${esc(c.h)}</h4>
        <dl class="st-nums"><div><dt>Saving a projector</dt><dd>${gbp(x.save)}</dd></div><div><dt>A year (${(UNITS / 1000).toFixed(0)}k)</dt><dd>${k(annual)}</dd></div>
        <div><dt>One-off cost</dt><dd>£${x.nre}k</dd></div><div><dt>Payback</dt><dd>${payback(x.nre, x.save).toFixed(1)} months</dd></div></dl>
        <p>${esc(c.body)}</p><p><b>Risks:</b> ${esc(c.risks)}</p><p><b>Tests before release:</b> ${esc(c.tests)}</p></article>`;
    }).join("");
    const WN = { 1: "Wave 1: quick wins, 0–3 months", 2: "Wave 2: short term, 3–6 months", 3: "Wave 3: medium term, 6–9 months", 4: "Wave 4: long term, 9–14 months" };
    $("#stWaves").innerHTML = [1, 2, 3, 4].map((n) => {
      const arr = V.filter((x) => x.wave === n), s = sum(arr, (x) => x.save), nre = sum(arr, (x) => x.nre);
      return `<div class="st-wscroll" tabindex="0" role="region" aria-label="Wave ${n} ideas"><table class="cs-tbl st-wave"><caption>${WN[n]}</caption>
      <thead><tr><th scope="col">Idea</th><th scope="col" class="num">A projector</th><th scope="col" class="num">A year</th><th scope="col" class="num">One-off</th><th scope="col" class="num">Payback</th></tr></thead>
      <tbody>${arr.map((x) => `<tr><th scope="row"><b>${x.id}</b> ${esc(x.t)}</th><td class="num">${gbp(x.save)}</td><td class="num">${k(x.save * UNITS)}</td><td class="num">£${x.nre}k</td><td class="num">${payback(x.nre, x.save).toFixed(1)} mo</td></tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row">Wave ${n}</th><td class="num">${gbp(s)}</td><td class="num">${k(s * UNITS)}</td><td class="num">£${nre}k</td><td class="num">${payback(nre, s).toFixed(1)} mo</td></tr></tfoot></table></div>`;
    }).join("");
  }
  const dlp = $("#stDlp");
  if (dlp) {
    const direct = sum(D.dlp, (d) => d[3]);
    dlp.innerHTML = `<table class="cs-tbl"><caption>3LCD against single-chip DLP at the same white brightness (report section 12)</caption>
      <thead><tr><th scope="col">Area</th><th scope="col">3LCD (VH-3600)</th><th scope="col">Single-chip DLP</th><th scope="col" class="num">3LCD costs</th></tr></thead>
      <tbody>${D.dlp.map(([a, l, d, v]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(l)}</td><td>${esc(d)}</td><td class="num">${v > 0 ? "+" : ""}${gbp(v)}</td></tr>`).join("")}
      <tr><th scope="row">Overheads and margin on the difference</th><td colspan="2">Scrap, overheads and the factory's margin applied to the extra parts and alignment</td><td class="num">+${gbp(R.ddp - R.ddpDlp - direct)}</td></tr></tbody>
      <tfoot><tr><th scope="row">Landed cost</th><td>${gbp(R.ddp)}: 3,600 white and 3,600 colour lumens</td><td>${gbp(R.ddpDlp)}: 3,600 white, about 1,400 colour lumens</td><td class="num">+${gbp(R.ddp - R.ddpDlp)}</td></tr></tfoot></table>`;
  }
  const tco = $("#stTco");
  if (tco) {
    const LAMP = { price: 602, lamp: [63, 118], life: 6000, fit: 15 }, LASER = { price: 939 };
    const rows = [["A classroom, 6 hours a day", 1140], ["A lecture theatre, 10 hours a day", 2500]].map(([name, h]) => {
      const hours = h * 8, lamps = Math.max(0, Math.ceil(hours / LAMP.life) - 1);
      return { name, hours, lamps, lo: lamps * (LAMP.lamp[0] + LAMP.fit), hi: lamps * (LAMP.lamp[1] + LAMP.fit), gap: LASER.price - LAMP.price };
    });
    tco.innerHTML = `<table class="cs-tbl st-tco"><caption>Over 8 years: does a laser projector pay back its extra £${LASER.price - LAMP.price}?</caption>
      <thead><tr><th scope="col">Use</th><th scope="col" class="num">Hours in 8 years</th><th scope="col" class="num">Lamp changes</th><th scope="col" class="num">Lamps and fitting</th><th scope="col">Verdict</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><th scope="row">${r.name}</th><td class="num">${r.hours.toLocaleString("en-GB")}</td><td class="num">${r.lamps}</td><td class="num">£${r.lo}–£${r.hi}</td>
        <td>${r.hi < r.gap ? `Lamp model is cheaper by at least £${r.gap - r.hi}` : r.lo > r.gap ? "Laser pays back" : "About even: downtime and access costs decide it"}</td></tr>`).join("")}</tbody></table>
      <p class="cs-small">Epson's lamp EB-W51 (£602 ex VAT) against its laser EB-L210W (£939 ex VAT). Lamp life 6,000 hours in normal mode; a lamp costs £63–118, plus about £15 to fit. Energy isn't included because the two models' power use is close.</p>`;
  }

  // ── Phase 6: the decision, the bridge and the plan ──
  const dec = $("#stDecision");
  if (dec) {
    const sCore = sum(CORE, (x) => x.save), sAll = sum(V, (x) => x.save), nCore = sum(CORE, (x) => x.nre), nAll = sum(V, (x) => x.nre), tgt = LANDED * 0.10;
    dec.innerHTML = `<div class="cs-kpis st-kpis">
      <div><b>${gbp(LANDED)}</b><span>landed cost today (report ${gbp(R.ddp)} + ${gbp(LANDED - R.ddp)} of parts it doesn't list)</span></div>
      <div><b>${gbp(tgt)}</b><span>the brief: 10% off the landed cost</span></div>
      <div><b>${gbp(sCore)}</b><span>core 12 ideas: ${(sCore / LANDED * 100).toFixed(1)}%, ${k(sCore * UNITS)} a year, landed ${gbp(LANDED - sCore)}</span></div>
      <div><b>${gbp(sAll)}</b><span>all 20 ideas: ${(sAll / LANDED * 100).toFixed(1)}%, ${k(sAll * UNITS)} a year, landed ${gbp(LANDED - sAll)}</span></div>
      <div><b>${payback(nAll, sAll).toFixed(1)} months</b><span>payback on £${nAll}k of one-off costs</span></div></div>
      <ol class="st-asks">
        <li><b>Approve waves 1 and 2 now:</b> ${V.filter((x) => x.wave <= 2).length} ideas, ${gbp(sum(V.filter((x) => x.wave <= 2), (x) => x.save))} a projector, ${k(sum(V.filter((x) => x.wave <= 2), (x) => x.save) * UNITS)} a year for £${sum(V.filter((x) => x.wave <= 2), (x) => x.nre)}k, paying back in about a month.</li>
        <li><b>Fund the wave 3 and 4 engineering:</b> ${V.filter((x) => x.wave >= 3).length} ideas worth ${gbp(sum(V.filter((x) => x.wave >= 3), (x) => x.save))} a projector for £${sum(V.filter((x) => x.wave >= 3), (x) => x.nre)}k, with a go or no-go at each feasibility check (V04, V08 and V13 first).</li>
        <li><b>Ship in eco mode (H1)</b> from the next production run: no cost, and a quarter off the school's electricity bill.</li>
        <li><b>Take laser (H2) to the product plan,</b> as a premium model, using the lifetime case. Keep 3LCD: DLP (H3) is cheaper but fails on colour brightness.</li>
      </ol>
      <p class="cs-small">The core 12 match the report's £${R.coreSave.toFixed(2)} and all 20 its £${R.allSave.toFixed(2)}. The report's own landed figures after the ideas are ${gbp(R.ddp - R.coreSave)} and ${gbp(R.ddp - R.allSave)}; they're ${gbp(LANDED - R.ddp)} higher here because of the parts VAVEhub added.</p>`;

    // the cost bridge (waterfall) from today's landed cost to the target
    const steps = [["Ports, board", ["V01", "V02"]], ["Power", ["V03"]], ["Optics", ["V04", "V05", "V06"]], ["Case, fans", ["V07", "V08", "V09"]], ["Pack, factory", ["V10", "V11", "V12"]], ["Ideas 13–20", EXT.map((x) => x.id)]];
    const byId = Object.fromEntries(V.map((x) => [x.id, x]));
    let run = LANDED; const bars = [{ n: "Today", v: LANDED, a: 0, b: LANDED, cls: "wf-total" }];
    steps.forEach(([n, ids], i) => { const s = sum(ids, (id) => byId[id].save); bars.push({ n, v: -s, a: run - s, b: run, cls: "wf-step", ids }); run -= s; if (i === 4) bars.push({ n: "Core 12", v: run, a: 0, b: run, cls: "wf-sub" }); });
    bars.push({ n: "All 20", v: run, a: 0, b: run, cls: "wf-total wf-end" });
    const lo = 100, hi = LANDED + 4, Wd = 760, Hd = 300, pad = 46, bw = (Wd - pad - 10) / bars.length, y = (v) => Hd - 34 - (v - lo) / (hi - lo) * (Hd - 60);
    const tY = y(LANDED * 0.9);
    $("#stBridge").innerHTML = `<svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Cost bridge: ${bars.map((b) => `${b.n} ${gbp(Math.abs(b.v))}`).join(", ")}">
      ${[100, 110, 120, 130, 140].map((v) => `<line class="wf-grid" x1="${pad}" x2="${Wd - 6}" y1="${y(v)}" y2="${y(v)}"/><text class="wf-ax" x="${pad - 6}" y="${y(v) + 4}">£${v}</text>`).join("")}
      <line class="wf-target" x1="${pad}" x2="${Wd - 6}" y1="${tY}" y2="${tY}"/><text class="wf-tl" x="${Wd - 8}" y="${tY - 6}">10% target ${gbp(LANDED * 0.9)}</text>
      ${bars.map((b, i) => { const x = pad + 8 + i * bw, top = y(b.b), bot = b.a ? y(b.a) : y(lo);
        return `<g class="${b.cls}"><rect x="${x}" y="${top}" width="${bw - 14}" height="${Math.max(2, bot - top)}" rx="3"/>
        <text class="wf-v" x="${x + (bw - 14) / 2}" y="${top - 6}">${b.v < 0 ? "−" + gbp(-b.v) : gbp(b.v)}</text>
        <text class="wf-n" x="${x + (bw - 14) / 2}" y="${Hd - 16}">${esc(b.n)}</text></g>`; }).join("")}
      </svg>`;

    // the plan, month by month, from the report's waves
    const PLAN = [["Wave 1: V10, V16, V19", "Product marketing, electronics", 0, 3], ["Wave 2: V01, V02, V07, V12, V15, V18, V20", "Electronics, mechanical, factory, purchasing", 3, 6],
      ["Wave 3: V03, V05, V08, V09, V11, V14, V17", "Power, optics, mechanical, factory", 6, 9], ["Wave 4: V04, V06, V13", "Optics, purchasing, electronics", 9, 14],
      ["Eco mode default (H1)", "Product marketing", 0, 1], ["Laser model in the product plan (H2)", "Product director", 3, 9], ["Savings tracked monthly against the old cost", "Finance", 0, 14]];
    const M = 14;
    $("#stPlan").innerHTML = `<div class="st-gantt" role="table" tabindex="0" aria-label="Implementation plan, months 0 to 14">
      <div class="g-row g-head" role="row"><span role="columnheader">Action</span><span role="columnheader">Owner</span><span role="columnheader" class="g-weeks">${[0, 2, 4, 6, 8, 10, 12].map((w) => `<i style="left:${w / M * 100}%">${w === 0 ? "start" : "m" + w}</i>`).join("")}</span></div>
      ${PLAN.map(([a, o, s, e]) => `<div class="g-row" role="row"><span role="cell">${esc(a)}</span><span role="cell">${esc(o)}</span><span role="cell" class="g-track"><b style="left:${s / M * 100}%;width:${(e - s) / M * 100}%"></b><span class="sr">months ${s} to ${e}</span></span></div>`).join("")}</div>`;
    const go = scored.filter((x) => x.go === "go").length, chk = scored.filter((x) => x.go === "check").length;
    const funnel = [["Ideas", D.ideas.length], ["Through screening", D.ideas.length - X.filter((x) => x.extra !== "accept").length], ["Go, or go after a check", go + chk], ["Approved now (waves 1 and 2, eco mode)", V.filter((x) => x.wave <= 2).length + 1]];
    $("#stFunnel").innerHTML = funnel.map(([n, v]) => `<li style="--w:${v / D.ideas.length * 100}%"><b>${v}</b> ${esc(n)}</li>`).join("");
  }

  // the "3D" buttons and FAST boxes point at the parts in the model above
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-parts]"); if (!b || !window.VHProjector) return;
    const ns = b.dataset.parts.split(",").map(Number).filter(Boolean); if (!ns.length) return;
    document.getElementById("pjViewer").scrollIntoView({ behavior: "smooth", block: "center" });
    window.VHProjector.show(ns);
    if (window.vhTrack) window.vhTrack("case-study/show-function");
  });
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("g[data-parts]")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });

  window.VH_STUDY = { funcs: D.funcs, ideas: D.ideas, scored, BOM, LANDED, UNITS };
})();
