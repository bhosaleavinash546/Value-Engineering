// Crawl the whole site from the homepage: every internal link must resolve,
// and every #anchor must point at an id that exists on the target page.
module.exports = async function links({ browser, O, r }) {
  const p = await (await browser.newContext()).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(p.url() + " :: " + e.message));
  const seen = new Map(), queue = [O + "/"], found = [], ids = new Map();
  ["training.html", "certificate.html", "verify.html", "auth.html", "privacy.html", "terms.html", "changelog.html"].forEach((x) => queue.push(`${O}/${x}`));
  while (queue.length) {
    const url = queue.shift().split("#")[0];
    if (seen.has(url)) continue;
    if (!/\.html$|\/$/.test(url)) { // downloads (spreadsheets etc.): just check the file is served
      const res = await p.request.get(url).catch(() => null);
      seen.set(url, res ? res.status() : 0); continue;
    }
    const res = await p.goto(url, { waitUntil: "load" }).catch(() => null);
    const status = res ? res.status() : 0; seen.set(url, status);
    if (status !== 200 || !/\.html$|\/$/.test(url)) continue;
    await p.waitForTimeout(200);
    ids.set(url, await p.evaluate(() => [...document.querySelectorAll("[id]")].map((e) => e.id)));
    for (const h of await p.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.href))) {
      if (!h.startsWith(O)) continue;
      found.push([url, h]);
      const t = h.split("#")[0];
      if (!seen.has(t) && !queue.includes(t)) queue.push(t);
    }
  }
  const pages = [...seen].filter(([u, s]) => s === 200 && /\.html$|\/$/.test(u)).length;
  r.ok(pages >= 25, `crawled ${pages} pages and ${found.length} links`);
  const bad = [...seen].filter(([, s]) => s !== 200).map(([u, s]) => `${u.replace(O, "")} (${s})`);
  r.ok(!bad.length, `no broken links${bad.length ? ": " + bad.join(", ") : ""}`);
  const badFrag = new Set();
  for (const [from, h] of found) {
    const [t, frag] = h.split("#");
    if (!frag || frag === "top") continue;
    const list = ids.get(t);
    if (list && !list.includes(decodeURIComponent(frag))) badFrag.add(`${from.replace(O, "")} → ${h.replace(O, "")}`);
  }
  r.ok(!badFrag.size, `no broken #anchors${badFrag.size ? ": " + [...badFrag].slice(0, 10).join(", ") : ""}`);
  r.ok(!errs.length, `no script errors while crawling${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
  await p.context().close();
};
