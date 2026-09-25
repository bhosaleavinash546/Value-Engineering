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
UPDATED = "2026-09-25"
UPDATED_HUMAN = "25 September 2026"
PUBLISHED = "2026-07-04"
AUTHOR = "Avinash Bhosale"

# ── the playbook: order = previous/next order and homepage card order ──
PAGES = [
  dict(slug="job-plan", old="save", nav="Job Plan", short="The 6-Phase Job Plan",
       title="The 6-Phase Value Engineering Job Plan",
       desc="The six phases of a Value Engineering study, from Information to Presentation, with the activities, tools and deliverable of each phase.",
       card="The six-phase workshop method, phase by phase: activities, tools and the deliverable each must produce.",
       tldr="A value engineering study follows six steps, always in the same order. You gather the facts first, then work out what the product actually has to do. Only then do you come up with ideas, pick the best ones, build the business case and present it. Don’t judge any idea until they’re all written down. And start as early as you can, because most of a product’s cost is locked in once the design is set.",
       tries=[("VE Workshop Agenda", "toolkit/save-workshop-agenda.html")], learn=("Modules 3–8 · one module per phase", "training.html?open=m3")),
  dict(slug="function-analysis", old="fast", nav="Function Analysis", short="Function Analysis & FAST",
       title="Function Analysis & FAST Diagrams, Worked Example",
       desc="Write verb–noun functions, build a FAST diagram and use the Value Index to find what to attack — worked step by step on an electric kettle.",
       card="Verb–noun functions, a worked FAST diagram and the function–cost matrix that exposes value gaps.",
       tldr="Describe what the product does in two words at a time, a verb and a noun, such as “heat water” or “indicate status”. Put these functions on a FAST diagram. Read it to the right and it tells you how each function is done. Read it to the left and it tells you why. Then share the product’s cost out across the functions and compare each one with the cheapest reliable way to do the same job. The biggest gaps are where to start.",
       tries=[("FAST Diagram Worksheet", "toolkit/fast-worksheet.html"), ("Function–Cost Matrix", "toolkit/function-cost-matrix.html")], learn=("Module 4 · Function Analysis & FAST", "training.html?open=m4")),
  dict(slug="cost-levers", old="levers", nav="Cost Levers", short="36 Cost Levers",
       title="36 Cost-Reduction Levers for Product Cost",
       desc="36 proven cost-reduction levers across design, materials, manufacturing, sourcing, packaging and complexity, with typical savings for each.",
       card="Thirty-six proven levers in six families, with typical savings — plus a selector that ranks them for your problem.",
       tldr="This page lists 36 ways to take cost out of a product, grouped into six areas: design, materials, manufacturing, sourcing, packaging and logistics, and complexity. Each one says where it works best and roughly how much it usually saves. If you’re not sure where to begin, the Lever Selector on this page suggests five, based on your industry and your biggest problems.",
       tries=[("Lever Selector (on this page)", "cost-levers/#selPains"), ("VE Cheat Sheet", "toolkit/ve-cheatsheet.html")], learn=("Module 9 · Cost Levers & Should-Costing", "training.html?open=m9")),
  dict(slug="ideation", old="ideation", nav="Ideation", short="Idea-Generation Techniques",
       title="12 Idea-Generation Techniques for VE Workshops",
       desc="Brainwriting 6-3-5, SCAMPER, TRIZ, FAST-driven ideation and eight more techniques for the Creative Phase — plus a Value Index simulator.",
       card="Twelve battle-tested techniques for the Creative Phase — from brainwriting to TRIZ and AI copilots.",
       tldr="When you’re coming up with ideas, aim for as many as you can and leave the judging until later. This page covers twelve ways to keep the ideas coming. Brainwriting lets the quiet people in the room contribute as much as the loud ones. SCAMPER gives you a checklist to work through. TRIZ helps when improving one thing makes another worse, like a part that needs to be stronger but can’t get heavier. Whichever you use, think about the job the part does rather than the part itself.",
       tries=[("Idea Capture Sheet", "toolkit/idea-capture.html"), ("Value Index simulator (on this page)", "ideation/#fSlider")], learn=("Module 5 · Creative Techniques", "training.html?open=m5")),
  dict(slug="technology", old="tech", nav="Technology", short="Modern Cost Technology",
       title="Modern Cost-Engineering Technology & AI Tools",
       desc="AI should-cost engines, cleansheet models, CT-scan teardown, spend analytics, generative design and LLM copilots — the modern cost stack.",
       card="The modern cost stack: AI should-cost engines, CT-scan teardown, generative design and LLM copilots.",
       tldr="Cost work that used to take weeks can now take hours. Should-cost software reads a CAD model and estimates what a part ought to cost before any supplier quotes. CT scanning lets you see inside a competitor’s part without cutting it open. Spend analysis finds parts you’re overpaying for, using data you already have. None of this replaces a sound method, but it makes a good team a lot faster.",
       tries=[("VE Cheat Sheet", "toolkit/ve-cheatsheet.html")], learn=("Module 11 · Modern & AI-Era Techniques", "training.html?open=m11")),
  dict(slug="benchmarking", old="benchmark", nav="Benchmarking", short="Teardown & Benchmarking",
       title="Teardown & Competitive Benchmarking Guide",
       desc="Run a competitive teardown in five steps — document, disassemble, capture the BOM, should-cost, harvest ideas — with an exploded-view SUV.",
       card="The five-step teardown process and six benchmarking dimensions, with an interactive exploded-view SUV.",
       tldr="Taking a competitor’s product apart is the most reliable way to find out what a function should cost. There are five steps. Photograph and weigh everything before you touch it. Take it apart one level at a time and time each step. Record every part. Estimate what each part costs the competitor to make. Then turn what you found into ideas for your own product. Look beyond price, too. This page covers six ways to compare.",
       tries=[("Teardown BOM Capture Sheet", "toolkit/teardown-bom.html")], learn=("Module 10 · Teardown & Benchmarking", "training.html?open=m10")),
  dict(slug="industries", old="industries", nav="Industries", short="Industry Playbooks",
       title="Value Engineering Playbooks for 8 Industries",
       desc="Cost structures, highest-yield levers and signature moves for automotive, consumer goods, machinery, appliances, aerospace and more.",
       card="Eight industries — typical cost structure, the levers that bite hardest, and each one's signature move.",
       tldr="The method is the same in every industry, but what saves the most money isn’t. For eight industries, this page shows where the cost usually sits, which approaches save the most, and the one move that stands out. In cars, for example, 60–75% of the cost is in parts bought from suppliers, so sharing parts across models and working closely with suppliers pay off most. In consumer goods, it’s packaging, recipes and cutting the number of product variants.",
       tries=[("Lever Selector", "cost-levers/#selPains")], learn=("Module 1 · Foundations (free preview)", "training.html?open=m1")),
  dict(slug="governance", old="governance", nav="Governance", short="Savings Funnel & KPIs",
       title="VE Governance: Savings Funnel & KPIs",
       desc="Run Value Engineering as an ongoing programme: the savings funnel from idea to audited saving, the KPIs that matter, and the review cadence.",
       card="Run VE as an operating system: the savings funnel, the KPIs that keep it honest and the review cadence.",
       tldr="A one-off study saves money once. A programme that keeps running saves money every year. Ideas move through a funnel, from first suggestion to money actually saved, and only about one in thirteen makes it all the way. So every idea needs a named owner and a date. A few simple measures and a short monthly review keep it on track.",
       tries=[("Savings Funnel Tracker", "toolkit/savings-funnel-tracker.html")], learn=("Module 12 · Running a VE Programme", "training.html?open=m12")),
  dict(slug="toolkit", old="toolkit", nav="Toolkit", short="Free Toolkit",
       title="Free Value Engineering Templates & Worksheets",
       desc="Seven free, print-ready VE templates with editable Excel versions: FAST worksheet, cost matrix, workshop agenda, savings tracker and more.",
       card="Seven free, print-ready worksheets with editable Excel versions — FAST, matrix, agenda, tracker and more.",
       tldr="Seven practical worksheets, free to download. Each one comes as a page you can print or save as a PDF, and as an Excel file you can fill in. You can use them yourself or within your company, as long as you credit where they came from. Each one links to the course module that shows you how to use it.",
       tries=[], learn=("The VE Academy · all 13 modules", "training.html")),
  dict(slug="glossary", old="glossary", nav="Glossary", short="Glossary",
       title="Value Engineering Glossary: Key Terms Explained",
       desc="Plain-English definitions of key Value Engineering terms — FAST, Value Index, worth, should-cost, cleansheet, LPP, DFMA and target costing.",
       card="Plain-English definitions of the terms that carry every VAVE conversation — searchable.",
       tldr="The terms you’ll come across on this site and in the course, explained in plain English. Start typing in the search box to find one, or share a link that goes straight to a particular term.",
       tries=[("VE Cheat Sheet", "toolkit/ve-cheatsheet.html")], learn=("The VE Academy · free course", "training.html")),
]
BY_OLD = {p["old"]: p for p in PAGES}
BY_SLUG = {p["slug"]: p for p in PAGES}
HOME_IDS = {"top", "about", "playbook", "faq", "diagnose", "engage"}

