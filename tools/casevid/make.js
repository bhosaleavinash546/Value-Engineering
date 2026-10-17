/* Builds the projector case-study videos: videos/cs-<id>.mp4, each with a poster (.webp).

     node tools/casevid/make.js intro p1 p2a p2b p2c p2d p2e p3 p4 p5 p6 learnt   (or "all")
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
D.funcs.forEach((f) => { f.save = r2(sum(V.filter((x) => x.f && x.f[f.id]), (x) => x.f[f.id])); f.worth = f.cost > 0 ? Math.max({ instr: 0.03 }[f.id] || 0, r2(f.cost - f.save)) : 0; f.vi = f.cost > 0 ? f.cost / f.worth : null; });
// function analysis figures, the same as the case study page
const FUNC = D.funcs.filter((f) => f.cost > 0).sort((a, b) => b.cost - a.cost), TOPN = Math.round(FUNC.length * 0.3), TOPC = r2(sum(FUNC.slice(0, TOPN), (f) => f.cost));
const COSTS = Object.fromEntries(FUNC.map((f) => [f.id, [f.cost, f.vi]])), ALLF = D.funcs.map((f) => f.id), PATHF = D.funcs.filter((f) => f.row === "P").map((f) => f.id);
const kindCost = (...k) => r2(sum(D.funcs.filter((f) => k.includes(f.kind)), (f) => f.cost));
const CAUSEDC = r2(sum(["heat", "dust", "uv", "emc"], (id) => FN[id].cost)), GAP = r2(sum(FUNC, (f) => f.cost - f.worth));
const PAIRS = (() => { const P = D.paired, sc = Object.fromEntries(P.fns.map((id) => [id, 0])); P.pairs.forEach(([, , w, n]) => (sc[w] += n));
  const tot = sum(P.fns, (id) => sc[id]), pc = sum(P.fns, (id) => FN[id].cost);
  return { tot, rows: P.fns.map((id) => ({ id, fn: FN[id].fn, imp: sc[id] / tot * 100, cost: FN[id].cost / pc * 100 })).sort((a, b) => b.imp - a.imp) }; })();
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

// ── the videos ──
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

  // function analysis: five short films, one per group of steps
  p2a: { name: "Function analysis · 1 of 5", step: 2, scenes: [
    { kind: "title", kick: "Step 2 · Function analysis · Film 1 of 5", title: "Why functions?", sub: "The heart of value engineering.", step: 2, min: 6,
      vo: "This is the first of five short films on function analysis, the heart of value engineering. By the end of them, you'll be able to do it yourself, step by step, on a real product." },
    { kind: "three", t: 1, cam: { from: CAM.exploded, to: [[84, 52, 100], [-6, 2.5, 0]] }, min: 10,
      vo: "Here's our projector, taken apart. Fifty kinds of part. The usual way to cut cost is to go through them one by one and ask each supplier for a lower price. That finds a little. Function analysis finds far more, because it asks a different question." },
    { kind: "big", k: "The different question", h: "Customers don't buy parts. They buy what the parts <em>do</em>.", p: "That job is called a function.", min: 9,
      vo: "A school doesn't want a lamp, three LCD panels and a lens. It wants a bright, clear picture on the wall. Every part is there only to do a job, and that job is called a function." },
    { kind: "cards", cols: 3, k: "Where it came from", h: "General Electric, the 1940s", min: 15, gap: 3.6,
      items: [{ h: "A shortage", p: "Wartime shortages forced GE's engineers to use substitute materials.", c: GREY }, { h: "A surprise", p: "Often the substitute did the job just as well, and cost less.", c: AMBER },
        { h: "A method", p: "Lawrence Miles asked: what does it do? Then: what else would do that, for less?", c: GREEN }],
      vo: "The idea came from General Electric in the nineteen-forties. Wartime shortages forced its engineers to use substitute materials, and often the substitute did the job just as well, for less. Lawrence Miles turned that into a method. Don't ask what the part is. Ask what it does, then find the cheapest reliable way to do that." },
    { kind: "big", k: "Value", h: "Value = <em>Function</em> ÷ Cost", p: "Do the same job for less, or more for the same. Never cut a function the customer needs.", min: 10,
      vo: "That gives us value: the function you get, divided by what it costs. We can raise value by doing the same job for less, or by doing more for the same money. What we never do is cut cost by cutting a function the customer needs." },
    { kind: "list", k: "Why analyse functions?", h: "Four things a parts list can't show you", min: 13,
      items: [["It frees the team", "from today's design"], ["It shows what each job really costs,", "however many parts it takes"], ["It shows money spent on jobs", "nobody asked for"], ["It points the creative session", "at the right targets"]],
      vo: "Why go to this trouble? Because it frees the team from today's design. It shows what each job really costs, however many parts it takes. It shows money spent on jobs nobody asked for. And it points the creative session at the right targets." },
    { kind: "table", k: "The plan for these five films", h: "Function analysis in seven steps", min: 14, num: false,
      cols: ["Step", "What you do", "Film"], rows: [["2.1", "Name the functions", "2"], ["2.2", "Classify them", "2"], ["2.3", "Build the FAST diagram", "3"], ["2.4", "Cost the functions", "4"], ["2.5", "Find where the cost sits", "4"], ["2.6", "Set the worth", "5"], ["2.7", "Pick the targets", "5"]],
      vo: "We'll do it in seven steps. Name the functions, and classify them. Build the FAST diagram. Cost the functions, and find where the cost sits. Set the worth. And pick the targets. Each step has a purpose, and we'll say what it is as we go." },
    { kind: "three", t: 1, sel: [1], only: [1, 2, 3], labels: true, cam: { from: [[-8, 26, 22], [-30, 12, -7]], to: [[-12, 24, 18], [-30, 12, -7]] },
      panel: { k: "One part, one question", big: "Generate light", p: "Lamp burner: a verb and a noun you can measure, in lumens.", list: [["What is it?", "A 210 W lamp"], ["What does it do?", "Generate light"]] }, min: 10,
      vo: "Let's try the question on one part. The lamp burner. What is it? A two hundred and ten watt lamp. What does it do? It generates light. Two words: a verb, and a noun you can measure. That's a function." },
    { kind: "stats", k: "What it found on this projector", h: "Fifty parts became thirty-two costed functions", min: 10,
      items: [{ v: D.parts.length, dp: 0, l: "kinds of part", c: "blue", at: 0.6 }, { v: FUNC.length, dp: 0, l: "functions with a cost", c: "blue", at: 2.0 }, { v: GAP, pre: "£", l: "a projector spent above what the functions are worth", c: "bad", at: 3.4 }],
      vo: `On this projector, function analysis turned fifty kinds of part into thirty-two costed functions, and found about twenty pounds a projector spent above what those functions are worth.` },
    { kind: "list", style: "check", k: "Recap", h: "Film 1 of 5", min: 9, sect: "resolve",
      items: [["A function is what a part does:", "an active verb and a measurable noun"], ["Value = function ÷ cost", ""], ["Seven steps,", "from naming the functions to picking the targets"]],
      vo: "So: a function is what a part does, written as an active verb and a measurable noun. Value is function divided by cost. In film two, we name and classify every function in the projector." },
  ] },

  p2b: { name: "Function analysis · 2 of 5", step: 2, scenes: [
    { kind: "title", kick: "Step 2 · Function analysis · Film 2 of 5", title: "Naming and classifying", sub: "An active verb and a measurable noun.", step: 2, min: 6,
      vo: "Film two: naming and classifying functions. Step two point one is to name every function. The purpose: the whole team agrees what every part is for, in words that don't depend on today's design." },
    { kind: "list", k: "Step 2.1 · The rules", h: "Two words, chosen with care", min: 16,
      items: [["An active verb and a measurable noun:", "Generate light (lumens), Remove heat (watts)"], ["Say what it does, not how:", "the reflector collects light; reflecting is how"], ["No weak verbs:", "provide, allow, enable, ensure"], ["Name the job, not the part:", "Trap dust, not \"filter\""]],
      vo: "There are four rules. Use an active verb and a measurable noun: generate light, in lumens; remove heat, in watts. Say what it does, not how it does it. Avoid weak verbs, such as provide, allow and ensure. And name the job, not the part: trap dust, not filter." },
    { kind: "table", k: "Wrong and right", h: "Weak names hide the real job", min: 14, num: false, strike: 1, bold: 2,
      cols: ["Part", "Weak", "Better"], rows: [["Lamp", "Provide light", "Generate light"], ["Lamp door", "Allow access", "Expose lamp"], ["Interlock switch", "Protect user", "Interrupt power"], ["Carton", "Protect product", "Absorb shock"], ["Air filter", "Filter", "Trap dust"], ["Tilt foot", "Level image", "Adjust angle"]],
      vo: "Here are some weak names, and better ones. Provide light tells you nothing you can measure; generate light can be measured in lumens. Protect user is a wish. Interrupt power is a job a switch really does, and you can test it." },
    { kind: "try", q: "The fold mirror bends the light through 90°. What is its function?", hint: "An active verb and a measurable noun.", min: 10,
      vo: "Your turn. The fold mirror bends the light through ninety degrees. What is its function? Pause the film and try." },
    { kind: "big", k: "Answer", h: "<em>Redirect</em> light", p: "Not \"reflect light\": reflecting is only how a mirror does it. A prism could redirect light too.", min: 10,
      vo: "Redirect light. Not reflect light: reflecting is only how a mirror does it. A prism could redirect light too. A good function stays true even if the part is replaced by something completely different." },
    { kind: "three", t: 1, sel: [1, 2, 3, 4, 5, 6], only: [1, 2, 3, 4, 5, 6], labels: true, cam: { from: [[8, 22, 34], [-24, 15, -6]], to: [[2, 21, 32], [-24, 15, -6]] },
      panel: { k: "The light source", list: [["Lamp burner", "Generate light"], ["Reflector", "Collect light"], ["Lamp cage", "Position lamp"], ["Safety glass", "Contain fragments"], ["Lamp door", "Expose lamp"], ["Heat baffle", "Deflect heat"]] }, min: 12,
      vo: "Now every part, group by group. The light source. The burner generates light, the reflector collects it, and the cage positions the lamp. The safety glass contains fragments if the lamp bursts. The door exposes the lamp, and the baffle deflects heat." },
    { kind: "three", t: 1, sel: [7, 8, 9, 10, 11, 12, 16, 19, 21], only: [7, 8, 9, 10, 11, 12, 16, 19, 21], labels: true, cam: { from: [[38, 36, 52], [-6, 11, 2]], to: [[30, 34, 52], [-6, 11, 2]] },
      panel: { k: "The optics", list: [["Fly's-eye arrays", "Divide, distribute light"], ["Polarisation converter", "Polarise light"], ["Dichroic mirrors", "Separate wavelengths"], ["LCD panels", "Modulate light"], ["X-cube prism", "Combine images"], ["Zoom lens", "Magnify image"]] }, min: 13,
      vo: "The optics. The fly's-eye arrays divide and distribute the light. The converter polarises it. Dichroic mirrors separate wavelengths into red, green and blue. The LCD panels modulate light, the X-cube combines the three images, and the lens magnifies the image." },
    { kind: "three", t: 1, sel: [22, 23, 24, 26, 28, 29], only: [22, 23, 24, 26, 27, 28, 29, 30], labels: true, cam: { from: [[64, 30, 62], [4, -8, -4]], to: [[56, 28, 66], [4, -8, -4]] },
      panel: { k: "Cooling and power", list: [["Three fans", "Move air"], ["Air filter", "Trap dust"], ["Thermistors", "Sense temperature"], ["Power supply", "Convert voltage"], ["Ballast", "Ignite arc, regulate power"], ["Mains inlet", "Conduct current"]] }, min: 12,
      vo: "Cooling and power. Three fans move air, the filter traps dust, and thermistors sense temperature. The power supply converts voltage. The ballast ignites the arc, then regulates power to the lamp." },
    { kind: "three", t: 1, sel: [31, 32, 33, 38, 41, 44], only: [31, 32, 33, 38, 41, 44], labels: true, cam: { from: CAM.exploded, to: [[90, 54, 108], [-6, 2.5, 0]] },
      panel: { k: "Electronics and housing", list: [["Main board", "Process signal"], ["Rear connectors", "Receive signal"], ["Buttons", "Accept commands"], ["Top case", "Enclose components"], ["Lens shutter", "Interrupt image"], ["Screws", "Fasten components"]] }, min: 12,
      vo: "Electronics and housing. The main board processes the signal, and the rear connectors receive it. The buttons accept commands. The case encloses components, the shutter interrupts the image, and thirty-eight screws fasten components." },
    { kind: "big", k: "From parts to the product", h: "Divide + distribute + superimpose light = <em>Homogenise light</em>", p: "Part functions are detailed. On the FAST diagram, related ones roll up into one.", min: 12,
      vo: "Part functions are detailed. When we draw the product's diagram, related ones roll up. The two fly's-eye arrays and the superposition lens divide, distribute and superimpose light. Together they homogenise light: an even patch of light on every panel." },
    { kind: "cards", cols: 4, k: "Step 2.2 · Classify them", h: "Four kinds of function", min: 18, gap: 3.4,
      items: [{ h: "Basic", p: "The reason it exists. One per product: Project image.", c: BLUE }, { h: "Secondary", p: "Needed for the way it's designed: Generate light, Remove heat.", c: GREY },
        { h: "Unwanted", p: "A side effect nobody asked for: Generate heat. Worth £0.", c: "#ff5d5d" }, { h: "Esteem", p: "Makes people want it, not makes it work: Enhance appearance.", c: "#e06aa8" }],
      vo: "Step two point two is to classify them. The purpose: to separate the job the customer pays for from everything else. The basic function is the reason the product exists: project image. Secondary functions are needed for the way it's designed. Unwanted functions are side effects nobody asked for. And esteem functions make people want it, rather than making it work." },
    { kind: "cards", cols: 5, k: "Unwanted functions", h: "Worth nothing, but they still cost money", min: 14, gap: 0.5,
      items: [{ h: "Generate heat", p: "Most of the lamp's 210 W", c: "#ff5d5d" }, { h: "Emit UV", p: "From the arc", c: "#ff5d5d" }, { h: "Generate interference", p: "From the chips and supplies", c: "#ff5d5d" },
        { h: "Generate noise", p: "From the fans", c: "#ff5d5d" }, { h: "Consume energy", p: "About £400 over five years", c: "#ff5d5d" }],
      vo: "Unwanted functions need special attention. Nobody asked for heat, ultraviolet, interference, fan noise or a four hundred pound electricity bill. They're worth nothing to the school, yet each one costs money to deal with, as we'll see." },
    { kind: "list", style: "check", k: "Recap", h: "Film 2 of 5", min: 9, sect: "resolve",
      items: [["Name every function:", "active verb, measurable noun"], ["Say what, not how", ""], ["Classify:", "basic, secondary, unwanted, esteem"]],
      vo: "So: name every function as an active verb and a measurable noun, and say what it does, not how. Then classify it. In film three, we arrange them into a FAST diagram." },
  ] },

  p2c: { name: "Function analysis · 3 of 5", step: 2, scenes: [
    { kind: "title", kick: "Step 2 · Function analysis · Film 3 of 5", title: "The FAST diagram", sub: "Function Analysis System Technique, built one layer at a time.", step: 2, min: 6,
      vo: "Film three: step two point three, the FAST diagram. Its purpose is to turn a list of functions into logic, and to test whether the team really understands the product." },
    { kind: "fastb", base: [], add: ["proj"], hl: ["proj"], min: 8,
      vo: "Start with the basic function, the one the customer pays for. For the projector, that's project image." },
    { kind: "fastb", base: ["proj"], add: ["comm"], addFlags: ["axis", "scope"], hl: ["comm"], min: 13,
      vo: "Ask why we project an image. To communicate information. That's the higher-order function: why the customer wants the product at all. It sits on the left, outside the scope line, because this study won't change it." },
    { kind: "fastb", base: ["comm", "proj"], flags: ["axis", "scope"], add: ["mag", "comb", "mod"], hl: ["mag", "comb", "mod"], min: 15,
      vo: "Now ask how. How do we project an image? By magnifying it. How do we magnify it? First we need one full-colour image, so we combine images. And how do we get those images? By modulating light, pixel by pixel, in three LCD panels." },
    { kind: "fastb", base: ["comm", "proj", "mag", "comb", "mod"], flags: ["axis", "scope"], add: ["pol", "gen"], hl: ["pol", "gen"], min: 10,
      vo: "How do we modulate light? An LCD panel only works with polarised light, so we polarise it. And before that, we generate light." },
    { kind: "fastb", base: ["comm", "proj", "mag", "comb", "mod", "pol", "gen"], flags: ["axis", "scope"], add: ["reg", "volt", "rpow", "supply"], hl: ["reg", "volt", "rpow", "supply"], min: 15,
      vo: "How do we generate light? We regulate power to the lamp. How? By converting voltage. And for that, we receive power. The building's supply is outside the study, so it sits past the right-hand scope line. Everything between the scope lines is the critical path." },
    { kind: "fastb", base: PATHF, flags: ["axis", "scope"], hl: PATHF, label: ["Read it back: WHY?", 680, 470], min: 14,
      vo: "Now test it backwards, asking why. Why receive power? To convert voltage. Why regulate power? To generate light. Why combine images? To magnify one image. Why magnify it? To project it. If every step makes sense both ways, the logic holds. If not, a card is in the wrong place." },
    { kind: "fastb", base: PATHF, flags: ["axis", "scope"], add: ["sep", "hom", "focus"], hl: ["sep", "hom", "focus"], min: 16,
      vo: "Some functions need more than one answer to how. To modulate light, the panels also need the light split into red, green and blue, and spread evenly. So we separate wavelengths, and homogenise light. Stacked like this, they read as AND: all three are needed. Focus image is a second answer to how we project it." },
    { kind: "fastb", base: [...PATHF, "sep", "hom", "focus"], flags: ["axis", "scope"], add: ["sig", "rcv", "ign"], hl: ["sig", "rcv", "ign"], min: 14,
      vo: "Below the path go functions that happen at the same time. When we modulate light, we process the signal, and for that we must receive it. When we generate light, the ballast first ignites the arc, with a pulse of about three and a half thousand volts." },
    { kind: "fastb", base: [...PATHF, "sep", "hom", "focus", "sig", "rcv", "ign"], flags: ["axis", "scope"], add: ["gheat", "guv", "gint", "energy"], hl: ["gheat", "guv", "gint", "energy"], min: 14,
      vo: "Now the unwanted functions, in red. Generating light also generates heat and ultraviolet. Processing the signal generates interference. And receiving power means consuming energy: about four hundred pounds of electricity over five years." },
    { kind: "fastb", base: [...PATHF, "sep", "hom", "focus", "sig", "rcv", "ign", "gheat", "guv", "gint", "energy"], flags: ["axis", "scope"], add: ["heat", "dust", "noise", "uv", "emc"], hl: ["heat", "dust", "noise", "uv", "emc"], min: 17,
      vo: "Each unwanted function drags in more. Heat must be removed, so we add fans. The fans pull in dust, so we trap dust, and they generate noise. The ultraviolet must be blocked, and the interference suppressed. None of this is what the school pays for. It exists only because of something unwanted." },
    { kind: "fastb", base: ALLF.filter((id) => !["encl", "loc", "sup", "fast", "frag", "app", "cmd", "mute", "angle", "instr", "expose", "intr", "shock"].includes(id)), flags: ["axis", "scope"], add: ["encl", "loc", "sup", "fast", "frag", "app"], hl: ["encl", "loc", "sup", "fast", "frag", "app"], min: 14,
      vo: "Above the path go functions needed all the time, whatever the projector is doing: enclose and locate components, support weight, fasten components, and contain fragments if the lamp ever bursts. Enhance appearance is an esteem function." },
    { kind: "fastb", base: ALLF.filter((id) => !["cmd", "mute", "angle", "instr", "expose", "intr", "shock"].includes(id)), flags: ["axis", "scope"], add: ["cmd", "mute", "angle", "instr", "expose", "intr", "shock"], hl: ["cmd", "mute", "angle", "instr", "expose", "intr", "shock"], min: 18,
      vo: "Next, user functions, such as accept commands and interrupt image. Then one-time functions, which happen once or only now and then: adjust angle, convey instructions, absorb shock in transit, and expose lamp when it's changed, with interrupt power at the same moment, for safety." },
    { kind: "fastb", base: ALLF, flags: ["axis", "scope"], addFlags: ["criteria", "objective"], min: 15,
      vo: "Last, the design criteria. Brightness, resolution, lamp life, noise, safety and price aren't functions. They're requirements that every idea must still meet. Beside them sits the objective: at least ten per cent off the landed cost." },
    { kind: "list", style: "check", k: "Recap", h: "Film 3 of 5", min: 12, sect: "resolve",
      items: [["Basic function first,", "then ask HOW? to the right"], ["Test every step with WHY?", "to the left"], ["Scope lines, AND, and when", ""], ["Unwanted functions in red:", "they drag in cost"]],
      vo: "So: start with the basic function and ask how, to build the critical path. Test it with why. Add the scope lines, the AND functions, and the when functions. And mark the unwanted ones, because they drag in cost. In film four, we put a price on every box." },
  ] },

  p2d: { name: "Function analysis · 4 of 5", step: 2, scenes: [
    { kind: "title", kick: "Step 2 · Function analysis · Film 4 of 5", title: "Costing the functions", sub: "Where does the money really go?", step: 2, min: 6,
      vo: "Film four: steps two point four and two point five. Costing the functions, and finding where the cost sits." },
    { kind: "big", k: "Step 2.4 · Why cost functions?", h: "A part can do several jobs. A job can need <em>several parts</em>.", p: "A parts list can't show what a job costs. A function cost can.", min: 10,
      vo: "Why cost functions, when we already know what the parts cost? Because a part can do several jobs, and a job can need several parts. A parts list can never show what a job really costs." },
    { kind: "split", k: "Share each part's cost among its jobs", h: "By what's inside the part", min: 20,
      rows: [{ part: "Main board", total: 14.00, pieces: [{ fn: "Process signal", v: 13.00, c: BLUE }, { fn: "Receive signal", v: 0.55, c: AMBER }, { fn: "Emit sound", v: 0.45, c: GREEN }] },
        { part: "Lamp ballast", total: 4.70, pieces: [{ fn: "Ignite arc", v: 1.70, c: AMBER }, { fn: "Regulate power", v: 3.00, c: BLUE }] },
        { part: "Power supply", total: 5.60, pieces: [{ fn: "Convert voltage", v: 5.00, c: BLUE }, { fn: "Suppress interference", v: 0.60, c: "#ff5d5d" }] }],
      vo: "So each part's cost is shared out among its functions, based on what's inside it. The main board's video chip, drivers and memory process the signal: thirteen pounds. Its network chip receives the signal, and its amplifier drives the speaker. The ballast ignites the arc and regulates power. The power supply's filter suppresses interference. The shares always add back to the part's cost." },
    { kind: "stats", k: "The function cost matrix", h: "Every part against every function", min: 13,
      items: [{ v: D.parts.length, dp: 0, l: "parts, one row each", c: "blue", at: 0.6 }, { v: FUNC.length, dp: 0, l: "functions, one column each", c: "blue", at: 2.0 }, { v: BOM, pre: "£", l: "the total, the same as the parts list", c: "good", at: 3.4 }],
      vo: "Do that for every part and you get the function cost matrix: fifty parts against thirty-two functions. Each row adds up to its part. Each column gives a function's cost. And the grand total must still be a hundred and five pounds twenty, or something's been lost." },
    { kind: "fastb", base: ALLF, flags: ["axis", "scope"], cost: true, costs: COSTS, min: 11,
      vo: "Now put those costs on the FAST diagram. The colours show value, which we'll come to in film five. For now, just look at where the money sits." },
    { kind: "bars", k: "Where the cost sits on the FAST diagram", h: `${Math.round(kindCost("path") / BOM * 100)}% is on the critical path`, min: 15, gap: 0.5,
      items: [["Critical path", kindCost("path"), "hl"], ["When and caused by", kindCost("when")], ["All the time", kindCost("all")], ["AND, second answers", kindCost("second")], ["One time", kindCost("one")], ["User", kindCost("user")], ["Esteem", kindCost("esteem")]]
        .map(([l, v, c]) => ({ l, v, c, vt: `${gbp(v)} · ${Math.round(v / BOM * 100)}%` })),
      vo: `Group the costs by where they sit. Fifty-seven per cent of the parts cost is on the critical path, doing the job the school pays for. The other forty-three per cent supports it, protects it, or cleans up after something unwanted.` },
    { kind: "fastb", base: ALLF, flags: ["axis", "scope"], cost: true, costs: COSTS, hl: ["gheat", "heat", "dust", "noise", "guv", "uv", "gint", "emc"], min: 15,
      vo: `Follow the red boxes. Removing heat, trapping dust, blocking ultraviolet and suppressing interference cost five pounds eighty-nine a projector. That's money spent only because of unwanted functions. Make less heat, or stop the interference at its source, and some of it disappears.` },
    { kind: "stats", k: "Beyond the basic function", h: "Where the parts money goes", min: 13,
      items: [{ v: kindCost("path"), pre: "£", l: "on the critical path: the job itself", c: "blue", at: 0.6 }, { v: r2(BOM - kindCost("path") - CAUSEDC), pre: "£", l: "supporting it: case, controls, signal", c: "", at: 2.2 }, { v: CAUSEDC, pre: "£", l: "only because of unwanted functions", c: "bad", at: 3.8 }],
      vo: "So, of a hundred and five pounds twenty: fifty-nine pounds fifty-four does the job itself. Thirty-nine seventy-seven supports it. And five eighty-nine exists only because of unwanted functions. That last pile is often the easiest money in the whole study." },
    { kind: "pareto", k: "Step 2.5 · Find where the cost sits", h: "Function costs, largest first", min: 20, items: FUNC.map((f) => ({ fn: f.fn, cost: f.cost })), top: TOPN, total: BOM,
      zone: `Top ${TOPN} of ${FUNC.length} functions (30%): ${gbp(TOPC)}, ${Math.round(TOPC / BOM * 100)}% of the cost`,
      vo: `Step two point five: rank the functions by cost, largest first, and add a running total. This is a Pareto chart. Its purpose is to show where effort will pay back. Thirty per cent of the functions, ten out of thirty-two, carry seventy-eight per cent of the cost.` },
    { kind: "bars", k: "The top 30%", h: `${TOPN} functions, ${gbp(TOPC)} of ${gbp(BOM)}`, min: 15, gap: 0.45,
      items: FUNC.slice(0, TOPN).map((f, i) => ({ l: f.fn, v: f.cost, c: i ? "" : "hl" })),
      vo: "These ten are where to look first: modulate light, process signal, generate light, magnify image, combine images, convert voltage, receive signal, remove heat, regulate power and enclose components. The other twenty-two share just twenty-three pounds between them." },
    { kind: "list", style: "check", k: "Recap", h: "Film 4 of 5", min: 11, sect: "resolve",
      items: [["Share each part's cost", "among its functions"], ["Check it adds up", "to the parts list"], ["Put the costs on the FAST diagram,", "and follow the unwanted ones"], ["Rank them:", "30% of the functions, 78% of the cost"]],
      vo: "So: share each part's cost among its functions, check it adds up, put the costs on the FAST diagram, and rank them. Cost tells us where the money goes. It doesn't tell us whether it's good value. That's worth, in film five." },
  ] },

  p2e: { name: "Function analysis · 5 of 5", step: 2, scenes: [
    { kind: "title", kick: "Step 2 · Function analysis · Film 5 of 5", title: "Worth, value and targets", sub: "What should each job cost?", step: 2, min: 6,
      vo: "Film five: steps two point six and two point seven. Setting the worth, and picking the targets." },
    { kind: "big", k: "Step 2.6 · Worth", h: "The lowest cost shown to perform the function <em>reliably</em>.", p: "Cost is what you pay. Worth is what you should pay. Every worth needs evidence.", min: 12,
      vo: "Worth is the lowest cost shown to perform the function reliably. Cost is what you pay. Worth is what you should pay. The difference is the prize. And every worth needs evidence: it's never a guess." },
    { kind: "list", k: "Five ways to set worth", h: "Each with evidence", min: 21,
      items: [["A cheaper way that does the same job:", "organic polarisers where it runs cooler"], ["A supplier quote or should-cost:", "local optical glass"], ["A benchmark,", "but only if it meets every must-be need"], ["What the customer needs:", "one VGA input, not three"], ["The theoretical minimum:", "an unwanted function is worth £0"]],
      vo: "There are five common ways to set it. A cheaper way that does the same job to the same standard. A supplier quote, or a should-cost. A benchmark, but only one that meets every must-be need. What the customer actually needs: one VGA input, not three. And the theoretical minimum. An unwanted function is worth nothing at all." },
    { kind: "table", k: "A benchmark that can't set the worth", h: "Modulate light: 3LCD or single-chip DLP?", min: 13, num: false, hl: [2],
      cols: ["", "3LCD (today)", "Single-chip DLP"], rows: [["Cheaper?", "No", "Yes"], ["Colour brightness", "3,600 lumens", "About 1,400 lumens"], ["Can it set the worth?", "", "No: fails a must-be"]],
      vo: "Be careful with benchmarks. A single-chip DLP projector is cheaper, but it gives about fourteen hundred colour lumens, not thirty-six hundred. It fails a must-be need, so it can't set the worth of modulating light." },
    { kind: "list", k: "Two numbers from cost and worth", h: "Value gap and value index", min: 15,
      items: [["Value gap = cost − worth:", "the money at stake"], ["Value index = cost ÷ worth:", "1.0 is fair value"], ["1.25 or more is worth a look;", "2 or more is a strong target"], ["Use both:", "a high index on pennies matters less"]],
      vo: "Cost and worth give two numbers. The value gap, cost minus worth, is the money at stake. The value index, cost divided by worth, shows how far off fair value it is. One point two five or more is worth a look; two or more is a strong target. Use both: a high index on a few pence matters less than a modest one on many pounds." },
    { kind: "vi", k: "Two functions compared", h: "The biggest cost isn't the worst value", min: 15,
      items: [{ fn: "Modulate light", cost: FN.mod.cost, worth: FN.mod.worth, say: "The biggest cost, but good value. Nothing cheaper meets the must-be needs.", at: 0.8 },
        { fn: "Receive signal", cost: FN.rcv.cost, worth: FN.rcv.worth, say: "Cheap, but poor value: ports and a cable few schools use.", at: 6.4 }],
      vo: "Here's why it matters. Modulating light is the biggest cost in the projector, but it's good value: an index of one point oh four. Receiving the signal costs five pounds, for a job worth one pound thirty. Its index is three point eight five: ports and a cable that few schools ever use." },
    { kind: "table", k: "The biggest value gaps", h: "Cost, worth and value index", min: 16, hl: [0, 1],
      cols: ["Function", "Cost", "Worth", "Gap", "Index"], rows: FUNC.slice().sort((a, b) => (b.cost - b.worth) - (a.cost - a.worth)).slice(0, 7).map((f) => [f.fn, gbp(f.cost), gbp(f.worth), gbp(f.cost - f.worth), f.vi.toFixed(2)]),
      vo: "Sort by value gap and two functions stand out. Process signal has the biggest gap, four pounds twenty-five. Receive signal is next, at three pounds seventy, with the worst index. Locate components has an index of two: a steel cage doing a job the case could do." },
    { kind: "list", k: "Step 2.6 · The customer's view", h: "A paired comparison", min: 21,
      items: [["Take the ten functions", "a school would notice"], ["Compare every pair:", "which matters more to a teacher?"], ["Score the winner 1, 2 or 3", `(45 pairs, ${PAIRS.tot} points)`], ["Expect a little inconsistency:", "real workshops have it too"]],
      vo: "Worth asks: what's the cheapest way to do this? The team also asks: how much does the school care? In a paired comparison, they take the ten functions a school would notice and compare every pair. Which matters more to a teacher: generating light, or receiving the signal? The winner scores one, two or three points. It's the team's judgement, from the school interviews, and it isn't perfectly consistent. That's normal." },
    { kind: "vg2", k: "Importance against cost", h: "Look harder where cost far outruns importance", min: 20, rows: PAIRS.rows.map((r) => ({ fn: r.fn, imp: r.imp, cost: r.cost })),
      vo: "Then set each function's share of the importance against its share of the cost. Process signal takes seventeen per cent of the cost for five per cent of the importance. Combine images and enclose components are flagged too. But combine images has no cheaper way to do it, so it stays. Use the graph to find questions. Use worth to answer them." },
    { kind: "table", k: "Step 2.7 · Clues from the costed FAST diagram", h: "Every clue becomes a question", min: 20, num: false,
      cols: ["Clue", "Question for the creative session"], rows: [["Receive signal: index 3.85", "Does the school need all of it?"], ["Process signal: gap £4.25", "Can fewer or simpler parts do it?"], ["Heat drives £4.34 of fans and filters", "Can we make less heat, or remove it with less?"], ["Interference drives £1.25 of shielding", "Can we stop it at the source?"], ["Convert voltage + regulate power on two boards", "Can two functions share parts?"], ["Case, steel cage and 38 screws", "Can the case do the bracket's and the screws' job?"]],
      vo: "Step two point seven: pick the targets. Read the costed FAST diagram for clues, and turn each one into a question. Does the school need all of receive signal? Can fewer parts process the signal? Can we make less heat? Can we stop the interference at its source? Can two functions share one board?" },
    { kind: "fastb", base: ALLF, flags: ["axis", "scope"], cost: true, costs: COSTS, hl: ["rcv", "sig", "heat", "emc", "volt", "reg", "encl", "loc", "fast"], min: 13,
      vo: "These are the targets: functions with a big gap, a high index, or a cost driven by something unwanted. Not simply the most expensive ones. Modulate light, the biggest cost of all, is left alone, apart from a cheaper material in one corner." },
    { kind: "big", k: "The question for every target", h: "How else could we <em>perform this function</em>, at the lowest total cost?", p: "With no loss of performance, quality, reliability or safety.", min: 12,
      vo: "For every target, the creative session asks one question. How else could we perform this function, at the lowest total cost, with no loss of performance, quality, reliability or safety?" },
    { kind: "list", style: "check", k: "Gate check before step 3", h: "Function analysis, done", min: 17, sect: "resolve",
      items: [["Every part has a verb-noun function", ""], ["The FAST diagram passes the how–why test", ""], ["Function costs add up to the parts list", ""], ["Every worth has evidence, and the targets are agreed", ""]],
      vo: `That's function analysis: name, classify, build the FAST diagram, cost it, rank it, set the worth, and pick the targets. In this study, those targets led to twenty-four ideas, and seventeen per cent off the landed cost. Next, the creative phase.` },
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
    { kind: "three", t: 1, sel: IDEA.V03.parts, only: IDEA.V03.parts, labels: true, cam: { from: [[12, 24, -108], [0, -13, -14]], to: [[-4, 22, -110], [0, -13, -14]] },
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
    { kind: "three", t: 1, sel: IDEA.V03.parts, only: IDEA.V03.parts, labels: true, cam: { from: [[-4, 22, -110], [0, -13, -14]], to: [[-18, 20, -106], [0, -13, -14]] },
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
// subtitles: the line is shown a sentence or two at a time, timed by length across the spoken line
function chunks(s) {
  const sent = s.vo.match(/[^.!?]+[.!?]+["'”]?\s*|[^.!?]+$/g).map((x) => x.trim()), out = [];
  sent.forEach((x) => { const last = out[out.length - 1]; if (last && words(last) + words(x) <= 24 && (words(last) < 12 || words(x) < 6)) out[out.length - 1] = last + " " + x; else out.push(x); });
  const total = sum(out, (x) => x.length); let at = 0.3;
  return out.map((text) => { const c = { at, text }; at += s.voDur * text.length / total; return c; });
}
async function setScene(page, v, s) {
  s.chunks = chunks(s);
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
