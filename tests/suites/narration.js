// Narration stays in step with the lesson text:
// - the text on the page matches the audio script word for word (so a text edit
//   without a narration run fails here), and the timings cover every block
// - timings run forwards, and seeking lights up the right paragraph
const fs = require("fs");
const path = require("path");
const { demoContext } = require("../lib");

module.exports = async function narration({ browser, O, r, ROOT }) {
  const script = JSON.parse(fs.readFileSync(path.join(ROOT, "audio/script.json"), "utf8"));
  const timings = JSON.parse(fs.readFileSync(path.join(ROOT, "audio/timings.json"), "utf8"));
  const sm = Array.isArray(script) ? Object.fromEntries(script.map((m) => [m.id, m.blocks]))
    : Object.fromEntries(Object.entries(script).map(([k, v]) => [k, v.blocks || v]));

  const p = await (await demoContext(browser, { viewport: { width: 1366, height: 900 } })).newPage(); // signed in, so every module opens
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${O}/training.html`); await p.waitForTimeout(800);
  const page = await p.evaluate(() => window.VHVoice.extractAll());
  r.ok(page.length === 13, `13 narrated modules (found ${page.length})`);
  // the 1-hour leaders course shares the same audio files and checks
  const lp = await p.context().newPage();
  await lp.goto(`${O}/leaders.html`); await lp.waitForTimeout(600);
  const lead = await lp.evaluate(() => window.VHVoice.extractAll());
  r.ok(lead.length === 7, `VAVE for Leaders: 7 narrated modules (found ${lead.length})`);
  await lp.close();
  page.push(...lead);

  for (const m of page) {
    const aud = sm[m.id] || [], tb = (timings[m.id] || {}).blocks || [];
    const i = m.blocks.findIndex((t, k) => t !== aud[k]);
    const same = m.blocks.length === aud.length && i === -1;
    r.ok(same, `${m.id}: page text matches the audio script` + (same ? "" :
      ` — first difference at block ${i}: "${(m.blocks[i] || "").slice(0, 60)}" vs "${(aud[i] || "").slice(0, 60)}". Run the narration workflow for ${m.id}.`));
    r.ok(tb.length === m.blocks.length, `${m.id}: timings for all ${m.blocks.length} blocks`);
    const forwards = tb.every((b, k) => b[0] <= b[1] && (k === 0 || b[0] >= tb[k - 1][0])) && tb.length && tb[tb.length - 1][1] <= timings[m.id].dur + 0.5;
    r.ok(forwards, `${m.id}: timings run forwards and end inside the audio`);
    r.ok(fs.existsSync(path.join(ROOT, `audio/${m.id}.mp3`)), `${m.id}: audio file present`);
  }

  // Seek test on three modules: jump to a block and check that block is highlighted.
  for (const id of ["m1", "m6", "m13"]) {
    await p.evaluate((id) => document.querySelector(`#modNav .mod-link[data-target="${id}"]`).click(), id);
    await p.waitForTimeout(400);
    const bar = p.locator(`section[data-mod="${id}"] .vo-bar`);
    await bar.locator(".vo-play").click();
    await p.waitForFunction((id) => { const a = document.querySelector(`section[data-mod="${id}"] .vo-play`); return a && a.classList.contains("is-playing"); }, id, { timeout: 5000 }).catch(() => {});
    const blocks = timings[id].blocks;
    let good = 0, tried = 0;
    for (const k of [1, Math.floor(blocks.length / 3), Math.floor(blocks.length / 2), blocks.length - 2]) {
      tried++;
      const t = blocks[k][0] + 0.3;
      await bar.locator(".vo-seek").evaluate((s, t) => { s.value = String(t); s.dispatchEvent(new Event("input")); }, t);
      await p.waitForTimeout(250);
      const lit = await p.evaluate(({ id, k }) => {
        const el = document.querySelector(".is-reading");
        if (!el) return false;
        // same clean-up the player uses when it builds the script
        const got = el.textContent.replace(/\s+/g, " ").replace(/[·—]/g, ", ").replace(/→/g, " to ").replace(/÷/g, " divided by ").replace(/✓|✗|🖨|🔒|🎓|★/g, "").trim();
        return got === window.VHVoice.extractAll().find((m) => m.id === id).blocks[k];
      }, { id, k });
      if (lit) good++;
    }
    r.ok(good === tried, `${id}: seeking highlights the right paragraph (${good}/${tried})`);
    await bar.locator(".vo-play").click(); // pause
  }
  r.ok(!errs.length, `no script errors${errs.length ? ": " + errs[0] : ""}`);
  await p.context().close();
};
