/* Builds the 60-second vertical YouTube Short (1080 × 1920) of the function analysis series.

     node tools/casevid/short.js <dir with cs-short.mp4 and cs-short.json> <out.mp4>

   The sound and the subtitle timings come from the "short" video made by make.js (VOICE=1, in CI): its narration,
   music and scene lengths. The pictures are cut from the five function analysis films (videos/cs-p2*.mp4), cropped
   to the middle of the tall frame (and panned across the FAST diagram), with a headline above and big subtitles
   below drawn by tools/casevid/short.html. The last scene is a full-screen end card. */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT, startServer, launch } = require("../../tests/lib");

const FF = process.env.FFMPEG || "ffmpeg";
const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error("usage: node tools/casevid/short.js <dir with cs-short.mp4/.json> <out.mp4>"); process.exit(1); }
const T = JSON.parse(fs.readFileSync(path.join(src, "cs-short.json"), "utf8"));

// per scene: the headline, and the footage (film, start second, crop x at the start and the end); null = end card
const HEADS = ["£105.20 in parts. <em>£20</em> overspent.", "Every part has a <em>job</em>", "The <em>FAST</em> diagram: how? why?",
  "Unwanted functions <em>cost money</em>", "30% of functions, <em>78%</em> of the cost", ""];
// film 1's scene starts, from the .json made with it: scene 1 is the product turning, then taken apart; scene 9 the lamp
const film = (f) => (fs.existsSync(path.join(src, f)) ? path.join(src, f) : path.join(ROOT, "videos", f));
const A = JSON.parse(fs.readFileSync(film("cs-p2a.json"), "utf8")), aAt = (i) => A.slice(0, i).reduce((x, y) => x + y.dur, 0);
const CLIPS = [["cs-p2a.mp4", aAt(1) + 0.3, 470, 470, 900, 264],   // [film, start, crop x from, to, crop width, crop top]; this one sits below the film's label
  ["cs-p2a.mp4", aAt(9) + 1.3, 800, 800], ["cs-p2c.mp4", 94.5, 0, 700],
  ["cs-p2d.mp4", 99.5, 420, 520], ["cs-p2d.mp4", 142, 0, 120], null];
const CW = 1100, CH = Math.round(CW * 780 / 1080), CY = 100;   // the crop of the 1920 × 1080 film that fills the 1080 × 780 window

