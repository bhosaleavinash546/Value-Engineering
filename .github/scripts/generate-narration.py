#!/usr/bin/env python3
"""Synthesize the VE Academy narration from audio/script.json.

For every module: each text block is spoken by a Microsoft neural voice
(edge-tts), decoded to WAV for exact duration measurement, joined with a
short natural pause, then encoded once to a single MP3. Block start/end
offsets are written to audio/timings.json so the site can highlight the
paragraph currently being read.
"""
import asyncio
import json
import pathlib
import subprocess
import sys
import wave

import edge_tts

VOICE = "en-GB-SoniaNeural"
GAP = 0.45  # seconds of silence between blocks
RATE = 24000
ROOT = pathlib.Path(__file__).resolve().parents[2]
AUDIO = ROOT / "audio"
TMP = pathlib.Path("/tmp/narration")
TMP.mkdir(parents=True, exist_ok=True)

script = json.loads((AUDIO / "script.json").read_text())


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(map(str, cmd))}\n{r.stderr[-2000:]}")


def wav_seconds(path):
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / w.getframerate()


async def synth(text, mp3_path):
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, voice=VOICE).save(str(mp3_path))
            if mp3_path.stat().st_size > 200:
                return
            raise RuntimeError("empty audio")
        except Exception as e:
            if attempt == 3:
                raise
            print(f"    retry {attempt + 1} ({e})", flush=True)
            await asyncio.sleep(3 * (attempt + 1))


# one shared silence segment for the inter-block pause
silence = TMP / "silence.wav"
run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={RATE}:cl=mono",
     "-t", str(GAP), "-c:a", "pcm_s16le", str(silence)])

timings = {}
total_blocks = sum(len(m["blocks"]) for m in script)
done = 0

for mod in script:
    mid = mod["id"]
    print(f"── {mid} · {mod['title']} · {len(mod['blocks'])} blocks", flush=True)
    parts, blocks, t = [], [], 0.0
    for i, text in enumerate(mod["blocks"]):
        mp3 = TMP / f"{mid}-{i}.mp3"
        wav = TMP / f"{mid}-{i}.wav"
        asyncio.run(synth(text, mp3))
        run(["ffmpeg", "-y", "-i", str(mp3), "-ar", str(RATE), "-ac", "1",
             "-c:a", "pcm_s16le", str(wav)])
        dur = wav_seconds(wav)
        blocks.append([round(t, 2), round(t + dur, 2)])
        t += dur + GAP
        parts.append(wav)
        done += 1
        if done % 25 == 0:
            print(f"    {done}/{total_blocks} blocks synthesized", flush=True)

    listfile = TMP / f"{mid}.txt"
    lines = []
    for p in parts:
        lines.append(f"file '{p}'")
        lines.append(f"file '{silence}'")
    listfile.write_text("\n".join(lines))
    out = AUDIO / f"{mid}.mp3"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
         "-c:a", "libmp3lame", "-b:a", "48k", "-ar", str(RATE), "-ac", "1", str(out)])
    timings[mid] = {"dur": round(t, 2), "blocks": blocks}
    print(f"    → {out.name} ({out.stat().st_size / 1e6:.1f} MB, {t / 60:.1f} min)", flush=True)
    for p in parts:
        p.unlink()

(AUDIO / "timings.json").write_text(json.dumps(timings, separators=(",", ":")))
print("all modules narrated:", ", ".join(timings), flush=True)
sys.exit(0)
