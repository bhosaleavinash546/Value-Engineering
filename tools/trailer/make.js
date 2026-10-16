/* Builds the course trailers: videos/trailer-academy.mp4 and videos/trailer-leaders.mp4,
   each with a poster (.webp) and captions (.vtt).

     node tools/trailer/make.js academy leaders

   1. Voice-over: with VOICE=1 each line is spoken by edge-tts (en-GB-RyanNeural) and its
      length measured; without it, lengths are estimated so the pictures can be checked.
   2. Scene lengths follow the voice-over, never shorter than the scene's minimum.
   3. Pictures: tools/trailer/stage.html draws each scene, captured frame by frame at 1080p;
      montage scenes lay a title and caption over a few seconds of a course video, with the
      course video's own subtitles covered.
   4. Sound: the voice lines, plus whooshes and hits made with ffmpeg (no music, so nothing
      to license). Loudness is normalised.
   Needs ffmpeg (FFMPEG=path, or on PATH) and Playwright's Chromium (CHROMIUM_PATH optional). */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT, startServer, launch, demoContext } = require("../../tests/lib");

const FF = process.env.FFMPEG || "ffmpeg";
const FPS = 30, VOICE = process.env.VOICE === "1";
const TMP = path.join(process.env.TRAILER_TMP || require("os").tmpdir(), "vh-trailer");
const ff = (args) => execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });

const PLANS = {
  academy: {
    end: { headline: "Find the cost hiding in <span style='color:#4d8dff'>every product</span>", course: "VE Academy", url: "valueengineeringhub.com/training.html" },
    scenes: [
      { id: "cold", min: 4.2, vo: "This kettle costs nine pounds to make.", hits: [1.6] },
      { id: "tags", min: 5.6, vo: "Sixty-two pence of that could go, and most buyers would never notice.", hits: [2.9] },
      { id: "counter", min: 6, vo: "Across a quarter of a million kettles, that's a hundred and fifty-five thousand pounds. Every year.", hits: ["0.66"] },
      { id: "twist", min: 4.2, vo: "It isn't hiding in the price. It's hiding in the design.", hits: ["0.45"] },
      { id: "method", min: 3, vo: "Value engineers find it with a method." },
      { id: "ttl", clip: "fast-diagram", at: 46, min: 3, title: "Find the jobs", vo: "See the product as a set of jobs.", hits: [0] },
      { id: "tear", min: 3.6, title: "Take it apart", vo: "Take the competition apart.", hits: [0] },
      { id: "ttl", clip: "should-cost", at: 47, min: 3, title: "Cost it honestly", vo: "Cost every layer honestly.", hits: [0] },
      { id: "ttl", clip: "brainwriting", at: 46, min: 3, title: "Out-think it", vo: "Then out-think the design.", hits: [0] },
      { id: "proof", min: 7.5, vo: "It's how IBM cut a printer from a hundred and fifty-two parts to thirty-two, and how US highway projects found one point seven billion dollars a year.", hits: [0.3, "+1", "+2"] },
      { id: "course", min: 6.5, vo: "Thirteen narrated modules. Labs, not lectures. And you finish with your own value study.", shots: true },
      { id: "cert", min: 4.6, vo: "Plus a certificate anyone can check. All free.", cert: true, hits: [1.1, "0.62"] },
      { id: "end", min: 4.4, vo: "Find the cost hiding in every product." },
    ],
  },
  leaders: {
    end: { headline: "Your next point of margin is <span style='color:#4d8dff'>hiding in your products</span>", course: "VAVE for Leaders", url: "valueengineeringhub.com/leaders.html" },
    scenes: [
      { id: "lsave", min: 6.5, vo: "An engineer saves fifty pence on a part you make two hundred thousand times a year. That's a hundred thousand pounds of extra profit.", hits: [0, 0.9, 2.2] },
      { id: "lsales", min: 6.5, vo: "To make the same profit from new sales, at an eight per cent margin, you'd have to sell one and a quarter million pounds more.", hits: ["0.62"] },
      { id: "lcurve", min: 4.6, vo: "And most of a product's cost is decided before production even starts.", hits: [1.7] },
      { id: "lfive", min: 5.6, vo: "VAVE for Leaders: one hour on what it pays back, and the five things only leaders can do.", hits: [] },
      { id: "end", min: 4.4, vo: "Your next point of margin is hiding in your products." },
    ],
  },
};