def read(*parts): return open(os.path.join(SRC, *parts), encoding="utf-8").read()
def write(rel, text):
    path = os.path.join(ROOT, rel); os.makedirs(os.path.dirname(path) or ROOT, exist_ok=True)
    open(path, "w", encoding="utf-8").write(text)

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
    # same seven items as the original one-page nav (Function Analysis is reached from Job Plan and the playbook grid)
    NAV = ["job-plan", "cost-levers", "ideation", "technology", "benchmarking", "industries"]
    items = [("Value Engineering", None, "about")] + [(BY_SLUG[s]["nav"], s, None) for s in NAV]
    out = []
    for label, slug, frag in items:
        if slug is None:
            href = "#about" if here is None else "./#about"
            extra = " data-spy" if here is None else ""
        else:
            href, extra = f"{slug}/", (' class="is-active" aria-current="page"' if slug == here else "")
        out.append(f'      <a href="{href}"{extra}>{label}</a>')
    return "\n".join(out)

def chrome(here):
    c = read("partials", "chrome.html")
    c = c.replace("{{NAV_LINKS}}", nav_links(here))
    c = c.replace("{{HOME_TOP}}", "#top" if here is None else "./")
    c = c.replace("{{DOTNAV}}", '<nav class="dotnav" id="dotnav" aria-label="Section navigation"></nav>\n' if here is None else "")
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
    section = re.sub(r"Twenty-four terms", f"{len(terms)} terms", section)
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
    end_cards += f'<div class="ge-card ge-learn"><h2>Learn it properly</h2><a href="{learn_h}">{html.escape(learn_t)} <span aria-hidden="true">→</span></a><p>Free, narrated and interactive — with a Certificate of Completion.</p></div>'
    pn = '<nav class="ge-pn" aria-label="More of the playbook">'
    pn += (f'<a class="ge-prev" href="{prev_p["slug"]}/"><small>← Previous</small>{html.escape(prev_p["short"])}</a>' if prev_p else '<a class="ge-prev" href="./#playbook"><small>← Back to</small>The playbook overview</a>')
    pn += (f'<a class="ge-next" href="{next_p["slug"]}/"><small>Next →</small>{html.escape(next_p["short"])}</a>' if next_p else '<a class="ge-next" href="training.html"><small>Next →</small>Take the free VE Academy</a>')
    pn += "</nav>"
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

