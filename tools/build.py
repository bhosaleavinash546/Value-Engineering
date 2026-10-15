#!/usr/bin/env python3
"""VAVEhub page generator.

Builds index.html and one page per playbook topic (/job-plan/, /cost-levers/, ...) from the
sources in src/. Shared nav + footer live once in src/partials; page content lives in
src/home/ and src/pages/. Output is plain static HTML — hosting is unchanged.

    python3 tools/build.py          # rebuild every page

Edit files in src/, then re-run. Do not hand-edit the generated index.html or */index.html.
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
SITE = "https://valueengineeringhub.com/"
UPDATED = "2026-10-15"
UPDATED_HUMAN = "15 October 2026"
PUBLISHED = "2026-07-04"
AUTHOR = "Avinash Bhosale"

# ── the playbook: order = previous/next order and homepage card order ──
PAGES = [
  dict(slug="job-plan", old="save", nav="Job Plan", short="The 6-Phase Job Plan",
       title="Value Engineering Job Plan: The 6 Phases Explained",
       desc="The value engineering job plan step by step: the six phases from Information to Presentation, what happens in each, the tools used and what each phase delivers.",
       card="The six steps of a VE study, and what to do and deliver at each one.",
       tldr="A value engineering study follows six steps, always in the same order. You gather the facts first, then work out what the product actually has to do. Only then do you come up with ideas, pick the best ones, build the business case and present it. Don’t judge any idea until they’re all written down. And start as early as you can, because most of a product’s cost is locked in once the design is set.",
       tries=[("VE Workshop Agenda", "toolkit/save-workshop-agenda.html")], learn=("Modules 3–8 · one module per phase", "training.html?open=m3")),
  dict(slug="function-analysis", old="fast", nav="Function Analysis", short="Function Analysis & FAST",
       title="FAST Diagram: How to Make One, with a Worked Example",
       desc="How to make a FAST diagram for value engineering: write verb–noun functions, place them with HOW–WHY logic and find poor-value functions, worked on an electric kettle.",
       card="How to describe what a product does, map it on a FAST diagram, and find where you’re overpaying.",
       tldr="Describe what the product does in two words at a time, a verb and a noun, such as “heat water” or “indicate status”. Put these functions on a FAST diagram. Read it to the right and it tells you how each function is done. Read it to the left and it tells you why. Then share the product’s cost out across the functions and compare each one with the cheapest reliable way to do the same job. The biggest gaps are where to start.",
       tries=[("FAST Diagram Worksheet", "toolkit/fast-worksheet.html"), ("Function–Cost Matrix", "toolkit/function-cost-matrix.html")], learn=("Module 4 · Function Analysis & FAST", "training.html?open=m4")),
  dict(slug="cost-levers", old="levers", nav="Cost Levers", short="36 Cost Levers",
       title="36 Product Cost Reduction Ideas, with Typical Savings",
       desc="36 product cost reduction ideas across design, materials, manufacturing, sourcing, packaging and complexity, with typical savings and a tool that picks your best five.",
       card="36 ways to cut product cost, with typical savings and a tool that picks the best five for you.",
       tldr="This page lists 36 ways to take cost out of a product, grouped into six areas: design, materials, manufacturing, sourcing, packaging and logistics, and complexity. Each one says where it works best and roughly how much it usually saves. If you’re not sure where to begin, the Lever Selector on this page suggests five, based on your industry and your biggest problems.",
       tries=[("Lever Selector (on this page)", "cost-levers/#selPains"), ("Should-Cost Build-Up", "toolkit/should-cost-buildup.html"), ("VE Cheat Sheet", "toolkit/ve-cheatsheet.html")], learn=("Module 9 · Cost Levers & Should-Costing", "training.html?open=m9")),
  dict(slug="ideation", old="ideation", nav="Ideation", short="Idea-Generation Techniques",
       title="12 Idea Techniques for Value Engineering Workshops",
       desc="Brainwriting 6-3-5, SCAMPER, TRIZ, FAST-driven ideation and eight more techniques for the Creative Phase, plus a simple value ratio simulator.",
       card="Twelve ways to come up with more, and better, cost-saving ideas in a workshop.",
       tldr="When you’re coming up with ideas, aim for as many as you can and leave the judging until later. This page covers twelve ways to keep the ideas coming. Brainwriting lets the quiet people in the room contribute as much as the loud ones. SCAMPER gives you a checklist to work through. TRIZ helps when improving one thing makes another worse, like a part that needs to be stronger but can’t get heavier. Whichever you use, think about the job the part does rather than the part itself.",
       tries=[("Idea Capture Sheet", "toolkit/idea-capture.html"), ("Value ratio simulator (on this page)", "ideation/#fSlider")], learn=("Module 5 · Creative Techniques", "training.html?open=m5")),
  dict(slug="technology", old="tech", nav="Technology", short="Modern Cost Technology",
       title="Should-Cost Software and Cost Engineering Tools",
       desc="Should-cost software, cleansheet cost models, CT-scan teardown, spend analytics, generative design and AI copilots: what each cost engineering tool does and when to use it.",
       card="The software and tools that make cost work faster, from should-cost software to CT scanning and AI.",
       tldr="Cost work that used to take weeks can now take hours. Should-cost software reads a CAD model and estimates what a part ought to cost before any supplier quotes. CT scanning lets you see inside a competitor’s part without cutting it open. Spend analysis finds parts you’re overpaying for, using data you already have. None of this replaces a sound method, but it makes a good team a lot faster.",
       tries=[("VE Cheat Sheet", "toolkit/ve-cheatsheet.html")], learn=("Module 11 · Modern & AI-Era Techniques", "training.html?open=m11")),
  dict(slug="benchmarking", old="benchmark", nav="Benchmarking", short="Teardown & Benchmarking",
       title="Competitor Teardown and Benchmarking: 5 Steps",
       desc="How to run a competitor teardown and benchmarking study in five steps: document, disassemble, capture the parts list, should-cost and turn findings into ideas.",
       card="How to take a competitor’s product apart and learn from it, with an interactive exploded view of an SUV.",
       tldr="Taking a competitor’s product apart is the most reliable way to find out what a function should cost. There are five steps. Photograph and weigh everything before you touch it. Take it apart one level at a time and time each step. Record every part. Estimate what each part costs the competitor to make. Then turn what you found into ideas for your own product. Look beyond price, too. This page covers six ways to compare.",
       tries=[("Teardown BOM Capture Sheet", "toolkit/teardown-bom.html")], learn=("Module 10 · Teardown & Benchmarking", "training.html?open=m10")),
  dict(slug="industries", old="industries", nav="Industries", short="Industry Playbooks",
       title="Value Engineering Examples in 8 Industries",
       desc="Value engineering examples for automotive, consumer goods, machinery, appliances, aerospace, electronics, medical devices and industrial products: where the cost sits and what saves most.",
       card="Where the cost sits in eight industries, and what saves the most money in each.",
       tldr="The method is the same in every industry, but what saves the most money isn’t. For eight industries, this page shows where the cost usually sits, which approaches save the most, and the one move that stands out. In cars, for example, 60–75% of the cost is in parts bought from suppliers, so sharing parts across models and working closely with suppliers pay off most. In consumer goods, it’s packaging, recipes and cutting the number of product variants.",
       tries=[("Lever Selector", "cost-levers/#selPains")], learn=("Module 1 · Foundations (free preview)", "training.html?open=m1")),
  dict(slug="governance", old="governance", nav="Governance", short="Savings Funnel & KPIs",
       title="Value Engineering Programme: Savings Funnel and KPIs",
       desc="Run Value Engineering as an ongoing programme: the savings funnel from idea to audited saving, the KPIs that matter, and the review cadence.",
       card="How to keep VE going after the first study and follow ideas through to real savings.",
       tldr="A one-off study saves money once. A programme that keeps running saves money every year. Ideas move through a funnel, from first suggestion to money actually saved, and only about one in nineteen makes it all the way. So every idea needs a named owner and a date. A few simple measures and a short monthly review keep it on track.",
       tries=[("Savings Funnel Tracker", "toolkit/savings-funnel-tracker.html"), ("VE Programme Charter", "toolkit/programme-charter.html")], learn=("Module 12 · Running a VE Programme", "training.html?open=m12")),
  dict(slug="toolkit", old="toolkit", nav="Toolkit", short="Free Toolkit",
       title="Free Value Engineering Templates: FAST, Should-Cost, Excel",
       desc="Fifteen free VE templates, from a FAST worksheet and cost matrix to a programme business case and a board pack, each printable with an editable Excel or PowerPoint version.",
       card="Fifteen free worksheets and templates you can print or fill in as Excel files.",
       tldr="Fifteen practical templates, free to download. Most come as a page you can print or save as a PDF and as an Excel file you can fill in; the board pack is a PowerPoint. You can use them yourself or within your company, as long as you credit where they came from. Each one links to the course module that shows you how to use it.",
       tries=[], learn=("The VE Academy · all 13 modules", "training.html")),
  dict(slug="glossary", old="glossary", nav="Glossary", short="Glossary",
       title="Value Engineering Glossary: Key Terms Explained",
       desc="Plain-English definitions of key Value Engineering terms — FAST, Value Index, worth, should-cost, cleansheet, LPP, DFMA and target costing.",
       card="Key VE terms explained in plain English, with a search box.",
       tldr="The terms you’ll come across on this site and in the course, explained in plain English. Start typing in the search box to find one, or share a link that goes straight to a particular term.",
       tries=[("VE Cheat Sheet", "toolkit/ve-cheatsheet.html")], learn=("The VE Academy · free course", "training.html")),
]
# Topic ("pillar") pages: one complete page for each main search term. Body in src/pillars/<slug>.html.
PILLARS = [
  dict(slug="vave", short="VAVE explained", kicker="Topic guide",
       title="VAVE: Value Analysis and Value Engineering Explained",
       h1='VAVE: value analysis and <span class="grad-text">value engineering</span>, explained',
       desc="What VAVE means, the difference between value analysis and value engineering, how a study runs, what it saves, real examples and how to start. Free templates and courses.",
       lede="VAVE stands for value analysis and value engineering: a structured way to lower a product’s cost, or raise what it does, by studying its functions instead of its parts. Value analysis is used on products already on sale; value engineering is used during design.",
       tldr="VAVE looks at what each part of a product is for, puts a cost on each of those jobs, and finds cheaper or better ways to do the ones that cost more than they’re worth. Value analysis does this for products already on sale; value engineering does it during design, when it saves the most. A study follows six steps with a mixed team, and a first round on a product that has never had one often finds 8–15% of its cost.",
       learn=("VAVE for Leaders · free, 1 hour", "leaders.html"),
       tries=[("VE Workshop Agenda", "toolkit/save-workshop-agenda.html"), ("FAST Diagram Worksheet", "toolkit/fast-worksheet.html"), ("All 15 free templates", "toolkit/")]),
  dict(slug="value-engineering", short="Value engineering", kicker="Topic guide",
       title="Value Engineering: What It Is, How It Works, Examples",
       h1='Value engineering: what it is, how it works, and <span class="grad-text">examples</span>',
       desc="Value engineering explained: definition, why it beats cost-cutting, history and standards, the job plan, examples in manufacturing and construction, certification and FAQ.",
       lede="Value engineering is a systematic way to get the functions a product or project needs at the lowest total cost, without lowering quality, safety or performance. It works best during design, before the cost is locked in.",
       tldr="Value engineering asks what a design has to do, what each of those jobs costs and what it should cost, then finds better ways to do the jobs that are out of line. It follows a six-phase job plan with a mixed team, works best early in design, and is used everywhere from consumer products to highways, where US law requires it on large projects.",
       learn=("VE Academy · free course with certificate", "training.html"),
       video={"@type": "VideoObject", "name": "What Is Value Engineering? VAVE Explained in 4 Minutes",
              "description": "Value engineering (VAVE) explained in under 4 minutes: why costs keep rising, where unnecessary cost hides in almost every product, and how a structured method removes it without cutting quality.",
              "thumbnailUrl": "https://i.ytimg.com/vi/Psya4JIOIB0/maxresdefault.jpg", "uploadDate": "2026-09-30",
              "embedUrl": "https://www.youtube-nocookie.com/embed/Psya4JIOIB0", "url": "https://youtu.be/Psya4JIOIB0",
              "author": {"@type": "Person", "name": "Avinash Bhosale"}},
       tries=[("FAST Diagram Worksheet", "toolkit/fast-worksheet.html"), ("Function–Cost Matrix", "toolkit/function-cost-matrix.html"), ("All 15 free templates", "toolkit/")]),
  dict(slug="value-analysis", short="Value analysis", kicker="Topic guide",
       title="Value Analysis: Method, Steps and a Worked Example",
       h1='Value analysis: method, steps and a <span class="grad-text">worked example</span>',
       desc="Value analysis explained: what it is, when to use it, the five classic questions, the six steps, a worked example from costed parts list to business case, and value analysis in purchasing.",
       lede="Value analysis is a structured review of a product already on sale: a mixed team works out what each part is for, what that job costs and what it should cost, then redesigns or re-sources whatever doesn’t earn its place.",
       tldr="Value analysis takes a product that’s already on sale and asks five questions in order: what is it, what does it do, what does it cost, what is it worth, and what else could do the job. A mixed team follows six steps, from fixing the starting cost to getting a decision on each idea, and savings count only once a change is in production.",
       learn=("Capstone: the kettle study · free", "capstone.html"),
       tries=[("Function–Cost Matrix", "toolkit/function-cost-matrix.html"), ("Should-Cost Build-Up", "toolkit/should-cost-buildup.html"), ("Savings Funnel Tracker", "toolkit/savings-funnel-tracker.html")]),
  dict(slug="product-cost-reduction", short="Product cost reduction", kicker="Topic guide",
       title="Product Cost Reduction: Proven Ideas and How to Find More",
       h1='Product cost reduction: proven ideas, and <span class="grad-text">how to find more</span>',
       desc="How to reduce product cost without hurting quality: the six areas where savings come from, typical savings, how to find ideas with should-cost and teardown, and a 30-day plan.",
       lede="Lasting product cost reduction comes from changing how a product is designed, made and bought, not from asking everyone for 5% less. This page shows where the savings usually are, and how to find the ones in your product.",
       tldr="Savings come from six areas: design, materials, manufacturing, sourcing, packaging and logistics, and complexity. To find yours, get a cost you can trust, build a should-cost for the biggest parts, take a competitor apart, analyse functions instead of parts, and run a mixed workshop. Count a saving only when it’s in production and checked by finance.",
       learn=("Module 9 · Cost Levers & Should-Costing", "training.html?open=m9"),
       tries=[("Lever Selector", "cost-levers/#selPains"), ("Should-Cost Build-Up", "toolkit/should-cost-buildup.html"), ("Teardown BOM Capture Sheet", "toolkit/teardown-bom.html")]),
  dict(slug="product-cost-optimisation", short="Product cost optimisation", kicker="Topic guide",
       title="Product Cost Optimisation: Design to Cost and Target Costing",
       h1='Product cost optimisation: design to cost and <span class="grad-text">target costing</span>',
       desc="Product cost optimisation explained: why cost has to be designed in early, target costing step by step, design-to-cost at the project gates, the tools, and running it as a programme.",
       lede="Product cost optimisation means designing a product to hit the right cost from the start, instead of taking cost out after it’s on sale, using target costing, design-to-cost reviews and should-cost estimates while the design can still change.",
       tldr="Most of a product’s cost is fixed by the time the design is finished, so the cheapest time to manage cost is before then. Target costing starts from the market price, takes off the margin you need, and designs to what’s left. Design-to-cost checks that target at every project gate, and the target cost is never exceeded.",
       learn=("Module 13 · Target Costing & Design-to-Cost", "training.html?open=m13"),
       tries=[("Target Cost Cascade", "toolkit/target-cost-cascade.html"), ("Should-Cost Build-Up", "toolkit/should-cost-buildup.html"), ("VE Programme Charter", "toolkit/programme-charter.html")]),
]
BY_OLD = {p["old"]: p for p in PAGES}
BY_SLUG = {p["slug"]: p for p in PAGES}
LEADERS_GUIDES = {"job-plan", "industries", "governance"}  # guides that also point managers to VAVE for Leaders
HOME_IDS = {"top", "about", "playbook", "faq", "diagnose", "engage"}

def read(*parts): return open(os.path.join(SRC, *parts), encoding="utf-8").read()
def write(rel, text):
    path = os.path.join(ROOT, rel); os.makedirs(os.path.dirname(path) or ROOT, exist_ok=True)
    open(path, "w", encoding="utf-8").write(text)

# fixed-position helpers go after the footer so they aren't the first keyboard stops
TAIL_GUIDE = '<button class="to-top" id="toTop" aria-label="Back to top">↑</button>'
TAIL_HOME = '<nav class="dotnav" id="dotnav" aria-label="Section navigation"></nav>\n' + TAIL_GUIDE

TOC = {
    "cost-levers": [("lever-grid", "leverGrid", "All 36 levers"), ("selector", "lever-selector", "Lever Selector")],
    "job-plan": [("concept-viz", "why-early", "Why start early"), ("save-stepper", "six-steps", "The six steps")],
    "function-analysis": [("fast-board", "fast-diagram", "FAST diagram"), ("matrix-wrap", "cost-vs-worth", "Cost vs worth")],
    "ideation": [("idea-grid", "techniques", "The techniques"), ("calc", "vi-simulator", "Value ratio simulator")],
    "technology": [("tech-grid", "tools", "The tools"), ("sc-anatomy", "inside-should-cost", "Inside a should-cost")],
    "benchmarking": [("concept-viz", "teardown-view", "Teardown view"), ("td-steps", "five-steps", "Five steps"),
                     ("bench-wrap", "six-ways", "Six ways to compare"), ("bm-case", "case-study", "Case study")],
    "governance": [("gov-wrap", "funnel", "The savings funnel"), ("cadence", "review-rhythm", "Review rhythm")],
}

def page_prefix(slug):  # how a page refers to another page, given <base href="../"> on topic pages
    return "" if slug is None else ""   # all hrefs are root-relative thanks to <base>

def ids_in(htmltext): return set(re.findall(r'\sid="([^"]+)"', htmltext))

CONTENT_IDS = {}  # page slug (None = home) -> set of element ids

def link_for(target, here):
    """Return the href for '#target' as written on page `here` (None = home)."""
    if target in BY_OLD:                         # a whole topic section → its page
        dest, frag = BY_OLD[target]["slug"], None
    elif target in HOME_IDS:
        dest, frag = None, (None if target == "top" else target)
    else:
        dest = next((s for s, ids in CONTENT_IDS.items() if target in ids), "MISSING")
        if dest == "MISSING": raise SystemExit(f"broken in-page link #{target} on {here or 'home'}")
        frag = target
    if here is None:                             # home: no <base>
        if dest is None: return "#" + (frag or "top")
        return f"{dest}/" + (f"#{frag}" if frag else "")
    # topic pages carry <base href="../">, so every href is relative to the site root
    if dest is None: return "./" + (f"#{frag}" if frag else "")
    if dest == here and not frag: return f"{dest}/#top"
    return f"{dest}/" + (f"#{frag}" if frag else "")

def rewrite(htmltext, here):
    return re.sub(r'href="#([A-Za-z][\w-]*)"', lambda m: f'href="{link_for(m.group(1), here)}"', htmltext)

def nav_links(here):
    # seven items: "Guides" opens the full list of ten; the rest are the most-used pages
    NAV = ["job-plan", "cost-levers", "ideation", "benchmarking", "toolkit", "glossary"]
    items = [("Guides", None, "playbook")] + [(BY_SLUG[s]["nav"], s, None) for s in NAV]
    out = []
    for label, slug, frag in items:
        if slug is None:
            href = f"#{frag}" if here is None else f"./#{frag}"
            extra = " data-spy" if here is None else ""
        else:
            href, extra = f"{slug}/", (' class="is-active" aria-current="page"' if slug == here else "")
        out.append(f'      <a href="{href}"{extra}>{label}</a>')
    return "\n".join(out)

def chrome(here):
    c = read("partials", "chrome.html")
    c = c.replace("{{NAV_LINKS}}", nav_links(here))
    c = c.replace("{{HOME_TOP}}", "#top" if here is None else "./")
    c = c.replace("{{SKIP}}", f'<a class="skip-link" href="{"" if here is None else here + "/"}#main">Skip to content</a>')
    return c

HEAD_COMMON = read("partials", "head-common.html") if os.path.exists(os.path.join(SRC, "partials", "head-common.html")) else None

def head(here, title, desc, canonical, og_image, og_title, og_desc, jsonld, extra=""):
    base = '<base href="../" />\n' if here is not None else ""
    return (HEAD_COMMON
      .replace("{{BASE}}", base).replace("{{TITLE}}", html.escape(title, quote=False))
      .replace("{{DESC}}", html.escape(desc)).replace("{{CANONICAL}}", canonical)
      .replace("{{OG_TYPE}}", "website" if here is None else "article")
      .replace("{{OG_TITLE}}", html.escape(og_title)).replace("{{OG_DESC}}", html.escape(og_desc))
      .replace("{{OG_IMAGE}}", og_image).replace("{{JSONLD}}", jsonld).replace("{{EXTRA}}", extra))

SCRIPTS = """<script src="site-config.js"></script>
<script src="vh-protect.js"></script>
<script src="vh-cloud.js"></script>
<script src="vh-account.js"></script>
<script src="app.js"></script>
<script src="vh-diagrams.js"></script>
</body>
</html>
"""

def words(htmltext):
    t = re.sub(r"<script.*?</script>|<style.*?</style>|<svg.*?</svg>", " ", htmltext, flags=re.S)
    return len(re.sub(r"<[^>]+>", " ", t).split())

# ── glossary: merge the course's tooltip terms into the homepage glossary ──
def slugify(t): return re.sub(r"[^a-z0-9]+", "-", html.unescape(t).lower()).strip("-")
def norm(t): return re.sub(r"[^a-z0-9]", "", html.unescape(t).lower())

def build_glossary(section):
    js = open(os.path.join(ROOT, "training.js"), encoding="utf-8").read()
    block = re.search(r"const TERMS = \[(.*?)\n  \];", js, re.S).group(1)
    course = re.findall(r'\["((?:[^"\\]|\\.)+)", "((?:[^"\\]|\\.)+)"\]', block)
    have = [norm(t) for t in re.findall(r'<div class="g-term"[^>]*><b>(.*?)</b>', section)]
    added = []
    for term, definition in course:
        n = norm(term)
        if any(n == h or n.startswith(h) or h.startswith(n) for h in have): continue
        have.append(n); added.append((term[0].upper() + term[1:], definition))
    extra = "".join(f'\n      <div class="g-term" data-reveal><b>{html.escape(t)}</b><span>{html.escape(d)}</span></div>' for t, d in added)
    grid_end = section.index('<div class="g-grid"')
    close = section.index("\n    </div>", grid_end)
    section = section[:close] + extra + section[close:]
    # stable anchors per term
    section = re.sub(r'<div class="g-term"( data-reveal)?><b>(.*?)</b>',
                     lambda m: f'<div class="g-term" id="term-{slugify(m.group(2))}"{m.group(1) or ""}><b>{m.group(2)}</b>', section)
    terms = re.findall(r'<div class="g-term"[^>]*><b>(.*?)</b><span>(.*?)</span>', section)
    section = section.replace("{{TERM_COUNT}}", str(len(terms)))
    return section, terms, added

def guide_page(i, p):
    body = read("pages", p["slug"] + ".html")
    terms = None
    if p["slug"] == "glossary":
        body, terms, added = build_glossary(body)
        if added: print(f"  glossary: +{len(added)} course terms → {', '.join(t for t, _ in added)}")
    m = re.search(r'\n\s*<div class="sec-head">(.*?)\n    </div>', body, re.S)
    head_html = m.group(1)
    kicker = re.search(r'<p class="kicker"[^>]*>(.*?)</p>', head_html, re.S).group(1)
    h1 = re.search(r"<h2[^>]*>(.*?)</h2>", head_html, re.S).group(1)
    lede_m = re.search(r'<p class="sec-lede"[^>]*>(.*?)</p>', head_html, re.S)
    lede = lede_m.group(1).strip() if lede_m else ""
    rest = head_html[lede_m.end():] if lede_m else ""
    body = body[:m.start()] + (("\n    " + rest.strip()) if rest.strip() else "") + body[m.end():]
    body = body.replace(' class="section section-alt"', ' class="section"', 1)
    minutes = max(2, round(words(body) / 220))
    prev_p = PAGES[i - 1] if i > 0 else None
    next_p = PAGES[i + 1] if i + 1 < len(PAGES) else None
    tries = "".join(f'<a href="{h}">{html.escape(t)} <span aria-hidden="true">→</span></a>' for t, h in p["tries"])
    learn_t, learn_h = p["learn"]
    end_cards = ""
    if tries:
        end_cards += f'<div class="ge-card"><h2>Try it</h2>{tries}</div>'
        # say up front what's free, so visitors from search aren't surprised by the sign-up step
    leaders = ('<a class="ge-leaders" href="leaders.html">Leading a team? VAVE for Leaders: 1 hour, no sign-up needed '
               '<span aria-hidden="true">→</span></a>' if p["slug"] in LEADERS_GUIDES else "")
    end_cards += (f'<div class="ge-card ge-learn"><h2>Learn it properly</h2><a href="{learn_h}">{html.escape(learn_t)} <span aria-hidden="true">→</span></a>'
                  '<p>Module 1 is free to read. A free account opens the other 12 modules, the exam and your certificate.</p>'
                  f'{leaders}</div>')
    pn = '<nav class="ge-pn" aria-label="More of the playbook">'
    pn += (f'<a class="ge-prev" href="{prev_p["slug"]}/"><small>← Previous</small>{html.escape(prev_p["short"])}</a>' if prev_p else '<a class="ge-prev" href="./#playbook"><small>← Back to</small>The playbook overview</a>')
    pn += (f'<a class="ge-next" href="{next_p["slug"]}/"><small>Next →</small>{html.escape(next_p["short"])}</a>' if next_p else '<a class="ge-next" href="training.html"><small>Next →</small>Take the free VE Academy</a>')
    pn += "</nav>"
    # every guide links to the topic pages, so readers and search engines see how the pages fit together
    pn += ('<p class="ge-topics"><span>Topic guides:</span>' + " · ".join(f'<a href="{t["slug"]}/">{html.escape(t["short"])}</a>' for t in PILLARS) + "</p>")
    # "On this page" bar for guides with several landmarks: (class of the block, anchor id, label)
    toc_html = ""
    toc = TOC.get(p["slug"])
    if toc:
        links = []
        for cls, anchor, label in toc:
            if cls:
                if f'id="{anchor}"' not in body:
                    pat = re.compile(r'<div class="' + re.escape(cls) + r'(?=[ "])')
                    mm = pat.search(body)
                    assert mm, (p["slug"], cls)
                    body = body[:mm.start()] + f'<div id="{anchor}" class="' + cls + body[mm.end():]
            links.append(f'<a href="{p["slug"]}/#{anchor}">{html.escape(label)}</a>')
        links.append(f'<a href="{p["slug"]}/#next-steps">What to do next</a>')
        toc_html = f'<nav class="guide-toc" aria-label="On this page"><div class="container"><span class="gt-label">On this page</span>{"".join(links)}</div></nav>\n'
    page = f'''<header class="guide-hero" id="top">
  <div class="container">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="./">Home</a><span aria-hidden="true">›</span><a href="./#playbook">Playbook</a><span aria-hidden="true">›</span><span aria-current="page">{html.escape(p["short"])}</span></nav>
    <p class="kicker">{kicker}</p>
    <h1>{h1}</h1>
    <p class="sec-lede">{lede}</p>
    <p class="guide-meta">By <a href="./#engage">{AUTHOR}</a> · Updated <time datetime="{UPDATED}">{UPDATED_HUMAN}</time> · {minutes} min read</p>
    <aside class="guide-tldr" aria-labelledby="tldr-{p["slug"]}"><h2 id="tldr-{p["slug"]}">In 30 seconds</h2><p>{p["tldr"]}</p></aside>
  </div>
</header>
{toc_html}
<main id="main">
{body}

<section class="section guide-end" id="next-steps">
  <div class="container">
    <div class="ge-grid">{end_cards}</div>
    {pn}
  </div>
</section>
</main>
'''
    url = f"{SITE}{p['slug']}/"
    crumbs = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
        {"@type": "ListItem", "position": 2, "name": "Playbook", "item": SITE + "#playbook"},
        {"@type": "ListItem", "position": 3, "name": p["short"], "item": url}]}
    main_ld = {"@type": "Article", "headline": p["title"], "description": p["desc"], "url": url,
        "mainEntityOfPage": url, "image": f"{SITE}og/{p['slug']}.jpg", "inLanguage": "en-GB",
        "datePublished": PUBLISHED, "dateModified": UPDATED,
        "author": {"@type": "Person", "name": AUTHOR, "url": "https://www.linkedin.com/in/avinash-bhosale-671bbb80"},
        "publisher": {"@type": "Organization", "name": "VAVEhub", "url": SITE}}
    graph = [main_ld, crumbs]
    if terms:
        graph.append({"@type": "DefinedTermSet", "name": "Value Engineering Glossary", "url": url,
            "hasDefinedTerm": [{"@type": "DefinedTerm", "name": html.unescape(re.sub(r"<[^>]+>", "", t)),
                                "description": html.unescape(re.sub(r"<[^>]+>", "", d)), "url": f"{url}#term-{slugify(t)}"} for t, d in terms]})
    jsonld = '<script type="application/ld+json">\n' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + "\n</script>"
    return page, jsonld, url

def pillar_page(p):
    body = read("pillars", p["slug"] + ".html")
    minutes = max(2, round(words(body) / 220))
    url = f"{SITE}{p['slug']}/"
    tries = "".join(f'<a href="{h}">{html.escape(t)} <span aria-hidden="true">→</span></a>' for t, h in p["tries"])
    learn_t, learn_h = p["learn"]
    toc = "".join(f'<a href="{p["slug"]}/#{i}">{html.escape(re.sub("<[^>]+>", "", h))}</a>'
                  for i, h in re.findall(r'<section class="pil-sec" id="([\w-]+)">\s*<h2>(.*?)</h2>', body))
    page = f'''<header class="guide-hero" id="top">
  <div class="container">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="./">Home</a><span aria-hidden="true">›</span><span aria-current="page">{html.escape(p["short"])}</span></nav>
    <p class="kicker">{p["kicker"]}</p>
    <h1>{p["h1"]}</h1>
    <p class="sec-lede">{p["lede"]}</p>
    <p class="guide-meta">By <a href="./#engage">{AUTHOR}</a> · Updated <time datetime="{UPDATED}">{UPDATED_HUMAN}</time> · {minutes} min read</p>
    <aside class="guide-tldr" aria-labelledby="tldr-{p["slug"]}"><h2 id="tldr-{p["slug"]}">In 30 seconds</h2><p>{p["tldr"]}</p></aside>
  </div>
</header>
<nav class="guide-toc" aria-label="On this page"><div class="container"><span class="gt-label">On this page</span>{toc}</div></nav>
<main id="main">
<div class="section pil-wrap"><div class="container">
{body}
</div></div>
<section class="section guide-end" id="next-steps">
  <div class="container">
    <div class="ge-grid"><div class="ge-card"><h2>Try it</h2>{tries}</div>
    <div class="ge-card ge-learn"><h2>Learn it properly</h2><a href="{learn_h}">{html.escape(learn_t)} <span aria-hidden="true">→</span></a>
    <a href="training.html">VE Academy · free course with certificate <span aria-hidden="true">→</span></a>
    <p>Both courses are free. VAVE for Leaders needs no account; the Academy’s Module 1 is free to read and a free account opens the rest.</p></div></div>
  </div>
</section>
</main>
'''
    faqs = re.findall(r'<summary>(.*?)<i></i></summary><p>(.*?)</p>', body, re.S)
    plain = lambda s: html.unescape(re.sub(r"<[^>]+>", "", s)).strip()
    graph = [
        {"@type": "Article", "headline": p["title"], "description": p["desc"], "url": url, "mainEntityOfPage": url,
         "inLanguage": "en-GB", "datePublished": UPDATED, "dateModified": UPDATED,
         "author": {"@type": "Person", "name": AUTHOR, "url": "https://www.linkedin.com/in/avinash-bhosale-671bbb80"},
         "publisher": {"@type": "Organization", "name": "VAVEhub", "url": SITE}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": p["short"], "item": url}]},
    ]
    if p.get("video"):
        graph.append(dict(p["video"]))
    if faqs:
        graph.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": plain(q),
                      "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in faqs]})
    jsonld = '<script type="application/ld+json">\n' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + "\n</script>"
    return page, jsonld, url

# Public summary pages for the 13 Academy modules: /academy/<slug>/ (the lessons themselves stay in training.html).
# (module, slug, search title, what the learner produces, related guide or topic page)
ACADEMY_PAGES = [
  (1, "value-engineering-basics", "Value Engineering Basics: Value = Function ÷ Cost", "a one-page cheat sheet and the first entry in your value study logbook", "vave"),
  (2, "ve-workshop-preparation", "How to Prepare a Value Engineering Workshop", "a study scope, a team list and a starting cost finance has signed off", "job-plan"),
  (3, "information-phase", "VE Information Phase: Costed Parts List and Pareto", "a costed, ranked parts list and the facts the workshop needs", "value-analysis"),
  (4, "function-analysis-fast", "Function Analysis and FAST Diagrams: Free Course Module", "a FAST diagram and a function–cost matrix that shows where to look", "function-analysis"),
  (5, "creative-phase", "Creative Phase: Brainwriting, SCAMPER and TRIZ for VE", "a list of ideas, each tagged with the function it serves", "ideation"),
  (6, "evaluation-phase", "Evaluation Phase: Pugh Matrix and Weighted Scoring", "a screened, scored and ranked shortlist of ideas", "ideation"),
  (7, "development-phase", "Development Phase: VE Business Case and Payback", "a costed business case with payback, risks and tests", "product-cost-reduction"),
  (8, "presentation-implementation", "Presentation and Implementation: Tracking VE Savings", "a decision log and a savings funnel that tracks every idea", "governance"),
  (9, "should-cost", "Should-Cost Analysis: The Seven-Layer Method", "a seven-layer should-cost for a real part", "cost-levers"),
  (10, "teardown-benchmarking", "Teardown and Competitive Benchmarking: Free Course Module", "a teardown parts list and a benchmark against a rival", "benchmarking"),
  (11, "ai-cost-engineering", "AI and Digital Tools for Cost Engineering", "a plan for using AI and cost tools safely in your study", "technology"),
  (12, "ve-programme", "Running a Value Engineering Programme: Cadence and KPIs", "a programme charter with KPIs and a review rhythm", "governance"),
  (13, "target-costing", "Target Costing and Design-to-Cost: Free Course Module", "a target-cost cascade from market price to each function", "product-cost-optimisation"),
]

def academy_pages(footer):
    head_src = read("academy", "_head.html")
    blurbs = dict(re.findall(r'data-open="(m\d+)"><span class="cat-n">\d+</span><span class="cat-body"><b>.*?</b><span>(.*?)</span>', head_src))
    for k, (n, slug, seo_title, output, related) in enumerate(ACADEMY_PAGES):
        src = read("academy", f"m{n}.html")
        title = html.unescape(re.search(r'data-title="([^"]+)"', src).group(1))
        mins = re.search(r'data-time="([^"]+)"', src).group(1)
        learn = re.findall(r"<li>(.*?)</li>", re.search(r'<div class="tmod-obj"><h3>You will learn</h3><ul>(.*?)</ul>', src, re.S).group(1))
        first = re.search(r"<h3>(.*?)</h3>\s*((?:<p>.*?</p>\s*){1,2})", src[src.find("</div>", src.find("tmod-obj")):], re.S)
        sec_h, sec_p = first.group(1), first.group(2)
        sec_p = re.sub(r'\s*class="[^"]*"', "", sec_p)
        sec_title = re.sub(r"\s*\([^)]*\)\s*$", "", re.sub(r"^\d+\.\d+\s*·\s*", "", sec_h))
        vid = re.search(r"videos/([a-z-]+)\.mp4", src)
        tpls = "".join(f'<li><a href="toolkit/{TOOLKIT[t][1]}.html">{html.escape(TOOLKIT[t][0])}</a>' + (f' · <a href="toolkit/{TOOLKIT[t][1]}.xlsx" download>Excel</a>' if TOOLKIT[t][2] else "") + "</li>" for t in MODULE_TEMPLATES[n])
        rel = next((x for x in PAGES + PILLARS if x["slug"] == related), None)
        prev_p = ACADEMY_PAGES[k - 1] if k else None
        next_p = ACADEMY_PAGES[k + 1] if k + 1 < len(ACADEMY_PAGES) else None
        start = f"training.html?open=m{n}"
        access = "Free to read, no account needed." if n == 1 else "Free. A free account opens Modules 2–13, the exam and your certificate."
        url = f"{SITE}academy/{slug}/"
        video_html = (f'<a class="am-video" href="{start}"><img src="videos/{vid.group(1)}.webp" alt="" width="1280" height="720" loading="lazy" decoding="async" />'
                      f'<span>Short narrated video in this module <span aria-hidden="true">→</span></span></a>') if vid else ""
        body = f'''<header class="guide-hero am-hero" id="top">
  <div class="container">
  <div class="am-head">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="./">Home</a><span aria-hidden="true">›</span><a href="training.html">VE Academy</a><span aria-hidden="true">›</span><span aria-current="page">Module {n}</span></nav>
    <p class="kicker">Free course · Module {n} of 13 · {mins}</p>
    <h1>{html.escape(title)}</h1>
    <p class="sec-lede">{blurbs.get(f"m{n}", "")}. Part of the free VE Academy: 13 narrated modules, hands-on labs and a certificate of completion.</p>
    <div class="am-cta"><a class="btn btn-primary btn-lg" href="{start}">Start Module {n} <span aria-hidden="true">→</span></a><span>{access}</span></div>
  </div>
  </div>
</header>
<main id="main">
<div class="section pil-wrap"><div class="container">
<article class="pil">
  <section class="pil-sec"><h2>What you’ll learn</h2><ul>{"".join(f"<li>{x}</li>" for x in learn)}</ul></section>
  <section class="pil-sec"><h2>What you’ll produce</h2><p>By the end of this module you’ll have {output}. Free templates:</p><ul>{tpls}</ul></section>
  <section class="pil-sec"><p class="kicker">From the module</p><h2>{sec_title}</h2>{sec_p}{video_html}
    <p class="pil-more">Continue reading in <a href="{start}">Module {n}</a>{f', or read the related guide: <a href="{rel["slug"]}/">{html.escape(rel["short"])}</a>' if rel else ""}.</p></section>
</article>
</div></div>
<section class="section guide-end" id="next-steps"><div class="container">
  <nav class="ge-pn" aria-label="Other modules">
    {f'<a class="ge-prev" href="academy/{prev_p[1]}/"><small>← Module {prev_p[0]}</small>{html.escape(prev_p[2])}</a>' if prev_p else '<a class="ge-prev" href="training.html"><small>← Back to</small>The VE Academy</a>'}
    {f'<a class="ge-next" href="academy/{next_p[1]}/"><small>Module {next_p[0]} →</small>{html.escape(next_p[2])}</a>' if next_p else '<a class="ge-next" href="training.html?open=exam"><small>Next →</small>The final exam and certificate</a>'}
  </nav>
</div></section>
</main>
'''
        desc = f"Free course module: {title} ({mins}). {html.unescape(re.sub('<[^>]+>', '', blurbs.get(f'm{n}', '')))}. You’ll produce {output}."
        graph = [
            {"@type": "LearningResource", "name": seo_title, "description": desc, "url": url, "inLanguage": "en-GB",
             "learningResourceType": "Course module", "isAccessibleForFree": True, "timeRequired": "PT" + mins.split()[0] + "M",
             "teaches": [html.unescape(re.sub("<[^>]+>", "", x)) for x in learn],
             "isPartOf": {"@type": "Course", "name": "VE Academy: Value Engineering 360°", "url": SITE + "training.html",
                          "provider": {"@type": "Organization", "name": "VAVEhub", "url": SITE}}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
                {"@type": "ListItem", "position": 2, "name": "VE Academy", "item": SITE + "training.html"},
                {"@type": "ListItem", "position": 3, "name": f"Module {n}", "item": url}]}]
        jsonld = '<script type="application/ld+json">\n' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + "\n</script>"
        here = f"academy/{slug}"
        doc = head(here, seo_title + " | VAVEhub", desc, url, SITE + "og-academy.png", seo_title, desc, jsonld).replace('<base href="../" />', '<base href="../../" />')
        doc += '<body class="guide pillar academy-page">\n\n<!-- ══════════ CHROME ══════════ -->\n' + chrome(here) + "\n\n"
        doc += body + "\n\n<!-- ══════════ FOOTER ══════════ -->\n" + rewrite(footer, here) + "\n" + TAIL_GUIDE + "\n\n" + SCRIPTS
        write(f"{here}/index.html", doc)
    print(f"academy/*/index.html  {len(ACADEMY_PAGES)} module pages")

def playbook_section():
    cards = "\n".join(
        f'      <a class="pb-card tilt" href="{p["slug"]}/" data-reveal><span class="pb-n">{i + 1:02d}</span>'
        f'<h3>{html.escape(p["short"])}</h3><p>{p["card"]}</p><span class="pb-go">Read the guide <span aria-hidden="true">→</span></span></a>'
        for i, p in enumerate(PAGES))
    return f'''<section class="section section-alt" id="playbook">
  <div class="container">
    <div class="sec-head">
      <p class="kicker" data-reveal>02 · The Playbook</p>
      <h2 data-reveal data-delay="100">Pick a <span class="grad-text">guide</span></h2>
      <p class="sec-lede" data-reveal data-delay="200">
        Ten guides covering the whole method, each on its own page so you can bookmark or share it. Read them in
        order, or start with whichever one fits your problem.
      </p>
    </div>
    <div class="pb-grid" data-stagger>
{cards}
    </div>
  </div>
</section>'''

def faq_jsonld():
    """Google's FAQ markup is generated from the visible FAQ, so the two always match."""
    faq = read("home", "faq.html")
    pairs = re.findall(r"<summary>(.*?)<i></i></summary><p>(.*?)</p>", faq, re.S)
    clean = lambda t: html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", t))).strip()
    data = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": clean(q), "acceptedAnswer": {"@type": "Answer", "text": clean(a)}} for q, a in pairs]}
    if len(pairs) < 1: raise SystemExit("FAQ: no questions found")
    return '<script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False) + "\n</script>"

