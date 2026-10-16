/* VAVEhub · projector case study: spec card, bill of materials, where the cost sits, CSV download.
   Works without WebGL; the 3D viewer (projector-3d.js) is an extra on top. */
(function () {
  const D = window.VH_PROJ; if (!D) return;
  const $ = (s) => document.querySelector(s);
  const places = (v) => (v < 0.05 ? 3 : v < 10 ? 2 : 0);
  const money = (v, dp) => "£" + v.toLocaleString("en-GB", { minimumFractionDigits: dp ?? places(v), maximumFractionDigits: dp ?? places(v) });
  const range = (lo, hi, dp) => `${money(lo, dp)}–${money(hi, dp)}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // spec card
  const spec = $("#pjSpec");
  if (spec) spec.innerHTML = D.spec.rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  // the viewer's side panel: parts by sub-assembly, and the light path in steps
  const list = $(".pj-list");
  if (list) list.innerHTML = D.groups.map((g) => {
    const items = D.parts.filter((p) => p.g === g.id && !p.hidden3d);
    return items.length ? `<li class="pj-grp"><p>${esc(g.name)}</p><ul>${items.map((p) => `<li><button type="button" class="pj-part" data-n="${p.n}"><span>${p.n}</span>${esc(p.name)}</button></li>`).join("")}</ul></li>` : "";
  }).join("");
  const steps = $(".pj-steps");
  if (steps) steps.innerHTML = D.path.map((s, i) => `<li><button type="button" class="pj-step" data-i="${i + 1}"><span>${i + 1}</span><b>${esc(s.t)}</b><em>${esc(s.d)}</em></button></li>`).join("");

  // totals
  const line = (p) => [p.c[0] * p.q, p.c[1] * p.q];
  const sum = (arr) => arr.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
  const groups = D.groups.map((g) => {
    const parts = D.parts.filter((p) => p.g === g.id);
    return { ...g, parts, tot: sum(parts.map(line)) };
  });
  const bom = sum(groups.map((g) => g.tot));
  const conv = sum(D.add.map((a) => a.c));
  const factory = [bom[0] + conv[0], bom[1] + conv[1]];
  const mid = (r) => (r[0] + r[1]) / 2;

  // the table
  const tb = $("#pjBom tbody");
  if (tb) {
    tb.innerHTML = groups.map((g) => `
      <tr class="bom-grp"><th colspan="5" scope="rowgroup">${esc(g.name)}<small>${esc(g.note)}</small></th><td></td><td class="num">${range(g.tot[0], g.tot[1])}</td></tr>
      ${g.parts.map((p) => `<tr>
        <td class="num">${p.n}</td><th scope="row">${esc(p.name)}</th><td class="fn">${esc(p.fn)}</td><td class="num">${p.q}</td>
        <td class="mat">${esc(p.mat)}</td><td class="num">${range(p.c[0], p.c[1])}</td><td class="num">${range(...line(p))}</td></tr>`).join("")}`).join("");
    $("#pjBom tfoot").innerHTML = `
      <tr class="bom-sum"><th colspan="6" scope="row">Parts total (bill of materials)</th><td class="num">${range(bom[0], bom[1], 0)}</td></tr>
      ${D.add.map((a) => `<tr><th colspan="6" scope="row">${esc(a.name)}</th><td class="num">${range(a.c[0], a.c[1], 0)}</td></tr>`).join("")}
      <tr class="bom-sum bom-big"><th colspan="6" scope="row">Should-cost per projector, landed in the UK</th><td class="num">${range(factory[0], factory[1], 0)}</td></tr>
      <tr><th colspan="6" scope="row">Street price, ex VAT</th><td class="num">${money(D.spec.retailEx, 0)}</td></tr>`;
  }
  const kp = $("#pjKpis");
  if (kp) kp.innerHTML = `
    <div><b>${D.parts.length}</b><span>line items</span></div>
    <div><b>${D.parts.reduce((a, p) => a + p.q, 0)}</b><span>parts in total</span></div>
    <div><b>${range(bom[0], bom[1], 0)}</b><span>parts cost (estimate)</span></div>
    <div><b>${range(factory[0], factory[1], 0)}</b><span>should-cost, landed in the UK</span></div>
    <div><b>${money(D.spec.retailEx, 0)}</b><span>street price ex VAT, about ${(D.spec.retailEx / mid(factory)).toFixed(1)} × should-cost</span></div>`;

  // where the cost sits: sub-assemblies by midpoint, largest first
  const par = $("#pjPareto");
  if (par) {
    const rows = groups.map((g) => ({ name: g.name, lo: g.tot[0], hi: g.tot[1], m: mid(g.tot) })).sort((a, b) => b.m - a.m);
    const total = rows.reduce((a, r) => a + r.m, 0), max = rows[0].m;
    let cum = 0;
    par.innerHTML = rows.map((r) => {
      cum += r.m;
      return `<li><span class="par-name">${esc(r.name)}</span><span class="par-bar"><i style="width:${(r.m / max * 100).toFixed(1)}%"></i></span>
        <span class="par-val">${Math.round(r.m / total * 100)}%<small>${range(r.lo, r.hi, 0)} · ${Math.round(cum / total * 100)}% so far</small></span></li>`;
    }).join("");
  }

  // where the shop price goes: should-cost, the maker's share, the channel's share, VAT
  const pr = $("#pjPrice");
  if (pr && D.price) {
    const P = D.price, cost = Math.round(mid(factory)), parts = Math.round(mid(bom));
    const maker = P.street - P.channel - cost, total = P.street + P.vat;
    const seg = [
      ["Parts", parts, "pr-parts", "the bill of materials"],
      ["Make, ship, warranty", cost - parts, "pr-conv", "assembly and test, freight, warranty"],
      ["The maker", maker, "pr-maker", "overheads, R&amp;D, sales, support and profit"],
      ["Distributor and reseller", P.channel, "pr-chan", "their margins"],
      ["VAT", P.vat, "pr-vat", "20%"],
    ];
    pr.innerHTML = `<div class="pr-bar" role="img" aria-label="${seg.map((x) => `${x[0]} £${x[1]}`).join(", ")}, total £${total}">${seg.map(([n, v, c]) => `<i class="${c}" style="flex:${v}"><span>£${v}</span></i>`).join("")}</div>
      <ul class="pr-key">${seg.map(([n, v, c, d]) => `<li><i class="${c}"></i><b>${n}</b> £${v} <span>${d} · ${Math.round(v / total * 100)}%</span></li>`).join("")}</ul>
      <p class="cs-small">Midpoint figures for a £${total} projector (£${P.street} ex VAT). ${esc(P.note)}</p>`;
  }

  // sources
  const src = $("#pjSources");
  if (src) src.innerHTML = D.sources.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("");

  // CSV download
  const dl = $("#pjCsv");
  if (dl) dl.addEventListener("click", () => {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [["Item", "Sub-assembly", "Part", "Function", "Qty", "Material / process", "Unit cost low (GBP)", "Unit cost high (GBP)", "Line cost low (GBP)", "Line cost high (GBP)"]];
    D.parts.forEach((p) => { const l = line(p); rows.push([p.n, D.groups.find((g) => g.id === p.g).name, p.name, p.fn, p.q, p.mat, p.c[0], p.c[1], l[0].toFixed(2), l[1].toFixed(2)]); });
    rows.push([]); rows.push(["", "", "Parts total", "", "", "", "", "", bom[0].toFixed(2), bom[1].toFixed(2)]);
    D.add.forEach((a) => rows.push(["", "", a.name, "", "", "", "", "", a.c[0], a.c[1]]));
    rows.push(["", "", "Should-cost, landed in the UK", "", "", "", "", "", factory[0].toFixed(2), factory[1].toFixed(2)]);
    rows.push([]); rows.push(["Should-cost estimates for a large maker buying parts on the open market: 2025/26 prices, about 500,000 projectors a year, assembled in Asia, £1 = $1.30. Built from volume price evidence, not retail spares. VH-3600 is a made-up model based on the usual design of 3LCD classroom projectors. Source: VAVEhub (valueengineeringhub.com)."]);
    const blob = new Blob(["﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "VH-3600-bill-of-materials.csv";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (window.vhTrack) window.vhTrack("case-study/bom-download");
  });
})();