(async () => {
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "vh-short-"));
  // 1. overlays
  const port = 8900 + Math.floor(Math.random() * 90), server = await startServer(port), browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await page.goto(`http://127.0.0.1:${port}/tools/casevid/short.html`); await page.evaluate(() => document.fonts.ready);
  const shot = async (what, d, file) => { await page.evaluate(([w, x]) => window.draw(w, x), [what, d]); await page.screenshot({ path: path.join(tmp, file), omitBackground: what !== "bg" && what !== "end" }); return path.join(tmp, file); };
  await shot("bg", "", "bg.png");
  // short subtitles for a phone: split each line at sentence ends, then at commas and colons, into pieces of 9 words or fewer
  const pieces = (text) => text.replace(/\.com/g, "\u2024com").match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g).flatMap((sen) => {
    const parts = sen.trim().split(/(?<=[,:;?])\s+/), out = [];
    parts.forEach((p) => { const last = out[out.length - 1]; if (last && last.split(" ").length + p.split(" ").length <= 9) out[out.length - 1] = last + " " + p; else out.push(p); });
    return out.flatMap((p) => { const w = p.split(" "); if (w.length <= 10) return [p]; const h = Math.ceil(w.length / 2); return [w.slice(0, h).join(" "), w.slice(h).join(" ")]; });
  }).map((x) => x.replace(/\u2024/g, "."));
  let t0 = 0; const caps = [];
  for (const [i, s] of T.entries()) {
    s.start = t0;
    const ps = pieces(s.chunks.map((c) => c.text).join(" ")), len = ps.reduce((a, x) => a + x.length, 0); let at = 0.3;
    s.chunks = ps.map((text) => { const c = { at, text }; at += s.voDur * text.length / len; return c; });
    s.chunks.forEach((c, j) => { const a = t0 + c.at - 0.1, b = j + 1 < s.chunks.length ? t0 + s.chunks[j + 1].at - 0.1 : t0 + s.dur - 0.15; caps.push({ a, b, text: c.text }); });
    t0 += s.dur;
  }
  // one picture for each stretch of time in which the headline, subtitle and end card stay the same
  const total = t0, cuts = [...new Set([0, total, ...T.map((x) => x.start), ...caps.flatMap((c) => [c.a, c.b])].map((x) => Math.max(0, Math.min(total, +x.toFixed(3)))))].sort((a, b) => a - b);
  const layers = [];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const a = cuts[k], b = cuts[k + 1], m = (a + b) / 2; if (b - a < 0.01) continue;
    const i = T.findIndex((x) => m >= x.start && m < x.start + x.dur), c = caps.find((x) => m >= x.a && m < x.b);
    layers.push({ d: b - a, file: await shot("layer", { head: HEADS[i], cap: c && c.text, end: CLIPS[i] === null }, `layer${k}.png`) });
  }
  await browser.close(); server.close();

  // 2. footage: each scene's clip, cropped (and panned) into the 1080 × 780 window
  const segs = [];
  for (const [i, c] of CLIPS.entries()) {
    if (!c) continue;
    const [fname, ss, x0, x1, cw = CW, cy = CY] = c, d = T[i].dur, f = path.join(tmp, `seg${i}.mp4`), ch = Math.round(cw * 780 / 1080);
    execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(ss), "-t", d.toFixed(3), "-i", film(fname), "-an",
      "-vf", `crop=${cw}:${ch}:'${x0}+(${x1 - x0})*min(t/${d.toFixed(3)},1)':${cy},scale=1080:780,fade=in:st=0:d=0.25,fade=out:st=${(d - 0.25).toFixed(3)}:d=0.25,fps=30,format=yuv420p`,
      "-c:v", "libx264", "-preset", "medium", "-crf", "18", f], { stdio: "inherit" });
    segs.push(f);
  }
  fs.writeFileSync(path.join(tmp, "segs.txt"), segs.map((f) => `file '${f}'`).join("\n"));
  const mid = path.join(tmp, "mid.mp4");
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "segs.txt"), "-c", "copy", mid], { stdio: "inherit" });

  // 3. the layers as one video with transparency, then everything together with the narration and music
  fs.writeFileSync(path.join(tmp, "layers.txt"), layers.map((l) => `file '${l.file}'\nduration ${l.d.toFixed(3)}`).join("\n") + `\nfile '${layers[layers.length - 1].file}'`);
  const ovl = path.join(tmp, "layers.mov");
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "layers.txt"), "-vf", "fps=30,format=argb", "-c:v", "qtrle", "-t", total.toFixed(3), ovl], { stdio: "inherit" });
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-framerate", "30", "-t", total.toFixed(3), "-i", path.join(tmp, "bg.png"), "-i", mid, "-i", ovl, "-i", path.join(src, "cs-short.mp4"),
    "-filter_complex", "[0][1]overlay=0:600:eof_action=pass[a];[a][2]overlay=0:0:eof_action=pass,format=yuv420p[v]", "-map", "[v]", "-map", "3:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-t", total.toFixed(3),
    "-movflags", "+faststart", "-metadata", "title=Function analysis in 60 seconds", "-metadata", "artist=Avinash Bhosale",
    "-metadata", "copyright=© 2026 Avinash Bhosale · VAVEhub. All rights reserved.", "-metadata", "comment=valueengineeringhub.com", out], { stdio: "inherit" });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Short: ${total.toFixed(1)} s → ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