def build():
    for p in PAGES: CONTENT_IDS[p["slug"]] = ids_in(read("pages", p["slug"] + ".html"))
    CONTENT_IDS[None] = set().union(*(ids_in(read("home", f)) for f in ["hero.html", "about.html", "faq.html", "diagnose.html", "engage.html"])) | {"playbook"}
    footer = read("partials", "footer.html")
    # ── home ──
    home_body = "\n\n".join([read("home", "hero.html"), '<main id="main">', "", read("home", "about.html"), playbook_section(),
                             read("home", "faq.html"), read("home", "diagnose.html"), read("home", "engage.html"), "", "</main>"])
    home = head(None, "VAVEhub: Free Value Engineering Guides, Templates and Courses",
                "Free value engineering (VAVE) guides, templates and two free courses with certificates: the job plan, FAST diagrams, 36 cost reduction ideas, should-costing and teardown.",
                SITE, SITE + "og-image.png", "VAVEhub — Value Engineering & Product Cost Optimisation",
                "Free value engineering courses (a 1-hour course for leaders, a 6-hour Academy) with certificates, plus ten guides and 15 templates.",
                read("home", "head-extra.html") + "\n" + faq_jsonld(),
                extra='<meta name="keywords" content="value engineering, value analysis, VAVE, product cost optimisation, cost reduction, should-cost, cleansheet, teardown benchmarking, value methodology job plan, FAST diagram, TRIZ, DFMA, target costing, design to cost" />\n')
    home += "<body>\n\n<!-- ══════════ CHROME ══════════ -->\n" + chrome(None) + "\n\n"
    home += rewrite(home_body, None) + "\n\n<!-- ══════════ FOOTER ══════════ -->\n" + rewrite(footer, None) + "\n" + TAIL_HOME + "\n\n" + SCRIPTS
    write("index.html", home)
    print(f"index.html  {len(home)//1024} KB")
    # ── topic pages ──
    for i, p in enumerate(PAGES):
        body, jsonld, url = guide_page(i, p)
        doc = head(p["slug"], p["title"] + " | VAVEhub", p["desc"], url, f"{SITE}og/{p['slug']}.jpg",
                   p["title"], p["desc"], jsonld)
        doc += '<body class="guide">\n\n<!-- ══════════ CHROME ══════════ -->\n' + chrome(p["slug"]) + "\n\n"
        doc += rewrite(body, p["slug"]) + "\n\n<!-- ══════════ FOOTER ══════════ -->\n" + rewrite(footer, p["slug"]) + "\n" + TAIL_GUIDE + "\n\n" + SCRIPTS
        write(f"{p['slug']}/index.html", doc)
        print(f"{p['slug']+'/index.html':34} {len(doc)//1024:>3} KB")
    # ── topic (pillar) pages ──
    for p in PILLARS:
        body, jsonld, url = pillar_page(p)
        doc = head(p["slug"], p["title"] + " | VAVEhub", p["desc"], url, SITE + "og-image.png", p["title"], p["desc"], jsonld)
        doc += '<body class="guide pillar">\n\n<!-- ══════════ CHROME ══════════ -->\n' + chrome(p["slug"]) + "\n\n"
        doc += body + "\n\n<!-- ══════════ FOOTER ══════════ -->\n" + rewrite(footer, p["slug"]) + "\n" + TAIL_GUIDE + "\n\n" + SCRIPTS
        write(f"{p['slug']}/index.html", doc)
        print(f"{p['slug']+'/index.html':34} {len(doc)//1024:>3} KB")
    academy_pages(footer)
    build_academy()
    build_leaders()
    write_sitemap()
    return PAGES

