/* VAVEhub · the VH-W2 wiper value study, phases 1–6 (case-study-wiper.html, and the worked examples in Academy modules 3–8).
   Everything is worked out from wiper-data.js. Function costs are each part's cost shared out among the jobs it does.
   Worth is the lowest cost shown to do the same job reliably, so cost ÷ worth (the value index) shows where money is lost.
   Each block draws only if its element is on the page, so a module can show just the part it teaches. */
(function () {
  const D = window.VH_WIPER; if (!D) return;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const gbp = (v, dp = 2) => (v < 0 ? "−" : "") + "£" + Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const k = (v) => (Math.abs(v) >= 1e6 ? "£" + (v / 1e6).toFixed(2) + "m" : "£" + Math.round(v / 1e3) + "k");
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  const r2 = (v) => Math.round(v * 100) / 100;
  const R = D.report, UNITS = R.volume, BOM = R.system;
  const FN = Object.fromEntries(D.funcs.map((f) => [f.id, f]));
  const ID = Object.fromEntries(D.ideas.map((x) => [x.id, x]));
  const V = D.ideas.filter((x) => !x.extra && !x.concept), CON = D.ideas.filter((x) => x.concept), X = D.ideas.filter((x) => x.extra);
  const payback = (nreK, save) => (save > 0 ? nreK * 1000 / (save * UNITS) * 12 : Infinity);
  const ideaFns = (x) => Object.keys(x.f || {}).map((id) => FN[id].fn + (x.f[id] < 0 ? " (adds)" : "")).concat(x.plant ? ["Carmaker's assembly"] : []);
  const partBtn = (ns, label) => (ns.length ? `<button type="button" class="st-3d" data-wparts="${ns.join(",")}" aria-label="Show ${esc(label)} in 3D">3D</button>` : "");
  const kg = (v) => (v ? (v < 0 ? "−" : "+") + Math.abs(v).toFixed(2) + " kg" : "–");

  // ── the bill of materials, with its cost build-up ──
  const bom = $("#wsBom");
  if (bom) {
    const grp = D.subs.map((s) => ({ s, ls: D.lines.filter((l) => l.sub === s.id) }));
    bom.innerHTML = `<table class="cs-tbl st-bom"><caption>Should-cost bill of materials: what the carmaker pays its supplier, £ a car (VAVEhub estimate)</caption>
      <thead><tr><th scope="col">Line</th><th scope="col">Part and how it's made</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Material</th><th scope="col" class="num">Process</th><th scope="col" class="num">Overheads and profit</th><th scope="col" class="num">Total</th></tr></thead>
      ${grp.map(({ s, ls }) => `<tbody><tr class="pf-grp"><th colspan="6" scope="rowgroup">${esc(s.name)}</th><td class="num"><b>${gbp(sum(ls, (l) => l.ext))}</b></td></tr>
        ${ls.map((l) => `<tr${l.added ? ' class="st-flag"' : ""}><td><b>${l.id}</b></td><td>${esc(l.name)}<small>${esc(l.spec)}${l.changed ? " " + esc(l.changed) : ""}</small></td><td class="num">${l.q}</td>
          <td class="num">${l.m.toFixed(2)}</td><td class="num">${l.p.toFixed(2)}</td><td class="num">${l.o.toFixed(2)}</td><td class="num"><b>${l.ext.toFixed(2)}</b></td></tr>`).join("")}</tbody>`).join("")}
      <tfoot><tr><th scope="row" colspan="3">System</th><td class="num">${gbp(sum(D.lines, (l) => l.m))}</td><td class="num">${gbp(sum(D.lines, (l) => l.p))}</td><td class="num">${gbp(sum(D.lines, (l) => l.o))}</td><td class="num">${gbp(BOM)}</td></tr></tfoot></table>`;
  }
  const gsplit = $("#wsGroups");
  if (gsplit) {
    const C = ["#2e6fe8", "#22a39a", "#9b6cf0", "#e06aa8", "#d9a44a", "#7c8db5", "#f0703a"];
    const rows = D.subs.map((s, i) => [s.name, r2(sum(D.lines.filter((l) => l.sub === s.id), (l) => l.ext)), C[i]]);
    gsplit.innerHTML = `<div class="sp-bar" role="img" aria-label="${rows.map(([n, v]) => `${n} ${gbp(v)}`).join(", ")}">${rows.map(([n, v, c]) => `<i style="flex:${v};background:${c}" title="${esc(n)}"></i>`).join("")}</div>
      <ul class="sp-key">${rows.map(([n, v, c]) => `<li><s style="background:${c}"></s>${esc(n)} <b>${gbp(v)}</b> <span>${(v / BOM * 100).toFixed(1)}%</span></li>`).join("")}</ul>`;
  }

  // ── Phase 1: customers, failures, tests, tooling, sensitivity ──
  const voc = $("#wsVoc");
  if (voc) voc.innerHTML = `<ul class="st-voc">${D.voc.map((v) => `<li><b>${esc(v.k)}.</b> ${esc(v.v)} <a href="${esc(v.src)}" target="_blank" rel="noopener">Source</a></li>`).join("")}</ul>`;
  const kano = $("#wsKano");
  if (kano) kano.innerHTML = `<table class="cs-tbl"><caption>What drivers expect, in Kano's three classes</caption><tbody>${D.kano.map(([c, d]) => `<tr><th scope="row">${esc(c)}</th><td>${esc(d)}</td></tr>`).join("")}</tbody></table>`;
  const rec = $("#wsRecalls");
  if (rec) rec.innerHTML = `<table class="cs-tbl"><caption>Wiper recalls: what went wrong in the field</caption><thead><tr><th scope="col">Year</th><th scope="col">Cars</th><th scope="col" class="num">Recalled</th><th scope="col">Cause</th></tr></thead>
    <tbody>${D.recalls.map(([y, c, n, w]) => `<tr><td>${y}</td><th scope="row">${esc(c)}</th><td class="num">${esc(n)}</td><td>${esc(w)}</td></tr>`).join("")}</tbody></table>`;
  const tst = $("#wsTests");
  if (tst) tst.innerHTML = `<table class="cs-tbl"><caption>The tests every design must pass</caption><thead><tr><th scope="col">Test</th><th scope="col">What it asks</th><th scope="col">Set by</th></tr></thead>
    <tbody>${D.tests.map(([t, w, b]) => `<tr><th scope="row">${esc(t)}</th><td>${esc(w)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table>`;
  const tool = $("#wsTooling");
  if (tool) {
    const t = sum(D.tooling, (x) => x[2]), sets = UNITS * R.life;
    tool.innerHTML = `<table class="cs-tbl"><caption>Tooling, paid separately and spread over ${(sets / 1e6).toFixed(2)} million cars</caption>
      <thead><tr><th scope="col">Tools</th><th scope="col">For</th><th scope="col" class="num">Cost</th><th scope="col" class="num">A car</th></tr></thead>
      <tbody>${D.tooling.map(([n, d, c]) => `<tr><th scope="row">${esc(n)}</th><td>${esc(d)}</td><td class="num">£${c}k</td><td class="num">${gbp(c * 1000 / sets, 3)}</td></tr>`).join("")}
      <tr class="st-flag"><th scope="row">Not itemised</th><td>Contingency in the £${R.toolTotal}k estimate</td><td class="num">£${R.toolTotal - t}k</td><td class="num">${gbp((R.toolTotal - t) * 1000 / sets, 3)}</td></tr></tbody>
      <tfoot><tr><th scope="row" colspan="2">Total tooling</th><td class="num">£${(R.toolTotal / 1000).toFixed(2)}m</td><td class="num">${gbp(R.toolTotal * 1000 / sets)}</td></tr></tfoot></table>`;
  }
  const sens = $("#wsSens");
  if (sens) sens.innerHTML = `<table class="cs-tbl"><caption>What moves the £${BOM.toFixed(2)}</caption><tbody>${D.sens.map(([n, v]) => `<tr><th scope="row">${esc(n)}</th><td class="num">+${gbp(v)} a car</td><td class="num">+${k(v * UNITS)} a year</td></tr>`).join("")}</tbody></table>`;

  // ── Phase 2: function analysis ──
  // worth: each function's cost less the savings shown by the ideas (concept changes excluded, added costs ignored)
  D.funcs.forEach((f) => {
    const cut = V.filter((x) => x.f && x.f[f.id] > 0);
    f.save = r2(sum(cut, (x) => x.f[f.id]));
    f.ideas = cut.map((x) => x.id);
    f.parts = Object.keys(f.alloc).map(Number);
    f.worth = f.cost > 0 ? r2(f.cost - f.save) : 0;
    f.vi = f.cost > 0 ? f.cost / f.worth : null;
    f.gap = r2(f.cost - f.worth);
  });
  const viClass = (vi) => (vi == null ? "" : vi >= 2 ? "vi-hot" : vi >= 1.25 ? "vi-warm" : "vi-ok");
  const viTxt = (vi) => (vi > 10 ? "over 10" : vi.toFixed(2));
  const FUN = D.funcs.filter((f) => f.cost > 0);
  const KIND = { higher: "Higher-order", basic: "Basic", path: "Critical path", assumed: "Input (outside scope)", when: "When / caused by", unwanted: "Unwanted",
    all: "All the time", one: "One time", esteem: "Esteem", user: "User", second: "Second answer to how (AND)" };
  const PATHCOST = r2(sum(D.funcs.filter((f) => f.kind === "path"), (f) => f.cost));
  const WASHCOST = r2(sum(["spray", "convey", "pres", "store", "prime", "rear"], (id) => FN[id].cost));
  const CAUSED = r2(sum(["rfric", "emc", "vib", "limit"], (id) => FN[id].cost));
  const sorted = FUN.slice().sort((a, b) => b.cost - a.cost), TOP = Math.round(sorted.length * 0.3), TOPCOST = r2(sum(sorted.slice(0, TOP), (f) => f.cost));
  const famOf = (n) => D.funcs.filter((f) => f.alloc[n] != null).map((f) => f.fn);

  const pf = $("#wsPartFns");
  if (pf) pf.innerHTML = `<table class="cs-tbl st-pf"><caption>Every part's function, as an active verb and a measurable noun</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Part</th><th scope="col">Main function</th><th scope="col">Also does</th><th scope="col">Unwanted functions</th><th scope="col">On the FAST diagram</th><th scope="col"><span class="sr">3D</span></th></tr></thead>
    <tbody>${D.groups.map((g) => `<tr class="pf-grp"><th colspan="7" scope="rowgroup">${esc(g.name)}</th></tr>` + D.parts.filter((p) => p.g === g.id).map((p) => `<tr>
      <td class="num">${p.n}</td><td>${esc(p.name)}</td><td class="fn"><b>${esc(p.fn)}</b></td><td class="fn2">${p.fn2.map(esc).join("<br>") || "–"}</td>
      <td class="fnu">${p.fnU.map(esc).join("<br>") || "–"}</td><td>${famOf(p.n).map(esc).join("<br>")}</td><td>${p.hidden3d ? "" : partBtn([p.n], p.name)}</td></tr>`).join("")).join("")}</tbody></table>`;

  // the FAST diagram, drawn from the data; costs can be switched on
  const fast = $("#wsFast");
  const ROWY = { D: 34, A: 118, B: 194, P: 300, W1: 396, W2: 470, W3: 544, W4: 618, W5: 692, W6: 766 }, CW = 140, BW = 124, BH = 58, X0 = 20, SVGW = 1430, SVGH = 850;
  const bx = (f) => ({ x: X0 + f.col * CW, y: ROWY[f.row] });
  function drawFast(showCost) {
    let s = `<g class="fx-axis"><line x1="200" y1="14" x2="610" y2="14"/><path d="M610 9 L622 14 L610 19Z"/><text x="628" y="19" style="text-anchor:start">HOW?</text>
      <path d="M200 25 L188 30 L200 35Z"/><line x1="200" y1="30" x2="610" y2="30"/><text x="180" y="35" style="text-anchor:end">WHY?</text></g>`;
    const sx1 = X0 + CW - 8, sx2 = X0 + 9 * CW - 8;
    s += `<line class="fx-scope" x1="${sx1}" y1="100" x2="${sx1}" y2="${SVGH - 30}"/><line class="fx-scope" x1="${sx2}" y1="100" x2="${sx2}" y2="${SVGH - 30}"/>
      <text class="fx-lbl" x="${sx1}" y="${SVGH - 14}">scope</text><text class="fx-lbl" x="${sx2}" y="${SVGH - 14}">scope</text>`;
    s += `<text class="fx-lbl fx-left" x="${X0}" y="${ROWY.A + 22}">ALL THE TIME</text><text class="fx-lbl fx-left" x="${X0}" y="${ROWY.A + 38}">AND ESTEEM</text>
      <text class="fx-lbl fx-left" x="${X0}" y="${ROWY.B + 22}">USER AND</text><text class="fx-lbl fx-left" x="${X0}" y="${ROWY.B + 38}">ONE TIME</text>
      <text class="fx-lbl fx-left" x="${X0 + 2 * CW}" y="${ROWY.P - 12}">CRITICAL PATH</text>
      <text class="fx-lbl fx-left" x="${X0}" y="${ROWY.W2 + 22}">AND, WHEN,</text><text class="fx-lbl fx-left" x="${X0}" y="${ROWY.W2 + 38}">OR CAUSED BY</text>
      <text class="fx-lbl fx-left" x="${X0}" y="${ROWY.W5 + 22}">WASHING</text><text class="fx-lbl fx-left" x="${X0}" y="${ROWY.W5 + 38}">(AND)</text>`;
    s += `<g class="fx-obj"><rect x="${X0}" y="48" width="${4 * CW + BW}" height="40" rx="8"/><text x="${X0 + 12}" y="73"><tspan class="fx-crit-h">OBJECTIVE </tspan>${esc(D.objective.replace(", with every legal and design requirement still met", ""))}</text></g>`;
    s += `<g class="fx-crit"><rect x="${X0 + 5 * CW}" y="${ROWY.D - 30}" width="${4 * CW + BW + 20}" height="96" rx="8"/><text class="fx-crit-h" x="${X0 + 5 * CW + 12}" y="${ROWY.D - 12}">DESIGN CRITERIA (requirements, not functions)</text>
      ${D.criteria.map((c, i) => `<text x="${X0 + 5 * CW + 12 + (i % 3) * 226}" y="${ROWY.D + 8 + Math.floor(i / 3) * 20}">${esc(c)}</text>`).join("")}</g>`;
    const path = D.funcs.filter((f) => f.row === "P").sort((a, b) => a.col - b.col);
    path.forEach((f, i) => { if (!i) return; const a = bx(path[i - 1]), b = bx(f);
      s += `<line class="fx-link${f.kind === "assumed" ? " fx-dash" : ""}" x1="${a.x + BW}" y1="${a.y + BH / 2}" x2="${b.x}" y2="${b.y + BH / 2}"/>`; });
    D.flinks.forEach(([from, to, type]) => { const a = bx(FN[from]), b = bx(FN[to]);
      if (a.x === b.x) s += `<line class="fx-link fx-${type}" x1="${a.x + BW / 2}" y1="${a.y + BH}" x2="${b.x + BW / 2}" y2="${b.y}"/>`;
      else if (a.y === b.y) s += `<line class="fx-link fx-${type}" x1="${a.x + BW}" y1="${a.y + BH / 2}" x2="${b.x}" y2="${b.y + BH / 2}"/>`;
      else s += `<path class="fx-link fx-${type}" d="M${a.x + BW / 2} ${a.y + BH} L${a.x + BW / 2} ${b.y + BH / 2} L${b.x} ${b.y + BH / 2}" fill="none"/>`; });
    D.funcs.forEach((f) => {
      const { x, y } = bx(f), w = f.fn.split(" "), sub = showCost && f.cost > 0 ? `${gbp(f.cost)} · VI ${f.vi > 10 ? ">10" : f.vi.toFixed(2)}` : f.kind === "basic" ? "basic function" : f.kind === "higher" ? "higher-order" : f.kind === "assumed" ? "input" : f.kind === "unwanted" ? "unwanted" : "";
      const cls = `fx fx-${f.kind === "assumed" ? "out" : f.kind}${showCost && f.cost > 0 ? " " + viClass(f.vi) : ""}`;
      s += `<g class="${cls}" ${f.parts.length ? `data-wparts="${f.parts.join(",")}" tabindex="0" role="button" aria-label="${esc(f.fn)} (${KIND[f.kind]})${f.cost ? ", " + gbp(f.cost) : ""}: show the parts in 3D"` : ""}>
        <rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="8"/><text x="${x + BW / 2}" y="${y + (sub ? 20 : 24)}">${esc(w[0])}</text><text x="${x + BW / 2}" y="${y + (sub ? 35 : 41)}">${esc(w.slice(1).join(" "))}</text>
        ${sub ? `<text class="fx-sub" x="${x + BW / 2}" y="${y + 50}">${sub}</text>` : ""}</g>`;
    });
    return s;
  }
  if (fast) {
    const desc = `Read left to right to answer how, right to left to answer why. Maintain visibility, the higher-order function, sits left of scope. The basic function is Clear windscreen. The critical path: ${D.funcs.filter((f) => f.kind === "path").map((f) => f.fn).join(", ")}, then Supply power, the car's supply, outside scope. Wipe glass also needs Apply pressure, Distribute pressure and Resist lift, all together; it brings the unwanted Generate friction, which causes Reduce friction. Clear windscreen has a second answer, Wash glass, done by Spray fluid, Convey fluid, Pressurise fluid and Store fluid; Spray fluid needs Prime jets at the same time and the bottle also feeds the rear washer. Generate torque happens with Vary speed and Park blades, and brings the unwanted Generate interference, Generate noise and Generate heat, which cause Suppress interference, Isolate vibration and Limit current. Above the path, all the time: ${D.funcs.filter((f) => f.kind === "all").map((f) => f.fn).join(", ")}; esteem: Enhance appearance; user: Replace blade, Admit fluid, Indicate level; one time: Aim spray. Objective: ${D.objective}. Design criteria: ${D.criteria.join(", ")}.`;
    const render = (on) => { fast.querySelector("svg").innerHTML = `<title id="wfxT">FAST diagram for the VH-W2 wiper system</title><desc id="wfxD">${esc(desc)}</desc>` + drawFast(on); };
    fast.innerHTML = `<div class="fx-tools"><button type="button" class="pj-btn" id="wfxCost" aria-pressed="false">Show costs and value index</button></div>
      <div class="fx-scroll" tabindex="0" role="region" aria-label="FAST diagram, scroll sideways on a small screen"><svg viewBox="0 0 ${SVGW} ${SVGH}" role="group" aria-labelledby="wfxT wfxD"></svg></div>
      <ul class="fx-legend"><li class="fl-basic">Basic function</li><li class="fl-path">Critical path</li><li class="fl-when">When / caused by</li><li class="fl-unwanted">Unwanted</li>
        <li class="fl-all">All the time</li><li class="fl-one">One time</li><li class="fl-user">User</li><li class="fl-esteem">Esteem</li><li class="fl-out">Outside scope</li></ul>
      <p class="fx-key" hidden id="wfxKey"><span class="vi-ok">good value (VI under 1.25)</span><span class="vi-warm">worth a look (1.25–2)</span><span class="vi-hot">strong target (2 or more)</span></p>`;
    render(fast.dataset.cost === "on");
    const b = $("#wfxCost");
    if (fast.dataset.cost === "on") { b.setAttribute("aria-pressed", "true"); $("#wfxKey").hidden = false; }
    b.addEventListener("click", (e) => { const on = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", on); render(on); $("#wfxKey").hidden = !on; });
  }

  // the function cost matrix: the costliest parts against the functions they serve
  const mx = $("#wsMatrix");
  if (mx) {
    const parts = D.parts.slice().sort((a, b) => b.ext - a.ext).slice(0, 12);
    const cols = D.funcs.filter((f) => parts.some((p) => f.alloc[p.n] != null));
    mx.innerHTML = `<table class="cs-tbl st-mx"><caption>Function cost matrix: the 12 costliest parts (£ a car)</caption>
      <thead><tr><th scope="col">Part</th>${cols.map((f) => `<th scope="col" class="num mx-h"><span>${esc(f.fn)}</span></th>`).join("")}<th scope="col" class="num">Part cost</th></tr></thead>
      <tbody>${parts.map((p) => `<tr><th scope="row">${p.n} · ${esc(p.name)}</th>${cols.map((f) => `<td class="num${f.alloc[p.n] != null ? " mx-on" : ""}">${f.alloc[p.n] != null ? f.alloc[p.n].toFixed(2) : ""}</td>`).join("")}<td class="num"><b>${p.ext.toFixed(2)}</b></td></tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row">Function cost (all ${D.parts.length} parts)</th>${cols.map((f) => `<td class="num"><b>${f.cost.toFixed(2)}</b></td>`).join("")}<td class="num"><b>${BOM.toFixed(2)}</b></td></tr></tfoot></table>`;
  }
  const split = $("#wsSplit");
  if (split) {
    const grp = [["Critical path (wiping)", ["path"], "#2e6fe8"], ["Washing", ["wash"], "#22a39a"], ["Second answers to how (AND)", ["second"], "#d9a44a"], ["When / caused by", ["when"], "#7c8db5"],
      ["All the time", ["all"], "#9b6cf0"], ["User and one time", ["user", "one"], "#5b6b8a"], ["Esteem", ["esteem"], "#e06aa8"]].map(([n, kk, c]) => {
      const wash = ["spray", "convey", "pres", "store", "prime", "rear"];
      const v = kk[0] === "wash" ? WASHCOST : r2(sum(D.funcs.filter((f) => kk.includes(f.kind) && !wash.includes(f.id)), (f) => f.cost));
      return [n, v, c]; });
    split.innerHTML = `<div class="sp-bar" role="img" aria-label="${grp.map(([n, v]) => `${n} ${gbp(v)}`).join(", ")}">${grp.map(([n, v, c]) => `<i style="flex:${v};background:${c}" title="${esc(n)}"></i>`).join("")}</div>
      <ul class="sp-key">${grp.map(([n, v, c]) => `<li><s style="background:${c}"></s>${esc(n)} <b>${gbp(v)}</b> <span>${(v / BOM * 100).toFixed(1)}%</span></li>`).join("")}</ul>
      <p class="cs-small"><b>Wipe glass, the job the driver actually buys, costs ${gbp(FN.wipe.cost)} (${(FN.wipe.cost / BOM * 100).toFixed(1)}%).</b> Getting motion to the blade (the rest of the critical path) costs ${gbp(PATHCOST - FN.wipe.cost)}, and washing ${gbp(WASHCOST)}, of which ${gbp(FN.rear.cost + FN.pres.cost)} is the two pumps.</p>`;
  }
  const par = $("#wsFnPareto");
  if (par) {
    const W = 1100, H = 320, L = 46, Rr = 46, T = 60, n = sorted.length, bw = (W - L - Rr) / n, max = 5, yb = (v) => H - 40 - v / max * (H - 40 - T), yc = (p) => H - 40 - p / 100 * (H - 40 - T);
    let cum = 0;
    const pts = sorted.map((f, i) => { cum += f.cost; return [L + i * bw + bw / 2, yc(cum / BOM * 100)]; });
    par.innerHTML = `<div class="fp-scroll" tabindex="0" role="region" aria-label="Pareto chart of function costs"><svg viewBox="0 0 ${W} ${H + 120}" role="img" aria-label="Pareto chart: ${sorted.map((f) => `${f.fn} ${gbp(f.cost)}`).join(", ")}">
      ${[0, 25, 50, 75, 100].map((p) => `<line class="fp-grid" x1="${L}" x2="${W - Rr}" y1="${yc(p)}" y2="${yc(p)}"/><text class="fp-ax" x="${L - 6}" y="${yc(p) + 4}">${p}%</text>`).join("")}
      ${[0, 1, 2, 3, 4, 5].map((v) => `<text class="fp-ax fp-axr" x="${W - Rr + 6}" y="${yb(v) + 4}">£${v}</text>`).join("")}
      <text class="fp-ax fp-axl" x="${L - 30}" y="${T - 10}">cumulative %</text><text class="fp-ax" x="${W - 4}" y="${T - 10}">£ per function</text>
      <rect class="fp-zone" x="${L}" y="${T}" width="${TOP * bw}" height="${H - 40 - T}"/>
      <text class="fp-zt" x="${L + TOP * bw / 2}" y="${T - 32}" style="text-anchor:middle">Top ${TOP} of ${n} functions (30%): ${gbp(TOPCOST)}, ${(TOPCOST / BOM * 100).toFixed(0)}% of the cost</text>
      ${sorted.map((f, i) => `<g class="fp-b${i < TOP ? " top" : ""}"><rect x="${L + i * bw + 3}" y="${yb(f.cost)}" width="${bw - 6}" height="${H - 40 - yb(f.cost)}" style="--d:${i * 40}ms"/>${i < TOP ? `<text class="fp-v" x="${L + i * bw + bw / 2}" y="${yb(f.cost) - 5}">£${f.cost.toFixed(2)}</text>` : ""}
        <text class="fp-n" transform="translate(${L + i * bw + bw / 2 + 4},${H - 30}) rotate(-55)">${esc(f.fn)}</text></g>`).join("")}
      <polyline class="fp-cum" points="${pts.map((p) => p.join(",")).join(" ")}"/>${pts.map((p) => `<circle class="fp-dot" cx="${p[0]}" cy="${p[1]}" r="3"/>`).join("")}
      </svg></div>`;
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { par.classList.add("is-on"); io.disconnect(); } }), { threshold: 0.3 }); io.observe(par); } else par.classList.add("is-on");
  }
  const ft = $("#wsFunctions");
  if (ft) {
    ft.innerHTML = `<table class="cs-tbl st-fn"><caption>Cost, worth, value gap and value index of every function (£ a car)</caption>
      <thead><tr><th scope="col">Function</th><th scope="col">Type</th><th scope="col" class="num">Cost</th><th scope="col" class="num">Worth</th><th scope="col" class="num">Value gap</th><th scope="col">Value index (cost ÷ worth)</th><th scope="col">How the worth was set</th><th scope="col"><span class="sr">3D</span></th></tr></thead>
      <tbody>${sorted.map((f) => `<tr class="${viClass(f.vi)}">
        <th scope="row">${esc(f.fn)}<small>items ${f.parts.join(", ")}</small></th><td class="ty">${KIND[f.kind]}</td><td class="num">${gbp(f.cost)}</td><td class="num">${gbp(f.worth)}</td><td class="num">${f.gap > 0 ? gbp(f.gap) : "–"}</td>
        <td><span class="vi-bar"><i style="width:${Math.min(100, f.vi / 4 * 100).toFixed(0)}%"></i></span><b class="vi-n">${viTxt(f.vi)}</b></td>
        <td class="why"><b>${esc(D.worth[f.id][0])}.</b> ${esc(D.worth[f.id][1])}</td><td>${partBtn(f.parts, "the parts for " + f.fn)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row" colspan="2">All functions</th><td class="num">${gbp(BOM)}</td><td class="num">${gbp(sum(FUN, (f) => f.worth))}</td><td class="num">${gbp(sum(FUN, (f) => f.gap))}</td><td colspan="3">Value index for the whole system: ${(BOM / sum(FUN, (f) => f.worth)).toFixed(2)}</td></tr></tfoot></table>
      <p class="cs-small">The function costs add up to the system cost (${gbp(BOM)}). Unwanted functions have no parts of their own and are worth £0: the cost they cause shows up in the functions that deal with them. The reversing motor (V15) changes the architecture, so it's judged as a business case and not used to set any worth.</p>`;
  }
  // the paired comparison and the value graph
  const PC = D.paired, LET = "ABCDEFGHIJ", sc = Object.fromEntries(PC.fns.map((id) => [id, 0]));
  PC.pairs.forEach(([a, b, w, n]) => (sc[w] += n));
  const TOT = sum(Object.values(sc), (v) => v), PCOST = sum(PC.fns, (id) => FN[id].cost);
  const imp = Object.fromEntries(PC.fns.map((id) => [id, sc[id] / TOT * 100])), cshare = Object.fromEntries(PC.fns.map((id) => [id, FN[id].cost / PCOST * 100]));
  const pc = $("#wsPaired");
  if (pc) pc.innerHTML = `<table class="cs-tbl st-pc"><caption>The team's paired comparison: for each pair, the more important function to a driver and by how much (1 a little, 2 clearly, 3 a lot)</caption>
    <thead><tr><th scope="col">Function</th>${PC.fns.map((id, i) => `<th scope="col" class="num">${LET[i]}</th>`).join("")}<th scope="col" class="num">Score</th><th scope="col" class="num">Importance</th></tr></thead>
    <tbody>${PC.fns.map((id, i) => `<tr><th scope="row"><b>${LET[i]}</b> ${esc(FN[id].fn)}<small>${esc(PC.why[id])}</small></th>${PC.fns.map((id2, j) => {
      if (j <= i) return `<td class="pc-x"></td>`;
      const p = PC.pairs.find((x) => (x[0] === id && x[1] === id2) || (x[0] === id2 && x[1] === id));
      return `<td class="num pc-c">${LET[PC.fns.indexOf(p[2])]}${p[3]}</td>`; }).join("")}<td class="num"><b>${sc[id]}</b></td><td class="num">${imp[id].toFixed(1)}%</td></tr>`).join("")}</tbody></table>`;
  const vg = $("#wsValGraph");
  if (vg) {
    const rows = PC.fns.slice().sort((a, b) => imp[b] - imp[a]), mx2 = Math.max(...rows.map((id) => Math.max(imp[id], cshare[id])));
    vg.innerHTML = `<ul class="fvg">${rows.map((id) => { const r = cshare[id] / imp[id];
      return `<li class="${r >= 2 ? "fvg-hot" : r >= 1.25 ? "fvg-warm" : ""}"><span class="fvg-n">${esc(FN[id].fn)}</span>
        <span class="fvg-bars"><i class="fvg-imp" style="width:${(imp[id] / mx2 * 100).toFixed(1)}%"><em>${imp[id].toFixed(0)}%</em></i><i class="fvg-cost" style="width:${(cshare[id] / mx2 * 100).toFixed(1)}%"><em>${cshare[id].toFixed(0)}%</em></i></span>
        <span class="fvg-r">${r.toFixed(1)}×</span></li>`; }).join("")}</ul>
      <p class="fvg-key"><span class="k-imp">importance to the driver</span><span class="k-cost">share of the cost</span><span>cost share ÷ importance</span></p>`;
  }

  // ── Phase 3: the ideas ──
  const OUT = { park: "Parked for the next platform: it adds cost", reject: "Rejected: fails a must-be", drop: "Dropped: costs the owner more", trap: "Rejected: the saving isn't real", option: "Kept as an option, not standard" };
  const it = $("#wsIdeas");
  if (it) it.innerHTML = `<table class="cs-tbl st-ideas"><caption>All ${D.ideas.length} ideas, linked to the functions and parts they change</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Idea</th><th scope="col">Functions</th><th scope="col">Parts</th><th scope="col">Where it came from</th><th scope="col" class="num">A car</th><th scope="col" class="num">Mass</th><th scope="col">Screening</th></tr></thead>
    <tbody>${D.ideas.map((x) => `<tr class="${x.extra ? "is-out" : ""}"><td><b>${x.id}</b></td><td><b>${esc(x.t)}</b><small>${esc(x.d)}</small></td>
      <td class="fn">${x.extra ? "–" : ideaFns(x).map(esc).join("<br>")}</td>
      <td class="st-parts">${x.parts.length ? x.parts.join(", ") + " " + partBtn(x.parts, "the parts for " + x.id) : "–"}</td><td>${esc(x.tech)}</td>
      <td class="num">${x.add ? "+" + gbp(x.add) + " cost" : x.extra ? "–" : gbp(x.save)}</td><td class="num">${kg(x.kg)}</td>
      <td>${x.extra ? esc(OUT[x.extra]) : x.concept ? "Taken forward as a business case" : "Taken forward"}</td></tr>`).join("")}</tbody></table>`;

  // ── Phase 4: weighted scoring (1–5, where 5 is always good) ──
  const CRIT = [["Saving", 0.30], ["Risk", 0.25], ["What the driver gets", 0.20], ["One-off cost", 0.15], ["Speed", 0.10]];
  const sSave = (v) => (v >= 1 ? 5 : v >= 0.5 ? 4 : v >= 0.25 ? 3 : v >= 0.1 ? 2 : 1);
  const sRisk = (r) => ({ "Very low": 5, Low: 4, "Low to medium": 3, Medium: 2 }[r] || 1);
  const sNre = (n) => (n <= 10 ? 5 : n <= 20 ? 4 : n <= 45 ? 3 : n <= 90 ? 2 : 1);
  const sSpeed = (h) => (/^Immediate/.test(h) ? 5 : /^Short/.test(h) ? 4 : /^Medium/.test(h) ? 3 : /^Long/.test(h) ? 2 : 1);
  const CUST = { V01: [4, "Front and rear can't wash at the same moment"], V02: [4, "A fan of spray; top-ups as often as today"], V03: [3, "Drivers without the winter pack lose the low-fluid light"],
    V04: [3, "The arm nut shows; a plainer look"], V12: [4, "Must stay as stiff as steel at speed"], V13: [4, "Can't corrode and seize; must pass the snow-load test"], V15: [5, "Arms park lower; softer, quieter reversals"] };
  const scoreOf = (x) => [sSave(x.save), sRisk(x.risk), (CUST[x.id] || [5])[0], sNre(x.nre), sSpeed(x.h)];
  const scored = V.concat(CON).map((x) => { const s = scoreOf(x), tot = r2(sum(s.map((v, i) => v * CRIT[i][1]), (v) => v));
    return { ...x, sc: s, tot, go: tot >= 3.25 ? "go" : tot >= 2.75 ? "check" : "hold" }; }).sort((a, b) => b.tot - a.tot);
  const ev = $("#wsEval");
  if (ev) ev.innerHTML = `<table class="cs-tbl st-eval"><caption>Weighted scoring: each idea scored 1–5 against each criterion, then weighted</caption>
    <thead><tr><th scope="col">Idea</th>${CRIT.map(([c, w]) => `<th scope="col" class="num">${esc(c)}<small>${Math.round(w * 100)}%</small></th>`).join("")}<th scope="col" class="num">Score</th><th scope="col">Decision</th></tr></thead>
    <tbody>${scored.map((x) => `<tr class="w-${x.go}"><th scope="row"><b>${x.id}</b> ${esc(x.t)}${CUST[x.id] ? `<small>${esc(CUST[x.id][1])}</small>` : ""}</th>${x.sc.map((s) => `<td class="num"><span class="dot d${s}">${s}</span></td>`).join("")}
      <td class="num"><b>${x.tot.toFixed(2)}</b></td><td class="dec">${x.go === "go" ? "Go" : x.go === "check" ? "Go after a feasibility check" : x.concept ? "Hold on cost: see business case 2" : "Hold"}</td></tr>`).join("")}</tbody></table>
    <p class="cs-small"><b>How the scores were set.</b> Saving: £1 or more a car scores 5, 50p 4, 25p 3, 10p 2, less 1. Risk: very low 5, low 4, low to medium 3, medium 2.
    One-off cost: up to £10k scores 5, £20k 4, £45k 3, £90k 2, more 1. Speed: immediate 5, short 4, medium 3, long 2, next platform 1. A score of 3.25 or more is a go; 2.75 to 3.25 a go once a feasibility check is passed.</p>`;

  // ── Phase 5: business cases ──
  const cs = $("#wsCases");
  if (cs) cs.innerHTML = D.cases.map((c) => {
    const xs = c.ideas.map((id) => ID[id]), save = r2(sum(xs, (x) => x.save)), nre = sum(xs, (x) => x.nre), mass = r2(sum(xs, (x) => x.kg || 0)), mv = -mass * R.massValue;
    return `<article class="st-case"><p class="st-case-k">${c.ideas.join(" + ")} ${partBtn([...new Set(xs.flatMap((x) => x.parts))], "the parts for " + c.h)}</p><h4>${esc(c.h)}</h4>
      <dl class="st-nums"><div><dt>Saving a car</dt><dd>${gbp(save)}</dd></div><div><dt>A year (${UNITS / 1000}k cars)</dt><dd>${k(save * UNITS)}</dd></div>
      <div><dt>One-off cost</dt><dd>${nre >= 1000 ? "£" + (nre / 1000).toFixed(1) + "m" : "£" + nre + "k"}</dd></div><div><dt>Mass</dt><dd>${kg(mass)}</dd></div>
      <div><dt>Payback on cost alone</dt><dd>${payback(nre, save) > 120 ? "over 10 years" : payback(nre, save).toFixed(1) + " months"}</dd></div>
      <div><dt>Payback counting mass at £${R.massValue}/kg</dt><dd>${(payback(nre, save + mv)).toFixed(1)} months</dd></div></dl>
      <p>${esc(c.body)}</p><p><b>Risks:</b> ${esc(c.risks)}</p><p><b>Tests before release:</b> ${esc(c.tests)}</p></article>`;
  }).join("");
  const wv = $("#wsWaves");
  if (wv) {
    const WN = { 1: "Wave 1: quick wins, 0–3 months", 2: "Wave 2: short term, 3–6 months", 3: "Wave 3: medium term, 6–9 months", 4: "Wave 4: long term, 12–18 months" };
    wv.innerHTML = [1, 2, 3, 4].map((n) => {
      const arr = V.filter((x) => x.wave === n), s = sum(arr, (x) => x.save), nre = sum(arr, (x) => x.nre);
      return `<div class="st-wscroll" tabindex="0" role="region" aria-label="Wave ${n} ideas"><table class="cs-tbl st-wave"><caption>${WN[n]}</caption>
      <thead><tr><th scope="col">Idea</th><th scope="col" class="num">A car</th><th scope="col" class="num">A year</th><th scope="col" class="num">One-off</th><th scope="col" class="num">Payback</th></tr></thead>
      <tbody>${arr.map((x) => `<tr><th scope="row"><b>${x.id}</b> ${esc(x.t)}</th><td class="num">${gbp(x.save)}</td><td class="num">${k(x.save * UNITS)}</td><td class="num">£${x.nre}k</td><td class="num">${payback(x.nre, x.save).toFixed(1)} mo</td></tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row">Wave ${n}</th><td class="num">${gbp(s)}</td><td class="num">${k(s * UNITS)}</td><td class="num">£${nre}k</td><td class="num">${payback(nre, s).toFixed(1)} mo</td></tr></tfoot></table></div>`;
    }).join("");
  }

  // ── Phase 6: the decision ──
  const dec = $("#wsDecision");
  if (dec) {
    const sAll = r2(sum(V, (x) => x.save)), nAll = sum(V, (x) => x.nre), c1 = D.cases[0].ideas.map((id) => ID[id]), s1 = r2(sum(c1, (x) => x.save)), tgt = BOM * 0.10;
    dec.innerHTML = `<div class="cs-kpis st-kpis">
      <div><b>${gbp(BOM)}</b><span>the system's cost today, a car</span></div>
      <div><b>${gbp(tgt)}</b><span>the objective: 10% off</span></div>
      <div><b>${gbp(s1)}</b><span>the washer package alone: ${(s1 / BOM * 100).toFixed(1)}%, ${k(s1 * UNITS)} a year</span></div>
      <div><b>${gbp(sAll)}</b><span>all ${V.length} running-change ideas: ${(sAll / BOM * 100).toFixed(1)}%, ${k(sAll * UNITS)} a year</span></div>
      <div><b>${payback(nAll, sAll).toFixed(1)} months</b><span>payback on £${nAll}k of one-off costs</span></div></div>`;
  }

  // the "3D" buttons and FAST boxes point at the parts in the model
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-wparts]"); if (!b || !window.VHWiper) return;
    const ns = b.dataset.wparts.split(",").map(Number).filter(Boolean); if (!ns.length) return;
    const v = document.getElementById("wpViewer"); if (v) v.scrollIntoView({ behavior: "smooth", block: "center" });
    window.VHWiper.show(ns);
  });
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("g[data-wparts]")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });

  window.VH_WSTUDY = { funcs: D.funcs, ideas: D.ideas, scored, BOM, UNITS, PATHCOST, WASHCOST, CAUSED, TOP, TOPCOST, importance: imp, costShare: cshare };
})();
