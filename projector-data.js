/* VAVEhub · worked case study: the VH-3600 classroom 3LCD projector.
   Costs come from a detailed should-cost and VAVE engineering report for a comparable projector
   (3,600 lumens, XGA, three 0.55-inch HTPS panels, 210 W UHE lamp): 200,000 a year, built by a tier-1
   contract manufacturer in Shenzhen, GBP. LINES are the report's own bill of materials, at its costs.
   PARTS are the parts you can see in the 3D model; each one's cost is its share of one or more report
   lines (alloc), and the shares add back up exactly to the report's line costs. A few parts the report
   doesn't itemise are added as lines X1–X5 and flagged as VAVEhub estimates. */
(function () {
  const SUBS = [
    { id: "A", name: "Optical engine and light source" },
    { id: "B", name: "Electronics and power" },
    { id: "C", name: "Mechanical, housing and thermal" },
    { id: "D", name: "Accessories and packaging" },
    { id: "X", name: "Parts the report doesn't itemise (VAVEhub estimates)" },
  ];
  const LINES = [
    { id: "A1", sub: "A", name: "HTPS LCD panels (R, G, B)", spec: "0.55-inch XGA (1024 × 768), micro-lens array, quartz substrate, dust-proof glass and flex cable", q: 3, unit: 8.20 },
    { id: "A2", sub: "A", name: "UHE lamp module", spec: "210 W UHE mercury arc burner, parabolic reflector, PPS cage and safety glass", q: 1, unit: 9.40 },
    { id: "A3", sub: "A", name: "Projection zoom lens", spec: "1.2× manual zoom (f = 16.9–20.28 mm, F1.49–1.72), 6 glass and aspheric elements in a PC-GF30 barrel", q: 1, unit: 7.90 },
    { id: "A4", sub: "A", name: "Dichroic cross prism (X-cube)", spec: "Four BK7 glass prisms with multi-layer R/G/B dielectric coatings, UV-bonded", q: 1, unit: 5.80 },
    { id: "A5", sub: "A", name: "Integrator and relay optics", spec: "Two fly's-eye lens arrays, PBS polarisation converter, two dichroic mirrors, field lenses", q: 1, unit: 4.60 },
    { id: "A6", sub: "A", name: "Inorganic polarisers (in and out)", spec: "Three entrance and three exit polarisers on sapphire or quartz substrates", q: 6, unit: 2.90 / 6 },
    { id: "B1", sub: "B", name: "Video SoC and panel drivers", spec: "Scaler and de-interlacer SoC (£4.45) and three HTPS panel timing and driver ICs (£3.15)", q: 1, unit: 7.60 },
    { id: "B2", sub: "B", name: "AC-DC power supply (SMPS)", spec: "330 W, 100–240 V, active PFC, flyback transformer, heatsinks, CEM-3 board", q: 1, unit: 5.60 },
    { id: "B3", sub: "B", name: "Electronic lamp ballast", spec: "210 W, 3.5 kV ignition and constant-power arc control, on a daughterboard", q: 1, unit: 4.70 },
    { id: "B4", sub: "B", name: "Memory and peripheral ICs", spec: "2 Gb DDR3L (£1.35), 128 Mb NOR flash (£0.45), 10/100 LAN PHY (£0.55), class-D amplifier and power-management ICs", q: 1, unit: 3.60 },
    { id: "B5", sub: "B", name: "Rear I/O connectors and ESD", spec: "3 × VGA D-sub, HDMI, RJ-45 with magnetics, RS-232C, USB-A and B, RCA, 3 × 3.5 mm jacks", q: 1, unit: 3.40 },
    { id: "B6", sub: "B", name: "Main board, bare PCB", spec: "6-layer FR4, 165 × 115 mm, Tg150, ENIG finish; double-sided SMT and selective wave solder", q: 1, unit: 2.80 },
    { id: "B7", sub: "B", name: "Keypad, IR receivers and speaker", spec: "Button board and two IR receivers (£0.95); 5 W speaker in a sealed enclosure (£0.85)", q: 1, unit: 1.80 },
    { id: "B8", sub: "B", name: "Internal wiring and ferrites", spec: "LVDS and flex ribbons, IEC C14 inlet harness, fan and thermistor leads, ferrites", q: 1, unit: 0.60 },
    { id: "C1", sub: "C", name: "Top and bottom enclosures", spec: "Flame-retardant PC/ABS (UL94 V-0), about 680 g together, one-cavity moulds on an 800 t press", q: 2, unit: 2.10 },
    { id: "C2", sub: "C", name: "Cooling fans", spec: "One radial blower (lamp and panel duct) and two low-noise PWM axial fans", q: 3, unit: 1.05 },
    { id: "C3", sub: "C", name: "Optical engine light pipe", spec: "PPS-GF40 (40% glass-filled PPS), high-heat precision moulding", q: 1, unit: 2.25 },
    { id: "C4", sub: "C", name: "Secondary moulded plastics", spec: "A/V mute lens shutter, lamp door, filter cover, zoom and focus rings, tilt foot", q: 1, unit: 1.55 },
    { id: "C5", sub: "C", name: "Sheet metal, EMI and fasteners", spec: "SGCC steel main board cage, rear I/O EMI shield, lamp heat baffle, 38 screws and inserts", q: 1, unit: 1.30 },
    { id: "C6", sub: "C", name: "Air filter and seals", spec: "Pleated electrostatic foam filter and die-cut silicone light and dust seals", q: 1, unit: 0.35 },
    { id: "D1", sub: "D", name: "Packaging, remote and cables", spec: "Double-wall box and EPE foam (£2.30), UK mains cord and VGA cable (£2.15), IR remote and 2 × AA (£1.45)", q: 1, unit: 5.90 },
    { id: "X1", sub: "X", name: "NTC thermistors", spec: "The report lists their leads but not the sensors", q: 3, unit: 0.03, added: true },
    { id: "X2", sub: "X", name: "Lamp cover interlock switch", spec: "Micro switch that cuts the lamp when the cover is off", q: 1, unit: 0.15, added: true },
    { id: "X3", sub: "X", name: "Front bezel", spec: "Small PC/ABS moulding; the report lists only the top and bottom cases", q: 1, unit: 0.60, added: true },
    { id: "X4", sub: "X", name: "Rear feet", spec: "Two rubber feet; the report lists only the front tilt foot", q: 2, unit: 0.04, added: true },
    { id: "X5", sub: "X", name: "Manual pack and labels", spec: "Printed manuals and warranty pack; cost from the report's own idea VAVE-19", q: 1, unit: 0.28, added: true },
  ];
  LINES.forEach((l) => (l.ext = Math.round(l.q * l.unit * 100) / 100));

  // groups for the 3D side panel, in the order light travels
  const G = [
    { id: "light", name: "Light source" }, { id: "illum", name: "Illumination optics" }, { id: "split", name: "Colour separation and relay" },
    { id: "image", name: "Image engine" }, { id: "lens", name: "Projection lens" }, { id: "cool", name: "Cooling" },
    { id: "power", name: "Power" }, { id: "elec", name: "Electronics and controls" }, { id: "house", name: "Housing and frame" },
    { id: "acc", name: "Accessories and packaging" },
  ];
  // n: item number (and balloon number); alloc: £ taken from each report line for all of this item's quantity
  const P = [
    { n: 1, id: "burner", g: "light", name: "UHE lamp burner, 210 W", fn: "Generate light", fn2: [], fnU: ["Generate heat", "Emit UV"], q: 1, mat: "Quartz arc tube, tungsten electrodes, mercury fill", alloc: { A2: 4.60 } },
    { n: 2, id: "reflector", g: "light", name: "Parabolic reflector", fn: "Collect light", fn2: [], fnU: [], q: 1, mat: "Pressed glass with a dichroic cold-mirror coating", alloc: { A2: 2.40 } },
    { n: 3, id: "cage", g: "light", name: "Lamp cage and connector", fn: "Position lamp", fn2: ["Conduct current"], fnU: [], q: 1, mat: "PPS cage with terminals", alloc: { A2: 1.40 } },
    { n: 4, id: "uvir", g: "light", name: "Lamp safety glass", fn: "Contain fragments", fn2: ["Block UV"], fnU: [], q: 1, mat: "Hard glass with UV-cut coating", alloc: { A2: 1.00 } },
    { n: 5, id: "lampdoor", g: "light", name: "Lamp access door", fn: "Expose lamp", fn2: [], fnU: [], q: 1, mat: "Moulded PC/ABS", alloc: { C4: 0.25 } },
    { n: 6, id: "baffle", g: "light", name: "Lamp heat baffle", fn: "Deflect heat", fn2: [], fnU: [], q: 1, mat: "Stamped SGCC steel", alloc: { C5: 0.15 } },
    { n: 7, id: "fly1", g: "illum", name: "Fly's-eye lens array 1", fn: "Divide light", fn2: [], fnU: [], q: 1, mat: "Moulded glass lens array", alloc: { A5: 0.55 } },
    { n: 8, id: "fly2", g: "illum", name: "Fly's-eye lens array 2", fn: "Distribute light", fn2: [], fnU: [], q: 1, mat: "Moulded glass lens array", alloc: { A5: 0.55 } },
    { n: 9, id: "pbs", g: "illum", name: "Polarisation converter (PBS array)", fn: "Polarise light", fn2: [], fnU: [], q: 1, mat: "Glass prism strips and half-wave film", alloc: { A5: 1.24 } },
    { n: 10, id: "cond", g: "illum", name: "Superposition lens", fn: "Superimpose light", fn2: [], fnU: [], q: 1, mat: "Glass lens", alloc: { A5: 0.25 } },
    { n: 11, id: "dm1", g: "split", name: "Dichroic mirror (blue)", fn: "Separate wavelengths", fn2: [], fnU: [], q: 1, mat: "Glass with a dichroic coating", alloc: { A5: 0.40 } },
    { n: 12, id: "dm2", g: "split", name: "Dichroic mirror (green)", fn: "Separate wavelengths", fn2: [], fnU: [], q: 1, mat: "Glass with a dichroic coating", alloc: { A5: 0.40 } },
    { n: 13, id: "fold", g: "split", name: "Fold mirrors", fn: "Redirect light", fn2: [], fnU: [], q: 3, mat: "Aluminised glass", alloc: { A5: 0.36 } },
    { n: 14, id: "relay", g: "split", name: "Relay lenses", fn: "Relay light", fn2: [], fnU: [], q: 2, mat: "Glass lens", alloc: { A5: 0.40 } },
    { n: 15, id: "field", g: "split", name: "Field lenses", fn: "Converge light", fn2: [], fnU: [], q: 3, mat: "Glass lens", alloc: { A5: 0.45 } },
    { n: 16, id: "lcd", g: "image", name: "HTPS LCD panels, 0.55 in", fn: "Modulate light", fn2: [], fnU: ["Generate heat"], q: 3, mat: "Polysilicon TFT on quartz, liquid crystal, micro-lens array, flex cable", alloc: { A1: 24.60 } },
    { n: 17, id: "polin", g: "image", name: "Entrance polarisers", fn: "Polarise light", fn2: [], fnU: [], q: 3, mat: "Inorganic polariser on sapphire or quartz", alloc: { A6: 1.45 } },
    { n: 18, id: "polout", g: "image", name: "Exit polarisers", fn: "Absorb light", fn2: [], fnU: ["Generate heat"], q: 3, mat: "Inorganic polariser on sapphire or quartz", alloc: { A6: 1.45 } },
    { n: 19, id: "prism", g: "image", name: "X-cube dichroic prism", fn: "Combine images", fn2: [], fnU: [], q: 1, mat: "Four bonded BK7 glass prisms, dielectric coatings", alloc: { A4: 5.80 } },
    { n: 20, id: "frame", g: "image", name: "Light pipe (optical engine frame)", fn: "Locate optics", fn2: ["Channel air"], fnU: [], q: 1, mat: "PPS-GF40 precision moulding", alloc: { C3: 1.85 } },
    { n: 21, id: "lens", g: "lens", name: "Projection lens, 1.2× zoom, with rings", fn: "Magnify image", fn2: ["Focus image"], fnU: [], q: 1, mat: "6 glass and aspheric elements, PC-GF30 barrel, moulded zoom and focus rings", alloc: { A3: 7.90, C4: 0.40 } },
    { n: 22, id: "blower", g: "cool", name: "Radial blower (lamp and panel duct)", fn: "Move air", fn2: [], fnU: ["Generate noise"], q: 1, mat: "Sirocco fan, brushless DC motor", alloc: { C2: 1.05 } },
    { n: 23, id: "intake", g: "cool", name: "Intake fan, axial", fn: "Move air", fn2: [], fnU: ["Generate noise"], q: 1, mat: "Low-noise PWM axial fan", alloc: { C2: 1.05 } },
    { n: 24, id: "exhaust", g: "cool", name: "Exhaust fan, axial", fn: "Expel air", fn2: [], fnU: ["Generate noise"], q: 1, mat: "Low-noise PWM axial fan", alloc: { C2: 1.05 } },
    { n: 25, id: "ducts", g: "cool", name: "Air guides", fn: "Channel air", fn2: [], fnU: [], q: 1, mat: "Moulded in PPS-GF40 with the light pipe", alloc: { C3: 0.40 } },
    { n: 26, id: "filter", g: "cool", name: "Air filter, cover and seals", fn: "Trap dust", fn2: [], fnU: [], q: 1, mat: "Electrostatic foam, moulded cover, silicone seals", alloc: { C6: 0.35, C4: 0.20 } },
    { n: 27, id: "therm", g: "cool", name: "Thermistors", fn: "Sense temperature", fn2: [], fnU: [], q: 3, mat: "NTC thermistor", alloc: { X1: 0.09 } },
    { n: 28, id: "psu", g: "power", name: "AC-DC power supply, 330 W", fn: "Convert voltage", fn2: ["Suppress interference"], fnU: ["Generate heat", "Generate interference"], q: 1, mat: "Active PFC, flyback transformer, heatsinks, CEM-3 board", alloc: { B2: 5.60 } },
    { n: 29, id: "ballast", g: "power", name: "Lamp ballast and igniter", fn: "Ignite arc", fn2: ["Regulate power"], fnU: ["Generate interference"], q: 1, mat: "3.5 kV igniter, constant-power arc control", alloc: { B3: 4.70 } },
    { n: 30, id: "inlet", g: "power", name: "Mains inlet (IEC C14) and harness", fn: "Conduct current", fn2: [], fnU: [], q: 1, mat: "IEC C14 inlet with leads", alloc: { B8: 0.20 } },
    { n: 31, id: "main", g: "elec", name: "Main board (6-layer)", fn: "Process signal", fn2: ["Drive panels", "Amplify sound"], fnU: ["Generate interference"], q: 1, mat: "Video SoC, panel drivers, DDR3L, flash, LAN PHY, amplifier, power ICs", alloc: { B1: 7.60, B4: 3.60, B6: 2.80 } },
    { n: 32, id: "io", g: "elec", name: "Rear connectors and ESD", fn: "Receive signal", fn2: [], fnU: [], q: 1, mat: "VGA × 3, HDMI, RJ-45, RS-232C, USB, RCA, audio jacks", alloc: { B5: 3.40 } },
    { n: 33, id: "keypad", g: "elec", name: "Control buttons", fn: "Accept commands", fn2: [], fnU: [], q: 1, mat: "Button board, rubber keys, moulded cap", alloc: { B7: 0.75 } },
    { n: 34, id: "ir", g: "elec", name: "IR receivers", fn: "Detect infrared", fn2: [], fnU: [], q: 2, mat: "IR receiver module", alloc: { B7: 0.20 } },
    { n: 35, id: "speaker", g: "elec", name: "Speaker, 5 W", fn: "Emit sound", fn2: [], fnU: [], q: 1, mat: "Moving-coil speaker in a sealed box", alloc: { B7: 0.85 } },
    { n: 36, id: "interlock", g: "elec", name: "Lamp cover interlock switch", fn: "Interrupt power", fn2: [], fnU: [], q: 1, mat: "Micro switch", alloc: { X2: 0.15 } },
    { n: 37, id: "harness", g: "elec", name: "LVDS ribbons and ferrites", fn: "Conduct signals", fn2: ["Suppress interference"], fnU: [], q: 1, mat: "Flex and LVDS ribbons, clip-on ferrite cores", alloc: { B8: 0.40 } },
    { n: 38, id: "top", g: "house", name: "Top case", fn: "Enclose components", fn2: ["Enhance appearance"], fnU: [], q: 1, mat: "FR PC/ABS (UL94 V-0), textured", alloc: { C1: 2.10 } },
    { n: 39, id: "bottom", g: "house", name: "Bottom case", fn: "Support weight", fn2: ["Enclose components"], fnU: [], q: 1, mat: "FR PC/ABS (UL94 V-0), with side cores", alloc: { C1: 2.10 } },
    { n: 40, id: "bezel", g: "house", name: "Front bezel", fn: "Enhance appearance", fn2: [], fnU: [], q: 1, mat: "PC/ABS moulding", alloc: { X3: 0.60 } },
    { n: 41, id: "lenscover", g: "house", name: "A/V mute lens shutter", fn: "Interrupt image", fn2: [], fnU: [], q: 1, mat: "Moulded sliding shutter with a sensor switch", alloc: { C4: 0.45 } },
    { n: 42, id: "tiltfoot", g: "house", name: "Front tilt foot", fn: "Adjust angle", fn2: [], fnU: [], q: 1, mat: "Moulded foot with release catch", alloc: { C4: 0.25 } },
    { n: 43, id: "feet", g: "house", name: "Rear feet", fn: "Support weight", fn2: [], fnU: [], q: 2, mat: "Rubber", alloc: { X4: 0.08 } },
    { n: 44, id: "screws", g: "house", name: "Screws and inserts", fn: "Fasten components", fn2: [], fnU: [], q: 38, mat: "Steel screws, brass heat-set inserts", alloc: { C5: 0.35 } },
    { n: 45, id: "mbcage", g: "house", name: "Main board cage", fn: "Locate board", fn2: [], fnU: [], q: 1, mat: "Stamped SGCC steel", alloc: { C5: 0.35 } },
    { n: 46, id: "emi", g: "house", name: "Rear I/O EMI shield", fn: "Shield radiation", fn2: [], fnU: [], q: 1, mat: "Stamped tinned steel with gasket fingers", alloc: { C5: 0.45 } },
    { n: 47, id: "remote", g: "acc", name: "IR remote and 2 × AA", fn: "Transmit commands", fn2: [], fnU: [], q: 1, mat: "ABS case, rubber keypad, batteries", alloc: { D1: 1.45 } },
    { n: 48, id: "cables", g: "acc", name: "UK mains cord and VGA cable", fn: "Conduct current", fn2: ["Transmit signal"], fnU: [], q: 1, mat: "BS1363 cord 1.8 m, VGA cable 1.8 m", alloc: { D1: 2.15 } },
    { n: 49, id: "docs", g: "acc", name: "Manual pack and labels", fn: "Convey instructions", fn2: [], fnU: [], q: 1, mat: "Printed booklets, warranty pack", alloc: { X5: 0.28 } },
    { n: 50, id: "carton", g: "acc", name: "Double-wall carton and EPE foam", fn: "Absorb shock", fn2: ["Contain product"], fnU: [], q: 1, mat: "Corrugated board, EPE foam end-caps", alloc: { D1: 2.30 }, hidden3d: true },
  ];
  P.forEach((p) => { p.ext = Math.round(Object.values(p.alloc).reduce((a, b) => a + b, 0) * 100) / 100; p.cost = p.ext / p.q; });

  // from parts to a landed projector (report section 1)
  const CHAIN = [
    { name: "Direct manufacturing and conversion", cost: 9.70, note: "Optical alignment in a clean room, line assembly, burn-in, test, tooling" },
    { name: "Yield loss, scrap and factory overheads", cost: 8.50, note: "1.5% optical scrap, 0.5% SMT loss (£1.80) and 6% factory overhead (£6.70)" },
    { name: "Contract manufacturer's margin (8%)", cost: 9.40, note: "On a £122.20 factory cost" },
    { gate: "Ex-works cost (factory gate, Shenzhen)" },
    { name: "Freight, insurance, compliance and warranty", cost: 9.90, note: "Sea freight £2.60, insurance £0.80, HDMI licence, WEEE and warranty £6.50; 0% UK duty (HS 8528.62.00)" },
    { gate: "Landed cost in the UK (delivered duty paid)" },
  ];
  const REPORT = { bom: 104.00, exw: 131.60, ddp: 141.50, volume: 200000, street: 354.17, streetInc: 425, vat: 70.83 };
  const SPEC = {
    model: "VH-3600",
    rows: [
      ["Type", "3LCD, 210 W UHE lamp"], ["Brightness", "3,600 lumens, white and colour"], ["Resolution", "XGA, 1024 × 768"],
      ["Panels", "3 × 0.55 in HTPS"], ["Lens", "1.2× zoom, F1.49–1.72"], ["Lamp life", "6,000 h (12,000 h eco)"],
      ["Connections", "HDMI, 2 × VGA in, VGA out, LAN, RS-232C, USB, audio"], ["Price", "£425 inc VAT (£354.17 ex VAT)"],
    ],
  };
  // the steps of the light path; parts lists the item numbers each step uses
  const PATH = [
    { t: "Make light", d: "The lamp's arc makes white light. The parabolic reflector sends it forward as a beam, through a safety glass that cuts ultraviolet.", parts: [1, 2, 4] },
    { t: "Even it out", d: "Two fly's-eye arrays chop the beam into dozens of small beams and overlap them, so every corner of the panels gets the same light.", parts: [7, 8, 10] },
    { t: "Line it up", d: "LCD panels only use one polarisation. The converter turns the other half round instead of wasting it.", parts: [9] },
    { t: "Split the colours", d: "Two dichroic mirrors split the white light into blue, green and red. Red takes the longest route, so relay lenses keep its beam from spreading.", parts: [11, 12, 13, 14] },
    { t: "Make the picture", d: "Each colour passes through a polariser, an LCD panel and a second polariser. The voltage on each pixel decides how much light gets through.", parts: [15, 16, 17, 18] },
    { t: "Put it back together", d: "The X-cube prism recombines the three images into one full-colour picture.", parts: [19] },
    { t: "Throw it on the wall", d: "The zoom lens enlarges the picture onto the screen, and the fans carry the heat away.", parts: [21, 22, 23, 24] },
  ];
  const SOURCES = [
    ["Should-cost and VAVE engineering report for a comparable 3,600-lumen XGA 3LCD projector (200,000 a year, tier-1 EMS, Shenzhen): the source of every report line and idea", null],
    ["How 3LCD works (Epson)", "https://corporate-origin.epson.biz/en/technology/overview/projector/3lcd.html"],
    ["Colour separation with a relay path (patent US6886945)", "https://patents.google.com/patent/US6886945"],
    ["Polarisation conversion and integrator optics (patent US6927910)", "https://patents.google.com/patent/US6927910"],
    ["Street price of comparable projectors in the UK (PriceRunner)", "https://www.pricerunner.com/pl/98-3202808310/Projectors/Epson-EB-X49-Compare-Prices"],
    ["Cross-check: bare 200 W UHE lamp in its reflector, $9 each at 50+ (Alibaba)", "https://www.alibaba.com/product-detail/V13H010L67-ELPLP67-Projector-Lamp-Bulb-KR85_1600923110743.html"],
    ["Cross-check: X-cube prisms, $2.50–6 (Alibaba)", "https://www.alibaba.com/product-detail/RGB-optical-dichroic-x-cube-prism_60828381068.html"],
    ["Cross-check: replacement lamp ELPLP97, UK retail", "https://shop.teqex.co.uk/epson-elplp97-projector-lamp-uhe-v13h010l97.html"],
  ];
  // ── the value study ──
  // FAST functions. alloc: each part's cost (by item number, £) shared out among the functions it performs; the shares add up
  // exactly to the parts total. kind: higher | basic | path | assumed (the input, outside scope) | when (caused by, or at the same
  // time as, the function above it) | unwanted | all (all-time) | one (one-time) | esteem | user | second (a second answer to HOW
  // for the higher-order function). col and row place the box on the FAST diagram.
  const FUNCS = [
    { id: "comm", fn: "Communicate information", kind: "higher", alloc: {}, col: 0, row: "P" },
    { id: "proj", fn: "Project image", kind: "basic", alloc: {}, col: 1, row: "P" },
    { id: "mag", fn: "Magnify image", kind: "path", alloc: { 21: 7.30 }, col: 2, row: "P" },
    { id: "comb", fn: "Combine images", kind: "path", alloc: { 19: 5.80 }, col: 3, row: "P" },
    { id: "mod", fn: "Modulate light", kind: "path", alloc: { 16: 24.60, 17: 1.45, 18: 1.45 }, col: 4, row: "P" },
    { id: "pol", fn: "Polarise light", kind: "path", alloc: { 9: 1.24 }, col: 5, row: "P" },
    { id: "gen", fn: "Generate light", kind: "path", alloc: { 1: 4.60, 2: 2.40, 3: 1.40 }, col: 6, row: "P" },
    { id: "reg", fn: "Regulate power", kind: "path", alloc: { 29: 3.00 }, col: 7, row: "P" },
    { id: "volt", fn: "Convert voltage", kind: "path", alloc: { 28: 5.00 }, col: 8, row: "P" },
    { id: "rpow", fn: "Receive power", kind: "path", alloc: { 30: 0.20, 48: 1.10 }, col: 9, row: "P" },
    { id: "supply", fn: "Supply power", kind: "assumed", alloc: {}, col: 10, row: "P", note: "The building's mains: outside the study" },
    { id: "snd", fn: "Emit sound", kind: "second", alloc: { 35: 0.85, 31: 0.45 }, col: 1, row: "W2" },
    { id: "focus", fn: "Focus image", kind: "second", alloc: { 21: 1.00 }, col: 2, row: "W1" },
    { id: "sep", fn: "Separate wavelengths", kind: "second", alloc: { 11: 0.40, 12: 0.40, 13: 0.36, 14: 0.40 }, col: 5, row: "W1" },
    { id: "hom", fn: "Homogenise light", kind: "second", alloc: { 7: 0.55, 8: 0.55, 10: 0.25, 15: 0.45 }, col: 5, row: "W2" },
    { id: "sig", fn: "Process signal", kind: "when", alloc: { 31: 13.00, 37: 0.20 }, col: 4, row: "W3" },
    { id: "rcv", fn: "Receive signal", kind: "when", alloc: { 32: 3.40, 31: 0.55, 48: 1.05 }, col: 5, row: "W3" },
    { id: "gint", fn: "Generate interference", kind: "unwanted", alloc: {}, col: 4, row: "W4", note: "From the video chip, and from the power supply and ballast too" },
    { id: "emc", fn: "Suppress interference", kind: "when", alloc: { 46: 0.45, 37: 0.20, 28: 0.60 }, col: 5, row: "W4" },
    { id: "ign", fn: "Ignite arc", kind: "when", alloc: { 29: 1.70 }, col: 6, row: "W1" },
    { id: "gheat", fn: "Generate heat", kind: "unwanted", alloc: {}, col: 6, row: "W2", note: "Mostly from the lamp; also the panels, polarisers, power supply and ballast" },
    { id: "guv", fn: "Emit UV", kind: "unwanted", alloc: {}, col: 6, row: "W4" },
    { id: "heat", fn: "Remove heat", kind: "when", alloc: { 22: 1.05, 23: 1.05, 24: 1.05, 25: 0.40, 27: 0.09, 6: 0.15 }, col: 7, row: "W2" },
    { id: "dust", fn: "Trap dust", kind: "when", alloc: { 26: 0.55 }, col: 7, row: "W3" },
    { id: "uv", fn: "Block UV", kind: "when", alloc: { 4: 0.30 }, col: 7, row: "W4" },
    { id: "noise", fn: "Generate noise", kind: "unwanted", alloc: {}, col: 8, row: "W2" },
    { id: "energy", fn: "Consume energy", kind: "unwanted", alloc: {}, col: 9, row: "W1", note: "An operating cost, not in the parts: about £400 over five years (5,700 h × 0.28 kW × 25p)" },
    { id: "encl", fn: "Enclose components", kind: "all", alloc: { 38: 1.90, 39: 1.05 }, col: 2, row: "A" },
    { id: "loc", fn: "Locate components", kind: "all", alloc: { 20: 1.85, 45: 0.35 }, col: 3, row: "A" },
    { id: "sup", fn: "Support weight", kind: "all", alloc: { 39: 1.05, 43: 0.08 }, col: 4, row: "A" },
    { id: "fast", fn: "Fasten components", kind: "all", alloc: { 44: 0.35 }, col: 5, row: "A" },
    { id: "frag", fn: "Contain fragments", kind: "all", alloc: { 4: 0.70 }, col: 6, row: "A" },
    { id: "app", fn: "Enhance appearance", kind: "esteem", alloc: { 40: 0.60, 38: 0.20 }, col: 7, row: "A" },
    { id: "cmd", fn: "Accept commands", kind: "user", alloc: { 33: 0.75, 34: 0.20, 47: 1.45 }, col: 2, row: "B" },
    { id: "mute", fn: "Interrupt image", kind: "user", alloc: { 41: 0.45 }, col: 3, row: "B" },
    { id: "angle", fn: "Adjust angle", kind: "one", alloc: { 42: 0.25 }, col: 4, row: "B" },
    { id: "instr", fn: "Convey instructions", kind: "one", alloc: { 49: 0.28 }, col: 5, row: "B" },
    { id: "expose", fn: "Expose lamp", kind: "one", alloc: { 5: 0.25 }, col: 6, row: "B" },
    { id: "intr", fn: "Interrupt power", kind: "one", alloc: { 36: 0.15 }, col: 7, row: "B" },
    { id: "shock", fn: "Absorb shock", kind: "one", alloc: { 50: 2.30 }, col: 8, row: "B" },
  ];
  FUNCS.forEach((f) => (f.cost = Math.round(Object.values(f.alloc).reduce((a, b) => a + b, 0) * 100) / 100));
  // links besides the critical path: how (an answer to "how?"; several in one column form an AND), when (at the same time, drawn
  // vertically), cause (a function that brings an unwanted one with it, or exists because of one)
  const FLINKS = [["comm", "snd", "how"], ["proj", "focus", "how"], ["mod", "sep", "how"], ["mod", "hom", "how"], ["mod", "sig", "when"], ["sig", "rcv", "how"],
    ["sig", "gint", "cause"], ["gint", "emc", "cause"], ["gen", "ign", "when"], ["gen", "gheat", "cause"], ["gen", "guv", "cause"], ["gheat", "heat", "cause"],
    ["heat", "dust", "cause"], ["heat", "noise", "cause"], ["guv", "uv", "cause"], ["rpow", "energy", "cause"], ["expose", "intr", "when"]];
  // requirements the design must meet: shown on the FAST diagram, but they're criteria, not functions
  const CRITERIA = ["3,600 lumens, white and colour", "XGA, 1024 × 768", "Lamp life 6,000 h (12,000 h eco)", "Panels converged to 2 µm", "Fan noise 37 dB(A) or less", "Safety: IEC 62368-1", "EMC: EN 55032 and EN 55035", "Retail price £425 inc VAT"];
  const OBJECTIVE = "Take at least 10% (£14.27) off the £142.70 landed cost, with every design criterion still met";
  // the team's paired comparison of what matters to the customer (Mudge's method: for each pair, the more important
  // function and by how much: 1 a little, 2 clearly, 3 a lot)
  const PAIRED = {
    fns: ["gen", "mod", "mag", "comb", "sig", "rcv", "heat", "cmd", "snd", "encl"],
    why: { gen: "a bright picture in a lit classroom", mod: "a sharp, accurate picture", mag: "a big picture, in focus", comb: "colours that line up", sig: "a clean picture from any source",
      rcv: "plugs straight into a laptop", heat: "quiet, reliable, long lamp life", cmd: "easy to set up and use", snd: "sound for a small room", encl: "survives a school" },
    pairs: [["gen", "mod", "gen", 1], ["gen", "mag", "gen", 1], ["gen", "comb", "gen", 2], ["gen", "sig", "gen", 2], ["gen", "rcv", "gen", 1], ["gen", "heat", "gen", 2], ["gen", "cmd", "gen", 2], ["gen", "snd", "gen", 3], ["gen", "encl", "gen", 2],
      ["mod", "mag", "mod", 1], ["mod", "comb", "mod", 1], ["mod", "sig", "mod", 2], ["mod", "rcv", "mod", 1], ["mod", "heat", "mod", 1], ["mod", "cmd", "mod", 2], ["mod", "snd", "mod", 2], ["mod", "encl", "mod", 2],
      ["mag", "comb", "mag", 1], ["mag", "sig", "mag", 1], ["mag", "rcv", "mag", 1], ["mag", "heat", "mag", 1], ["mag", "cmd", "mag", 1], ["mag", "snd", "mag", 2], ["mag", "encl", "mag", 2],
      ["comb", "sig", "sig", 1], ["comb", "rcv", "rcv", 1], ["comb", "heat", "heat", 1], ["comb", "cmd", "cmd", 1], ["comb", "snd", "comb", 1], ["comb", "encl", "encl", 1],
      ["sig", "rcv", "rcv", 1], ["sig", "heat", "heat", 1], ["sig", "cmd", "cmd", 1], ["sig", "snd", "sig", 1], ["sig", "encl", "sig", 1],
      ["rcv", "heat", "rcv", 1], ["rcv", "cmd", "rcv", 1], ["rcv", "snd", "rcv", 2], ["rcv", "encl", "rcv", 1],
      ["heat", "cmd", "heat", 1], ["heat", "snd", "heat", 2], ["heat", "encl", "heat", 1],
      ["cmd", "snd", "cmd", 1], ["cmd", "encl", "cmd", 1], ["snd", "encl", "snd", 1]],
  };

  // the report's 20 VAVE ideas, plus four more from the creative session (H1–H4).
  // f: saving by function (£); proc: saving in the factory process; frt: saving in freight; parts: item numbers it changes.
  // h: horizon; nre: one-off engineering and tooling cost (£k); wave: the report's implementation wave
  const IDEAS = [
    { id: "V01", t: "Drop the legacy ports", d: "Remove the second VGA input, VGA out, RS-232C, RCA and two of the three audio jacks. Keep HDMI, one VGA, LAN, USB and one audio jack. The analogue video buffers, the RS-232 chip and four wave-soldered connectors go, and the board shrinks by 22%.", f: { rcv: 2.40, sig: 1.40 }, parts: [32, 31], tech: "Function analysis: functions few customers use", cat: "Design", h: "Short (3–6 months)", nre: 35, risk: "Low", wave: 2 },
    { id: "V02", t: "Main board from 6 layers to 4", d: "With the ports gone, re-lay the main board as 4 layers, 135 × 100 mm with an OSP finish, instead of 6 layers, 165 × 115 mm with ENIG. 34% more boards per laminate sheet.", f: { sig: 1.45 }, parts: [31], tech: "Follow-on from V01", cat: "Design", h: "Short (4–6 months)", nre: 28, risk: "Low", wave: 2 },
    { id: "V03", t: "One board for power and ballast", d: "Put the 330 W power supply (£5.60) and the 210 W lamp ballast (£4.70) on one board, sharing one mains filter, one PFC controller, one heatsink and one steel carrier.", f: { volt: 1.10, reg: 1.00 }, parts: [28, 29], tech: "SCAMPER: combine", cat: "Design", h: "Medium (6–9 months)", nre: 65, risk: "Medium", wave: 3 },
    { id: "V04", t: "Plastic aspheres in the zoom lens", d: "Replace two ground-glass elements in the six-element lens with moulded COC aspheres. The lens is 28% lighter and needs less grinding and polishing.", f: { mag: 1.35 }, parts: [21], tech: "SCAMPER: substitute", cat: "Material", h: "Medium (9–12 months)", nre: 90, risk: "Medium", wave: 4 },
    { id: "V05", t: "Organic polarisers where it's cooler", d: "Use stretched-dye organic polarisers on float glass for the red and blue entrance polarisers, where the light and heat load are lower than on green. Green and all exit polarisers stay inorganic.", f: { mod: 1.15 }, parts: [17], tech: "Fit the specification to the need", cat: "Material", h: "Medium (6–9 months)", nre: 20, risk: "Low to medium", wave: 3 },
    { id: "V06", t: "Local optical glass", d: "Qualify Chinese optical glass makers for the fly's-eye arrays, relay lenses and lamp reflector instead of imported Japanese blanks: 17% less material cost on the illumination path.", f: { gen: 0.60, hom: 0.60, sep: 0.40 }, parts: [2, 7, 8, 14], tech: "Supplier benchmarking", cat: "Commercial", h: "Medium (6–12 months)", nre: 45, risk: "Medium", wave: 4 },
    { id: "V07", t: "Thinner case walls, 15% recycled resin", d: "Walls from 2.4 to 2.0 mm, stiffened with ribs checked by mould-flow analysis, in PC/ABS with 15% post-consumer recycled content. 680 g down to 565 g; the press cycle drops from 42 s to 34 s.", f: { encl: 0.95 }, parts: [38, 39], tech: "Design for manufacture", cat: "Material", h: "Short (3–6 months)", nre: 30, risk: "Low", wave: 2 },
    { id: "V08", t: "Two fans instead of three", d: "Redesign the intake air path with CFD so one high-flow axial fan and the lamp blower do the job of three fans. Saves a fan, its harness and four screws.", f: { heat: 1.10 }, parts: [22, 23, 24, 25], tech: "CFD and TRIZ: merging", cat: "Design", h: "Medium (6–9 months)", nre: 40, risk: "Medium", wave: 3 },
    { id: "V09", t: "Snap fits and no board cage", d: "Mould the main board supports into the bottom case, drop the steel board cage, and turn 22 of the 38 screws and inserts into snap fits. 4.5 minutes less assembly a projector.", f: { loc: 0.35, fast: 0.30 }, proc: 0.60, parts: [45, 44, 39], tech: "Design for assembly", cat: "Design", h: "Medium (6–9 months)", nre: 50, risk: "Low", wave: 3 },
    { id: "V10", t: "No VGA cable, moulded pulp packaging", d: "Leave out the 1.8 m VGA cable (£1.05), unused in over 90% of HDMI installations, and swap the foam end-caps for recycled moulded pulp (£0.50). The carton is 14% smaller, so 1,310 fit in a 40 ft container (£0.30 off freight).", f: { rcv: 1.05, shock: 0.50 }, frt: 0.30, parts: [48, 50], tech: "Voice of the customer", cat: "Design", h: "Immediate (0–3 months)", nre: 12, risk: "Very low", wave: 1 },
    { id: "V11", t: "UV tack, then batch cure", d: "Fix each aligned panel with a 5-second UV flash on the alignment rig, then cure in batches off the rig. Alignment drops from 180 s to 105 s and the clean room handles 71% more.", proc: 0.85, parts: [16, 19], tech: "TRIZ: preliminary action", cat: "Process", h: "Medium (6–9 months)", nre: 35, risk: "Low to medium", wave: 3 },
    { id: "V12", t: "Burn-in from 45 to 20 minutes", d: "Watch each projector with thermal imaging and automatic checks in its first 15 minutes, and replace the fixed 45-minute burn-in with a 20-minute stress test.", proc: 0.90, parts: [], tech: "Process data", cat: "Process", h: "Short (3–6 months)", nre: 18, risk: "Low", wave: 2 },
    { id: "V13", t: "Video chip with memory built in", d: "Move to a 28 nm display chip with its DDR3 memory in the same package and the LAN interface on chip. Two packages and 28 high-speed memory traces go.", f: { sig: 1.15, rcv: 0.25 }, parts: [31], tech: "Technology scan", cat: "Design", h: "Long (9–14 months)", nre: 85, risk: "Medium", wave: 4 },
    { id: "V14", t: "Cheaper resin where the light pipe runs cool", d: "Only the lamp end of the light pipe goes above 165 °C. Mould the cooler lens and prism end in glass-filled PET/PPA, 32% cheaper per kilo than PPS-GF40.", f: { loc: 0.75 }, parts: [20], tech: "TRIZ: local quality", cat: "Material", h: "Medium (6–9 months)", nre: 38, risk: "Low to medium", wave: 3 },
    { id: "V15", t: "One IR receiver, touch keys", d: "Delete the rear IR board, its harness and the tactile switches. Use capacitive touch keys on a single-sided board, with a light guide feeding one front IR receiver.", f: { cmd: 0.55 }, parts: [33, 34], tech: "SCAMPER: eliminate and combine", cat: "Design", h: "Short (3–5 months)", nre: 14, risk: "Very low", wave: 2 },
    { id: "V16", t: "Spread-spectrum clocks instead of shielding", d: "Turn on spread-spectrum clocking in the video chip and panel timing firmware. Peak emissions fall by about 6 dBµV, so three clip-on ferrites and the I/O EMI shield can go.", f: { emc: 0.65 }, parts: [37, 46], tech: "Firmware instead of hardware", cat: "Design", h: "Short (2–4 months)", nre: 15, risk: "Low", wave: 1 },
    { id: "V17", t: "Flat cables and board-to-board docking", d: "Replace hand-crimped harnesses between the power board, main board and keypad with machine-made flat flexible cables and a blind-mate board-to-board header. Saves 90 seconds of plugging.", f: { sig: 0.15 }, proc: 0.30, parts: [37, 30], tech: "Design for assembly", cat: "Design", h: "Medium (5–8 months)", nre: 22, risk: "Low", wave: 3 },
    { id: "V18", t: "A simpler lens shutter", d: "Turn the multi-part A/V mute shutter, with its Hall sensor and detent rails, into a two-piece friction slider read by an optical sensor on the main board edge.", f: { mute: 0.40, sig: 0.10 }, parts: [41], tech: "SCAMPER: eliminate", cat: "Design", h: "Short (4–6 months)", nre: 16, risk: "Low", wave: 2 },
    { id: "V19", t: "QR manual and a 1.2 m mains cord", d: "Replace the printed manuals and warranty pack (£0.28) with one A5 safety sheet and a QR code. Shorten the UK mains cord from 1.8 m to 1.2 m (£0.32 of copper and PVC).", f: { instr: 0.28, rpow: 0.32 }, parts: [49, 48], tech: "Voice of the customer", cat: "Design", h: "Immediate (0–2 months)", nre: 4, risk: "Very low", wave: 1 },
    { id: "V20", t: "Vendor-managed stock and prism recovery", d: "Put glass, board and resin suppliers on vendor-managed stock with 60-day consignment at the factory, and recover X-cube prisms (£5.80) from failed alignments by ultrasonic debonding: 0.8% less net scrap.", proc: 1.40, parts: [19], tech: "Supply chain", cat: "Commercial", h: "Short (3–6 months)", nre: 25, risk: "Low", wave: 2 },
    { id: "H1", t: "Eco mode as the factory setting", d: "Ship in eco mode: about a quarter less power and twice the lamp life (12,000 hours). No saving for the maker, a large one for the school.", parts: [1, 29], tech: "Voice of the customer (phase 1 lifetime cost)", cat: "Customer", h: "Immediate", nre: 0, risk: "Very low", extra: "accept" },
    { id: "H2", t: "Laser-phosphor light source", d: "Replace the lamp and ballast (£14.10) with a laser-phosphor engine (£27.60): +£13.50 a projector. No lamp changes or lamp warranty claims, and a retail premium of £90 or more.", parts: [1, 2, 3, 4, 29], tech: "Technology scan", cat: "Design", h: "Next platform", extra: "park", add: 13.50 },
    { id: "H3", t: "Single-chip DLP instead of 3LCD", d: "One DMD chip, a colour wheel and a TIR prism instead of three panels, the X-cube and six polarisers. It lands £9.65 cheaper, but gives only about 1,400 colour lumens against 3,600.", parts: [16, 17, 18, 19], tech: "Competitor benchmark", cat: "Design", h: "Platform change", extra: "reject", save: 9.65 },
    { id: "H4", t: "Remove the built-in speaker", d: "Saves most of the £0.85 speaker, but teachers in small rooms rely on it.", parts: [35], tech: "SCAMPER: eliminate", cat: "Design", h: "Short", extra: "drop", save: 0.85 },
  ];
  IDEAS.forEach((x) => { if (x.extra) return; x.save = Math.round((Object.values(x.f || {}).reduce((a, b) => a + b, 0) + (x.proc || 0) + (x.frt || 0)) * 100) / 100; });

  // the report's factory audit, tooling, volume sensitivity and DLP benchmark (sections 8, 9, 11 and 12)
  const PROCESS = [
    ["SMT and wave solder", "2-lane SMT, optical inspection, selective wave solder for the ports", 4, 3.8, 0.27, 0.68],
    ["Optical sub-assembly", "Clean room: lens barrel, fly's-eye arrays, PBS and mirror mounts", 6, 6.5, 0.61, 0.49],
    ["Panel-on-prism alignment", "Four 6-axis camera rigs align each panel to under 2 µm, then UV bond", 4, 3.0, 0.56, 1.44],
    ["Chassis assembly", "14 stations: bottom case, power and ballast, engine, fans, main board", 14, 15.2, 1.06, 0.29],
    ["Close and safety test", "4 stations: top cover, hi-pot and earth test", 4, 4.2, 0.29, 0.11],
    ["Burn-in", "120-slot rack, 45 minutes at 35 °C", 2, 45.0, 0.18, 0.67],
    ["Dark-room optical check", "9-point brightness, convergence, colour tables", 4, 4.5, 0.42, 0.73],
    ["Pack-out", "Wipe, accessory scan, weight check, box", 4, 2.8, 0.20, 0.10],
  ];
  const TOOLING = [
    ["Top case mould", "FR PC/ABS, 340 g shot, 800 t press, textured", 95], ["Bottom case mould", "FR PC/ABS, 340 g shot, 800 t press, side cores", 105],
    ["Light pipe mould", "PPS-GF40, 210 g, 350 t press", 135], ["Zoom lens barrel and cam", "PC-GF30, 3 tool sets", 140],
    ["Eight secondary moulds", "Lamp cover, filter grille, shutter, rings, foot, remote", 165], ["Sheet metal dies", "Progressive dies for the cage, I/O plate and brackets", 75],
  ];
  const SENS = [[50000, 113.05, 8.80, 27.45, 149.30, 160.10, 135.45], [100000, 108.40, 4.40, 26.15, 138.95, 149.15, 124.50], [200000, 104.00, 2.20, 25.40, 131.60, 141.50, 116.85],
    [350000, 100.60, 1.26, 24.54, 126.40, 136.05, 111.40], [500000, 98.45, 0.88, 24.02, 123.35, 132.85, 108.20]];
  const DLP = [
    ["Imager and colour", "3 HTPS panels £24.60, X-cube £5.80, 6 polarisers £2.90 = £33.30", "One 0.55-inch DMD £16.80, 6-segment colour wheel £4.90, TIR prism £3.40 = £25.10", 8.20],
    ["Light source", "210 W lamp and ballast £14.10, equal white and colour brightness", "240 W lamp and ballast £15.40, needed to match white brightness", -1.30],
    ["Alignment", "6-axis panel convergence £3.10", "Single DMD socket and colour wheel timing £1.45", 1.65],
  ];
  REPORT.ddpDlp = 131.85; REPORT.coreSave = 18.35; REPORT.allSave = 24.65; REPORT.toolTotal = 880;

  window.VH_PROJ = { subs: SUBS, lines: LINES, groups: G, parts: P, chain: CHAIN, report: REPORT, spec: SPEC, path: PATH, sources: SOURCES,
    funcs: FUNCS, flinks: FLINKS, criteria: CRITERIA, objective: OBJECTIVE, paired: PAIRED, ideas: IDEAS, process: PROCESS, tooling: TOOLING, sens: SENS, dlp: DLP };
})();