def write_sitemap():
    """Sitemap is generated too, so it always lists exactly the pages that exist."""
    rows = [("", "1.0", "weekly")] + [(p["slug"] + "/", "0.9", "monthly") for p in PILLARS] + [(f"academy/{a[1]}/", "0.7", "monthly") for a in ACADEMY_PAGES] + [(p["slug"] + "/", "0.8", "monthly") for p in PAGES] + [
        ("training.html", "0.9", "weekly"), ("leaders.html", "0.9", "monthly"), ("changelog.html", "0.5", "weekly"), ("verify.html", "0.6", "monthly"), ("capstone.html", "0.7", "monthly")]
    for f in sorted(os.listdir(os.path.join(ROOT, "toolkit"))):
        if f.endswith(".html") and f != "index.html": rows.append((f"toolkit/{f}", "0.6", "monthly"))
    rows += [("privacy.html", "0.3", "yearly"), ("terms.html", "0.3", "yearly"), ("credits.html", "0.3", "yearly")]
    for path, _, _ in rows:
        target = os.path.join(ROOT, path, "index.html") if path.endswith("/") or path == "" else os.path.join(ROOT, path)
        if not os.path.exists(target): raise SystemExit(f"sitemap: {path} does not exist")
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    xml += [f"  <url><loc>{SITE}{p}</loc><lastmod>{UPDATED}</lastmod><changefreq>{c}</changefreq><priority>{pr}</priority></url>" for p, pr, c in rows]
    write("sitemap.xml", "\n".join(xml + ["</urlset>"]) + "\n")
    print(f"sitemap.xml  {len(rows)} URLs")

