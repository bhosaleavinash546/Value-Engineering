/* Builds the projector case-study videos: videos/cs-<id>.mp4, each with a poster (.webp).

     node tools/casevid/make.js intro p1 p2 p3 p4 p5 p6 learnt      (or "all")
     PREVIEW=dir node tools/casevid/make.js all                     (stills only, to check the pictures)

   1. Voice-over: with VOICE=1 each line is spoken by edge-tts (en-GB-RyanNeural) and its length measured;
      without it, lengths are estimated so the pictures can be checked.
   2. Scene lengths follow the voice-over, never shorter than the scene's minimum.
   3. Pictures: tools/casevid/stage.html draws each scene at 1080p, frame by frame. 3D scenes use the real
      model (projector-3d.js); charts and tables are HTML. Subtitles are drawn on the picture.
   4. Sound: the voice, with original music from tools/trailer/music.py underneath (nothing to license),
      dipping while the voice speaks. Loudness is normalised.
   Every figure comes from projector-data.js, the same data as the case study page. */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT, startServer, launch } = require("../../tests/lib");

const FF = process.env.FFMPEG || "ffmpeg";
const FPS = 30, VOICE = process.env.VOICE === "1";
const TMP = path.join(process.env.CASEVID_TMP || require("os").tmpdir(), "vh-casevid");
const ff = (args) => execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });

// ── the numbers, from the case study's own data ──
const W = {}; new Function("window", fs.readFileSync(path.join(ROOT, "projector-data.js"), "utf8"))(W);
const D = W.VH_PROJ, sum = (a, f) => a.reduce((t, x) => t + f(x), 0), r2 = (v) => Math.round(v * 100) / 100;
const BOM = r2(sum(D.lines, (l) => l.ext)), CONV = r2(sum(D.chain.filter((c) => c.cost && !/Freight/.test(c.name)), (c) => c.cost));
const SHIP = r2(sum(D.chain.filter((c) => /Freight/.test(c.name)), (c) => c.cost)), LANDED = r2(BOM + CONV + SHIP);
const V = D.ideas.filter((x) => !x.extra), IDEA = Object.fromEntries(D.ideas.map((x) => [x.id, x]));
const FN = Object.fromEntries(D.funcs.map((f) => [f.id, f]));
D.funcs.forEach((f) => { f.save = r2(sum(V.filter((x) => x.f && x.f[f.id]), (x) => x.f[f.id])); f.worth = Math.max({ emc: 0.05, info: 0.03 }[f.id] || 0, r2(f.cost - f.save)); });
const LINE = Object.fromEntries(D.lines.map((l) => [l.id, l]));
const save = (ids) => r2(sum(ids, (id) => IDEA[id].save));
const CORE = V.filter((x) => +x.id.slice(1) <= 12), ALL = save(V.map((x) => x.id)), CORESAVE = save(CORE.map((x) => x.id));
const UNITS = D.report.volume;
const gbp = (v) => "£" + v.toFixed(2);
const k = (v) => (v >= 1e6 ? "£" + (v / 1e6).toFixed(2) + "m" : "£" + Math.round(v / 1e3) + "k");
const payback = (nre, s) => nre * 1000 / (s * UNITS) * 12;
// weighted scores, the same rules as the study (phase 4)
const sSave = (v) => (v >= 3 ? 5 : v >= 1.5 ? 4 : v >= 1.0 ? 3 : v >= 0.6 ? 2 : 1);
const sRisk = (r) => ({ "Very low": 5, Low: 4, "Low to medium": 3, Medium: 2 }[r] || 1);
const sNre = (n) => (n <= 15 ? 5 : n <= 25 ? 4 : n <= 40 ? 3 : n <= 70 ? 2 : 1);
const sSpeed = (h) => (/^Immediate/.test(h) ? 5 : /^Short/.test(h) ? 4 : /^Medium/.test(h) ? 3 : 2);
const CUST = { V01: 2, V10: 3, V19: 3, V04: 4, V05: 4, V08: 4, V15: 4, V18: 4 };
const WT = [0.30, 0.25, 0.20, 0.15, 0.10];
const SCORED = V.map((x) => { const sc = [sSave(x.save), sRisk(x.risk), CUST[x.id] || 5, sNre(x.nre), sSpeed(x.h)]; return { id: x.id, t: x.t, sc, tot: r2(sum(sc.map((s, i) => s * WT[i]), (v) => v)) }; })
  .sort((a, b) => b.tot - a.tot);
const GO = SCORED.filter((x) => x.tot >= 3).length + 1, CHECK = SCORED.filter((x) => x.tot >= 2.5 && x.tot < 3);   // +1: eco mode (H1) is a go too
const wave = (n) => { const a = V.filter((x) => x.wave === n); return { ids: a.map((x) => x.id), s: r2(sum(a, (x) => x.save)), nre: sum(a, (x) => x.nre) }; };
const optical = D.parts.filter((p) => Object.keys(p.alloc).some((l) => l[0] === "A")).map((p) => p.n);

