"""Tell IndexNow search engines (Bing, Yandex, Seznam, Naver and others) which pages changed.

Run by the deploy workflow after the site is live. Pages are worked out from the files changed
in the push and kept only if they are listed in sitemap.xml, so admin pages, tests and the
search engine ownership files are never sent. With --all it sends every page in the sitemap.
"""
import glob, json, os, re, subprocess, sys, urllib.request

HOST = "valueengineeringhub.com"
SITE = f"https://{HOST}/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def key():
    files = [f for f in glob.glob(os.path.join(ROOT, "*.txt")) if re.fullmatch(r"[0-9a-f]{32}\.txt", os.path.basename(f))]
    if len(files) != 1: sys.exit(f"expected one IndexNow key file, found {len(files)}")
    return os.path.basename(files[0])[:-4]

def sitemap_urls():
    return re.findall(r"<loc>([^<]+)</loc>", open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read())

def url_for(path):
    if not path.endswith(".html"): return None
    if path == "index.html": return SITE
    if path.endswith("/index.html"): return SITE + path[: -len("index.html")]
    return SITE + path

def changed(before):
    rng = f"{before}..HEAD" if before and not set(before) <= {"0"} else "HEAD~1..HEAD"
    out = subprocess.run(["git", "diff", "--name-only", rng], cwd=ROOT, capture_output=True, text=True)
    if out.returncode: return None  # history not available: fall back to everything
    return [p for p in out.stdout.split() if p]

def main():
    listed = sitemap_urls()
    if "--all" in sys.argv: urls = listed
    else:
        files = changed(os.environ.get("BEFORE", ""))
        if files is None: urls = listed
        else:
            want = {url_for(p) for p in files}
            urls = [u for u in listed if u in want]
    if not urls: print("IndexNow: no listed pages changed, nothing to send"); return
    k = key()
    body = json.dumps({"host": HOST, "key": k, "keyLocation": f"{SITE}{k}.txt", "urlList": urls}).encode()
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body,
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: print(f"IndexNow: sent {len(urls)} pages, HTTP {r.status}")
    except urllib.error.HTTPError as e:
        print(f"IndexNow: HTTP {e.code} {e.read()[:200]!r}"); sys.exit(1)
    for u in urls: print("  " + u)

if __name__ == "__main__": main()
