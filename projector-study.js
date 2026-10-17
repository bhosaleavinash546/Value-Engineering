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

  // ── Phase 2: function analysis ──
  // worth = the lowest cost shown to perform the function reliably, never below a small floor; the evidence is the ideas and benchmarks
  const FLOOR = { instr: 0.03 };
  const WORTH = {
    mag: ["Cheaper alternative", "Moulded plastic aspheres for two of the glass elements give the same throw (V04)."],
    comb: ["No cheaper way found", "DLP needs no X-cube, but it fails the colour-brightness must-be (H3). Worth = cost."],
    mod: ["Cheaper alternative", "Organic polarisers on red and blue, where it runs cooler (V05). DLP's imager is cheaper but fails a must-be, so it can't set the worth."],
    sep: ["Supplier quote", "Local optical glass for the relay lenses (V06)."],
    pol: ["No cheaper way found", "Nothing cheaper converts the polarisation without losing about a third of the light."],
    hom: ["Supplier quote", "Local optical glass for the fly's-eye arrays (V06)."],
    gen: ["Supplier quote", "Local glass for the reflector (V06)."],
    volt: ["Cheaper alternative", "Power supply and ballast on one board, sharing a filter and heatsink (V03)."],
    rpow: ["Customer need", "A 1.2 m mains cord is long enough for a ceiling or trolley (V19)."],
    focus: ["No cheaper way found", "The focus ring is part of the lens barrel and already lean."],
    snd: ["No cheaper way found", "Kept: teachers in small rooms rely on it (H4)."],
    sig: ["Cheaper alternative", "A 4-layer board (V02), fewer port circuits (V01), an integrated chip (V13), flat cables (V17), the shutter sensor on the board (V18)."],
    rcv: ["Customer need", "HDMI, one VGA, LAN and USB cover nearly every classroom (V01); most never use the VGA cable (V10); LAN can sit inside the chip (V13)."],
    emc: ["Cheaper alternative", "Spread-spectrum clocks deal with most of the interference in firmware (V16), so the ferrite and shield can go."],
    ign: ["No cheaper way found", "The 3.5 kV ignition pulse is needed by any mercury lamp."],
    reg: ["Cheaper alternative", "Shares the power supply's filter, PFC controller and heatsink (V03)."],
    heat: ["Cheaper alternative", "Two fans can do the work of three (V08)."],
    dust: ["No cheaper way found", "Already lean."],
    uv: ["Required by safety", "Needed for safety; already lean."],
    encl: ["Cheaper alternative", "Thinner walls in part-recycled resin (V07)."],
    loc: ["Cheaper alternative", "Board supports moulded into the case (V09); cheaper resin at the cool end of the light pipe (V14)."],
    sup: ["No cheaper way found", "Already lean."],
    fast: ["Cheaper alternative", "Snap fits instead of 22 of the 38 screws (V09)."],
    frag: ["Required by safety", "The lamp can burst; the safety glass is needed and already lean."],
    intr: ["Required by safety", "The interlock switch is a safety requirement and costs 15p."],
    app: ["Esteem: kept", "Small, and it helps sell the product."],
    cmd: ["Cheaper alternative", "One IR receiver and touch keys (V15)."],
    mute: ["Cheaper alternative", "A two-piece slider does the same job (V18)."],
    angle: ["No cheaper way found", "Already lean."],
    instr: ["Theoretical minimum", "A QR code does the job of the printed manuals (V19)."],
    expose: ["No cheaper way found", "Already lean."],
    shock: ["Cheaper alternative", "Moulded pulp protects as well as foam (V10)."],
  };
  D.funcs.forEach((f) => {
    f.save = r2(sum(V.filter((x) => x.f && x.f[f.id]), (x) => x.f[f.id]));
    f.ideas = V.filter((x) => x.f && x.f[f.id]).map((x) => x.id);
    f.parts = Object.keys(f.alloc).map(Number);
    f.worth = f.cost > 0 ? Math.max(FLOOR[f.id] || 0, r2(f.cost - f.save)) : 0;
    f.vi = f.cost > 0 ? f.cost / f.worth : null;
    f.gap = r2(f.cost - f.worth);
  });
  const viClass = (vi) => (vi == null ? "" : vi >= 2 ? "vi-hot" : vi >= 1.25 ? "vi-warm" : "vi-ok");
  const viTxt = (vi) => (vi > 10 ? "over 10" : vi.toFixed(2));
  const FUN = D.funcs.filter((f) => f.cost > 0);
  const KIND = { higher: "Higher-order", basic: "Basic", path: "Critical path", assumed: "Input (outside scope)", when: "When / caused by", unwanted: "Unwanted",
    all: "All the time", one: "One time", esteem: "Esteem", user: "User", second: "Second answer to how (AND)" };
  const PROC_SAVE = r2(sum(V, (x) => (x.proc || 0))), FRT_SAVE = r2(sum(V, (x) => (x.frt || 0)));
  const PATHCOST = r2(sum(D.funcs.filter((f) => f.kind === "path"), (f) => f.cost));
  const CAUSED = r2(sum(["emc", "heat", "dust", "uv"], (id) => FN[id].cost));
  const sorted = FUN.slice().sort((a, b) => b.cost - a.cost), TOP = Math.round(sorted.length * 0.3), TOPCOST = r2(sum(sorted.slice(0, TOP), (f) => f.cost));
  const famOf = (n, line) => D.funcs.filter((f) => f.alloc[n] != null).map((f) => f.fn);

  // 2.2 every part's function
  const pf = $("#stPartFns");
  if (pf) pf.innerHTML = `<table class="cs-tbl st-pf"><caption>Every part's function, as an active verb and a measurable noun</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Part</th><th scope="col">Main function</th><th scope="col">Also does</th><th scope="col">Unwanted functions</th><th scope="col">On the FAST diagram</th><th scope="col"><span class="sr">3D</span></th></tr></thead>
    <tbody>${D.groups.map((g) => `<tr class="pf-grp"><th colspan="7" scope="rowgroup">${esc(g.name)}</th></tr>` + D.parts.filter((p) => p.g === g.id).map((p) => `<tr>
      <td class="num">${p.n}</td><td>${esc(p.name)}</td><td class="fn"><b>${esc(p.fn)}</b></td><td class="fn2">${p.fn2.map(esc).join("<br>") || "–"}</td>
      <td class="fnu">${p.fnU.map(esc).join("<br>") || "–"}</td><td>${famOf(p.n).map(esc).join("<br>")}</td><td>${p.hidden3d ? "" : partBtn([p.n], p.name)}</td></tr>`).join("")).join("")}</tbody></table>`;

  // 2.3 the FAST diagram, drawn from the data; costs can be switched on
  const fast = $("#stFast");
  const ROWY = { D: 34, A: 118, B: 194, P: 300, W1: 396, W2: 470, W3: 544, W4: 618 }, CW = 140, BW = 124, BH = 58, X0 = 20;
  const bx = (f) => ({ x: X0 + f.col * CW, y: ROWY[f.row] });
  function drawFast(showCost) {
    let s = `<g class="fx-axis"><line x1="200" y1="14" x2="720" y2="14"/><path d="M720 9 L732 14 L720 19Z"/><text x="738" y="19" style="text-anchor:start">HOW?</text>
      <path d="M200 25 L188 30 L200 35Z"/><line x1="200" y1="30" x2="720" y2="30"/><text x="180" y="35" style="text-anchor:end">WHY?</text></g>`;
    const sx1 = X0 + CW - 8, sx2 = X0 + 10 * CW - 8;
    s += `<line class="fx-scope" x1="${sx1}" y1="100" x2="${sx1}" y2="690"/><line class="fx-scope" x1="${sx2}" y1="100" x2="${sx2}" y2="690"/>
      <text class="fx-lbl" x="${sx1}" y="706">scope</text><text class="fx-lbl" x="${sx2}" y="706">scope</text>`;
    s += `<text class="fx-lbl fx-left" x="${X0}" y="${ROWY.A + 22}">ALL THE TIME</text><text class="fx-lbl fx-left" x="${X0}" y="${ROWY.A + 38}">AND ESTEEM</text>
      <text class="fx-lbl fx-left" x="${X0}" y="${ROWY.B + 22}">USER AND</text><text class="fx-lbl fx-left" x="${X0}" y="${ROWY.B + 38}">ONE TIME</text>
      <text class="fx-lbl fx-left" x="${X0 + 2 * CW}" y="${ROWY.P - 12}">CRITICAL PATH</text>
      <text class="fx-lbl fx-left" x="${X0}" y="${ROWY.W3 + 22}">WHEN, OR</text><text class="fx-lbl fx-left" x="${X0}" y="${ROWY.W3 + 38}">CAUSED BY</text>`;
    // design criteria: requirements, not functions
    s += `<g class="fx-obj"><rect x="${X0}" y="48" width="${5 * CW + BW}" height="40" rx="8"/><text x="${X0 + 12}" y="73"><tspan class="fx-crit-h">STUDY OBJECTIVE </tspan>${esc(D.objective)}</text></g>`;
    s += `<g class="fx-crit"><rect x="${X0 + 6 * CW}" y="${ROWY.D - 30}" width="${4 * CW + BW}" height="96" rx="8"/><text class="fx-crit-h" x="${X0 + 6 * CW + 12}" y="${ROWY.D - 12}">DESIGN CRITERIA (requirements, not functions)</text>
      ${D.criteria.map((c, i) => `<text x="${X0 + 6 * CW + 12 + (i % 3) * 222}" y="${ROWY.D + 8 + Math.floor(i / 3) * 20}">${esc(c)}</text>`).join("")}</g>`;
    // links: path, then the others
    const path = D.funcs.filter((f) => f.row === "P").sort((a, b) => a.col - b.col);
    path.forEach((f, i) => { if (!i) return; const a = bx(path[i - 1]), b = bx(f);
      s += `<line class="fx-link${f.kind === "assumed" ? " fx-dash" : ""}" x1="${a.x + BW}" y1="${a.y + BH / 2}" x2="${b.x}" y2="${b.y + BH / 2}"/>`; });
    D.flinks.forEach(([from, to, type]) => { const a = bx(FN[from]), b = bx(FN[to]);
      if (a.x === b.x) s += `<line class="fx-link fx-${type}" x1="${a.x + BW / 2}" y1="${a.y + BH}" x2="${b.x + BW / 2}" y2="${b.y}"/>`;
      else if (a.y === b.y) s += `<line class="fx-link fx-${type}" x1="${a.x + BW}" y1="${a.y + BH / 2}" x2="${b.x}" y2="${b.y + BH / 2}"/>`;
      else s += `<path class="fx-link fx-${type}" d="M${a.x + BW / 2} ${a.y + BH} L${a.x + BW / 2} ${b.y + BH / 2} L${b.x} ${b.y + BH / 2}" fill="none"/>`; });
    // boxes
    D.funcs.forEach((f) => {
      const { x, y } = bx(f), w = f.fn.split(" "), sub = showCost && f.cost > 0 ? `${gbp(f.cost)} · VI ${f.vi > 10 ? ">10" : f.vi.toFixed(2)}` : f.kind === "basic" ? "basic function" : f.kind === "higher" ? "higher-order" : f.kind === "assumed" ? "input" : f.kind === "unwanted" ? "unwanted" : "";
      const cls = `fx fx-${f.kind}${showCost && f.cost > 0 ? " " + viClass(f.vi) : ""}`;
      s += `<g class="${cls}" ${f.parts.length ? `data-parts="${f.parts.join(",")}" tabindex="0" role="button" aria-label="${esc(f.fn)} (${KIND[f.kind]})${f.cost ? ", " + gbp(f.cost) : ""}: show the parts in 3D"` : ""}>
        <rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="8"/><text x="${x + BW / 2}" y="${y + (sub ? 20 : 24)}">${esc(w[0])}</text><text x="${x + BW / 2}" y="${y + (sub ? 35 : 41)}">${esc(w.slice(1).join(" "))}</text>
        ${sub ? `<text class="fx-sub" x="${x + BW / 2}" y="${y + 50}">${sub}</text>` : ""}</g>`;
    });
    return s;
  }
  if (fast) {
    const desc = `Read left to right to answer how, right to left to answer why. Communicate information, the higher-order function, sits left of scope. The basic function is Project image. The critical path: ${D.funcs.filter((f) => f.kind === "path").map((f) => f.fn).join(", ")}, then Supply power, the input outside scope. Emit sound is a second way to communicate information, and Focus image a second answer to how the image is projected. Modulate light needs Polarise light on the path, and Separate wavelengths and Homogenise light below it, all three together. Modulate light happens when the projector processes the signal, which needs Receive signal and brings the unwanted Generate interference, which causes Suppress interference. Generate light happens when the arc is ignited, and brings the unwanted Generate heat and Emit UV; heat causes Remove heat, which in turn causes Trap dust and the unwanted Generate noise; UV causes Block UV. Receive power brings the unwanted Consume energy. Above the path, all the time: ${D.funcs.filter((f) => f.kind === "all").map((f) => f.fn).join(", ")}; esteem: Enhance appearance; user functions: Accept commands, Interrupt image; one-time functions: Adjust angle, Convey instructions, Expose lamp, which needs Interrupt power at the same time, and Absorb shock. Objective: ${D.objective}. Design criteria: ${D.criteria.join(", ")}.`;
    const render = (on) => { fast.querySelector("svg").innerHTML = `<title id="fxT">FAST diagram for the VH-3600 projector</title><desc id="fxD">${esc(desc)}</desc>` + drawFast(on); };
    fast.innerHTML = `<div class="fx-tools"><button type="button" class="pj-btn" id="fxCost" aria-pressed="false">Show costs and value index</button></div>
      <div class="fx-scroll" tabindex="0" role="region" aria-label="FAST diagram, scroll sideways on a small screen"><svg viewBox="0 0 1720 720" role="group" aria-labelledby="fxT fxD"></svg></div>
      <ul class="fx-legend"><li class="fl-basic">Basic function</li><li class="fl-path">Critical path</li><li class="fl-when">When / caused by</li><li class="fl-unwanted">Unwanted</li>
        <li class="fl-all">All the time</li><li class="fl-one">One time</li><li class="fl-user">User</li><li class="fl-esteem">Esteem</li><li class="fl-out">Outside scope</li></ul>
      <p class="fx-key" hidden id="fxKey"><span class="vi-ok">good value (VI under 1.25)</span><span class="vi-warm">worth a look (1.25–2)</span><span class="vi-hot">strong target (2 or more)</span></p>`;
    render(false);
    $("#fxCost").addEventListener("click", (e) => { const on = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", on); render(on); $("#fxKey").hidden = !on; });
  }

  // 2.4 the cost matrix: the costliest parts against the functions they serve
  const mx = $("#stMatrix");
  if (mx) {
    const parts = D.parts.slice().sort((a, b) => b.ext - a.ext).slice(0, 12);
    const cols = D.funcs.filter((f) => parts.some((p) => f.alloc[p.n] != null));
    mx.innerHTML = `<table class="cs-tbl st-mx"><caption>Function cost matrix: the 12 costliest parts (£)</caption>
      <thead><tr><th scope="col">Part</th>${cols.map((f) => `<th scope="col" class="num mx-h"><span>${esc(f.fn)}</span></th>`).join("")}<th scope="col" class="num">Part cost</th></tr></thead>
      <tbody>${parts.map((p) => `<tr><th scope="row">${p.n} · ${esc(p.name)}</th>${cols.map((f) => `<td class="num${f.alloc[p.n] != null ? " mx-on" : ""}">${f.alloc[p.n] != null ? f.alloc[p.n].toFixed(2) : ""}</td>`).join("")}<td class="num"><b>${p.ext.toFixed(2)}</b></td></tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row">Function cost (all ${D.parts.length} parts)</th>${cols.map((f) => `<td class="num"><b>${f.cost.toFixed(2)}</b></td>`).join("")}<td class="num"><b>${BOM.toFixed(2)}</b></td></tr></tfoot></table>`;
    const dl = $("#stMatrixCsv");
    if (dl) dl.addEventListener("click", () => {
      const q = (v) => `"${String(v).replace(/"/g, '""')}"`, F2 = FUN;
      const rows = [["Item", "Part", "Main function", ...F2.map((f) => f.fn), "Part cost (GBP)"]];
      D.parts.forEach((p) => rows.push([p.n, p.name, p.fn, ...F2.map((f) => (f.alloc[p.n] != null ? f.alloc[p.n].toFixed(2) : "")), p.ext.toFixed(2)]));
      rows.push(["", "Function cost", "", ...F2.map((f) => f.cost.toFixed(2)), BOM.toFixed(2)]);
      const blob = new Blob(["﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "VH-3600-function-cost-matrix.csv";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }
  // where the cost goes on the FAST diagram
  const split = $("#stSplit");
  if (split) {
    const grp = [["Critical path", ["path"], "#2e6fe8"], ["When / caused by", ["when"], "#7c8db5"], ["All the time", ["all"], "#22a39a"], ["One time", ["one"], "#9b6cf0"],
      ["User", ["user"], "#5b6b8a"], ["Second answers to how (AND)", ["second"], "#d9a44a"], ["Esteem", ["esteem"], "#e06aa8"]].map(([n, k, c]) => [n, r2(sum(D.funcs.filter((f) => k.includes(f.kind)), (f) => f.cost)), c]);
    split.innerHTML = `<div class="sp-bar" role="img" aria-label="${grp.map(([n, v]) => `${n} ${gbp(v)}`).join(", ")}">${grp.map(([n, v, c]) => `<i style="flex:${v};background:${c}" title="${esc(n)}"></i>`).join("")}</div>
      <ul class="sp-key">${grp.map(([n, v, c]) => `<li><s style="background:${c}"></s>${esc(n)} <b>${gbp(v)}</b> <span>${(v / BOM * 100).toFixed(1)}%</span></li>`).join("")}</ul>
      <p class="cs-small"><b>${(PATHCOST / BOM * 100).toFixed(0)}% of the parts cost is on the critical path</b>, doing the job the customer pays for. The other ${((BOM - PATHCOST) / BOM * 100).toFixed(0)}% supports it, protects it or exists because of something unwanted. <b>${gbp(CAUSED)} of parts exists only because of unwanted functions</b>: removing heat, trapping the dust the fans pull in, blocking UV and suppressing interference.</p>`;
  }
  // 2.5 Pareto of function costs
  const par = $("#stFnPareto");
  if (par) {
    const W = 1100, H = 320, L = 46, R = 46, T = 60, n = sorted.length, bw = (W - L - R) / n, max = 30, yb = (v) => H - 40 - v / max * (H - 40 - T), yc = (p) => H - 40 - p / 100 * (H - 40 - T);
    let cum = 0;
    const pts = sorted.map((f, i) => { cum += f.cost; return [L + i * bw + bw / 2, yc(cum / BOM * 100)]; });
    par.innerHTML = `<div class="fp-scroll" tabindex="0" role="region" aria-label="Pareto chart of function costs"><svg viewBox="0 0 ${W} ${H + 120}" role="img" aria-label="Pareto chart: ${sorted.map((f) => `${f.fn} ${gbp(f.cost)}`).join(", ")}">
      ${[0, 25, 50, 75, 100].map((p) => `<line class="fp-grid" x1="${L}" x2="${W - R}" y1="${yc(p)}" y2="${yc(p)}"/><text class="fp-ax" x="${L - 6}" y="${yc(p) + 4}">${p}%</text>`).join("")}
      ${[0, 10, 20, 30].map((v) => `<text class="fp-ax fp-axr" x="${W - R + 6}" y="${yb(v) + 4}">£${v}</text>`).join("")}
      <text class="fp-ax fp-axl" x="${L - 30}" y="${T - 10}">cumulative %</text><text class="fp-ax" x="${W - 4}" y="${T - 10}">£ per function</text>
      <rect class="fp-zone" x="${L}" y="${T}" width="${TOP * bw}" height="${H - 40 - T}"/>
      <text class="fp-zt" x="${L + TOP * bw / 2}" y="${T - 32}" style="text-anchor:middle">Top ${TOP} of ${n} functions (30%): ${gbp(TOPCOST)}, ${(TOPCOST / BOM * 100).toFixed(0)}% of the cost</text>
      ${sorted.map((f, i) => `<g class="fp-b${i < TOP ? " top" : ""}"><rect x="${L + i * bw + 3}" y="${yb(f.cost)}" width="${bw - 6}" height="${H - 40 - yb(f.cost)}" style="--d:${i * 40}ms"/>${i < TOP ? `<text class="fp-v" x="${L + i * bw + bw / 2}" y="${yb(f.cost) - 5}">£${f.cost.toFixed(2)}</text>` : ""}
        <text class="fp-n" transform="translate(${L + i * bw + bw / 2 + 4},${H - 30}) rotate(-55)">${esc(f.fn)}</text></g>`).join("")}
      <polyline class="fp-cum" points="${pts.map((p) => p.join(",")).join(" ")}"/>${pts.map((p) => `<circle class="fp-dot" cx="${p[0]}" cy="${p[1]}" r="3"/>`).join("")}
      </svg></div>`;
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { par.classList.add("is-on"); io.disconnect(); } }), { threshold: 0.3 }); io.observe(par); } else par.classList.add("is-on");
  }
  // 2.6 worth, value index and value gap
  const ft = $("#stFunctions");
  if (ft) {
    const rows = sorted;
    ft.innerHTML = `<table class="cs-tbl st-fn"><caption>Cost, worth, value gap and value index of every function (£ a projector)</caption>
      <thead><tr><th scope="col">Function</th><th scope="col">Type</th><th scope="col" class="num">Cost</th><th scope="col" class="num">Worth</th><th scope="col" class="num">Value gap</th><th scope="col">Value index (cost ÷ worth)</th><th scope="col">How the worth was set</th><th scope="col"><span class="sr">3D</span></th></tr></thead>
      <tbody>${rows.map((f) => `<tr class="${viClass(f.vi)}">
        <th scope="row">${esc(f.fn)}<small>items ${f.parts.join(", ")}</small></th><td class="ty">${KIND[f.kind]}</td><td class="num">${gbp(f.cost)}</td><td class="num">${gbp(f.worth)}</td><td class="num">${f.gap > 0 ? gbp(f.gap) : "–"}</td>
        <td><span class="vi-bar"><i style="width:${Math.min(100, f.vi / 4 * 100).toFixed(0)}%"></i></span><b class="vi-n">${viTxt(f.vi)}</b></td>
        <td class="why"><b>${esc(WORTH[f.id][0])}.</b> ${esc(WORTH[f.id][1])}</td><td>${partBtn(f.parts, "the parts for " + f.fn)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row" colspan="2">All functions</th><td class="num">${gbp(BOM)}</td><td class="num">${gbp(sum(FUN, (f) => f.worth))}</td><td class="num">${gbp(sum(FUN, (f) => f.gap))}</td><td colspan="3">Value index for the whole product: ${(BOM / sum(FUN, (f) => f.worth)).toFixed(2)}</td></tr></tfoot></table>
      <p class="cs-small">The function costs add up to the bill of materials (${gbp(BOM)}). A further ${gbp(PROC_SAVE)} of savings sit in the factory process and ${gbp(FRT_SAVE)} in freight; they change how the projector is made and shipped, not what it does, so they're kept out of this table. Unwanted functions have no parts of their own and are worth £0: the cost they cause shows up in the functions that deal with them.</p>`;
  }
  // the paired comparison and the value graph
  const P = D.paired, LET = "ABCDEFGHIJ", sc = Object.fromEntries(P.fns.map((id) => [id, 0]));
  P.pairs.forEach(([a, b, w, n]) => (sc[w] += n));
  const TOT = sum(Object.values(sc), (v) => v), PCOST = sum(P.fns, (id) => FN[id].cost);
  const imp = Object.fromEntries(P.fns.map((id) => [id, sc[id] / TOT * 100])), cshare = Object.fromEntries(P.fns.map((id) => [id, FN[id].cost / PCOST * 100]));
  const pc = $("#stPaired");
  if (pc) pc.innerHTML = `<table class="cs-tbl st-pc"><caption>The team's paired comparison: for each pair, the more important function to a school and by how much (1 a little, 2 clearly, 3 a lot)</caption>
    <thead><tr><th scope="col">Function</th>${P.fns.map((id, i) => `<th scope="col" class="num">${LET[i]}</th>`).join("")}<th scope="col" class="num">Score</th><th scope="col" class="num">Importance</th></tr></thead>
    <tbody>${P.fns.map((id, i) => `<tr><th scope="row"><b>${LET[i]}</b> ${esc(FN[id].fn)}<small>${esc(P.why[id])}</small></th>${P.fns.map((id2, j) => {
      if (j <= i) return `<td class="pc-x"></td>`;
      const p = P.pairs.find((x) => (x[0] === id && x[1] === id2) || (x[0] === id2 && x[1] === id));
      return `<td class="num pc-c">${LET[P.fns.indexOf(p[2])]}${p[3]}</td>`; }).join("")}<td class="num"><b>${sc[id]}</b></td><td class="num">${imp[id].toFixed(1)}%</td></tr>`).join("")}</tbody></table>`;
  const VGEL = $("#stValGraph");
  if (VGEL) {
    const rows = P.fns.slice().sort((a, b) => imp[b] - imp[a]), mx2 = Math.max(...rows.map((id) => Math.max(imp[id], cshare[id])));
    VGEL.innerHTML = `<ul class="fvg">${rows.map((id) => { const r = cshare[id] / imp[id];
      return `<li class="${r >= 2 ? "fvg-hot" : r >= 1.25 ? "fvg-warm" : ""}"><span class="fvg-n">${esc(FN[id].fn)}</span>
        <span class="fvg-bars"><i class="fvg-imp" style="width:${(imp[id] / mx2 * 100).toFixed(1)}%"><em>${imp[id].toFixed(0)}%</em></i><i class="fvg-cost" style="width:${(cshare[id] / mx2 * 100).toFixed(1)}%"><em>${cshare[id].toFixed(0)}%</em></i></span>
        <span class="fvg-r">${r.toFixed(1)}×</span></li>`; }).join("")}</ul>
      <p class="fvg-key"><span class="k-imp">importance to the school</span><span class="k-cost">share of the cost</span><span>cost share ÷ importance</span></p>`;
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

  window.VH_STUDY = { funcs: D.funcs, ideas: D.ideas, scored, BOM, LANDED, UNITS, PATHCOST, CAUSED, TOP, TOPCOST, importance: imp, costShare: cshare };
})();
