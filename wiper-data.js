/* VAVEhub · worked case study 2: the VH-W2 front windscreen wiper and washer system.
   A tandem system for a right-hand-drive family hatchback (Golf, Focus or Astra size), 250,000 cars a year,
   priced at what the carmaker pays its tier-1 supplier, in GBP, 2026. LINES are VAVEhub's own should-cost build-up
   (material, process, and overheads with profit) from public material prices, labour rates and part masses; there is
   no supplier quote behind it, so every cost is an estimate and labelled as one. PARTS are the parts you can see in
   the 3D model. Each part's cost is its share of one or more lines (alloc). Each group's assembly-and-test line is
   shared across that group's parts in proportion to their cost (worked out below), so the parts add back up exactly
   to the lines. The washer bottle also feeds the rear washer, so its second pump (X1) is in the study too. */
(function () {
  const SUBS = [
    { id: "M", name: "Motor and gearbox" },
    { id: "L", name: "Linkage" },
    { id: "A", name: "Arms (2)" },
    { id: "B", name: "Blades (2)" },
    { id: "W", name: "Washer" },
    { id: "E", name: "Electrical and fixings" },
    { id: "X", name: "The rear washer's pump, in the same bottle" },
  ];
  // q: a car; m, p, o: material, process, and overheads with profit, £ a car; ext: the line's price to the carmaker, £ a car
  // (taken from the build-up, so a few lines differ from m + p + o by a penny of rounding); g: grams a piece
  const LINES = [
    { id: "M1", sub: "M", name: "Pole housing (motor can)", spec: "DC04 cold-rolled steel, 250 g, transfer-press deep draw, washed and e-coated", q: 1, m: 0.28, p: 0.17, o: 0.12, ext: 0.58 },
    { id: "M2", sub: "M", name: "Ferrite arc magnets", spec: "Sintered strontium ferrite, 2 × 45 g, magnetised on the assembly line", q: 2, m: 0.40, p: 0, o: 0.12, ext: 0.53 },
    { id: "M3", sub: "M", name: "Armature lamination stack", spec: "M800-50A electrical steel, 140 g, high-speed press with interlocked stacking", q: 1, m: 0.26, p: 0.17, o: 0.12, ext: 0.54 },
    { id: "M4", sub: "M", name: "Armature shaft with rolled worm", spec: "C45 bar, 45 g: cut, ground, worm thread-rolled, induction hardened", q: 1, m: 0.06, p: 0.22, o: 0.07, ext: 0.34 },
    { id: "M5", sub: "M", name: "Armature winding", spec: "Enamelled copper wire, 70 g: flyer-wound, fused, impregnated, balanced, surge-tested", q: 1, m: 0.62, p: 0.22, o: 0.23, ext: 1.08 },
    { id: "M6", sub: "M", name: "Commutator", spec: "Copper segments on phenolic, bought in", q: 1, m: 0.35, p: 0, o: 0.10, ext: 0.45 },
    { id: "M7", sub: "M", name: "Carbon brushes", spec: "Copper-graphite with shunts; the third brush gives the second speed", q: 3, m: 0.18, p: 0, o: 0.05, ext: 0.23 },
    { id: "M8", sub: "M", name: "Brush card", spec: "PA66-GF30 holder with springs, two chokes and a PTC thermal fuse", q: 1, m: 0.48, p: 0.25, o: 0.20, ext: 0.93 },
    { id: "M9", sub: "M", name: "Gearbox housing", spec: "AlSi9Cu3 aluminium, 360 g: 630 t pressure die-cast in a 2-cavity die, trimmed, CNC machined", q: 1, m: 0.80, p: 1.76, o: 0.63, ext: 3.19 },
    { id: "M10", sub: "M", name: "Worm wheel", spec: "Acetal (POM), 40 g, moulded in a 4-cavity tool", q: 1, m: 0.12, p: 0.10, o: 0.06, ext: 0.28 },
    { id: "M11", sub: "M", name: "Output shaft", spec: "C45 bar: cold-formed, knurled, thread-rolled, zinc-nickel plated", q: 1, m: 0.07, p: 0.30, o: 0.09, ext: 0.45 },
    { id: "M12", sub: "M", name: "Gearbox cover and connector shroud", spec: "PA66-GF30, 70 g, insert-moulded over stamped contact tracks", q: 1, m: 0.26, p: 0.55, o: 0.20, ext: 1.01 },
    { id: "M13", sub: "M", name: "Park switch disc and suppression", spec: "Bronze contact disc, wiper fingers, X and Y capacitors and a varistor", q: 1, m: 0.60, p: 0, o: 0.18, ext: 0.78 },
    { id: "M14", sub: "M", name: "Bearings, seals, grease and screws", spec: "Sintered bush, ball bearing, O-ring, gasket, magnet clips, three screws", q: 1, m: 0.70, p: 0, o: 0.21, ext: 0.91 },
    { id: "M15", sub: "M", name: "Motor assembly and end-of-line test", spec: "Automated line, 15 s a motor, 3 operators: magnetise, grease, close, test current, speed and park", q: 1, m: 0, p: 0.86, o: 0.19, ext: 1.05, assy: true },
    { id: "L1", sub: "L", name: "Frame tube", spec: "E235 welded steel tube, Ø20 × 1.5 mm, 580 g: CNC-bent, flattened, pierced, e-coated", q: 1, m: 0.66, p: 0.61, o: 0.33, ext: 1.60 },
    { id: "L2", sub: "L", name: "Motor mounting plate", spec: "2.5 mm steel, 280 g: progressive press, projection-welded to the tube, e-coated", q: 1, m: 0.32, p: 0.57, o: 0.22, ext: 1.11 },
    { id: "L3", sub: "L", name: "Pivot housings", spec: "AlSi9Cu3, 95 g each: 400 t die-cast in a 4-cavity die, trimmed, reamed", q: 2, m: 0.42, p: 1.28, o: 0.41, ext: 2.11 },
    { id: "L4", sub: "L", name: "Pivot spindles and levers", spec: "C45 spindle cold-headed and knurled; 3 mm stamped lever, orbital-riveted", q: 2, m: 0.24, p: 0.73, o: 0.24, ext: 1.21 },
    { id: "L5", sub: "L", name: "Pivot bushes", spec: "Sintered, oil-impregnated bronze, bought in", q: 4, m: 0.24, p: 0, o: 0.07, ext: 0.31 },
    { id: "L6", sub: "L", name: "Motor crank", spec: "4 mm S355 steel, 85 g: progressive die with a serrated bore, e-coated", q: 1, m: 0.10, p: 0.13, o: 0.06, ext: 0.29 },
    { id: "L7", sub: "L", name: "Ball joints", spec: "Cold-formed steel ball stud in a moulded acetal socket", q: 4, m: 0.45, p: 0.09, o: 0.15, ext: 0.69 },
    { id: "L8", sub: "L", name: "Drive rods", spec: "E235 tube, Ø14 × 1 mm: cut, flattened, pierced, coined, e-coated", q: 2, m: 0.31, p: 0.32, o: 0.16, ext: 0.79 },
    { id: "L9", sub: "L", name: "Rubber isolators and pivot seals", spec: "EPDM, injection-moulded in a 32-cavity tool", q: 5, m: 0.13, p: 0.29, o: 0.10, ext: 0.52 },
    { id: "L10", sub: "L", name: "Linkage assembly and function test", spec: "Semi-automatic line, 20 s, 2 operators: rivet, press ball joints, fit motor, check torque and play", q: 1, m: 0, p: 0.76, o: 0.17, ext: 0.93, assy: true },
    { id: "A1", sub: "A", name: "Arm head castings", spec: "Zamak 5 zinc, 110 g each: hot-chamber die-cast, trimmed, taper broached", q: 2, m: 0.59, p: 0.82, o: 0.36, ext: 1.78 },
    { id: "A2", sub: "A", name: "Arm retainers", spec: "1.5 mm HSLA steel U-channel, progressive die", q: 2, m: 0.29, p: 0.23, o: 0.14, ext: 0.66 },
    { id: "A3", sub: "A", name: "Arm strips with hooks", spec: "HSLA steel strip: blanked, formed, twisted, hook formed", q: 2, m: 0.13, p: 0.27, o: 0.10, ext: 0.49 },
    { id: "A4", sub: "A", name: "Arm tension springs", spec: "Oil-tempered spring wire, coiled, hooked and coated, bought in", q: 2, m: 0.24, p: 0, o: 0.07, ext: 0.31 },
    { id: "A5", sub: "A", name: "Nut covers", spec: "PP with 20% talc, 12 g, 4-cavity tool", q: 2, m: 0.03, p: 0.13, o: 0.04, ext: 0.20 },
    { id: "A6", sub: "A", name: "Arm finish, hinge and assembly", spec: "E-coat and satin black powder (about 70p of the line), hinge rivet and bush, spring hooked, cap fitted", q: 2, m: 0.18, p: 1.08, o: 0.29, ext: 1.56, assy: true },
    { id: "B1", sub: "B", name: "Wiping rubbers", spec: "Natural rubber and chloroprene, twin-profile extrusion, halogenated and graphite-coated, 27 g", q: 2, m: 0.27, p: 0.23, o: 0.13, ext: 0.63 },
    { id: "B2", sub: "B", name: "Spring-steel beams", spec: "Pre-hardened spring strip, 38 g, formed to the windscreen's curve, painted", q: 2, m: 0.31, p: 0.20, o: 0.14, ext: 0.65 },
    { id: "B3", sub: "B", name: "Blade adaptors", spec: "Acetal with a steel clip: the carmaker's own fitting to the arm", q: 2, m: 0.17, p: 0.19, o: 0.09, ext: 0.46 },
    { id: "B4", sub: "B", name: "Spoilers", spec: "PP and TPE co-extrusion, 28 g", q: 2, m: 0.14, p: 0.05, o: 0.05, ext: 0.24 },
    { id: "B5", sub: "B", name: "End caps", spec: "Acetal, 3 g, 8-cavity tool", q: 4, m: 0.04, p: 0.10, o: 0.03, ext: 0.17 },
    { id: "B6", sub: "B", name: "Blade assembly, inspection and pack", spec: "Automated line, 8 s a blade: beam into rubber, spoiler, adaptor, caps, camera check, packed in pairs", q: 2, m: 0.08, p: 0.42, o: 0.12, ext: 0.61, assy: true },
    { id: "W1", sub: "W", name: "Washer bottle, 3 litres", spec: "HDPE, 500 g, extrusion blow-moulded (50 s), deflashed, pierced, leak-tested", q: 1, m: 0.50, p: 1.22, o: 0.42, ext: 2.13 },
    { id: "W2", sub: "W", name: "Filler neck and cap", spec: "PP, moulded in two tools, with a tether", q: 1, m: 0.06, p: 0.25, o: 0.07, ext: 0.38 },
    { id: "W3", sub: "W", name: "Low-fluid sensor", spec: "Reed switch and float, bought in", q: 1, m: 0.90, p: 0, o: 0.27, ext: 1.17 },
    { id: "W4", sub: "W", name: "Front washer pump", spec: "12 V centrifugal pump, single outlet, in a rubber grommet; about 1 litre a minute at 2 bar", q: 1, m: 3.40, p: 0, o: 1.01, ext: 4.41 },
    { id: "W5", sub: "W", name: "Hoses and connectors", spec: "EPDM hose, 4 mm bore, 2.4 m, with nylon T-piece and elbows", q: 1, m: 0.34, p: 0.19, o: 0.14, ext: 0.68 },
    { id: "W6", sub: "W", name: "Check valve", spec: "Nylon body with a silicone diaphragm: keeps the line full so the spray starts at once", q: 1, m: 0.15, p: 0, o: 0.04, ext: 0.19 },
    { id: "W7", sub: "W", name: "Washer jets, twin-spot", spec: "Acetal body with an adjustable two-hole ball, 8 g", q: 2, m: 0.26, p: 0.20, o: 0.12, ext: 0.58, changed: "The research costed fan (fluidic) jets at £0.75; the study's baseline uses simpler twin-spot jets, so fan jets can be tested as an idea (V02)." },
    { id: "W8", sub: "W", name: "Washer module assembly and leak test", spec: "Manual cell, 30 s: pumps, sensor and neck fitted to the bottle, then leak-tested", q: 1, m: 0, p: 0.47, o: 0.10, ext: 0.57, assy: true },
    { id: "E1", sub: "E", name: "Motor connector terminals and seal", spec: "Four tinned terminals and a silicone interface seal", q: 1, m: 0.18, p: 0, o: 0.05, ext: 0.23 },
    { id: "E2", sub: "E", name: "Arm and crank nuts, M8", spec: "Grade 8 steel, zinc-flake coated", q: 3, m: 0.12, p: 0, o: 0.04, ext: 0.16 },
    { id: "E3", sub: "E", name: "Module and motor bolts, M6", spec: "Grade 8.8 steel, zinc-flake coated", q: 6, m: 0.24, p: 0, o: 0.07, ext: 0.31 },
    { id: "E4", sub: "E", name: "Bottle fixings", spec: "One bolt and one push clip", q: 2, m: 0.10, p: 0, o: 0.03, ext: 0.13 },
    { id: "E5", sub: "E", name: "Hose and cable clips", spec: "Nylon fir-tree clips", q: 8, m: 0.20, p: 0, o: 0.06, ext: 0.26 },
    { id: "X1", sub: "X", name: "Rear washer pump", spec: "The same 12 V pump as W4, in a second hole in the same bottle, feeding the rear screen", q: 1, m: 3.40, p: 0, o: 1.01, ext: 4.41, added: true },
  ];

  // groups for the 3D side panel, in the order the motion travels
  const G = [
    { id: "mot", name: "Motor and gearbox", line: "M" }, { id: "lnk", name: "Linkage", line: "L" }, { id: "arm", name: "Arms", line: "A" },
    { id: "bld", name: "Blades", line: "B" }, { id: "wsh", name: "Washer", line: "W" }, { id: "fix", name: "Electrical and fixings", line: "E" },
  ];
  // n: item (balloon) number. alloc: £ a car taken from each line for all of the item. fns: how its cost is shared among the
  // functions it performs (the shares add up to 1). fn, fn2, fnU: main, other and unwanted functions, as verb + noun.
  const P = [
    { n: 1, id: "yoke", g: "mot", name: "Motor can (pole housing)", fn: "Conduct flux", fn2: ["Enclose armature"], fnU: [], q: 1, mat: "Deep-drawn steel, e-coated", alloc: { M1: 0.58 }, fns: { gen: 0.8, encl: 0.2 } },
    { n: 2, id: "magnets", g: "mot", name: "Ferrite magnets", fn: "Create field", fn2: [], fnU: [], q: 2, mat: "Sintered strontium ferrite arcs", alloc: { M2: 0.53 }, fns: { gen: 1 } },
    { n: 3, id: "armature", g: "mot", name: "Armature and commutator", fn: "Generate torque", fn2: [], fnU: ["Generate heat", "Generate noise"], q: 1, mat: "Laminated steel core, copper winding, copper commutator", alloc: { M3: 0.54, M5: 1.08, M6: 0.45 }, fns: { gen: 1 } },
    { n: 4, id: "brushes", g: "mot", name: "Carbon brushes (3)", fn: "Conduct current", fn2: ["Vary speed"], fnU: ["Generate interference"], q: 3, mat: "Copper-graphite with shunts", alloc: { M7: 0.23 }, fns: { gen: 0.7, speed: 0.3 } },
    { n: 5, id: "brushcard", g: "mot", name: "Brush card, chokes and thermal fuse", fn: "Hold brushes", fn2: ["Suppress interference", "Limit current"], fnU: [], q: 1, mat: "Glass-filled nylon, springs, chokes, PTC fuse", alloc: { M8: 0.93 }, fns: { gen: 0.4, emc: 0.35, limit: 0.25 } },
    { n: 6, id: "worm", g: "mot", name: "Armature shaft with worm", fn: "Multiply torque", fn2: [], fnU: [], q: 1, mat: "Hardened steel, rolled worm thread", alloc: { M4: 0.34 }, fns: { torque: 1 } },
    { n: 7, id: "wheel", g: "mot", name: "Worm wheel", fn: "Multiply torque", fn2: ["Hold position"], fnU: [], q: 1, mat: "Moulded acetal (POM)", alloc: { M10: 0.28 }, fns: { torque: 1 } },
    { n: 8, id: "housing", g: "mot", name: "Gearbox housing", fn: "Locate gears", fn2: ["Enclose mechanism"], fnU: [], q: 1, mat: "Die-cast aluminium, machined", alloc: { M9: 3.19 }, fns: { torque: 0.6, encl: 0.4 } },
    { n: 9, id: "cover", g: "mot", name: "Gearbox cover and connector shroud", fn: "Enclose mechanism", fn2: ["Carry contacts"], fnU: [], q: 1, mat: "Glass-filled nylon over stamped contact tracks", alloc: { M12: 1.01 }, fns: { encl: 0.6, rpow: 0.4 } },
    { n: 10, id: "park", g: "mot", name: "Park switch disc and suppression", fn: "Park blades", fn2: ["Suppress interference"], fnU: [], q: 1, mat: "Bronze contact disc and fingers, capacitors, varistor", alloc: { M13: 0.78 }, fns: { park: 0.75, emc: 0.25 } },
    { n: 11, id: "outshaft", g: "mot", name: "Output shaft", fn: "Transmit torque", fn2: [], fnU: [], q: 1, mat: "Steel, knurled taper, zinc-nickel plated", alloc: { M11: 0.45 }, fns: { torque: 1 } },
    { n: 12, id: "bearings", g: "mot", name: "Bearings, seals and screws", fn: "Support shafts", fn2: ["Exclude water"], fnU: [], q: 1, mat: "Sintered bush, ball bearing, O-ring, gasket, screws", alloc: { M14: 0.91 }, fns: { torque: 0.6, water: 0.4 } },
    { n: 13, id: "frame", g: "lnk", name: "Frame tube", fn: "Locate pivots", fn2: ["Support loads"], fnU: [], q: 1, mat: "Bent steel tube, e-coated", alloc: { L1: 1.60 }, fns: { loc: 1 } },
    { n: 14, id: "plate", g: "lnk", name: "Motor mounting plate", fn: "Locate motor", fn2: [], fnU: [], q: 1, mat: "Pressed steel, welded to the tube", alloc: { L2: 1.11 }, fns: { loc: 1 } },
    { n: 15, id: "pivots", g: "lnk", name: "Pivot housings (2)", fn: "Support spindles", fn2: ["Locate arms"], fnU: [], q: 2, mat: "Die-cast aluminium", alloc: { L3: 2.11 }, fns: { osc: 0.7, loc: 0.3 } },
    { n: 16, id: "spindles", g: "lnk", name: "Pivot spindles and levers (2)", fn: "Oscillate arms", fn2: [], fnU: [], q: 2, mat: "Steel spindle, stamped lever, riveted", alloc: { L4: 1.21 }, fns: { osc: 1 } },
    { n: 17, id: "bushes", g: "lnk", name: "Pivot bushes (4)", fn: "Guide spindles", fn2: [], fnU: [], q: 4, mat: "Oil-impregnated sintered bronze", alloc: { L5: 0.31 }, fns: { osc: 1 } },
    { n: 18, id: "crank", g: "lnk", name: "Motor crank", fn: "Convert rotation", fn2: [], fnU: [], q: 1, mat: "Pressed steel with a serrated bore", alloc: { L6: 0.29 }, fns: { conv: 1 } },
    { n: 19, id: "joints", g: "lnk", name: "Ball joints (4)", fn: "Transmit motion", fn2: ["Allow misalignment"], fnU: [], q: 4, mat: "Steel ball stud, acetal socket", alloc: { L7: 0.69 }, fns: { conv: 1 } },
    { n: 20, id: "rods", g: "lnk", name: "Drive rods (2)", fn: "Transmit motion", fn2: [], fnU: [], q: 2, mat: "Steel tube, flattened ends", alloc: { L8: 0.79 }, fns: { conv: 1 } },
    { n: 21, id: "isolators", g: "lnk", name: "Rubber isolators and pivot seals", fn: "Isolate vibration", fn2: ["Exclude water"], fnU: [], q: 5, mat: "EPDM rubber", alloc: { L9: 0.52 }, fns: { vib: 0.6, water: 0.4 } },
    { n: 22, id: "armhead", g: "arm", name: "Arm heads (2)", fn: "Grip spindle", fn2: ["Hinge arm"], fnU: [], q: 2, mat: "Die-cast zinc", alloc: { A1: 1.78 }, fns: { move: 1 } },
    { n: 23, id: "retainer", g: "arm", name: "Arm retainers (2)", fn: "Carry blade", fn2: [], fnU: [], q: 2, mat: "Pressed steel U-channel", alloc: { A2: 0.66 }, fns: { move: 1 } },
    { n: 24, id: "strip", g: "arm", name: "Arm strips with hooks (2)", fn: "Carry blade", fn2: ["Attach blade"], fnU: [], q: 2, mat: "Formed steel strip", alloc: { A3: 0.49 }, fns: { move: 0.7, attach: 0.3 } },
    { n: 25, id: "spring", g: "arm", name: "Arm springs (2)", fn: "Apply pressure", fn2: [], fnU: [], q: 2, mat: "Coiled spring wire", alloc: { A4: 0.31 }, fns: { press: 1 } },
    { n: 26, id: "nutcover", g: "arm", name: "Nut covers (2)", fn: "Hide nut", fn2: ["Exclude water"], fnU: [], q: 2, mat: "Moulded PP", alloc: { A5: 0.20 }, fns: { app: 0.6, water: 0.4 } },
    { n: 27, id: "finish", g: "arm", name: "Arm finish (e-coat and satin black)", fn: "Resist corrosion", fn2: ["Enhance appearance"], fnU: [], q: 2, mat: "Zinc phosphate, e-coat, powder coat", alloc: { A6: 0.70 }, fns: { corr: 0.7, app: 0.3 }, hidden3d: true },
    { n: 28, id: "rubber", g: "bld", name: "Wiping rubbers (2)", fn: "Wipe glass", fn2: ["Reduce friction"], fnU: ["Generate friction", "Generate noise"], q: 2, mat: "Natural rubber and chloroprene, graphite-coated lip", alloc: { B1: 0.63 }, fns: { wipe: 0.8, rfric: 0.2 } },
    { n: 29, id: "beam", g: "bld", name: "Spring-steel beams (2)", fn: "Distribute pressure", fn2: [], fnU: [], q: 2, mat: "Pre-curved spring steel", alloc: { B2: 0.65 }, fns: { dist: 1 } },
    { n: 30, id: "adaptor", g: "bld", name: "Blade adaptors (2)", fn: "Attach blade", fn2: ["Release blade"], fnU: [], q: 2, mat: "Acetal with a steel clip", alloc: { B3: 0.46 }, fns: { attach: 0.5, repl: 0.5 } },
    { n: 31, id: "spoiler", g: "bld", name: "Spoilers (2)", fn: "Resist lift", fn2: ["Enhance appearance"], fnU: [], q: 2, mat: "PP and TPE co-extrusion", alloc: { B4: 0.24 }, fns: { lift: 0.7, app: 0.3 } },
    { n: 32, id: "endcaps", g: "bld", name: "End caps (4)", fn: "Retain beam", fn2: [], fnU: [], q: 4, mat: "Moulded acetal", alloc: { B5: 0.17 }, fns: { dist: 1 } },
    { n: 33, id: "bottle", g: "wsh", name: "Washer bottle, 3 litres", fn: "Store fluid", fn2: [], fnU: [], q: 1, mat: "Blow-moulded HDPE", alloc: { W1: 2.13 }, fns: { store: 1 } },
    { n: 34, id: "neck", g: "wsh", name: "Filler neck and cap", fn: "Admit fluid", fn2: [], fnU: [], q: 1, mat: "Moulded PP, tethered cap", alloc: { W2: 0.38 }, fns: { fill: 1 } },
    { n: 35, id: "level", g: "wsh", name: "Low-fluid sensor", fn: "Indicate level", fn2: [], fnU: [], q: 1, mat: "Reed switch and float", alloc: { W3: 1.17 }, fns: { level: 1 } },
    { n: 36, id: "pump", g: "wsh", name: "Front washer pump", fn: "Pressurise fluid", fn2: [], fnU: ["Generate noise"], q: 1, mat: "12 V centrifugal pump in a rubber grommet", alloc: { W4: 4.41 }, fns: { pres: 1 } },
    { n: 37, id: "rearpump", g: "wsh", name: "Rear washer pump", fn: "Feed rear washer", fn2: [], fnU: [], q: 1, mat: "The same 12 V pump, second outlet hole", alloc: { X1: 4.41 }, fns: { rear: 1 } },
    { n: 38, id: "hoses", g: "wsh", name: "Hoses and connectors", fn: "Convey fluid", fn2: [], fnU: [], q: 1, mat: "EPDM hose, nylon T-piece and elbows", alloc: { W5: 0.68 }, fns: { convey: 1 } },
    { n: 39, id: "valve", g: "wsh", name: "Check valve", fn: "Prime jets", fn2: [], fnU: [], q: 1, mat: "Nylon body, silicone diaphragm", alloc: { W6: 0.19 }, fns: { prime: 1 } },
    { n: 40, id: "jets", g: "wsh", name: "Washer jets, twin-spot (2)", fn: "Spray fluid", fn2: ["Aim spray"], fnU: [], q: 2, mat: "Acetal body, adjustable two-hole ball", alloc: { W7: 0.58 }, fns: { spray: 0.8, aim: 0.2 } },
    { n: 41, id: "connector", g: "fix", name: "Motor connector", fn: "Receive power", fn2: [], fnU: [], q: 1, mat: "Tinned terminals, silicone seal", alloc: { E1: 0.23 }, fns: { rpow: 1 } },
    { n: 42, id: "nuts", g: "fix", name: "Arm and crank nuts (3)", fn: "Fasten components", fn2: [], fnU: [], q: 3, mat: "M8 steel, zinc-flake", alloc: { E2: 0.16 }, fns: { fast: 1 } },
    { n: 43, id: "bolts", g: "fix", name: "Module and motor bolts (6)", fn: "Fasten components", fn2: [], fnU: [], q: 6, mat: "M6 steel, zinc-flake", alloc: { E3: 0.31 }, fns: { fast: 1 } },
    { n: 44, id: "bottlefix", g: "fix", name: "Bottle fixings (2)", fn: "Fasten components", fn2: [], fnU: [], q: 2, mat: "Bolt and push clip", alloc: { E4: 0.13 }, fns: { fast: 1 } },
    { n: 45, id: "clips", g: "fix", name: "Hose and cable clips (8)", fn: "Route hoses", fn2: [], fnU: [], q: 8, mat: "Nylon fir-tree clips", alloc: { E5: 0.26 }, fns: { route: 1 } },
  ];
  const r2 = (v) => Math.round((v + 1e-9) * 100) / 100;
  const sumv = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  // share each group's assembly line across its parts, in proportion to their cost; the costliest part takes the rounding
  LINES.filter((l) => l.assy).forEach((l) => {
    const gid = G.find((g) => g.line === l.sub).id, ps = P.filter((p) => p.g === gid), base = ps.reduce((t, p) => t + sumv(p.alloc), 0);
    const amt = l.id === "A6" ? l.ext - 0.70 : l.ext, big = ps.reduce((a, b) => (sumv(b.alloc) > sumv(a.alloc) ? b : a));
    let acc = 0;
    ps.forEach((p) => { if (p === big) return; const v = r2(amt * sumv(p.alloc) / base); p.alloc[l.id] = r2((p.alloc[l.id] || 0) + v); acc += v; });
    big.alloc[l.id] = r2((big.alloc[l.id] || 0) + amt - acc);
  });
  P.forEach((p) => { p.ext = r2(sumv(p.alloc)); p.cost = p.ext / p.q; });

  const REPORT = { system: r2(LINES.reduce((t, l) => t + l.ext, 0)), volume: 250000, life: 5, low: 37.5, high: 53.5, massKg: 4.86, fluidKg: 3.0, massValue: 4 };
  const SPEC = {
    model: "VH-W2",
    rows: [
      ["Layout", "Tandem: both arms sweep the same way. Right-hand drive"], ["Motor", "12 V brushed DC, about 60 W, worm gear about 70:1"],
      ["Speeds", "45 and 63 wipes a minute, plus intermittent"], ["Sweep", "Driver's arm about 97°, passenger's about 87°"],
      ["Blades", "Flat (beam) blades, 650 mm and 450 mm"], ["Washer", "3-litre bottle, front and rear pumps, twin-spot jets"],
      ["Mass", "About 4.9 kg dry, 7.9 kg with a full bottle"], ["Cost", "£45.28 a car to the carmaker (VAVEhub estimate)"],
    ],
  };
  // how it works, for the 3D tour; parts: the item numbers each step uses
  const PATH = [
    { t: "Power in", d: "The car's body controller sends 12 volts to the motor's connector. Two of the three brushes carry it to the armature; using the offset third brush gives the faster speed.", parts: [41, 4, 5] },
    { t: "Make it turn", d: "Current in the armature's winding pushes against the field of two ferrite magnets, so the armature spins at about 3,000 rpm.", parts: [1, 2, 3] },
    { t: "Slow it down, add force", d: "A worm on the armature shaft turns a plastic worm wheel about 70 times slower and about 50 times stronger. The worm also locks the arms in place when the power is off.", parts: [6, 7, 8, 11] },
    { t: "Turn rotation into a sweep", d: "The crank goes round and round. Two rods and two levers turn that into a back-and-forth swing of each spindle: a four-bar linkage. One turn of the crank is one full wipe, up and back.", parts: [18, 19, 20, 16, 15] },
    { t: "Carry the blade", d: "Each arm grips its spindle on a knurled taper. A spring presses the blade onto the glass with about 9 N on the driver's side.", parts: [22, 23, 24, 25] },
    { t: "Wipe", d: "A pre-curved steel beam spreads that force evenly along the rubber, the spoiler holds the blade down at speed, and the rubber edge wipes the water away.", parts: [28, 29, 31] },
    { t: "Wash", d: "Pull the stalk and the pump pushes fluid from the bottle through the hoses to two jets on the bonnet. A check valve keeps the line full so the spray starts at once.", parts: [33, 36, 38, 39, 40] },
    { t: "Park", d: "Switch off and a contact track on the worm wheel keeps the motor running until the arms reach the bottom of the screen, then brakes it.", parts: [10, 7] },
  ];

  // ── the value study ──
  // FAST functions. Each part's cost is shared among its functions (fns above), so function costs add up exactly to the
  // system cost. kind: higher | basic | path | assumed (the input, outside scope) | second (a second answer to HOW, an AND) |
  // when (at the same time as, or caused by, the function it hangs from) | unwanted | all (all the time) | one | user | esteem.
  // col and row place the box on the FAST diagram.
  const FUNCS = [
    { id: "vis", fn: "Maintain visibility", kind: "higher", col: 0, row: "P" },
    { id: "clear", fn: "Clear windscreen", kind: "basic", col: 1, row: "P" },
    { id: "wipe", fn: "Wipe glass", kind: "path", col: 2, row: "P" },
    { id: "move", fn: "Move blade", kind: "path", col: 3, row: "P" },
    { id: "osc", fn: "Oscillate arms", kind: "path", col: 4, row: "P" },
    { id: "conv", fn: "Convert rotation", kind: "path", col: 5, row: "P" },
    { id: "torque", fn: "Multiply torque", kind: "path", col: 6, row: "P" },
    { id: "gen", fn: "Generate torque", kind: "path", col: 7, row: "P" },
    { id: "rpow", fn: "Receive power", kind: "path", col: 8, row: "P" },
    { id: "supply", fn: "Supply power", kind: "assumed", col: 9, row: "P", note: "The car's 12 V supply and body controller: outside the study" },
    { id: "press", fn: "Apply pressure", kind: "second", col: 3, row: "W1" },
    { id: "dist", fn: "Distribute pressure", kind: "second", col: 3, row: "W2" },
    { id: "lift", fn: "Resist lift", kind: "second", col: 3, row: "W3" },
    { id: "fric", fn: "Generate friction", kind: "unwanted", col: 2, row: "W4", note: "Rubber on glass: wear, chatter and squeal" },
    { id: "rfric", fn: "Reduce friction", kind: "when", col: 3, row: "W4" },
    { id: "speed", fn: "Vary speed", kind: "when", col: 7, row: "W1" },
    { id: "park", fn: "Park blades", kind: "when", col: 7, row: "W2" },
    { id: "gint", fn: "Generate interference", kind: "unwanted", col: 7, row: "W3", note: "Sparking at the brushes" },
    { id: "emc", fn: "Suppress interference", kind: "when", col: 8, row: "W3" },
    { id: "gnoise", fn: "Generate noise", kind: "unwanted", col: 7, row: "W4", note: "Motor hum and the thump as the arms reverse" },
    { id: "vib", fn: "Isolate vibration", kind: "when", col: 8, row: "W4" },
    { id: "gheat", fn: "Generate heat", kind: "unwanted", col: 7, row: "W5", note: "Most of all when the blades are frozen to the glass" },
    { id: "limit", fn: "Limit current", kind: "when", col: 8, row: "W5" },
    { id: "wash", fn: "Wash glass", kind: "second", col: 2, row: "W5" },
    { id: "spray", fn: "Spray fluid", kind: "second", col: 3, row: "W5" },
    { id: "convey", fn: "Convey fluid", kind: "second", col: 4, row: "W5" },
    { id: "pres", fn: "Pressurise fluid", kind: "second", col: 5, row: "W5" },
    { id: "store", fn: "Store fluid", kind: "second", col: 6, row: "W5" },
    { id: "prime", fn: "Prime jets", kind: "when", col: 3, row: "W6" },
    { id: "rear", fn: "Feed rear washer", kind: "when", col: 6, row: "W6", note: "The bottle also feeds the rear screen's washer" },
    { id: "loc", fn: "Locate components", kind: "all", col: 1, row: "A" },
    { id: "encl", fn: "Enclose mechanism", kind: "all", col: 2, row: "A" },
    { id: "water", fn: "Exclude water", kind: "all", col: 3, row: "A" },
    { id: "corr", fn: "Resist corrosion", kind: "all", col: 4, row: "A" },
    { id: "fast", fn: "Fasten components", kind: "all", col: 5, row: "A" },
    { id: "route", fn: "Route hoses", kind: "all", col: 6, row: "A" },
    { id: "attach", fn: "Attach blade", kind: "all", col: 7, row: "A" },
    { id: "app", fn: "Enhance appearance", kind: "esteem", col: 8, row: "A" },
    { id: "repl", fn: "Replace blade", kind: "user", col: 1, row: "B" },
    { id: "fill", fn: "Admit fluid", kind: "user", col: 2, row: "B" },
    { id: "level", fn: "Indicate level", kind: "user", col: 3, row: "B" },
    { id: "aim", fn: "Aim spray", kind: "one", col: 4, row: "B" },
  ];
  // function costs from the parts' shares; the last function of each part takes the rounding
  FUNCS.forEach((f) => (f.alloc = {}));
  const FN = Object.fromEntries(FUNCS.map((f) => [f.id, f]));
  P.forEach((p) => { const ks = Object.keys(p.fns); let acc = 0;
    ks.forEach((k, i) => { const v = i === ks.length - 1 ? r2(p.ext - acc) : r2(p.ext * p.fns[k]); acc += v; FN[k].alloc[p.n] = v; }); });
  FUNCS.forEach((f) => (f.cost = r2(sumv(f.alloc))));
  // links besides the critical path: how (a second answer to "how?"), when (at the same time), cause (brings an unwanted function, or exists because of one)
  const FLINKS = [["wipe", "press", "how"], ["wipe", "dist", "how"], ["wipe", "lift", "how"], ["wipe", "fric", "cause"], ["fric", "rfric", "cause"],
    ["clear", "wash", "how"], ["wash", "spray", "how"], ["spray", "convey", "how"], ["convey", "pres", "how"], ["pres", "store", "how"], ["spray", "prime", "when"], ["store", "rear", "when"],
    ["gen", "speed", "when"], ["gen", "park", "when"], ["gen", "gint", "cause"], ["gint", "emc", "cause"], ["gen", "gnoise", "cause"], ["gnoise", "vib", "cause"], ["gen", "gheat", "cause"], ["gheat", "limit", "cause"]];
  // requirements the design must meet: criteria, not functions
  const CRITERIA = ["Wipe 98% of zone A, 80% of zone B", "Two speeds: 45 and 63 a minute", "Wash 60% of zone A", "Bottle at least 1 litre", "Blades stay on at 160 km/h",
    "Survive 15 s stalled", "Run dry at −18 °C", "1.5 million wipe cycles", "Quiet: no chatter or reversal thump"];
  const OBJECTIVE = "Take at least 10% (£4.53) off the £45.28 system cost, with every legal and design requirement still met";

  // what drivers value: the team's paired comparison (1 a little more important, 2 clearly, 3 a lot)
  const PAIRED = {
    fns: ["wipe", "press", "lift", "spray", "speed", "vib", "park", "rear", "store", "level"],
    why: { wipe: "a clear view, no streaks", press: "a clean wipe at every point", lift: "stays on the glass on the motorway", spray: "washes the whole view",
      speed: "keeps up in heavy rain", vib: "quiet: no chatter or thump", park: "arms tuck away at the bottom", rear: "a clean rear screen too",
      store: "rarely needs a top-up", level: "warns before it runs dry" },
    pairs: [["wipe", "press", "wipe", 1], ["wipe", "lift", "wipe", 2], ["wipe", "spray", "wipe", 2], ["wipe", "speed", "wipe", 2], ["wipe", "vib", "wipe", 3], ["wipe", "park", "wipe", 3], ["wipe", "rear", "wipe", 3], ["wipe", "store", "wipe", 3], ["wipe", "level", "wipe", 3],
      ["press", "lift", "press", 1], ["press", "spray", "press", 1], ["press", "speed", "press", 1], ["press", "vib", "press", 2], ["press", "park", "press", 2], ["press", "rear", "press", 2], ["press", "store", "press", 3], ["press", "level", "press", 3],
      ["lift", "spray", "lift", 1], ["lift", "speed", "lift", 1], ["lift", "vib", "lift", 1], ["lift", "park", "lift", 2], ["lift", "rear", "lift", 2], ["lift", "store", "lift", 2], ["lift", "level", "lift", 3],
      ["spray", "speed", "spray", 1], ["spray", "vib", "spray", 1], ["spray", "park", "spray", 2], ["spray", "rear", "spray", 2], ["spray", "store", "spray", 2], ["spray", "level", "spray", 3],
      ["speed", "vib", "speed", 1], ["speed", "park", "speed", 1], ["speed", "rear", "speed", 1], ["speed", "store", "speed", 2], ["speed", "level", "speed", 2],
      ["vib", "park", "vib", 1], ["vib", "rear", "vib", 1], ["vib", "store", "vib", 1], ["vib", "level", "vib", 2],
      ["park", "rear", "park", 1], ["park", "store", "store", 1], ["park", "level", "park", 1], ["rear", "store", "rear", 1], ["rear", "level", "level", 1], ["store", "level", "store", 1]],
  };

  // the ideas. f: saving by function (£ a car; a negative number is a cost added); plant: saving in the carmaker's own assembly;
  // kg: mass change a car; nre: one-off engineering, tooling and testing (£k); wave: when it can be done (P = the next platform);
  // concept: a change of architecture, judged as a business case, not used to set the worth of functions
  const IDEAS = [
    { id: "V01", t: "One reversing pump for front and rear", d: "One pump with two outlets replaces the two single pumps: it runs one way for the front jets and the other way for the rear. One pump, one grommet and one wiring branch go; the dual pump costs about 60p more than a single one.", f: { rear: 3.81 }, kg: -0.09, parts: [36, 37], tech: "SCAMPER: combine. A catalogue part from several pump makers", cat: "Design", h: "Short (4–6 months)", nre: 45, risk: "Low", wave: 2 },
    { id: "V02", t: "Fan jets and a 2-litre bottle", d: "Fluidic fan jets (20p more a car) spread the fluid in a sweeping fan; their maker claims 65–74% less fluid for the same clean. A 2-litre bottle then lasts as long as today's 3 litres, still double the legal 1 litre: 120 g less plastic, a shorter moulding cycle, and a litre less fluid to carry.", f: { store: 0.40, spray: -0.20 }, kg: -1.12, parts: [33, 40], tech: "Benchmarking: fan jets on many current cars", cat: "Design", h: "Short (4–6 months)", nre: 70, risk: "Low", wave: 2 },
    { id: "V03", t: "Low-fluid warning only in the winter pack", d: "Fit the low-fluid sensor only to cars ordered with the winter pack, about 30% of them. The other 70% save its cost.", f: { level: 0.85 }, kg: -0.01, parts: [35], tech: "Kano: who values it?", cat: "Specification", h: "Immediate (0–3 months)", nre: 5, risk: "Very low", wave: 1 },
    { id: "V04", t: "Cap nuts instead of nut covers", d: "A domed cap nut holds the arm and keeps water out of the thread, so the separate plastic cover, its tool and its fitting go.", f: { app: 0.11, water: 0.07 }, kg: -0.02, parts: [26, 42], tech: "SCAMPER: eliminate. Patent US5647680", cat: "Design", h: "Immediate (0–3 months)", nre: 8, risk: "Very low", wave: 1 },
    { id: "V05", t: "One blade fitting across the range", d: "Use the same blade adaptor and arm hook on every model and both sides. The piece saving is small; the bigger gain is fewer part numbers, tools and service variants.", f: { attach: 0.04, repl: 0.04 }, kg: 0, parts: [30, 24], tech: "Variety reduction", cat: "Design", h: "Medium (6–9 months)", nre: 20, risk: "Low", wave: 3 },
    { id: "V06", t: "One pivot housing for both sides", d: "Redesign the two mirror-image pivot housings as one part that fits either side. Twice the volume on one die, and about £40k of tooling never needs making.", f: { osc: 0.06 }, kg: 0, parts: [15], tech: "Design for manufacture: common parts", cat: "Design", h: "Medium (6–9 months)", nre: 0, risk: "Low", wave: 3 },
    { id: "V07", t: "Thinner-walled drive rods", d: "Drive rods in Ø14 × 0.8 mm tube instead of 1.0 mm: 20% less steel and an easier flattening operation. They must still survive a frozen blade without buckling.", f: { conv: 0.10 }, kg: -0.03, parts: [20], tech: "Material efficiency", cat: "Material", h: "Medium (6–9 months)", nre: 15, risk: "Medium", wave: 3 },
    { id: "V08", t: "Cored gearbox housing, less machining", d: "Cast the bearing bores and mounting faces close to finished size with cores in the die, so machining drops from 45 to 15 seconds. The single costliest part in the system gets 53p cheaper.", f: { torque: 0.32, encl: 0.21 }, kg: -0.04, parts: [8], tech: "Design for manufacture: near-net shape", cat: "Process", h: "Medium (6–9 months)", nre: 60, risk: "Low to medium", wave: 3 },
    { id: "V09", t: "A second source for the washer pump", d: "Qualify a second pump maker whose quote is 50p lower for the same specification, and use the competition to bring the current price down too.", f: { pres: 0.65 }, kg: 0, parts: [36], tech: "Supplier benchmarking", cat: "Commercial", h: "Short (3–6 months)", nre: 15, risk: "Low", wave: 2 },
    { id: "V10", t: "Two bolts and a locating peg", d: "Fix the wiper module to the body with two bolts and a rubber locating peg instead of three bolts, as some current cars do. One bolt less to buy, and ten seconds less on the carmaker's line.", f: { fast: 0.10 }, plant: 0.11, kg: -0.01, parts: [43, 13], tech: "Design for assembly", cat: "Design", h: "Short (4–6 months)", nre: 10, risk: "Low", wave: 2 },
    { id: "V11", t: "One choke fewer, proven by test", d: "The EMC tests show margin on the motor's interference, so one of the two chokes on the brush card can go.", f: { emc: 0.10 }, kg: 0, parts: [5], tech: "Test data instead of margin", cat: "Design", h: "Short (3–6 months)", nre: 20, risk: "Low to medium", wave: 2 },
    { id: "V12", t: "Composite arms, moulded in black", d: "A glass-filled plastic arm over a steel core replaces the steel retainer and strip, and comes out of the mould black, so there's no e-coat or powder line. About 30% lighter.", f: { corr: 0.42, move: 0.28 }, kg: -0.20, parts: [23, 24, 27], tech: "Material substitution", cat: "Material", h: "Long (12–18 months)", nre: 90, risk: "Medium", wave: 4 },
    { id: "V13", t: "Plastic pivot housings", d: "Glass-filled plastic pivot housings with metal bushes replace die-cast aluminium. Cheaper, lighter, and they can't corrode and seize, the cause of several wiper recalls; they must pass the snow-load and stall tests.", f: { osc: 0.50, loc: 0.21 }, kg: -0.15, parts: [15, 17], tech: "Material substitution; lessons from recalls", cat: "Material", h: "Long (12–18 months)", nre: 80, risk: "Medium", wave: 4 },
    { id: "V14", t: "One motor across the platform", d: "Buy the same motor for all the platform's models, with only the connector and software varying, and bundle the volume in one contract.", f: { gen: 0.20, torque: 0.30 }, kg: 0, parts: [3, 8], tech: "Volume bundling", cat: "Commercial", h: "Short (3–6 months)", nre: 0, risk: "Low", wave: 2 },
    { id: "V15", t: "Reversing motor, simpler linkage", d: "A motor with its own electronics drives the driver's arm directly and reverses at each end of the wipe, so the crank, one pivot set, one rod, two ball joints, part of the frame and the park switch go. The electronics add about £4.40, so the piece cost barely changes; the gains are 0.7 kg, arms that can park lower, softer reversals and snow detection.", f: { conv: 1.33, osc: 1.79, loc: 0.67, park: 0.64, gen: -4.25 }, kg: -0.70, parts: [18, 20, 19, 15, 16, 13, 10, 3], tech: "Technology scan: reversing motors from two leading suppliers", cat: "Design", h: "Next platform (24–36 months)", nre: 1800, risk: "Medium", wave: "P", concept: true },
    { id: "H1", t: "Brushless motor", d: "About 20% lighter and 30% less power, and about 6 dB quieter, its maker reports; but it needs electronics, so it costs more. Worth it when the electronics are already there for a reversing motor.", parts: [3, 4, 5], tech: "Technology scan", cat: "Design", h: "Next platform", extra: "park", add: 3.00 },
    { id: "H2", t: "One motor per arm, no linkage", d: "Two reversing motors replace the motor, crank and whole linkage: about 1.5 kg lighter, its supplier says, but two electronic motors cost about £6–8 more a car than the system they replace.", parts: [13, 14, 15, 16, 18, 19, 20], tech: "Technology scan", cat: "Design", h: "Next platform", extra: "park", add: 7.00 },
    { id: "H3", t: "A single arm", d: "One long arm and blade instead of two. On a wide, raked windscreen it can't wipe 98% of zone A without a complex reach-and-retract mechanism, and the long arm needs a bigger motor.", parts: [22, 23, 28], tech: "Benchmarking", cat: "Design", h: "Platform change", extra: "reject" },
    { id: "H4", t: "Washer fluid through the blade", d: "Fluid released along the blade halves fluid use, its supplier says, but the blades become special parts that cost the owner far more at every change. A premium-car answer, not a family car's.", parts: [28, 40, 33], tech: "Technology scan", cat: "Design", h: "Next platform", extra: "drop" },
    { id: "H5", t: "Ferrite magnets instead of rare earth", d: "A trap: the motor already uses ferrite magnets. The saving only exists against a rare-earth baseline, so check the baseline before claiming it.", parts: [2], tech: "Benchmarking", cat: "Material", h: "–", extra: "trap" },
    { id: "H6", t: "Rain-sensing wipers as standard", d: "Adds £8–20 a car. Drivers like it when it works and are annoyed when it wipes a dry screen, so it stays in the comfort pack.", parts: [], tech: "Voice of the customer", cat: "Customer", h: "–", extra: "option", add: 12.00 },
  ];
  IDEAS.forEach((x) => { if (x.extra) return; x.save = r2(sumv(x.f || {}) + (x.plant || 0)); });

  // why each function's worth is what it is (worth = the lowest cost shown to do the job reliably)
  const WORTH = {
    rear: ["Cheaper alternative", "One reversing pump feeds both screens (V01)."],
    pres: ["Supplier quote", "A second pump maker quotes 50p less (V09)."],
    gen: ["Cheaper alternative", "One motor bought for the whole platform (V14)."],
    torque: ["Cheaper alternative", "A cored housing needs less machining (V08), and the platform volume helps (V14)."],
    loc: ["Cheaper alternative", "Plastic pivot housings (V13)."],
    move: ["Cheaper alternative", "Composite arms moulded in black (V12)."],
    osc: ["Cheaper alternative", "Plastic pivot housings (V13); one housing for both sides (V06)."],
    store: ["Cheaper alternative", "With fan jets, 2 litres is enough (V02). The law asks for 1 litre."],
    encl: ["Cheaper alternative", "A cored housing (V08)."],
    conv: ["Cheaper alternative", "Thinner-walled rods (V07)."],
    level: ["Customer need", "Only cold-market buyers rely on it: fit it with the winter pack (V03)."],
    dist: ["No cheaper way found", "The flat blade's beam is already the lean answer on a curved screen."],
    water: ["Cheaper alternative", "A cap nut keeps water out without a cover (V04)."],
    convey: ["No cheaper way found", "Already lean."],
    rpow: ["No cheaper way found", "Already lean."],
    wipe: ["No cheaper way found", "The rubber edge does the main job for pennies: the best value in the system."],
    park: ["No cheaper way found", "Already lean for a crank motor. A reversing motor parks electronically (V15, next platform)."],
    corr: ["Cheaper alternative", "Composite arms need no paint line (V12)."],
    fast: ["Cheaper alternative", "Two bolts and a locating peg (V10)."],
    emc: ["Test data", "The EMC tests show margin for one choke fewer (V11)."],
    attach: ["Cheaper alternative", "One blade fitting across the range (V05)."],
    app: ["Esteem: mostly kept", "Cap nuts instead of covers (V04); the satin finish stays."],
    spray: ["No cheaper way found", "Twin-spot jets are already the cheapest that wash 60% of zone A. Fan jets cost 20p more (V02), paid back by a smaller bottle."],
    fill: ["No cheaper way found", "Already lean."],
    press: ["Required by performance", "The spring sets the force that keeps the blade on the glass: already lean."],
    vib: ["No cheaper way found", "Already lean."],
    repl: ["Cheaper alternative", "One blade fitting across the range (V05)."],
    route: ["No cheaper way found", "Already lean."],
    limit: ["Required by law", "The 15-second stall test needs it."],
    lift: ["Required by performance", "Keeps the blade on the glass at 160 km/h."],
    prime: ["No cheaper way found", "Already lean."],
    rfric: ["No cheaper way found", "The graphite coat is what stops chatter."],
    aim: ["No cheaper way found", "Already lean."],
    speed: ["Required by law", "Two speeds are a legal must; the third brush costs a few pence."],
  };

  // phase 1: what drivers say, the Kano view, field failures and recalls, the tests (research file 4)
  const VOC = [
    { k: "Blades wear out unnoticed", v: "Only 1 of 15 blades still better than good after six months (Consumer Reports); drivers change blades about every three years against a recommended 6–12 months (AAA).", src: "https://abc30.com/archive/6479032" },
    { k: "Washers fail the MOT", v: "216,388 UK MOT failures for faulty washer jets in 2025, and 29,405 more for jets aimed badly (DVSA data, reported by Carwow).", src: "https://www.carwow.co.uk/news/10427/mot-failures-washer-jet-faults-uk" },
    { k: "Cold weather", v: "Only 1 of 8 blades kept wiping well below freezing in an ADAC test.", src: "https://www.firmenauto.de/fahrzeuge/pkw/scheibenwischertest-bei-kaelte-wischt-nur-einer-richtig-gut/" },
    { k: "Lift at speed", v: "Standard blades hold to about 160 km/h; premium cars ask for 240 km/h.", src: "https://polen.itu.edu.tr/entities/publication/f9cd74e6-e46a-41c8-90cb-d84d6223f879" },
    { k: "Auto wipers can backfire", v: "Camera-based auto wipers that wipe a dry screen became a long-running complaint for one carmaker.", src: "https://insideevs.com/features/706288/tesla-auto-wiper-problem-musk/" },
  ];
  const KANO = [
    ["Must-be", "Wipes the legal area at both speeds, parks, never stops in rain; washer sprays and is aimed; survives snow and ice"],
    ["Performance", "Wipe quality over the blade's life; quietness; stays on at motorway speed; fluid lasts"],
    ["Delighter", "Rain-sensing wipers that work; heated jets; arms that park out of sight"],
  ];
  const RECALLS = [
    ["2008", "Honda Accord", "about 351,000", "Water entered the motor's breather and corroded it"],
    ["2016", "Mitsubishi Outlander", "100,082", "Water corroded the linkage ball joints, which came apart"],
    ["2022", "Ford F-150", "453,650 (US)", "Voltage surges damaged the motor's circuit board"],
    ["2026", "Ford Explorer, Escape and two Lincolns", "604,533", "A terminal inside the motor's cover was misaligned"],
  ];
  const TESTS = [
    ["Wiped area and speeds", "EU 2021/535 Annex IV: 98% of zone A, 80% of zone B; 10–55 and 45+ wipes a minute", "Legal"],
    ["Stall", "Arms held for 15 s at full speed without damage", "Legal"],
    ["Cold", "120 s dry at −18 °C; washer frozen and thawed 6 times", "Legal"],
    ["High-speed lift", "Blades stay on at 80% of top speed or 160 km/h", "Legal"],
    ["System life", "1.5 million wipe cycles with temperature cycling (about 23 days' non-stop running)", "Carmaker practice"],
    ["Blade life", "500,000 cycles on a rig, no cracks or loss of wipe quality", "Supplier practice"],
    ["Corrosion", "96 hours of salt spray or more", "Carmaker practice"],
  ];
  // tooling (not in the piece price: carmakers usually pay for tools separately)
  const TOOLING = [
    ["Die-casting dies", "Gearbox housing and pivot housings", 240], ["Arm head dies", "Zinc hot-chamber dies, left and right", 80],
    ["Press dies", "Motor can transfer die, lamination die, plate, crank, levers, arm parts", 630], ["Injection moulds", "Cover, brush card, worm wheel, sockets, caps, jets, neck", 420],
    ["Blow mould", "Washer bottle", 120], ["Rubber and hose dies", "Blade rubber, spoiler, hose", 50], ["Gauges and test adapters", "Part gauges and end-of-line fixtures", 150],
  ];
  REPORT.toolTotal = 1750;
  // what moves the cost (research file 2, section 4.1)
  const SENS = [["Factory efficiency 70% instead of 80%", 2.16], ["Copper +20%, aluminium +15%, zinc +12%", 0.47], ["Labour £2 an hour dearer", 0.38], ["Supplier profit 8% instead of 5%", 1.17], ["Pump price £1 higher (both pumps)", 2.60]];

  const CASES = [
    { id: "C1", ideas: ["V01", "V02", "V03", "V09"], h: "The washer quick-win package",
      body: "Four changes to the washer, all inside today's design: one reversing pump for both screens, fan jets with a 2-litre bottle, the low-fluid sensor moved to the winter pack, and a second pump supplier. Together they meet the whole 10% objective on their own, and the car carries over a kilogram less.",
      risks: "Front and rear can't wash at the same moment with one pump; drivers without the winter pack lose the low-fluid light; fan jets must be checked for drift at motorway speed and in the cold; the new pump maker must pass the full approval process.",
      tests: "Washed area (60% of zone A) and the freeze–thaw cycles to EU 2021/535; fan-jet spray at 130 km/h and −18 °C; pump life and reversing; a winter fleet test." },
    { id: "C2", ideas: ["V15"], h: "Reversing motor with a simpler linkage",
      body: "A change of architecture for the next platform. The motor gains electronics and loses the crank; a pivot set, a rod, two ball joints, part of the frame and the park switch go. The piece cost barely moves, so the case rests on what it adds: 0.7 kg less, arms that can park below the bonnet line, softer reversals, wipe-angle correction and snow detection.",
      risks: "Software now decides the wiped area, so it must be proven against the legal zones; the arms must park safely if the power fails mid-wipe; new electronics bring EMC and voltage-surge risks (the cause of a 2022 recall); about two winters of testing.",
      tests: "1.5 million cycles with temperature cycling; stall and snow-load starts at −20 °C; EMC and voltage surges; wiped-area homologation; wind tunnel for lift and noise." },
  ];
  const SOURCES = [
    ["VAVEhub research files for this study: engineering and rules, should-cost, ideas, customers (October 2026)", null],
    ["EU wiper and washer requirements: Implementing Regulation (EU) 2021/535, Annex IV", "https://lexparency.org/eu/32021R0535/ANX_IV/"],
    ["US requirements: FMVSS 104", "https://www.law.cornell.edu/cfr/text/49/571.104"],
    ["Reversing wiper systems (Bosch)", "https://www.bosch-mobility.com/en/solutions/wipers/reversing-front-wiper-system/"],
    ["Direct-drive wiper motors (Valeo)", "https://www.valeo.com/en/dual-direct-drive-motors/"],
    ["Brushless wiper motor, SAE 2019-01-0610 (Mitsuba)", "https://saemobilus.sae.org/papers/development-brushless-smart-motor-front-wipers-2019-01-0610"],
    ["Fluidic washer nozzles (dlhBowles)", "https://dlhbowles.com/?p=244"],
    ["Material prices: zinc, aluminium and copper (2025 averages)", "https://metalcharts.org/zinc-price-history/2025"],
    ["Labour costs in Central and Eastern Europe (Eurostat)", "https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20250328-1"],
    ["Supplier profit margins (Lazard supplier study)", "https://lazard.com/media/hf3devfa/press-release-global-automotive-supplier-study-average-industry-profit-margin-drops.pdf"],
  ];
  // the linkage for the 3D model (research file 1, section 4.3, mirrored for right-hand drive). Glass-plane millimetres:
  // u across the car (+ is the driver's side), v up the glass, from the middle of its lower edge. Arm angles are measured from
  // the line along the bottom of the screen, swinging up towards the driver's A-pillar.
  const GEOM = {
    rake: 28, glass: { bottom: 1440, top: 1220, height: 900 },
    driverPivot: [450, -40], passengerPivot: [-60, -40], motorShaft: [-380, -110], crank: 50, levers: [67, 74], rods: [834, 332],
    arms: [520, 400], blades: [650, 450],
    sweep: [[0, 4.0, 2.0], [30, 12.1, 10.8], [60, 30.8, 28.5], [90, 52.8, 48.7], [120, 74.6, 67.9], [150, 92.7, 82.5], [180, 100.7, 88.5],
      [210, 94.3, 84.1], [240, 78.0, 71.7], [270, 57.0, 53.6], [300, 34.3, 31.8], [330, 13.8, 10.8], [360, 4.0, 2.0]],
  };

  window.VH_WIPER = { subs: SUBS, lines: LINES, groups: G, parts: P, report: REPORT, spec: SPEC, path: PATH, sources: SOURCES,
    funcs: FUNCS, flinks: FLINKS, criteria: CRITERIA, objective: OBJECTIVE, paired: PAIRED, ideas: IDEAS, worth: WORTH,
    voc: VOC, kano: KANO, recalls: RECALLS, tests: TESTS, tooling: TOOLING, sens: SENS, cases: CASES, geom: GEOM };
})();
