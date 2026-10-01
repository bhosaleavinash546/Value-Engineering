"""Lists Wikimedia Commons files (by category or name) with their licence
details, and downloads them for review. Used by media-candidates.yml.

  thumbs/  small previews of every file found in the categories
  full/    1600px copies of the files named in FILES
  meta.json  title, licence, author, credit, description and source page
"""
import json, os, re, sys, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "VAVEhub-media-review/1.0 (https://valueengineeringhub.com)"}
OUT = sys.argv[1]


def get(params):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)


def download(url, path):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r, open(path, "wb") as f:
                f.write(r.read())
            return True
        except Exception as e:  # rate limits: wait and retry
            print("retry", url, e)
            time.sleep(5 * (attempt + 1))
    return False


def strip(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def info(titles, width):
    out = []
    for i in range(0, len(titles), 40):
        d = get({"action": "query", "titles": "|".join(titles[i:i + 40]), "prop": "imageinfo",
                 "iiprop": "url|size|extmetadata|mime", "iiurlwidth": width})
        for p in d.get("query", {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            m = ii.get("extmetadata", {})
            val = lambda k: strip(m.get(k, {}).get("value", ""))
            out.append({"title": p.get("title"), "mime": ii.get("mime"), "width": ii.get("width"),
                        "height": ii.get("height"), "thumb": ii.get("thumburl"), "page": ii.get("descriptionurl"),
                        "licence": val("LicenseShortName"), "licence_url": val("LicenseUrl"),
                        "author": val("Artist"), "credit": val("Credit"), "attribution_required": val("AttributionRequired"),
                        "description": val("ImageDescription")[:400], "date": val("DateTimeOriginal")})
    return out


def safe(title):
    return re.sub(r"[^A-Za-z0-9._-]+", "_", title.replace("File:", ""))[:120]


os.makedirs(f"{OUT}/thumbs", exist_ok=True)
os.makedirs(f"{OUT}/full", exist_ok=True)
meta = {"categories": {}, "files": []}

for cat in [c.strip() for c in os.environ.get("CATS", "").split("|") if c.strip()]:
    d = get({"action": "query", "list": "categorymembers", "cmtitle": "Category:" + cat,
             "cmtype": "file", "cmlimit": 60})
    titles = [m["title"] for m in d.get("query", {}).get("categorymembers", [])]
    items = [x for x in info(titles, 360) if (x["mime"] or "").startswith("image/")]
    for x in items:
        if x["thumb"]:
            x["saved"] = f"thumbs/{safe(cat)}__{safe(x['title'])}.jpg"
            download(x["thumb"], f"{OUT}/{x['saved']}")
            time.sleep(0.5)
    meta["categories"][cat] = items
    print(cat, len(items))

names = [f.strip() for f in os.environ.get("FILES", "").split("|") if f.strip()]
if names:
    for x in info([n if n.startswith("File:") else "File:" + n for n in names], 1600):
        if x["thumb"]:
            x["saved"] = f"full/{safe(x['title'])}"
            download(x["thumb"], f"{OUT}/{x['saved']}")
        meta["files"].append(x)

with open(f"{OUT}/meta.json", "w") as f:
    json.dump(meta, f, indent=1, ensure_ascii=False)
print("done")