// cameras ([position], [target])
const CAM = { home: [[34, 24, 40], [0, 0, 0]], exploded: [[98, 58, 114], [-6, 2.5, 0]], light: [[-4, 31, 25], [-2, 0, 2]] };
const BLUE = "#2e6fe8", AMBER = "#d9a44a", GREEN = "#1fae6a", GREY = "#55607a", ORANGE = "#ff7a3d";

// ── the eight videos ──
const VIDEOS = {
  intro: { name: "The product and the challenge", badge: "A", scenes: [
    { kind: "title", kick: "VAVEhub · Worked case study", title: "The classroom projector", sub: "One product, taken through all six steps of a value study.", step: 0, min: 6,
      vo: "This is a complete value study of one product, a classroom projector, from the first facts to the final decision." },
    { kind: "three", cam: { orbit: { target: [0, -1, 0], r: [66, 60], h: [26, 22], a: [0.45, 1.15] } }, min: 7,
      vo: "It's a three LCD projector: three thousand six hundred lumens, from a lamp that runs at two hundred and ten watts." },
    { kind: "three", t: [0, 1], tAt: [0.6, 4.2], cam: { from: CAM.home, to: CAM.exploded }, min: 8,
      vo: "Take it apart and there are fifty kinds of part inside. Each one has a job, and each one has a cost." },
    { kind: "three", light: true, lightIn: 0.8, step: [1, 2, 3, 4, 5, 6, 7, 0], cam: { from: CAM.light, to: [[16, 28, 34], [1, 0, 3]] }, min: 12,
      vo: "Light leaves the lamp, is split into red, green and blue, and passes through three small LCD panels. A glass cube puts it back together, and the lens throws it on the wall." },
    { kind: "chain", k: "Where the £425 goes", h: `It sells for £425. Making it and landing it in the UK costs ${gbp(LANDED)}.`, tl: "Shop price, inc VAT", min: 9,
      segs: [{ l: "Parts", v: BOM, c: BLUE, short: "Parts" }, { l: "Making it", v: CONV, c: AMBER }, { l: "Getting it here", v: SHIP, c: GREEN },
        { l: "Brand owner and shops", v: r2(D.report.street - LANDED), c: GREY, short: "Brand owner and shops" }, { l: "VAT", v: D.report.vat, c: "#3b4560", short: "VAT" }],
      vo: "It sells for four hundred and twenty-five pounds. Making it, and landing it in the UK, costs a hundred and forty-two pounds seventy." },
    { kind: "list", style: "check", k: "The challenge", h: `Take at least 10% (${gbp(LANDED * 0.1)}) out of the landed cost`, min: 8,
      items: [["No loss of brightness:", "3,600 lumens, white and colour"], ["No loss of picture:", "XGA from three LCD panels"], ["No loss of reliability or safety", ""], ["The same £425 in the shops", ""]],
      vo: "The challenge is to take at least ten per cent out of that cost, without losing any brightness, picture quality, reliability or safety." },
    { kind: "title", kick: "The method", title: "The six-step job plan", sub: "From the facts to the decision, one step at a time.", step: 0, min: 6, sect: "resolve",
      vo: "To do it, we'll follow the six-step value engineering job plan. Let's start with the facts." },
  ] },

  p1: { name: "Information", step: 1, scenes: [
    { kind: "title", kick: "Step 1 of 6", title: "Information", sub: "Get the facts before the ideas.", step: 1, min: 5,
      vo: "Step one is information. Before anyone has an idea, the team gets the facts." },
    { kind: "three", t: 1, sel: optical, only: optical, cam: { from: [[84, 62, 104], [-10, 6, 2]], to: [[70, 58, 100], [-10, 7, 2]] },
      panel: { k: "Optical engine and lamp", big: "£55.20", p: "53% of the parts cost", list: [["3 LCD panels", gbp(LINE.A1.ext)], ["Lamp module", gbp(LINE.A2.ext)], ["Zoom lens", gbp(LINE.A3.ext)], ["X-cube prism", gbp(LINE.A4.ext)]] }, min: 10,
      vo: "First, where the cost sits. The optical engine is fifty-five pounds twenty, more than half of the parts. The three LCD panels alone cost twenty-four pounds sixty." },
    { kind: "chain", k: "From parts to a landed projector", h: "Parts are only part of the cost", tl: "Landed cost", min: 9,
      segs: [{ l: "Parts (bill of materials)", v: BOM, c: BLUE, short: gbp(BOM) }, { l: "Making it: assembly, test, overheads, margin", v: CONV, c: AMBER, short: gbp(CONV) }, { l: "Freight, compliance and warranty", v: SHIP, c: GREEN, short: gbp(SHIP) }],
      vo: "The parts come to a hundred and five pounds twenty. Making it adds twenty-seven sixty, and freight, compliance and warranty another nine ninety." },
    { kind: "table", k: "The factory, stage by stage", h: "42 people and 85 minutes a projector", min: 9, hl: [5],
      cols: ["Stage", "People", "Minutes", "Cost"], rows: D.process.map((p) => [p[0], p[2], p[3].toFixed(1), gbp(p[4] + p[5])]),
      foot: ["Direct conversion", "42", "85.0", gbp(sum(D.process, (p) => p[4] + p[5]))],
      vo: "Then the factory. Forty-two people and eighty-five minutes of work a projector. More than half that time is a forty-five minute burn-in." },
    { kind: "list", style: "warn", k: "Checking the data", h: "Five things in the report didn't add up", min: 10,
      items: [["Tooling:", "£880k used, but only £715k itemised"], ["Factory margin:", "called 8%, but £9.40 is 7.7%"], ["VAVE-10:", "headed £1.55, counted as £1.85"], ["Panel alignment:", "£3.10 in the text, £2.00 in the table"], ["Missing parts:", "manuals and four more, £1.20 added"]],
      vo: "Then check the data. The report was good, but five things didn't add up, including a hundred and sixty-five thousand pounds of tooling that nobody had itemised." },
    { kind: "cards", cols: 4, k: "What schools value (Kano)", h: "Ask the customer", min: 9,
      items: [{ h: "Must-be", p: "Safe and reliable. A bright picture in a lit room, in colour too. HDMI.", c: "#ff5d5d" }, { h: "More is better", p: "Brightness, lamp life, low running cost, a quiet fan.", c: BLUE },
        { h: "Delighters", p: "Instant on, wireless casting, automatic keystone.", c: GREEN }, { h: "Indifferent for most", p: "A second VGA input, VGA out, RS-232C, a VGA cable in the box.", c: GREY }],
      vo: "And ask the customer. Schools must have a bright picture in a lit room, and HDMI. Most don't care about the extra VGA ports, or the cable in the box." },
    { kind: "stats", k: "Five years in a classroom", h: "The school's biggest cost isn't the projector", min: 8,
      items: [{ v: 354, pre: "£", dp: 0, l: "the projector, ex VAT", c: "blue", at: 0.8 }, { v: 400, pre: "about £", dp: 0, l: "electricity: 280 W for 5,700 hours at 25p", c: "bad", at: 2.4 }],
      vo: "One surprise. Over five years, a school spends more on electricity than on the projector itself." },
    { kind: "list", style: "check", k: "Gate check before step 2", h: "Ready to move on", min: 7, sect: "resolve",
      items: [["Brief signed", "by the sponsor"], ["Costs, volumes and factory data checked,", "with the gaps written down"], ["Customer needs ranked,", "not guessed"]],
      vo: "With the brief signed and the facts checked, the team moves on to step two." },
  ] },

  p2: { name: "Function analysis", step: 2, scenes: [
    { kind: "title", kick: "Step 2 of 6", title: "Function analysis", sub: "What does it do, and what does each job cost?", step: 2, min: 5,
      vo: "Step two is function analysis. Stop looking at the parts, and ask what the product does." },
    { kind: "three", t: 1, sel: [1, 16, 19, 21], only: [1, 16, 19, 21], labels: true, cam: { from: [[66, 50, 88], [-8, 6, 3]], to: [[56, 46, 86], [-8, 7, 3]] },
      panel: { k: "A verb and a noun", list: [["Lamp", "generate light"], ["LCD panels", "modulate light"], ["X-cube", "combine colours"], ["Lens", "enlarge image"]] }, min: 10,
      vo: "Every part gets a function, written as a verb and a noun. The lamp generates light. The panels modulate light. The prism combines colours. The lens enlarges the image." },
    { kind: "fast", k: "The FAST diagram", h: "How? to the right. Why? to the left.", min: 11,
      path: [{ fn: "Communicate information", sub: "higher-order", cls: "out" }, { fn: "Project image", sub: "basic function", cls: "basic" }, { fn: "Enlarge image" }, { fn: "Combine colours" },
        { fn: "Modulate light" }, { fn: "Separate colours" }, { fn: "Condition light" }, { fn: "Generate light" }, { fn: "Convert power" }],
      above: [{ fn: "Enclose components" }, { fn: "Remove heat" }, { fn: "Align optics" }, { fn: "Protect user" }], below: [{ fn: "Process signal", sub: "when" }, { fn: "Receive signal" }], belowAt: 4,
      vo: "The FAST diagram links them. Read to the right, it answers how. Read to the left, it answers why. Project image is the basic function: the reason the product exists." },
    { kind: "bars", k: "Cost of each function", h: "Each part's cost, shared out among its jobs", min: 9, gap: 0.3,
      items: ["mod", "sig", "gen", "enl", "pow", "comb", "rcv", "encl"].map((id, i) => ({ l: FN[id].fn, v: FN[id].cost, c: i ? "" : "hl" })),
      vo: "Then each part's cost is shared out among its functions. Modulating light costs twenty-seven pounds fifty: over a quarter of everything." },
    { kind: "list", k: "Worth and the value index", h: "What should each job cost?", min: 9,
      items: [["Worth:", "the lowest cost shown to do the same job reliably"], ["Value index:", "cost divided by worth"], ["1.5 or more:", "poor value, so look there first"]],
      vo: "Next comes worth: the lowest cost shown to do the same job. Cost divided by worth gives the value index. The higher it is, the more you're overpaying." },
    { kind: "vi", k: "Two functions compared", h: "The biggest cost isn't the worst value", min: 13,
      items: [{ fn: "Modulate light", cost: FN.mod.cost, worth: FN.mod.worth, say: "Expensive, but good value. DLP is cheaper, but fails on colour.", at: 0.8 },
        { fn: "Receive signal", cost: FN.rcv.cost, worth: FN.rcv.worth, say: "Cheap, but poor value: ports few schools use.", at: 5.6 }],
      vo: "Modulating light is expensive, but good value: its index is one point oh four. Receiving the signal costs five pounds, for a job worth one pound thirty. Its index is three point eight five." },
    { kind: "list", k: "Targets for the creative session", h: "Chosen by value, not just by cost", min: 7, sect: "resolve",
      items: [["Receive and process the signal", ""], ["Generate light and convert power", ""], ["Enclose components and remove heat", ""], ["The optics, and the factory process", ""]],
      vo: "So the targets for the creative session are set by value, not just by cost." },
  ] },

  p3: { name: "Creative", step: 3, scenes: [
    { kind: "title", kick: "Step 3 of 6", title: "Creative", sub: "Lots of ideas, and no judging yet.", step: 3, min: 5,
      vo: "Step three is the creative phase. Lots of ideas, and no judging yet." },
    { kind: "cards", cols: 3, k: "How the ideas came", h: "Six ways in, all aimed at the target functions", min: 9, gap: 0.45,
      items: [{ h: "Brainstorming" }, { h: "SCAMPER" }, { h: "TRIZ" }, { h: "Design for assembly" }, { h: "Teardowns and benchmarks" }, { h: "Ideas from suppliers" }],
      vo: "The team works on the target functions only, using brainstorming, SCAMPER, TRIZ, design for assembly, teardowns, and ideas from suppliers." },
    { kind: "three", t: 1, sel: IDEA.V01.parts, only: IDEA.V01.parts, labels: true, cam: { from: [[-44, 8, -66], [-2, -13, -20]], to: [[-26, 4, -70], [-2, -13, -20]] },
      panel: { k: "V01 · Drop the legacy ports", big: gbp(IDEA.V01.save), p: "a projector. Keep HDMI, one VGA, network, USB and one audio jack." }, min: 9,
      vo: "Drop the legacy ports that few schools use, and keep HDMI, one VGA, network and USB. Three pounds eighty a projector." },
    { kind: "three", t: 1, sel: IDEA.V03.parts, only: IDEA.V03.parts, labels: true, cam: { from: [[10, 8, 60], [0, -14, -14]], to: [[-4, 6, 62], [0, -14, -14]] },
      panel: { k: "V03 · One board for power", big: gbp(IDEA.V03.save), p: "a projector. Power supply and lamp ballast share one filter and one heatsink." }, min: 9,
      vo: "Put the power supply and the lamp ballast on one board, sharing one filter and one heatsink. Two pounds ten." },
    { kind: "three", t: 1, sel: [22, 23, 24], only: [22, 23, 24], labels: true, cam: { from: [[70, 40, 80], [0, 0, 2]], to: [[60, 34, 86], [0, 0, 2]] },
      panel: { k: "V08 · Two fans, not three", big: gbp(IDEA.V08.save), p: "a projector. The airflow is redesigned with CFD." }, min: 8,
      vo: "Redesign the airflow so two fans do the work of three. One pound ten." },
    { kind: "cards", cols: 3, k: "Ideas that don't touch the product", h: "The factory and the supply chain", min: 9,
      items: ["V11", "V12", "V20"].map((id) => ({ id, h: IDEA[id].t, sv: gbp(IDEA[id].save) })),
      vo: "Some ideas don't touch the product at all. Faster curing on the alignment rig, and a shorter burn-in, save one pound seventy-five between them." },
    { kind: "stats", k: "The creative session", h: "Every idea tied to parts and functions", min: 7,
      items: [{ v: D.ideas.length, dp: 0, l: "ideas in all: the report's 20, and 4 more", c: "blue", at: 0.6 }, { v: ALL, pre: "£", l: "a projector, if all 20 work", c: "good", at: 1.8 }],
      vo: "Twenty-four ideas in all, each one tied to the parts and the functions it changes." },
    { kind: "cards", cols: 4, k: "A quick screen", h: "Only must-be failures are dropped", min: 10, sect: "resolve",
      items: [{ id: "H3", h: "Single-chip DLP", p: "Cheaper, but about 1,400 colour lumens", out: true }, { id: "H4", h: "Remove the speaker", p: "Teachers in small rooms need it", out: true },
        { id: "H2", h: "Laser light source", p: "Adds £13.50: parked for a premium model", out: true }, { id: "H1", h: "Eco mode by default", p: "No cost to the maker; kept", sv: "Kept", svc: "#3fd08a" }],
      vo: "Then a quick screen. It drops only what breaks a must-be. Single-chip DLP is cheaper, but it can't give a bright colour picture, so it's out." },
  ] },

  p4: { name: "Evaluation", step: 4, scenes: [
    { kind: "title", kick: "Step 4 of 6", title: "Evaluation", sub: "Score every idea the same way.", step: 4, min: 5,
      vo: "Step four is evaluation. Every idea is scored in the same way." },
    { kind: "bars", k: "Agreed before any scoring", h: "The criteria and their weights", min: 12, max: 30, gap: 1.3,
      items: [["Saving", 30], ["Risk", 25], ["What the customer gets", 20], ["One-off cost", 15], ["Speed", 10]].map(([l, v]) => ({ l, v, vt: v + "%" })),
      vo: "First, the team and the sponsor agree the criteria and their weights. Saving, thirty per cent. Risk, twenty-five. What the customer gets, twenty. One-off cost, fifteen. And speed, ten." },
    { kind: "scores", k: "Scored 1 to 5, where 5 is always good", h: "The top of the table", min: 11, crit: ["Saving", "Risk", "Customer", "One-off", "Speed"],
      rows: SCORED.slice(0, 4).map((x) => ({ id: x.id, t: IDEA[x.id].t, sc: x.sc, tot: x.tot })),
      vo: "Then each idea is scored from one to five against each criterion, where five is always good. Dropping the VGA cable comes top: a real saving, almost no risk, and quick to do." },
    { kind: "stats", k: "The result", h: "21 ideas scored", min: 8,
      items: [{ v: GO, dp: 0, l: "a clear go", c: "good", at: 0.6 }, { v: CHECK.length, dp: 0, l: "go after a feasibility check: " + CHECK.map((x) => IDEA[x.id].t.toLowerCase()).join("; "), c: "blue", at: 2.4 }],
      vo: "Eighteen ideas are a clear go. Three, like the plastic lens elements, need a feasibility check first." },
    { kind: "list", style: "check", k: "Gate check before step 5", h: "Fair, and seen to be fair", min: 7, sect: "resolve",
      items: [["Criteria and weights agreed", "before scoring"], ["Every score has a reason", ""], ["Shortlist agreed", "by the sponsor"]],
      vo: "Agreeing the weights before scoring stops anyone working back from the answer they wanted." },
  ] },

  p5: { name: "Development", step: 5, scenes: [
    { kind: "title", kick: "Step 5 of 6", title: "Development", sub: "Turn the best ideas into business cases.", step: 5, min: 5,
      vo: "Step five is development. A good idea isn't a saving until it has a business case." },
    { kind: "stats", k: "V01 · Drop the legacy ports", h: "The biggest single saving", min: 10,
      items: [{ v: IDEA.V01.save, pre: "£", l: "saving a projector", c: "good", at: 0.6 }, { v: IDEA.V01.save * UNITS / 1000, pre: "£", suf: "k", dp: 0, l: "a year, at 200,000 projectors", c: "good", at: 2.2 },
        { v: IDEA.V01.nre, pre: "£", suf: "k", dp: 0, l: "one-off cost", c: "blue", at: 4.6 }],
      vo: "Dropping the legacy ports saves three pounds eighty a projector. That's seven hundred and sixty thousand pounds a year, for a one-off cost of thirty-five thousand." },
    { kind: "list", style: "warn", k: "V01 · Risks and tests", h: "Every risk has an answer and a test", min: 10,
      items: [["Risk:", "some schools still use a second VGA input or RS-232 control"], ["Answer:", "room control moves to the network port, which stays"], ["Check:", "the installed base, before launch"], ["Tests:", "EMC, HDMI compliance, a trial in five schools"]],
      vo: "The risk is the schools that still use those ports. Room control can move to the network port, and sales check the installed base before launch." },
    { kind: "three", t: 1, sel: IDEA.V03.parts, only: IDEA.V03.parts, labels: true, cam: { from: [[-4, 6, 62], [0, -14, -14]], to: [[-14, 4, 60], [0, -14, -14]] },
      panel: { k: "V03 · The riskiest", big: gbp(IDEA.V03.save), list: [["One-off cost", "£" + IDEA.V03.nre + "k"], ["Payback", payback(IDEA.V03.nre, IDEA.V03.save).toFixed(1) + " months"], ["Watch", "3.5 kV by low voltage"]] }, min: 10,
      vo: "One board for power and ballast saves two pounds ten, but it needs the most care. The lamp's three and a half thousand volt ignition pulse sits next to low-voltage parts." },
    { kind: "table", k: "The report's four waves", h: "From quick wins to longer engineering", min: 9,
      cols: ["Wave", "Ideas", "A projector", "One-off", "Payback"],
      rows: [[1, "0–3 months"], [2, "3–6 months"], [3, "6–9 months"], [4, "9–14 months"]].map(([n, m]) => { const w = wave(n); return [`Wave ${n}, ${m}`, w.ids.length, gbp(w.s), "£" + w.nre + "k", payback(w.nre, w.s).toFixed(1) + " mo"]; }),
      foot: ["All 20 ideas", "20", gbp(ALL), "£" + sum(V, (x) => x.nre) + "k", payback(sum(V, (x) => x.nre), ALL).toFixed(1) + " mo"],
      vo: "All twenty ideas go into four waves, from quick wins in three months to longer engineering over fourteen." },
    { kind: "table", k: "The biggest idea, tested", h: "3LCD or single-chip DLP?", min: 10, num: false, hl: [1],
      cols: ["", "3LCD", "Single-chip DLP"], rows: [["Landed cost", gbp(D.report.ddp), gbp(D.report.ddpDlp)], ["Colour brightness", "3,600 lumens", "about 1,400 lumens"], ["Verdict", "Keep", "Fails a must-be"]],
      vo: "The big questions are tested too. DLP would land nine pounds sixty-five cheaper, but with about fourteen hundred colour lumens, not thirty-six hundred." },
    { kind: "stats", k: "Lamp or laser?", h: "A product decision, not a saving", min: 8, sect: "resolve",
      items: [{ v: IDEA.H2.add, pre: "+£", l: "a projector for a laser-phosphor light source", c: "bad", at: 0.6 }, { v: 90, pre: "£", suf: "+", dp: 0, l: "retail premium it can support", c: "good", at: 2.4 }],
      vo: "And a laser light source adds thirteen pounds fifty. That makes it a decision for a premium model, not a cost saving." },
  ] },

  p6: { name: "Presentation", step: 6, scenes: [
    { kind: "title", kick: "Step 6 of 6", title: "Presentation", sub: "Ask for a decision, then track the savings.", step: 6, min: 5,
      vo: "Step six is presentation. A short meeting, a clear ask, and a decision." },
    { kind: "waterfall", k: "From today's cost to the target", h: `${gbp(LANDED)} to ${gbp(LANDED - ALL)}`, min: 14, part: 1,
      vo: "From a landed cost of a hundred and forty-two pounds seventy, the ports and the board take off five twenty-five. Power, two ten. Optics, four ten. The case and fans, three thirty. Packing and the factory, three sixty." },
    { kind: "waterfall", k: "From today's cost to the target", h: `${gbp(LANDED)} to ${gbp(LANDED - ALL)}`, min: 10, part: 2,
      vo: "The core twelve ideas reach a hundred and twenty-four thirty-five, past the ten per cent target. All twenty reach a hundred and eighteen pounds five." },
    { kind: "stats", k: "The result", h: "All 20 ideas", min: 9,
      items: [{ v: ALL / LANDED * 100, dp: 1, suf: "%", l: "off the landed cost", c: "good", at: 0.6 }, { v: ALL * UNITS / 1e6, pre: "£", suf: "m", dp: 2, l: "a year, at 200,000 projectors", c: "good", at: 2.0 },
        { v: payback(sum(V, (x) => x.nre), ALL), dp: 1, suf: " months", l: `payback on £${sum(V, (x) => x.nre)}k`, c: "blue", at: 3.6 }],
      vo: "That's seventeen per cent off the cost: four point nine million pounds a year, paying back in under two months." },
    { kind: "list", k: "The ask", h: "Four decisions for the sponsor", min: 10,
      items: [["Approve waves 1 and 2 now:", `${gbp(save([...wave(1).ids, ...wave(2).ids]))} a projector`], ["Fund the engineering", "for waves 3 and 4"], ["Ship in eco mode", "from the next production run"], ["Take laser to the product plan,", "as a premium model"]],
      vo: "The ask is simple. Approve waves one and two now. Fund the engineering for three and four. Ship in eco mode. And take laser to the product plan." },
    { kind: "list", style: "check", k: "After the workshop", h: "A saving isn't real until it's banked", min: 10, sect: "resolve",
      items: [["Engineer and test", "each approved idea"], ["Release it", "through a formal engineering change"], ["Bank it", "when finance sees it in the actual cost"], ["Review monthly:", "banked, late, at risk"]],
      vo: "Then the real work starts. Engineer it, test it, release it, and track every saving monthly until finance sees it in the actual cost." },
  ] },

  learnt: { name: "What we learnt", badge: "✓", scenes: [
    { kind: "three", cam: { orbit: { target: [0, -1, 0], r: [60, 66], h: [22, 26], a: [1.2, 0.6] } }, min: 5,
      vo: "So what did one projector teach us?" },
    { kind: "cards", cols: 3, k: "What we learnt", h: "Facts, functions and the customer", min: 16, gap: 4.4,
      items: [{ h: "Check the facts", p: "Even a good report had five things that didn't add up." }, { h: "Think in functions", p: "The most expensive job was good value. The worst value hid in a cheap one." },
        { h: "The customer sets the worth", p: "Over 90% of classrooms use HDMI: £6.30 of savings." }],
      vo: "Check the facts: even a good report had five things that didn't add up. Think in functions: the most expensive job was good value, and the worst value hid in a cheap one. And let the customer set the worth. One fact, that over ninety per cent of classrooms use HDMI, is behind six pounds thirty of savings." },
    { kind: "cards", cols: 3, k: "What we learnt", h: "Process, fairness and who pays", min: 15, gap: 4.2,
      items: [{ h: "Value is in the process too", p: "£4.05 came from the factory and the supply chain." }, { h: "Agree the criteria first", p: "Then score every idea the same way." },
        { h: "Value depends on who pays", p: "Eco mode costs the maker nothing, and saves the school a quarter of its power." }],
      vo: "Value isn't only in the design: four pounds of savings came from the factory and the supply chain. Agree the criteria before you score. And remember, value depends on who pays. Eco mode costs the maker nothing, and saves the school a quarter of its power." },
    { kind: "end", h: "24 ideas. <span>17%.</span> One method.", p: "Now try it on a product of your own.", url: "valueengineeringhub.com", min: 7, sect: "resolve",
      vo: "Twenty-four ideas, seventeen per cent, one method. Now try it on a product of your own." },
  ] },
};
// the waterfall bars, shared by the two waterfall scenes
const STEPS = [["Ports, board", ["V01", "V02"]], ["Power", ["V03"]], ["Optics", ["V04", "V05", "V06"]], ["Case, fans", ["V07", "V08", "V09"]], ["Pack, factory", ["V10", "V11", "V12"]]];
function waterfall(part) {
  let run = LANDED; const bars = [{ n: "Today", top: LANDED, bot: 100, lbl: gbp(LANDED), c: "#2e6fe8" }];
  STEPS.forEach(([n, ids]) => { const s = save(ids); bars.push({ n, top: run, bot: run - s, lbl: "−" + gbp(s), c: "#ff7a3d", step: true }); run = r2(run - s); });
  bars.push({ n: "Core 12", top: run, bot: 100, lbl: gbp(run), c: "#3b5fb0" });
  const ext = r2(ALL - CORESAVE); bars.push({ n: "Ideas 13–20", top: run, bot: run - ext, lbl: "−" + gbp(ext), c: "#ff7a3d", step: true }); run = r2(run - ext);
  bars.push({ n: "All 20", top: run, bot: 100, lbl: gbp(run), c: "#1fae6a" });
  // part 1 draws Today and the five core steps in time with the voice; part 2 starts with those already up
  const at1 = [0.6, 4.6, 6.6, 8.4, 10.3, 12.2], at2 = [1.0, 4.4, 6.4];
  bars.forEach((b, i) => (b.at = part === 1 ? (i < 6 ? at1[i] : 999) : (i < 6 ? -1 : at2[i - 6])));
  return { bars, lo: 100, hi: 146, target: r2(LANDED * 0.9), tAt: part === 1 ? 999 : 0.4 };
}
Object.values(VIDEOS).forEach((v) => v.scenes.forEach((s) => { if (s.kind === "waterfall") Object.assign(s, waterfall(s.part)); }));

