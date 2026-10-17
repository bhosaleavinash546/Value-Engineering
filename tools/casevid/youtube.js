/* Joins the function analysis films into the YouTube version, and writes its chapter list.

     node tools/casevid/youtube.js <dir with the new pieces> <closing video> <out.mp4>

   Order: the cold open (cs-ytopen), film 1 (cs-p2a, from the dir), then a teaser (cs-ytb1..4) before each of films
   2 to 5 (videos/cs-p2b..e), the payoff (cs-ytpay) and the closing. Two badges give the challenge answers at the
   moment each is revealed. Writes <out>.chapters.txt beside the video. */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT, startServer, launch } = require("../../tests/lib");

const FF = process.env.FFMPEG || "ffmpeg";
const [dir, closing, out] = process.argv.slice(2);
if (!dir || !closing || !out) { console.error("usage: node tools/casevid/youtube.js <dir> <closing.mp4> <out.mp4>"); process.exit(1); }
const dur = (f) => { try { execFileSync(FF, ["-hide_banner", "-i", f], { stdio: "pipe" }); } catch (e) { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(e.stderr)); if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3]; } throw new Error("no duration: " + f); };

// scene starts in films 2 to 5 (seconds, measured from the published films); film 1's come from its .json
const STARTS = {
  p2b: [0, 15, 38, 55, 66, 82, 101, 120, 134, 155, 174, 201, 218],
  p2c: [0, 13, 21, 37, 59, 71, 93, 122, 146, 173, 187, 204, 221, 240, 259],
  p2d: [0, 10, 24, 52, 71, 83, 99, 120, 138, 158, 178],
  p2e: [0, 9, 25, 51, 67, 93, 114, 134, 165, 190, 213, 231, 245],
};
const film = (id) => (id === "p2a" ? path.join(dir, "cs-p2a.mp4") : path.join(ROOT, "videos", `cs-${id}.mp4`));
const PARTS = [["ytopen", path.join(dir, "cs-ytopen.mp4")], ["p2a", film("p2a")], ["ytb1", path.join(dir, "cs-ytb1.mp4")], ["p2b", film("p2b")],
  ["ytb2", path.join(dir, "cs-ytb2.mp4")], ["p2c", film("p2c")], ["ytb3", path.join(dir, "cs-ytb3.mp4")], ["p2d", film("p2d")],
  ["ytb4", path.join(dir, "cs-ytb4.mp4")], ["p2e", film("p2e")], ["ytpay", path.join(dir, "cs-ytpay.mp4")], ["ytend", closing]];
const at = {}; let t = 0;
for (const [id, f] of PARTS) { at[id] = t; t += dur(f); }
const total = t;
const a = JSON.parse(fs.readFileSync(path.join(dir, "cs-p2a.json"), "utf8")); let s = 0;
STARTS.p2a = a.map((x) => { const v = s; s += x.dur; return v; });
const T = (id, i) => at[id] + STARTS[id][i];