<main>
{body}

<section class="section guide-end">
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

def playbook_section():
    cards = "\n".join(
        f'      <a class="pb-card tilt" href="{p["slug"]}/" data-reveal><span class="pb-n">{i + 1:02d}</span>'
        f'<h3>{html.escape(p["short"])}</h3><p>{p["card"]}</p><span class="pb-go">Read the guide <span aria-hidden="true">→</span></span></a>'
        for i, p in enumerate(PAGES))
    return f'''<section class="section section-alt" id="playbook">
  <div class="container">
    <div class="sec-head">
      <p class="kicker" data-reveal>02 · The Playbook</p>
      <h2 data-reveal data-delay="100">The whole discipline, <span class="grad-text">one topic at a time</span></h2>
      <p class="sec-lede" data-reveal data-delay="200">
        Ten in-depth guides — from the six-phase job plan to teardown benchmarking — each on its own page you can
        bookmark, share and come back to. Read them in order, or start wherever your problem is.
      </p>
    </div>
    <div class="pb-grid" data-stagger>
{cards}
    </div>
  </div>
</section>'''

def build():
    for p in PAGES: CONTENT_IDS[p["slug"]] = ids_in(read("pages", p["slug"] + ".html"))
    CONTENT_IDS[None] = set().union(*(ids_in(read("home", f)) for f in ["hero.html", "about.html", "faq.html", "diagnose.html", "engage.html"])) | {"playbook"}
    footer = read("partials", "footer.html")
    # ── home ──
    home_body = "\n\n".join([read("home", "hero.html"), "<main>", "", read("home", "about.html"), playbook_section(),
                             read("home", "faq.html"), read("home", "diagnose.html"), read("home", "engage.html"), "", "</main>"])
    home = head(None, "VAVEhub — Value Engineering, Product Cost Optimisation & Benchmarking",
                "Free Value Engineering (VAVE) playbook and certified course: the 6-phase job plan, FAST, 36 cost levers, should-costing and teardown benchmarking.",
                SITE, SITE + "og-image.png", "VAVEhub — Value Engineering & Product Cost Optimisation",
                "6-phase VE job plan · 36 cost levers · TRIZ, SCAMPER & FAST ideation · Should-cost, teardown & benchmarking · 8 industry playbooks.",
                read("home", "head-extra.html"),
                extra='<meta name="keywords" content="value engineering, value analysis, VAVE, product cost optimisation, cost reduction, should-cost, cleansheet, teardown benchmarking, value methodology job plan, FAST diagram, TRIZ, DFMA, target costing, design to cost" />\n')
    home += "<body>\n\n" + read("home", "preloader.html") + "\n\n<!-- ══════════ CHROME ══════════ -->\n" + chrome(None) + "\n\n"
    home += rewrite(home_body, None) + "\n\n<!-- ══════════ FOOTER ══════════ -->\n" + rewrite(footer, None) + "\n\n" + SCRIPTS
    write("index.html", home)
    print(f"index.html  {len(home)//1024} KB")
    # ── topic pages ──
    for i, p in enumerate(PAGES):
        body, jsonld, url = guide_page(i, p)
        doc = head(p["slug"], p["title"] + " | VAVEhub", p["desc"], url, f"{SITE}og/{p['slug']}.jpg",
                   p["title"], p["desc"], jsonld)
        doc += '<body class="guide">\n\n<!-- ══════════ CHROME ══════════ -->\n' + chrome(p["slug"]) + "\n\n"
        doc += rewrite(body, p["slug"]) + "\n\n<!-- ══════════ FOOTER ══════════ -->\n" + rewrite(footer, p["slug"]) + "\n\n" + SCRIPTS
        write(f"{p['slug']}/index.html", doc)
        print(f"{p['slug']+'/index.html':34} {len(doc)//1024:>3} KB")
    write_sitemap()
    return PAGES

