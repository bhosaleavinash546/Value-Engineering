// Extracts the narration script from the course pages using the SAME
// collection logic the player uses (window.VHVoice.extractAll from
// vh-voice.js), so audio blocks always line up with the on-page
// highlighting. Usage: node extract-narration.mjs <repo-root>
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const repo = process.argv[2];
if (!repo) { console.error("usage: node extract-narration.mjs <repo-root>"); process.exit(1); }

// Every narrated course page. Module ids are unique across courses (m1–m13, l0–l6),
// so they share one script.json / timings.json and one audio folder.
const PAGES = ["training.html", "leaders.html"];
const browser = await chromium.launch();
const script = [];
for (const file of PAGES) {
  const page = await browser.newPage();
  await page.goto("file://" + join(repo, file));
  await page.waitForFunction(() => window.VHVoice && typeof window.VHVoice.extractAll === "function");
  script.push(...(await page.evaluate(() => window.VHVoice.extractAll())));
  await page.close();
}
await browser.close();

if (!script.length || script.some((m) => !m.blocks.length)) {
  console.error("extraction produced empty modules — aborting");
  process.exit(1);
}
mkdirSync(join(repo, "audio"), { recursive: true });
writeFileSync(join(repo, "audio", "script.json"), JSON.stringify(script, null, 1));
console.log("extracted", script.length, "modules,", script.reduce((n, m) => n + m.blocks.length, 0), "blocks");
