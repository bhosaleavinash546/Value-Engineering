/* Shared helpers for the VAVEhub test suites.
   - a tiny static server that behaves like GitHub Pages (index.html for folders,
     byte ranges so audio can seek, 404.html for missing pages)
   - a browser launcher (set CHROMIUM_PATH to use a pre-installed Chromium)
   - demo mode: serves site-config.js with Supabase switched off, so Academy tests
     run without a real account and without touching the file on disk
   - a small pass/fail recorder */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".mp3": "audio/mpeg", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain", ".xlsx": "application/octet-stream" };

function startServer(port) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
    let file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      return fs.createReadStream(path.join(ROOT, "404.html")).pipe(res);
    }
    const size = fs.statSync(file).size, type = TYPES[path.extname(file)] || "application/octet-stream";
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (m) {
      const start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
      res.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": size });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok(server)));
}

function launch() {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
}

// Demo mode: Supabase off, and a signed-in demo learner.
async function demoContext(browser, opts = {}, learner = { name: "Test Learner", email: "test@example.com" }) {
  const ctx = await browser.newContext(opts);
  const cfg = fs.readFileSync(path.join(ROOT, "site-config.js"), "utf8")
    .replace(/(supabaseUrl:\s*)"[^"]*"/, '$1""').replace(/(supabaseAnonKey:\s*)"[^"]*"/, '$1""');
  await ctx.route("**/site-config.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: cfg }));
  if (learner) await ctx.addInitScript((l) => localStorage.setItem("vh-session", JSON.stringify({ ...l, at: Date.now() })), learner);
  return ctx;
}

function recorder(name) {
  const r = { name, pass: 0, fail: 0, failures: [] };
  r.ok = (cond, label) => {
    if (cond) { r.pass++; console.log("  ✓ " + label); }
    else { r.fail++; r.failures.push(label); console.log("  ✗ FAIL: " + label); }
  };
  return r;
}

// Watch a page for script errors (ignoring blocked third-party network calls).
function trackErrors(page, list) {
  page.on("pageerror", (e) => list.push(page.url() + " :: " + e.message));
}

module.exports = { ROOT, startServer, launch, demoContext, recorder, trackErrors };