# toolkit sheets listed in the "Templates for this module" box at the end of each Academy module:
# (title, file name without extension, has an .xlsx version)
TOOLKIT = {
    "cheat": ("The VE Cheat Sheet", "ve-cheatsheet", False),
    "agenda": ("VE Workshop Agenda", "save-workshop-agenda", True),
    "fast": ("FAST Diagram Worksheet", "fast-worksheet", True),
    "fcm": ("Function–Cost Matrix", "function-cost-matrix", True),
    "ideas": ("Idea Capture Sheet", "idea-capture", True),
    "case": ("Business Case", "business-case", True),
    "funnel": ("Savings Funnel Tracker", "savings-funnel-tracker", True),
    "should": ("Should-Cost Build-Up", "should-cost-buildup", True),
    "teardown": ("Teardown BOM Capture Sheet", "teardown-bom", True),
    "charter": ("VE Programme Charter", "programme-charter", True),
    "target": ("Target-Cost Cascade", "target-cost-cascade", True),
    "logbook": ("Value Study Logbook", "value-study-logbook", True),
}
MODULE_TEMPLATES = {
    1: ["cheat", "logbook"], 2: ["agenda"], 3: ["fcm"], 4: ["fast", "fcm"], 5: ["ideas"], 6: ["ideas"],
    7: ["case"], 8: ["funnel", "case"], 9: ["should"], 10: ["teardown"], 11: ["ideas"],
    12: ["charter", "funnel", "logbook"], 13: ["target"],
}