// chapters (a teaser belongs to the film after it)
const CH = [
  [0, "The challenge: where is the £20?"],
  [at.p2a, "Film 1: Why functions? The heart of value engineering"], [T("p2a", 1), "The product: a 3LCD classroom projector, whole and taken apart"],
  [T("p2a", 4), "Customers buy what parts do"], [T("p2a", 5), "Where function analysis came from: General Electric and Lawrence Miles"],
  [T("p2a", 6), "Value = Function ÷ Cost"], [T("p2a", 7), "Why analyse functions"], [T("p2a", 8), "The seven steps of function analysis"],
  [T("p2a", 9), "One part, one question: what does the lamp do?"],
  [at.ytb1, "Film 2: Naming and classifying functions"], [T("p2b", 1), "Step 2.1: the rules for an active verb and a measurable noun"],
  [T("p2b", 2), "Weak function names and better ones"], [T("p2b", 3), "Pause and try: the fold mirror"],
  [T("p2b", 5), "Every part's function, group by group (3D)"], [T("p2b", 9), "How part functions roll up: homogenise light"],
  [T("p2b", 10), "Step 2.2: basic, secondary, unwanted and esteem functions"], [T("p2b", 11), "Unwanted functions: heat, UV, interference, noise, energy"],
  [at.ytb2, "Film 3: The FAST diagram, step by step"], [T("p2c", 1), "Start with the basic function"],
  [T("p2c", 2), "Higher-order function and scope lines"], [T("p2c", 3), "Building the critical path with HOW?"],
  [T("p2c", 6), "Testing the logic with WHY?"], [T("p2c", 7), "AND functions: more than one answer to how"],
  [T("p2c", 8), "When functions below the path"], [T("p2c", 9), "Unwanted functions on the FAST diagram"],
  [T("p2c", 10), "What unwanted functions drag in"], [T("p2c", 11), "All-time and esteem functions"],
  [T("p2c", 12), "User and one-time functions"], [T("p2c", 13), "Design criteria and the study objective"],
  [at.ytb3, "Film 4: Costing the functions"], [T("p2d", 2), "Sharing a part's cost among its functions"],
  [T("p2d", 3), "The function cost matrix"], [T("p2d", 4), "The costed FAST diagram"],
  [T("p2d", 5), "Where the cost sits (challenge 1 answered)"], [T("p2d", 6), "Cost driven by unwanted functions"],
  [T("p2d", 8), "Step 2.5: the Pareto chart of function costs"], [T("p2d", 9), "The top 30% of functions"],
  [at.ytb4, "Film 5: Worth, value and targets"], [T("p2e", 1), "Step 2.6: what worth means"],
  [T("p2e", 2), "Five ways to set worth"], [T("p2e", 3), "A benchmark that can't set the worth: 3LCD vs DLP"],
  [T("p2e", 4), "Value gap and value index"], [T("p2e", 5), "The worst value in the projector (challenge 2 answered)"],
  [T("p2e", 6), "The biggest value gaps"], [T("p2e", 7), "The customer's view: a paired comparison"],
  [T("p2e", 8), "Importance against cost: the value graph"], [T("p2e", 9), "Step 2.7: clues from the costed FAST diagram"],
  [T("p2e", 10), "The targets"], [T("p2e", 11), "The question for every target"], [T("p2e", 12), "Gate check before the creative phase"],
  [at.ytpay, "The payoff: where the £20 was hiding"], [at.ytend, "Free courses and certificates at valueengineeringhub.com"],
];
const fmt = (x) => { x = Math.floor(x); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`; };

// the two answers, shown when each is revealed
const BADGES = [
  { k: "Challenge 1 · the answer", v: "B · About 57%", a: T("p2d", 5) + 2.5, b: T("p2d", 6) - 0.4 },
  { k: "Challenge 2 · the answer", v: "C · Receive signal", a: T("p2e", 5) + 8.5, b: T("p2e", 6) - 0.4 },
];

(async () => {
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "vh-yt-"));
  const port = 8900 + Math.floor(Math.random() * 90), server = await startServer(port), browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await page.goto(`http://127.0.0.1:${port}/tools/casevid/short.html`); await page.evaluate(() => document.fonts.ready);
  for (const [i, b] of BADGES.entries()) {
    await page.evaluate((b) => {
      document.documentElement.style.cssText = "width:1920px;height:1080px"; document.body.style.cssText = "width:1920px;height:1080px;margin:0;background:transparent";
      document.getElementById("root").innerHTML = `<div style="position:absolute;right:60px;top:26px;padding:16px 30px;border-radius:18px;background:rgba(6,20,14,.94);border:3px solid #3fd08a;box-shadow:0 14px 40px rgba(0,0,0,.5);text-align:right">
        <div style="font:700 20px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#3fd08a">${b.k}</div>
        <div style="font:800 46px 'IBM Plex Sans',sans-serif;color:#fff;margin-top:4px">${b.v}</div></div>`;
    }, b);
    b.file = path.join(tmp, `badge${i}.png`); await page.screenshot({ path: b.file, omitBackground: true });
  }
  await browser.close(); server.close();

  fs.writeFileSync(path.join(tmp, "list.txt"), PARTS.map(([, f]) => `file '${path.resolve(f)}'`).join("\n"));
  const inputs = ["-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt")];
  let g = "[0:v]null[v0]", last = "v0";
  BADGES.forEach((b, i) => {
    inputs.push("-loop", "1", "-framerate", "30", "-t", total.toFixed(3), "-i", b.file);
    g += `;[${i + 1}]format=rgba,fade=in:st=${b.a.toFixed(2)}:d=0.35:alpha=1,fade=out:st=${(b.b - 0.35).toFixed(2)}:d=0.35:alpha=1[b${i}];[${last}][b${i}]overlay=0:0:enable='between(t,${b.a.toFixed(2)},${b.b.toFixed(2)})'[v${i + 1}]`;
    last = `v${i + 1}`;
  });
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", g, "-map", `[${last}]`, "-map", "0:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", total.toFixed(3),
    "-movflags", "+faststart", "-metadata", "title=Where Is the £20? Function Analysis of a £105 Projector, Step by Step", "-metadata", "artist=Avinash Bhosale",
    "-metadata", "copyright=© 2026 Avinash Bhosale · VAVEhub. All rights reserved.", "-metadata", "comment=valueengineeringhub.com", out], { stdio: "inherit" });
  fs.writeFileSync(out.replace(/\.mp4$/, "") + ".chapters.txt", CH.map(([x, n]) => `${fmt(x)} ${n}`).join("\n") + "\n");
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`YouTube version: ${fmt(total)} → ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