def write_sitemap():
    """Sitemap is generated too, so it always lists exactly the pages that exist."""
    rows = [("", "1.0", "weekly")] + [(p["slug"] + "/", "0.8", "monthly") for p in PAGES] + [
        ("training.html", "0.9", "weekly"), ("changelog.html", "0.5", "weekly"), ("verify.html", "0.6", "monthly")]
    for f in sorted(os.listdir(os.path.join(ROOT, "toolkit"))):
        if f.endswith(".html") and f != "index.html": rows.append((f"toolkit/{f}", "0.6", "monthly"))
    rows += [("privacy.html", "0.3", "yearly"), ("terms.html", "0.3", "yearly")]
    for path, _, _ in rows:
        target = os.path.join(ROOT, path, "index.html") if path.endswith("/") or path == "" else os.path.join(ROOT, path)
        if not os.path.exists(target): raise SystemExit(f"sitemap: {path} does not exist")
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    xml += [f"  <url><loc>{SITE}{p}</loc><lastmod>{UPDATED}</lastmod><changefreq>{c}</changefreq><priority>{pr}</priority></url>" for p, pr, c in rows]
    write("sitemap.xml", "\n".join(xml + ["</urlset>"]) + "\n")
    print(f"sitemap.xml  {len(rows)} URLs")

if __name__ == "__main__":
    if HEAD_COMMON is None: sys.exit("missing src/partials/head-common.html")
    build()