def templates_box(i):
    rows = []
    for key in MODULE_TEMPLATES[i]:
        title, f, xls = TOOLKIT[key]
        links = f'<a href="toolkit/{f}.html" target="_blank" rel="noopener">Print or save as PDF ↗</a>'
        if xls: links += f'<a class="tmpl-xls" href="toolkit/{f}.xlsx" download>⤓ Excel (.xlsx)</a>'
        rows.append(f'<li><b>{html.escape(title)}</b><span>{links}</span></li>')
    return f'<div class="tmpl-box"><h4>Templates for this module</h4><ul>{"".join(rows)}</ul></div>\n\n      '

def build_academy():
    """training.html = src/academy/_head.html + m1..m13.html + _tail.html (exam, certificate, scripts).
    Edit the module files, not training.html. The narration workflow reads the built page, so any
    change to narrated module text still needs the audio regenerating for that module.
    The "Templates for this module" box is added here, before each module's quick check."""
    mods = []
    for i in range(1, 14):
        src, anchor = read("academy", f"m{i}.html"), f'<div class="qcheck" data-qc="m{i}">'
        if src.count(anchor) != 1: sys.exit(f"m{i}.html: expected one quick-check block")
        mods.append(src.replace(anchor, templates_box(i) + anchor))
    parts = [read("academy", "_head.html")] + mods + [read("academy", "_tail.html")]
    write("training.html", "".join(parts))
    print("training.html  13 modules")

def build_leaders():
    """leaders.html (VAVE for Leaders, the 1-hour crash course) = src/leaders/_head.html + l0..l6.html + _tail.html.
    Same rule as the Academy: edit the source files, and regenerate narration for any module whose text changes."""
    parts = [read("leaders", "_head.html")] + [read("leaders", f"l{i}.html") for i in range(7)] + [read("leaders", "_tail.html")]
    write("leaders.html", "".join(parts))
    print("leaders.html   7 modules")

if __name__ == "__main__":
    if HEAD_COMMON is None: sys.exit("missing src/partials/head-common.html")
    build()
