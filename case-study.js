/* VAVEhub · projector case study: spec card, bill of materials (by report line, with the parts in
   each), cost build-up, where the cost sits, where the shop price goes, CSV download.
   Works without WebGL; the 3D viewer (projector-3d.js) is an extra on top. */
(function () {
  const D = window.VH_PROJ; if (!D) return;
  const $ = (s) => document.querySelector(s);
  const money = (v, dp = 2) => "£" + v.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const unitFmt = (v) => money(v, v < 0.1 ? 3 : 2);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);

  // totals: the report's parts, our additions, then the report's cost build-up
  const reportLines = D.lines.filter((l) => !l.added), added = D.lines.filter((l) => l.added);
  const BOM_R = sum(reportLines, (l) => l.ext), BOM_X = sum(added, (l) => l.ext), BOM = BOM_R + BOM_X;
  const conv = sum(D.chain.filter((c) => c.cost && !/Freight/.test(c.name)), (c) => c.cost);
  const ship = sum(D.chain.filter((c) => /Freight/.test(c.name)), (c) => c.cost);
  const EXW = BOM + conv, DDP = EXW + ship;
  window.VH_COST = { BOM_R, BOM_X, BOM, EXW, DDP, conv, ship };

  // spec card
  const spec = $("#pjSpec");
  if (spec) spec.innerHTML = D.spec.rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  // the viewer's side panel: parts by group, and the light path in steps
  const list = $(".pj-list");
  if (list) list.innerHTML = D.groups.map((g) => {
    const items = D.parts.filter((p) => p.g === g.id && !p.hidden3d);
    return items.length ? `<li class="pj-grp"><p>${esc(g.name)}</p><ul>${items.map((p) => `<li><button type="button" class="pj-part" data-n="${p.n}"><span>${p.n}</span>${esc(p.name)}</button></li>`).join("")}</ul></li>` : "";
  }).join("");
  const steps = $(".pj-steps");
  if (steps) steps.innerHTML = D.path.map((s, i) => `<li><button type="button" class="pj-step" data-i="${i + 1}"><span>${i + 1}</span><b>${esc(s.t)}</b><em>${esc(s.d)}</em></button></li>`).join("");

  // headline figures
  const kp = $("#pjKpis");
  if (kp) kp.innerHTML = `
    <div><b>${D.lines.length} lines · ${D.parts.length} parts</b><span>${reportLines.length} lines from the report, ${added.length} added by VAVEhub</span></div>
    <div><b>${money(BOM)}</b><span>parts cost: ${money(BOM_R)} in the report + ${money(BOM_X)} added</span></div>
    <div><b>${money(EXW)}</b><span>ex-works cost at the factory gate</span></div>
    <div><b>${money(DDP)}</b><span>landed cost in the UK, duty paid</span></div>
    <div><b>${money(D.report.street)}</b><span>street price ex VAT, ${(D.report.street / DDP).toFixed(1)} × landed cost</span></div>`;

  // cost build-up
  const cb = $("#pjChain");
  if (cb) {
    let run = BOM;
    cb.innerHTML = `<table class="cs-tbl"><caption class="sr">From parts to a landed projector</caption><tbody>
      <tr><th scope="row">Parts (bill of materials)<small>${money(BOM_R)} in the report + ${money(BOM_X)} for parts it doesn't itemise</small></th><td class="num">${money(BOM)}</td><td class="num">${money(BOM)}</td></tr>
      ${D.chain.map((c) => {
        if (c.gate) return `<tr class="cb-gate"><th scope="row">${esc(c.gate)}</th><td></td><td class="num">${money(run)}</td></tr>`;
        run += c.cost; return `<tr><th scope="row">${esc(c.name)}<small>${esc(c.note)}</small></th><td class="num">${money(c.cost)}</td><td></td></tr>`;
      }).join("")}</tbody></table>
      <p class="cs-small">The report's own totals are ${money(D.report.exw)} ex-works and ${money(D.report.ddp)} landed. The ${money(BOM_X)} difference is the parts VAVEhub added.</p>`;
  }

  // where the cost sits: report lines, largest first, with a running total
  const par = $("#pjPareto");
  if (par) {
    const rows = D.lines.slice().sort((a, b) => b.ext - a.ext);
    const top = rows.slice(0, 10), rest = rows.slice(10), max = top[0].ext;
    let cum = 0;
    par.innerHTML = top.map((l) => {
      cum += l.ext;
      return `<li><span class="par-name">${l.id} · ${esc(l.name)}</span><span class="par-bar"><i style="width:${(l.ext / max * 100).toFixed(1)}%"></i></span>
        <span class="par-val">${Math.round(l.ext / BOM * 100)}%<small>${money(l.ext)} · ${Math.round(cum / BOM * 100)}% so far</small></span></li>`;
    }).join("") + `<li class="par-rest"><span class="par-name">${rest.length} other lines</span><span class="par-bar"><i style="width:${(sum(rest, (l) => l.ext) / max * 100).toFixed(1)}%"></i></span>
      <span class="par-val">${Math.round(sum(rest, (l) => l.ext) / BOM * 100)}%<small>${money(sum(rest, (l) => l.ext))}</small></span></li>`;
  }

  // the table: each report line, then the parts it pays for
  const tb = $("#pjBom tbody");
  if (tb) {
    tb.innerHTML = D.subs.map((s) => {
      const lines = D.lines.filter((l) => l.sub === s.id), tot = sum(lines, (l) => l.ext);
      return `<tr class="bom-grp"><th colspan="5" scope="rowgroup">${s.id} · ${esc(s.name)}</th><td class="num">${money(tot)}</td></tr>` + lines.map((l) => {
        const kids = D.parts.filter((p) => p.alloc[l.id] != null);
        return `<tr class="bom-line${l.added ? " is-added" : ""}"><td class="num"><b>${l.id}</b></td><th scope="row">${esc(l.name)}<small>${esc(l.spec)}</small></th><td></td>
          <td class="num">${l.q}</td><td class="num">${unitFmt(l.unit)}</td><td class="num"><b>${money(l.ext)}</b></td></tr>` +
          kids.map((p) => {
            const share = p.alloc[l.id], others = Object.keys(p.alloc).filter((k) => k !== l.id);
            return `<tr class="bom-kid"><td class="num">${p.n}</td><td>↳ ${esc(p.name)}<small>${esc(p.mat)}${others.length ? ` · also ${others.map((k) => `${k} ${money(p.alloc[k])}`).join(", ")}` : ""}</small></td>
              <td class="fn">${esc(p.fn)}${p.fn2 && p.fn2.length ? `<small>also ${p.fn2.map(esc).join(", ")}</small>` : ""}</td><td class="num">${p.q}</td><td class="num">${unitFmt(share / p.q)}</td><td class="num">${money(share)}</td></tr>`;
          }).join("");
      }).join("");
    }).join("");
    $("#pjBom tfoot").innerHTML = `
      <tr><th colspan="5" scope="row">Parts in the report</th><td class="num">${money(BOM_R)}</td></tr>
      <tr><th colspan="5" scope="row">Parts added by VAVEhub</th><td class="num">${money(BOM_X)}</td></tr>
      <tr class="bom-sum"><th colspan="5" scope="row">Bill of materials</th><td class="num">${money(BOM)}</td></tr>
      <tr><th colspan="5" scope="row">Conversion, scrap, overheads and the contract manufacturer's margin</th><td class="num">${money(conv)}</td></tr>
      <tr><th colspan="5" scope="row">Freight, insurance, compliance and warranty</th><td class="num">${money(ship)}</td></tr>
      <tr class="bom-sum bom-big"><th colspan="5" scope="row">Landed cost in the UK</th><td class="num">${money(DDP)}</td></tr>
      <tr><th colspan="5" scope="row">Street price, ex VAT</th><td class="num">${money(D.report.street)}</td></tr>`;
  }

  // where the shop price goes
  const pr = $("#pjPrice");
  if (pr) {
    const R = D.report, owner = R.street - DDP;
    const seg = [
      ["Parts", BOM, "pr-parts", "the bill of materials"],
      ["Making it", conv, "pr-conv", "assembly, test, scrap, overheads and the factory's margin"],
      ["Getting it here", ship, "pr-ship", "freight, insurance, compliance, warranty"],
      ["Brand owner and sales channel", owner, "pr-maker", "R&D, sales, support, distributor and reseller margins, profit"],
      ["VAT", R.vat, "pr-vat", "20%"],
    ];
    pr.innerHTML = `<div class="pr-bar" role="img" aria-label="${seg.map((x) => `${x[0]} ${money(x[1])}`).join(", ")}, total £${R.streetInc}">${seg.map(([n, v, c]) => `<i class="${c}" style="flex:${v}"><span>£${Math.round(v)}</span></i>`).join("")}</div>
      <ul class="pr-key">${seg.map(([n, v, c, d]) => `<li><i class="${c}"></i><b>${n}</b> ${money(v)} <span>${d} · ${Math.round(v / R.streetInc * 100)}%</span></li>`).join("")}</ul>
      <p class="cs-small">For a projector selling at £${R.streetInc} (${money(R.street)} ex VAT). The report puts the combined brand-owner and channel margin at about 60% of the ex-VAT price, which is what is left here once the landed cost is paid.</p>`;
  }

  // sources
  const src = $("#pjSources");
  if (src) src.innerHTML = D.sources.map(([t, u]) => `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>` : esc(t)}</li>`).join("");

  // CSV download: the report lines, then the parts with their shares
  const dl = $("#pjCsv");
  if (dl) dl.addEventListener("click", () => {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [["Line", "Sub-assembly", "Description", "Specification", "Qty", "Unit cost (GBP)", "Line cost (GBP)", "Source"]];
    D.lines.forEach((l) => rows.push([l.id, D.subs.find((s) => s.id === l.sub).name, l.name, l.spec, l.q, l.unit.toFixed(3), l.ext.toFixed(2), l.added ? "VAVEhub estimate" : "Should-cost report"]));
    rows.push([]); rows.push(["Item", "Group", "Part", "Function", "Qty", "Unit cost (GBP)", "Total (GBP)", "From report lines"]);
    D.parts.forEach((p) => rows.push([p.n, D.groups.find((g) => g.id === p.g).name, p.name, p.fn, p.q, p.cost.toFixed(3), p.ext.toFixed(2), Object.entries(p.alloc).map(([k, v]) => `${k} £${v.toFixed(2)}`).join("; ")]));
    rows.push([]);
    rows.push(["", "", "Bill of materials", "", "", "", BOM.toFixed(2)]);
    D.chain.filter((c) => c.cost).forEach((c) => rows.push(["", "", c.name, c.note, "", "", c.cost.toFixed(2)]));
    rows.push(["", "", "Landed cost in the UK", "", "", "", DDP.toFixed(2)]);
    rows.push([]); rows.push(["VH-3600 is a made-up model. Costs from a should-cost report for a comparable 3,600-lumen XGA 3LCD projector at 200,000 a year; parts marked VAVEhub estimate are not itemised in the report. Source: VAVEhub (valueengineeringhub.com)."]);
    const blob = new Blob(["﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "VH-3600-bill-of-materials.csv";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (window.vhTrack) window.vhTrack("case-study/bom-download");
  });
})();
