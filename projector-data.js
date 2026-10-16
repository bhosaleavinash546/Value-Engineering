/* VAVEhub · worked case study: the VH-3600 classroom 3LCD projector.
   One list of parts drives the 3D model, the bill of materials and (later) the function analysis.
   Costs are should-cost estimates in GBP per unit, as ranges [lo, hi], for a large maker buying parts on
   the open market: 2025/26 prices, about 500,000 projectors a year, assembled in the Philippines or China,
   £1 = $1.30. They are built from volume price evidence (wholesale listings at volume tiers, makers'
   filings, resin and labour rates), not from retail spares, which sell for 5–10 times as much.
   LCD panels and the zoom lens have no public volume price, so they are modelled from wafer and glass costs. */
(function () {
  const G = [
    { id: "light", name: "Light source", note: "Makes the light: a high-pressure lamp in a reflector" },
    { id: "illum", name: "Illumination optics", note: "Evens out the light and turns it all one polarisation" },
    { id: "split", name: "Colour separation and relay", note: "Splits white light into red, green and blue" },
    { id: "image", name: "Image engine", note: "Three LCD panels make the picture; a prism recombines it" },
    { id: "lens", name: "Projection lens", note: "Enlarges the image onto the screen" },
    { id: "cool", name: "Cooling", note: "Moves heat out of the lamp, panels and power supply" },
    { id: "power", name: "Power", note: "Turns mains into the voltages the lamp and boards need" },
    { id: "elec", name: "Electronics and controls", note: "Takes the video in and drives the three panels" },
    { id: "house", name: "Housing", note: "Holds, protects and presents everything" },
    { id: "acc", name: "Accessories and packaging", note: "What else is in the box" },
  ];
  // n: BOM item number (also the balloon number in the exploded view)
  // fn: the part's main function, as a verb and a noun
  const P = [
    { n: 1, id: "burner", g: "light", name: "UHE lamp burner, 210 W", fn: "Generate light", q: 1, mat: "Quartz arc tube, tungsten electrodes, mercury fill (bought sealed into the reflector)", c: [2.7, 4.6] },
    { n: 2, id: "reflector", g: "light", name: "Ellipsoidal reflector", fn: "Collect light", q: 1, mat: "Pressed hard glass, dichroic cold-mirror coating", c: [1.15, 2.3] },
    { n: 3, id: "cage", g: "light", name: "Lamp cage and connector", fn: "Locate lamp", q: 1, mat: "Die-cast aluminium frame, PPS insulator", c: [0.6, 1.15] },
    { n: 4, id: "uvir", g: "light", name: "UV/IR cut filter", fn: "Filter UV", q: 1, mat: "Glass with thin-film coating", c: [0.25, 0.55] },
    { n: 5, id: "lampdoor", g: "light", name: "Lamp cover", fn: "Allow access", q: 1, mat: "Moulded PC/ABS", c: [0.12, 0.27] },

    { n: 6, id: "fly1", g: "illum", name: "Fly's-eye lens array 1", fn: "Divide beam", q: 1, mat: "Moulded glass lens array", c: [0.4, 0.77] },
    { n: 7, id: "fly2", g: "illum", name: "Fly's-eye lens array 2", fn: "Distribute light", q: 1, mat: "Moulded glass lens array", c: [0.4, 0.77] },
    { n: 8, id: "pbs", g: "illum", name: "Polarisation conversion array", fn: "Polarise light", q: 1, mat: "Glass prism strips, half-wave film", c: [0.77, 1.54] },
    { n: 9, id: "cond", g: "illum", name: "Superposition lens", fn: "Overlap beams", q: 1, mat: "Glass lens", c: [0.25, 0.6] },

    { n: 10, id: "dm1", g: "split", name: "Dichroic mirror (blue)", fn: "Separate blue", q: 1, mat: "Glass with dichroic coating", c: [0.2, 0.46] },
    { n: 11, id: "dm2", g: "split", name: "Dichroic mirror (green)", fn: "Separate green", q: 1, mat: "Glass with dichroic coating", c: [0.2, 0.46] },
    { n: 12, id: "fold", g: "split", name: "Fold mirrors", fn: "Redirect light", q: 3, mat: "Aluminised glass", c: [0.12, 0.3] },
    { n: 13, id: "relay", g: "split", name: "Relay lenses", fn: "Relay light", q: 2, mat: "Glass lens", c: [0.25, 0.6] },
    { n: 14, id: "field", g: "split", name: "Field lenses", fn: "Converge light", q: 3, mat: "Glass lens", c: [0.15, 0.4] },

    { n: 15, id: "lcd", g: "image", name: "HTPS LCD panels (0.63 in)", fn: "Modulate light", q: 3, mat: "Polysilicon TFT on quartz, liquid crystal, flex cable", c: [6.2, 10.8] },
    { n: 16, id: "polin", g: "image", name: "Input polarisers", fn: "Polarise light", q: 3, mat: "Polariser on glass", c: [0.23, 0.6] },
    { n: 17, id: "polout", g: "image", name: "Output polarisers", fn: "Block light", q: 3, mat: "Polariser on glass, with compensator film", c: [0.4, 0.9] },
    { n: 18, id: "prism", g: "image", name: "X-cube dichroic prism", fn: "Combine colours", q: 1, mat: "Four bonded glass prisms, dichroic coatings", c: [1.55, 2.7] },
    { n: 19, id: "frame", g: "image", name: "Optical engine frame", fn: "Align optics", q: 1, mat: "Die-cast magnesium or glass-filled resin", c: [1.15, 2.7] },

    { n: 20, id: "lens", g: "lens", name: "Projection lens, 1.2× zoom", fn: "Enlarge image", q: 1, mat: "About 12 glass elements in a plastic barrel", c: [5.4, 9.2] },

    { n: 21, id: "blower", g: "cool", name: "Panel cooling blower", fn: "Cool panels", q: 1, mat: "Sirocco fan, brushless DC motor", c: [0.6, 1.25] },
    { n: 22, id: "lampfan", g: "cool", name: "Lamp blower", fn: "Cool lamp", q: 1, mat: "Small sirocco fan", c: [0.45, 0.9] },
    { n: 23, id: "exhaust", g: "cool", name: "Exhaust fan, 80 mm", fn: "Remove heat", q: 1, mat: "Axial fan, brushless DC motor", c: [0.45, 0.9] },
    { n: 24, id: "ducts", g: "cool", name: "Air ducts", fn: "Direct air", q: 1, mat: "Moulded polypropylene", c: [0.25, 0.6] },
    { n: 25, id: "filter", g: "cool", name: "Intake air filter", fn: "Filter dust", q: 1, mat: "Foam pad in a moulded frame", c: [0.08, 0.25] },
    { n: 26, id: "therm", g: "cool", name: "Thermistors", fn: "Sense temperature", q: 3, mat: "NTC thermistor on leads", c: [0.02, 0.04] },

    { n: 27, id: "psu", g: "power", name: "Power supply and lamp ballast", fn: "Convert power", q: 1, mat: "PCB: power-factor correction, DC-DC, ballast and igniter", c: [7.7, 13.1] },
    { n: 28, id: "inlet", g: "power", name: "Mains inlet and fuse", fn: "Connect mains", q: 1, mat: "IEC C14 inlet with fuse holder", c: [0.15, 0.4] },

    { n: 29, id: "main", g: "elec", name: "Main board", fn: "Process signal", q: 1, mat: "6-layer PCB: video processor, MCU, DDR memory, flash, panel drivers", c: [5.4, 9.2] },
    { n: 30, id: "io", g: "elec", name: "Input/output board", fn: "Receive signal", q: 1, mat: "PCB with HDMI, VGA, USB, RS-232 and audio sockets", c: [0.77, 1.9] },
    { n: 31, id: "keypad", g: "elec", name: "Control panel", fn: "Enable control", q: 1, mat: "PCB, rubber keys, moulded cap", c: [0.23, 0.46] },
    { n: 32, id: "ir", g: "elec", name: "IR receivers", fn: "Receive commands", q: 2, mat: "IR receiver module", c: [0.03, 0.06] },
    { n: 33, id: "speaker", g: "elec", name: "Speaker, 2 W", fn: "Emit sound", q: 1, mat: "Moving-coil speaker", c: [0.2, 0.4] },
    { n: 34, id: "interlock", g: "elec", name: "Lamp cover interlock switch", fn: "Protect user", q: 1, mat: "Micro switch", c: [0.06, 0.15] },
    { n: 35, id: "harness", g: "elec", name: "Cables and harness", fn: "Conduct signals", q: 1, mat: "Wire harness and flat flexible cables", c: [0.6, 1.4] },

    { n: 36, id: "top", g: "house", name: "Top cover", fn: "Enclose components", q: 1, mat: "PC/ABS, flame retardant (UL94 V-0), textured", c: [1.15, 2.0] },
    { n: 37, id: "bottom", g: "house", name: "Bottom case", fn: "Support components", q: 1, mat: "PC/ABS, flame retardant (UL94 V-0)", c: [1.15, 2.0] },
    { n: 38, id: "bezel", g: "house", name: "Front bezel", fn: "Attract buyer", q: 1, mat: "PC/ABS, gloss finish", c: [0.3, 0.7] },
    { n: 39, id: "lenscover", g: "house", name: "Sliding lens cover", fn: "Protect lens", q: 1, mat: "Moulded PC", c: [0.08, 0.25] },
    { n: 40, id: "feet", g: "house", name: "Adjustable feet", fn: "Level image", q: 3, mat: "Moulded PC with screw thread", c: [0.05, 0.15] },
    { n: 41, id: "screws", g: "house", name: "Screws", fn: "Fasten parts", q: 38, mat: "Steel, zinc plated", c: [0.004, 0.008] },

    { n: 42, id: "remote", g: "acc", name: "Remote control and batteries", fn: "Enable control", q: 1, mat: "ABS case, rubber keypad, 2 × AAA", c: [0.5, 0.9] },
    { n: 43, id: "cables", g: "acc", name: "Power cord and VGA cable", fn: "Connect power", q: 1, mat: "PVC cable, moulded plugs", c: [1.1, 1.8] },
    { n: 44, id: "docs", g: "acc", name: "Quick-start guide and labels", fn: "Inform user", q: 1, mat: "Printed paper", c: [0.08, 0.25] },
    { n: 45, id: "carton", g: "acc", name: "Carton and moulded pulp", fn: "Protect product", q: 1, mat: "Corrugated board, moulded pulp", c: [0.75, 1.45], hidden3d: true },
  ];
  // what it costs to turn the parts into a finished, delivered projector
  const ADD = [
    { name: "Assembly, optical alignment and test (with line overheads)", c: [3, 7] },
    { name: "Sea freight to the UK and landing", c: [1.2, 2.7] },
    { name: "Warranty provision", c: [3, 7.5] },
  ];
  // from landed cost to the shop price (a £375 ex VAT street price, as for Epson's EB-X49 and EB-E20)
  const PRICE = {
    street: 375, vat: 75,
    channel: 86,  // distributor (specialist AV, about 18% gross) and reseller (10–20%): about 23% of street price
    note: "Channel share from published margins: Midwich (UK AV distributor) 17.8% gross margin in 2024; UK resellers 10–20% on projectors. The maker's share covers its overheads, R&D, sales, support and profit; Epson's projector segment made 14–16% profit in 2022–24.",
  };
  const SPEC = {
    model: "VH-3600",
    retailInc: 450, retailEx: 375,
    rows: [
      ["Type", "3LCD, lamp"], ["Brightness", "3,600 lumens"], ["Resolution", "XGA, 1024 × 768"],
      ["Lamp", "210 W UHE, 6,000 h (12,000 h eco)"], ["Lens", "1.2× manual zoom"], ["Weight", "2.7 kg"],
      ["Inputs", "HDMI, VGA, USB, RS-232"], ["Price", "£450 inc VAT (£375 ex VAT)"],
    ],
  };
  // the steps of the light path; parts lists the BOM items each step uses
  const PATH = [
    { t: "Make light", d: "The lamp's arc makes white light. The reflector gathers it into a beam, and a filter strips out ultraviolet and infrared.", parts: [1, 2, 4] },
    { t: "Even it out", d: "Two fly's-eye arrays chop the beam into dozens of small beams and overlap them, so every corner of the panels gets the same light.", parts: [6, 7, 9] },
    { t: "Line it up", d: "LCD panels only use one polarisation. The conversion array turns the other half round instead of wasting it.", parts: [8] },
    { t: "Split the colours", d: "Two dichroic mirrors split the white light into blue, green and red. Red takes the longest route, so relay lenses keep its beam from spreading.", parts: [10, 11, 12, 13] },
    { t: "Make the picture", d: "Each colour passes through a polariser, an LCD panel and a second polariser. The voltage on each pixel decides how much light gets through.", parts: [14, 15, 16, 17] },
    { t: "Put it back together", d: "The X-cube prism recombines the three images into one full-colour picture.", parts: [18] },
    { t: "Throw it on the wall", d: "The zoom lens enlarges the picture onto the screen, and the fans carry the heat away.", parts: [20, 21, 22, 23] },
  ];
  // price signals behind the estimates (spares and street prices are upper bounds on factory cost)
  const SOURCES = [
    ["How 3LCD works (Epson)", "https://corporate-origin.epson.biz/en/technology/overview/projector/3lcd.html"],
    ["Colour separation with a relay path (patent US6886945)", "https://patents.google.com/patent/US6886945"],
    ["Polarisation conversion and integrator optics (patent US6927910)", "https://patents.google.com/patent/US6927910"],
    ["Street price: Epson EB-X49 in the UK (PriceRunner)", "https://www.pricerunner.com/pl/98-3202808310/Projectors/Epson-EB-X49-Compare-Prices"],
    ["Street price: Epson EB-E20, ex VAT (Stone Group)", "https://stonegroup.co.uk/epson-eb-e20-3lcd-projector-portable-white-1tdspbpr-003464"],
    ["Complete Chinese 3LCD projectors, ex-factory (Alibaba)", "https://electronics.alibaba.com/product/lcd-projector"],
    ["Bare 200 W UHE lamp in its reflector: $9 each at 50+ (Alibaba)", "https://www.alibaba.com/product-detail/V13H010L67-ELPLP67-Projector-Lamp-Bulb-KR85_1600923110743.html"],
    ["X-cube prisms: $2.50–6 (Alibaba)", "https://www.alibaba.com/product-detail/RGB-optical-dichroic-x-cube-prism_60828381068.html"],
    ["Dichroic filters for projectors: $0.50–1 (Alibaba)", "https://www.alibaba.com/showroom/dichroic-glass-filter-for-projector.html"],
    ["Prism and lens maker supplying 3LCD: about $1 average per optical part (Lida Optical annual report 2018)", "http://static.cninfo.com.cn/finalpage/2019-04-13/1206014751.PDF"],
    ["Epson makes HTPS panels on 300 mm quartz wafers (Digitimes)", "https://www.digitimes.com/news/a20060914PR200.html"],
    ["Optical engine is about half of projector hardware cost (PjTime, in Chinese)", "http://www.pjtime.com/2021/11/131866137425.shtml"],
    ["TV main boards: $8–9.50 at volume (Alibaba)", "https://electronics.alibaba.com/product/chinese-tv-board"],
    ["50 mm blower fans: $1.20 at 10,000+ (Made-in-China)", "https://yccfan.en.made-in-china.com/product/mJBRyzLrajWP/China-2-Inch-50mm-50X50X15mm-12V-DC-Brushless-Mini-Air-Purifier-Blower-Fan-5015.html"],
    ["PC/ABS resin price (Guidechem)", "https://www.guidechem.com/price/jp/detail-dssmfr.html"],
    ["UK mains cords: $1.30 at 2,000+ (Global Sources)", "https://m.globalsources.com/AC-power/UK-plug-1213637476p.htm"],
    ["Warranty claims about 1.2–1.4% of sales (Warranty Week)", "https://www.warrantyweek.com/archive/ww20260416.html"],
    ["Distributor margin: Midwich full-year results 2024", "https://www.stockopedia.com/share-prices/midwich-LON:MIDW/news/full-year-results-019e69b3-6674-7026-8cd8-f5c7881776a3/"],
    ["Epson results: Visual Communications segment profit", "https://corporate.epson/en/investors/publications/financial-reports/2024/pdf/results_2024_full_e.pdf"],
  ];
  window.VH_PROJ = { groups: G, parts: P, add: ADD, price: PRICE, spec: SPEC, path: PATH, sources: SOURCES };
})();