const words = (s) => s.split(/\s+/).length;
function duration(file) {
  try { execFileSync(FF, ["-hide_banner", "-i", file], { stdio: "pipe" }); } catch (e) {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(e.stderr));
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  }
  throw new Error("no duration for " + file);
}

async function voice(course, plan, dir) {
  for (const [i, s] of plan.scenes.entries()) {
    s.voFile = path.join(dir, `vo-${i}.mp3`);
    if (VOICE) {
      execFileSync("edge-tts", ["--voice", "en-GB-RyanNeural", "--rate", "+4%", "--text", s.vo, "--write-media", s.voFile], { stdio: "inherit" });
      s.voDur = duration(s.voFile);
    } else { s.voFile = null; s.voDur = words(s.vo) / 2.7 + 0.3; }
    s.dur = Math.max(s.min, s.voDur + 0.9);
  }
}

async function assets(browser, O) {
  // three screens from the real course, and a sample certificate (kept in tools/trailer/cache, not committed)
  const dir = path.join(ROOT, "tools", "trailer", "cache"); fs.mkdirSync(dir, { recursive: true });
  const shot = async (url, name, prep, sel) => {
    const ctx = await demoContext(browser, { viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => { try { localStorage.setItem("vf-theme", "dark"); localStorage.setItem("vh-focus", "0"); } catch (e) {} });
    const p = await ctx.newPage(); await p.goto(O + url); await p.waitForTimeout(1500);
    if (prep) await prep(p);
    await p.waitForTimeout(700);
    const file = path.join(dir, name);
    if (sel) await p.locator(sel).screenshot({ path: file, type: "jpeg", quality: 90 });
    else await p.screenshot({ path: file, type: "jpeg", quality: 90 });
    await ctx.close();
    return "cache/" + name;
  };
  return {
    shots: [
      await shot("/training.html?open=m4", "s1.jpg", async (p) => {
        await p.keyboard.press("f"); await p.waitForTimeout(500);
        await p.evaluate(() => { const e = document.querySelector(".tmod.is-visible .fast-builder"); if (e) scrollTo({ top: e.getBoundingClientRect().top + scrollY - 90, behavior: "instant" }); });
      }),
      await shot("/training.html?open=m6", "s2.jpg", async (p) => {
        await p.evaluate(() => { const e = document.querySelector(".tmod.is-visible .ve-lab"); if (e) scrollTo({ top: e.getBoundingClientRect().top + scrollY - 100, behavior: "instant" }); });
      }),
      await shot("/capstone.html", "s3.jpg"),
    ],
    cert: await shot("/training.html", "cert.jpg", async (p) => {
      await p.evaluate(() => {
        const w = document.getElementById("certWrap"); w.hidden = false;
        document.getElementById("certName").textContent = "Your Name";
        document.getElementById("certDate").textContent = "16 October 2026";
        document.getElementById("certId").textContent = "SAMPLE";
        w.scrollIntoView({ block: "center" });
      });
    }, "#cert"),
  };
}

async function renderScene(page, s, data, dir, n) {
  const frames = Math.round(s.dur * FPS), fdir = path.join(dir, `f${n}`);
  fs.mkdirSync(fdir, { recursive: true });
  await page.evaluate(({ id, data, dur, cap }) => window.setup(id, data, dur, cap), { id: s.id, data, dur: s.dur, cap: s.vo });
  const overlay = !!s.clip;
  for (let i = 0; i < frames; i++) {
    await page.evaluate(({ id, t }) => window.frame(id, t), { id: s.id, t: i / FPS });
    await page.screenshot({ path: path.join(fdir, `${String(i).padStart(5, "0")}.${overlay ? "png" : "jpg"}`), type: overlay ? "png" : "jpeg", quality: overlay ? undefined : 92, omitBackground: overlay });
  }
  const segFile = path.join(dir, `seg${String(n).padStart(2, "0")}.mp4`);
  const enc = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20", "-r", String(FPS)];
  if (!overlay) ff(["-framerate", String(FPS), "-i", path.join(fdir, "%05d.jpg"), ...enc, segFile]);
  else {
    // a few seconds of the course video, its own subtitle strip covered, with the title and caption on top
    ff(["-ss", String(s.at), "-t", s.dur.toFixed(3), "-i", path.join(ROOT, "videos", s.clip + ".mp4"),
      "-framerate", String(FPS), "-i", path.join(fdir, "%05d.png"),
      "-filter_complex", "[0:v]scale=1920:1080,fps=30,drawbox=x=0:y=88:w=1920:h=100:color=0x0a111f@1:t=fill,drawbox=x=0:y=880:w=1920:h=200:color=0x060a16@1:t=fill[v];[v][1:v]overlay=0:0:shortest=1[o]",
      "-map", "[o]", "-an", ...enc, segFile]);
  }
  fs.rmSync(fdir, { recursive: true, force: true });
  return segFile;
}

function sounds(dir) {
  // whoosh: a swept band of noise; hit: a low thump with a click on top
  const w = path.join(dir, "whoosh.wav"), h = path.join(dir, "hit.wav");
  ff(["-f", "lavfi", "-i", "anoisesrc=c=pink:d=0.55:a=0.6", "-af", "highpass=f=300,lowpass=f=4000,afade=t=in:d=0.25,afade=t=out:st=0.25:d=0.3,volume=0.35", w]);
  ff(["-f", "lavfi", "-i", "sine=f=58:d=0.45", "-f", "lavfi", "-i", "anoisesrc=c=white:d=0.05:a=0.5",
    "-filter_complex", "[0]afade=t=out:st=0:d=0.45,volume=1.6[a];[1]highpass=f=2000,volume=0.25[b];[a][b]amix=inputs=2:normalize=0", h]);
  return { w, h };
}

async function build(course, browser, O) {
  const plan = JSON.parse(JSON.stringify(PLANS[course]));
  const dir = path.join(TMP, course); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  await voice(course, plan, dir);
  const needs = plan.scenes.some((s) => s.shots || s.cert);
  const A = needs ? await assets(browser, O) : {};
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(O + "/tools/trailer/stage.html"); await page.waitForTimeout(500);
  if (process.env.PREVIEW) {
    for (const [n, s] of plan.scenes.entries()) {
      const data = s.id === "end" ? plan.end : { title: s.title, shots: s.shots ? A.shots : null, cert: s.cert ? A.cert : null };
      await page.evaluate(({ id, data, dur, cap }) => window.setup(id, data, dur, cap), { id: s.id, data, dur: s.dur, cap: s.vo });
      for (const f of [0.35, 0.7, 0.98]) {
        await page.evaluate(({ id, t }) => window.frame(id, t), { id: s.id, t: s.dur * f });
        await page.screenshot({ path: path.join(process.env.PREVIEW, `${course}-${String(n).padStart(2, "0")}-${s.id}-${Math.round(f * 100)}.jpg`), type: "jpeg", quality: 80 });
      }
    }
    await ctx.close();
    console.log(`  ${course}: stills written to ${process.env.PREVIEW}`);
    return;
  }
  const segs = [];
  for (const [n, s] of plan.scenes.entries()) {
    const data = s.id === "end" ? plan.end : { title: s.title, shots: s.shots ? A.shots : null, cert: s.cert ? A.cert : null };
    process.stdout.write(`  ${course} scene ${n + 1}/${plan.scenes.length} (${s.id}, ${s.dur.toFixed(1)} s)\n`);
    segs.push(await renderScene(page, s, data, dir, n));
  }
  await ctx.close();

  // join the pictures
  const list = path.join(dir, "list.txt");
  fs.writeFileSync(list, segs.map((f) => `file '${f}'`).join("\n"));
  const silent = path.join(dir, "silent.mp4");
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);

  // the sound track: voice lines at each scene start, music underneath (dipping while the voice speaks),
  // whooshes on the cuts and hits on the big moments
  const total = plan.scenes.reduce((a, s) => a + s.dur, 0);
  const sfx = sounds(dir), vo = [], fx = [], cues = [];
  let t = 0;
  const starts = [];
  for (const s of plan.scenes) {
    starts.push({ id: s.id, start: t, dur: s.dur });
    if (s.voFile) vo.push([s.voFile, t + 0.25]);
    if (t > 0) fx.push([sfx.w, Math.max(0, t - 0.2), 0.8]);
    (s.hits || []).forEach((hv) => {
      const at = typeof hv === "string" ? (hv.startsWith("+") ? (s.hits[0] + Math.min(1.4, s.dur / 4.2) * +hv.slice(1)) : s.dur * +hv) : hv;
      fx.push([sfx.h, t + at, 0.9]);
    });
    cues.push([t + 0.25, t + s.dur - 0.1, s.vo]);
    t += s.dur;
  }
  const planFile = path.join(dir, "music-plan.json"), music = path.join(dir, "music.wav");
  fs.writeFileSync(planFile, JSON.stringify({ course, scenes: starts }));
  execFileSync(process.env.PYTHON || "python3", [path.join(__dirname, "music.py"), planFile, music], { stdio: "inherit" });
  const inputs = ["-i", music], parts = [];
  let k = 1;
  const delay = (x) => `adelay=${Math.round(x * 1000)}|${Math.round(x * 1000)}`;
  vo.forEach(([f, at]) => { inputs.push("-i", f); parts.push(`[${k}]aformat=channel_layouts=stereo,${delay(at)}[v${k}]`); k++; });
  const voLabels = vo.map((_, i) => `[v${i + 1}]`).join("");
  fx.forEach(([f, at, g]) => { inputs.push("-i", f); parts.push(`[${k}]aformat=channel_layouts=stereo,${delay(at)},volume=${g}[f${k}]`); k++; });
  const fxLabels = fx.map((_, i) => `[f${vo.length + i + 1}]`).join("");
  let graph = parts.join(";") + ";";
  if (vo.length) {
    graph += `${voLabels}amix=inputs=${vo.length}:normalize=0:duration=longest,apad,atrim=0:${total.toFixed(2)},asplit=2[voA][voK];`;
    graph += `[0]volume=0.42[mus];[mus][voK]sidechaincompress=threshold=0.02:ratio=6:attack=30:release=450:makeup=1[duck];`;
    graph += `[voA][duck]${fxLabels}amix=inputs=${2 + fx.length}:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  } else {
    graph += `[0]volume=0.42[mus];[mus]${fxLabels}amix=inputs=${1 + fx.length}:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  }
  const wav = path.join(dir, "mix.wav");
  ff([...inputs, "-filter_complex", graph, "-map", "[aout]", "-ar", "48000", "-t", total.toFixed(2), wav]);
  const audio = ["-i", wav, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "160k"];
  const out = path.join(ROOT, "videos", `trailer-${course}`);
  ff(["-i", silent, ...audio, "-c:v", "copy", "-movflags", "+faststart", out + ".mp4"]);
  // poster: the end card
  ff(["-sseof", "-1.5", "-i", out + ".mp4", "-frames:v", "1", "-vf", "scale=1280:720", "-quality", "82", out + ".webp"]);
  // captions
  const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), sec = (x % 60).toFixed(3).padStart(6, "0"); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${sec}`; };
  fs.writeFileSync(out + ".vtt", "WEBVTT\n\n" + cues.map(([a, b, txt], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${txt}\n`).join("\n"));
  console.log(`  ${course}: ${total.toFixed(1)} s → videos/trailer-${course}.mp4 (${(fs.statSync(out + ".mp4").size / 1e6).toFixed(1)} MB)${VOICE ? "" : " (no voice: VOICE=1 to record it)"}`);
}

(async () => {
  const which = process.argv.slice(2).filter((a) => PLANS[a]);
  if (!which.length) { console.error("usage: node tools/trailer/make.js academy|leaders ..."); process.exit(1); }
  const port = 8600 + Math.floor(Math.random() * 300);
  const server = await startServer(port), O = `http://127.0.0.1:${port}`;
  const browser = await launch();
  try { for (const c of which) await build(c, browser, O); }
  finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