// ── building ──
const words = (s) => s.split(/\s+/).length;
function duration(file) {
  try { execFileSync(FF, ["-hide_banner", "-i", file], { stdio: "pipe" }); } catch (e) {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(e.stderr));
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  }
  throw new Error("no duration for " + file);
}
function voice(v, dir) {
  for (const [i, s] of v.scenes.entries()) {
    s.voFile = path.join(dir, `vo-${i}.mp3`);
    if (VOICE) {
      for (let a = 0; ; a++) {
        try { execFileSync("edge-tts", ["--voice", "en-GB-RyanNeural", "--rate=-2%", "--text", s.vo, "--write-media", s.voFile], { stdio: "inherit" }); break; }
        catch (e) { if (a >= 3) throw e; execFileSync("sleep", [String(5 * (a + 1))]); }
      }
      s.voDur = duration(s.voFile);
    } else { s.voFile = null; s.voDur = words(s.vo) / 2.6 + 0.3; }
    s.dur = Math.max(s.min, s.voDur + 1.1);
  }
}
async function stage(browser, O) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("  stage error:", e.message));
  await page.goto(O + "/tools/casevid/stage.html");
  await page.waitForFunction(() => window.ready && window.ready(), null, { timeout: 120000 });
  return { ctx, page };
}
async function setScene(page, v, s) {
  await page.evaluate(({ s, meta }) => window.setup(s, meta), { s: { ...s, voFile: undefined }, meta: { dur: s.dur, step: v.step, stepName: v.name, name: v.name, badge: v.badge } });
  await page.waitForTimeout(s.kind === "three" ? 400 : 120);   // let the 3D canvas take its new size
}
async function renderScene(page, v, s, dir, n) {
  const frames = Math.round(s.dur * FPS), fdir = path.join(dir, `f${n}`);
  fs.mkdirSync(fdir, { recursive: true });
  await setScene(page, v, s);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.frame(t), i / FPS);
    await page.screenshot({ path: path.join(fdir, `${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
  }
  const segFile = path.join(dir, `seg${String(n).padStart(2, "0")}.mp4`);
  ff(["-framerate", String(FPS), "-i", path.join(fdir, "%05d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20", "-r", String(FPS), segFile]);
  fs.rmSync(fdir, { recursive: true, force: true });
  return segFile;
}

async function build(id, browser, O) {
  const v = JSON.parse(JSON.stringify(VIDEOS[id]));
  const dir = path.join(TMP, id); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  voice(v, dir);
  const { ctx, page } = await stage(browser, O);
  if (process.env.PREVIEW) {
    for (const [n, s] of v.scenes.entries()) {
      await setScene(page, v, s);
      for (const f of (process.env.AT || "0.5,0.97").split(",").map(Number)) {
        await page.evaluate((t) => window.frame(t), s.dur * f);
        await page.screenshot({ path: path.join(process.env.PREVIEW, `${id}-${String(n).padStart(2, "0")}-${s.kind}-${Math.round(f * 100)}.jpg`), type: "jpeg", quality: 80 });
      }
    }
    await ctx.close();
    console.log(`  ${id}: ${v.scenes.length} scenes, about ${v.scenes.reduce((a, s) => a + s.dur, 0).toFixed(0)} s; stills in ${process.env.PREVIEW}`);
    return;
  }
  const segs = [];
  for (const [n, s] of v.scenes.entries()) {
    const t0 = Date.now();
    segs.push(await renderScene(page, v, s, dir, n));
    console.log(`  ${id} scene ${n + 1}/${v.scenes.length} (${s.kind}, ${s.dur.toFixed(1)} s) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await ctx.close();
  const list = path.join(dir, "list.txt");
  fs.writeFileSync(list, segs.map((f) => `file '${f}'`).join("\n"));
  const silent = path.join(dir, "silent.mp4");
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);

  // sound: voice lines at each scene start, music underneath that dips while the voice speaks
  const total = v.scenes.reduce((a, s) => a + s.dur, 0), starts = [], vo = [];
  let t = 0;
  for (const s of v.scenes) { starts.push({ id: s.kind, sect: s.sect || "calm", start: t, dur: s.dur }); if (s.voFile) vo.push([s.voFile, t + 0.3]); t += s.dur; }
  const planFile = path.join(dir, "music-plan.json"), music = path.join(dir, "music.wav");
  fs.writeFileSync(planFile, JSON.stringify({ course: "casevid", scenes: starts }));
  execFileSync(process.env.PYTHON || "python3", [path.join(ROOT, "tools", "trailer", "music.py"), planFile, music], { stdio: "inherit" });
  const inputs = ["-i", music], parts = [];
  const delay = (x) => `adelay=${Math.round(x * 1000)}|${Math.round(x * 1000)}`;
  vo.forEach(([f, at], i) => { inputs.push("-i", f); parts.push(`[${i + 1}]aformat=channel_layouts=stereo,${delay(at)}[v${i + 1}]`); });
  let graph;
  if (vo.length) {
    graph = parts.join(";") + `;${vo.map((_, i) => `[v${i + 1}]`).join("")}amix=inputs=${vo.length}:normalize=0:duration=longest,apad,atrim=0:${total.toFixed(2)},asplit=2[voA][voK];` +
      `[0]volume=0.30[mus];[mus][voK]sidechaincompress=threshold=0.02:ratio=6:attack=30:release=500:makeup=1[duck];[voA][duck]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  } else graph = `[0]volume=0.30,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  const wav = path.join(dir, "mix.wav");
  ff([...inputs, "-filter_complex", graph, "-map", "[aout]", "-ar", "48000", "-t", total.toFixed(2), wav]);
  const out = path.join(process.env.CASEVID_OUT || path.join(ROOT, "videos"), `cs-${id}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ff(["-i", silent, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out + ".mp4"]);
  ff(["-ss", "3.2", "-i", out + ".mp4", "-frames:v", "1", "-vf", "scale=1280:720", "-quality", "82", out + ".webp"]);
  console.log(`  ${id}: ${total.toFixed(1)} s → ${out}.mp4 (${(fs.statSync(out + ".mp4").size / 1e6).toFixed(1)} MB)${VOICE ? "" : " (no voice: VOICE=1 to record it)"}`);
}

if (require.main === module) (async () => {
  let which = process.argv.slice(2);
  if (which.includes("all")) which = Object.keys(VIDEOS);
  which = which.filter((a) => VIDEOS[a]);
  if (!which.length) { console.error("usage: node tools/casevid/make.js " + Object.keys(VIDEOS).join("|") + "|all"); process.exit(1); }
  const port = 8600 + Math.floor(Math.random() * 300);
  const server = await startServer(port), O = `http://127.0.0.1:${port}`;
  const browser = await launch();
  try { for (const id of which) await build(id, browser, O); }
  finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); process.exit(1); });

module.exports = { VIDEOS };
