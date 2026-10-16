// Narration stops: the follow-along narration waits at videos, animations, diagrams
// and labs instead of scrolling straight past them (Module 10 has all four kinds).
const fs = require("fs");
const path = require("path");
const { demoContext } = require("../lib");

module.exports = async function stops({ browser, O, r, ROOT }) {
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, "audio/timings.json"), "utf8"));
  const ctx = await demoContext(browser, { viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${O}/training.html?open=m10`); await p.waitForTimeout(1200);
  const bar = p.locator('section[data-mod="m10"] .vo-bar');
  // the paragraph each stop follows, worked out the same way the player does
  const after = await p.evaluate(() => {
    const mod = document.querySelector('section[data-mod="m10"]');
    const EXC = ".qcheck, button, .vo-bar, .gate-card, .fast-builder, .fn-lib, .fn-challenge, .ve-lab, .concept-viz, .mod-feedback, .tmpl-box, .tcap, .lc-src, .lc-chart, .lc-metrics, .tvid, .vw-remind";
    const coll = [...mod.querySelectorAll("h2, h3, h4, p, li")].filter((el) => !el.closest(EXC) && !el.querySelectorAll("p, li").length && el.textContent.trim().length > 2);
    const k = (el) => { let i = -1; coll.forEach((c, j) => { if (c.compareDocumentPosition(el) & 4) i = j; }); return i; };
    return { xview: k(mod.querySelector("[data-xview]")), lab: k(mod.querySelector(".ve-lab")), diagram: k([...mod.querySelectorAll(".concept-viz")].pop()) };
  });
  const seek = async (t) => bar.locator(".vo-seek").evaluate((s, t) => { s.value = String(t); s.dispatchEvent(new Event("input")); }, t);
  const card = () => p.evaluate(() => { const c = document.querySelector(".vs-card"); return c.hidden ? "" : c.querySelector(".vs-msg").textContent; });
  const playing = () => p.evaluate(() => document.querySelector('section[data-mod="m10"] .vo-play').classList.contains("is-playing"));

  r.ok(await p.isVisible('section[data-mod="m10"] .vw-remind'), "an unwatched video is mentioned above Mark complete");
  await bar.locator(".vo-play").click(); await p.waitForTimeout(600);

  // 1. the exploded view plays itself, without the reader scrolling
  await seek(T.m10.blocks[after.xview][1] - 1.2);
  await p.waitForFunction(() => !document.querySelector(".vs-card").hidden, null, { timeout: 8000 }).catch(() => {});
  r.ok(/come apart/.test(await card()) && !(await playing()), "narration pauses at the exploded view");
  await p.waitForFunction(() => document.querySelector("[data-xview] .xv-scene").classList.contains("xp-s2"), null, { timeout: 9000 }).catch(() => {});
  r.ok(await p.evaluate(() => document.querySelector("[data-xview] .xv-scene").classList.contains("xp-s2")), "the exploded view comes fully apart on its own");
  // 2. then the video: narration waits for it to end
  await p.waitForFunction(() => /video/i.test(document.querySelector(".vs-msg").textContent) && !document.querySelector(".vs-card").hidden, null, { timeout: 12000 }).catch(() => {});
  r.ok(/video/i.test(await card()), "then it waits at the teardown video");
  await p.waitForTimeout(1500);
  r.ok(!(await playing()), "narration stays paused while the video is on");
  await p.evaluate(() => document.querySelector('section[data-mod="m10"] .tvid video').dispatchEvent(new Event("ended")));
  await p.waitForTimeout(800);
  r.ok(!(await card()) && await playing(), "narration carries on when the video ends");
  r.ok(!(await p.isVisible('section[data-mod="m10"] .vw-remind')), "the unwatched-video note goes once it has been watched");

  // 3. a lab waits for Continue
  await seek(T.m10.blocks[after.lab][1] - 1.2);
  await p.waitForFunction(() => !document.querySelector(".vs-card").hidden, null, { timeout: 8000 }).catch(() => {});
  r.ok(/activity/.test(await card()), "narration pauses at the lab");
  await p.waitForTimeout(3000);
  r.ok(/activity/.test(await card()) && !(await playing()), "and waits there until the learner is ready");
  await p.click(".vs-go"); await p.waitForTimeout(600);
  r.ok(!(await card()) && await playing(), "Continue carries the narration on");

  // 4. a diagram gets a short look with a countdown, then the narration carries on by itself
  await seek(T.m10.blocks[after.diagram][1] - 1.2);
  await p.waitForFunction(() => !document.querySelector(".vs-card").hidden, null, { timeout: 8000 }).catch(() => {});
  const msg = await card();
  await p.waitForFunction(() => !document.querySelector(".vs-ring").hidden && !document.querySelector(".vs-card").hidden, null, { timeout: 7000 }).catch(() => {});
  r.ok(/diagram/.test(msg) && await p.isVisible(".vs-ring"), "narration pauses at a diagram, plays it, then shows a countdown");
  await p.waitForFunction(() => document.querySelector(".vs-card").hidden, null, { timeout: 16000 }).catch(() => {});
  r.ok(!(await card()) && await playing(), "after the countdown the narration carries on by itself");

  // 5. switched off: it reads straight on
  await p.locator('section[data-mod="m10"] .vo-stops input').uncheck();
  await seek(T.m10.blocks[after.lab][1] - 1.2); await p.waitForTimeout(2500);
  r.ok(!(await card()) && await playing(), "with the switch off, the narration doesn't stop");
  await p.locator('section[data-mod="m10"] .vo-stops input').check();
  await bar.locator(".vo-play").click();

  // 6. the narration script is unchanged: nothing added is read aloud
  const blocks = await p.evaluate(() => window.VHVoice.extractAll().find((m) => m.id === "m10").blocks.length);
  r.ok(blocks === T.m10.blocks.length, "nothing new is read aloud");
  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs[0] : ""}`);
  await ctx.close();
};
