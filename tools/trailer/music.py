"""Original music for the course trailers, synthesised from scratch (nothing to license).

    python3 tools/trailer/music.py plan.json out.wav

plan.json gives the trailer's scenes in order ({"course", "scenes": [{"id", "start", "dur"}]}),
so the music changes where the pictures change:

  tension  (the kettle, the price tags, the counter; the 50p sum)  low pad, heartbeat pulse, a sparse motif
  riser    into the "It's in the design" reveal (or the cost curve)  noise swell, then an impact on the cut
  groove   (the method and the montage; the five things)            kick, clap, hats, bass and a 16th-note arpeggio
  lift     (the results and the course)                              the same groove with a brighter, wider pad
  resolve  (the certificate and the end card)                        drums out, a major chord that rings out
  calm     (under narration, used by the case-study videos)           soft pads and a slow, quiet arpeggio; no drums

A scene can name its section directly with "sect"; otherwise it's looked up from the trailer's scene ids.

A minor, 100 beats a minute. Everything sits on one beat grid from the first frame; section
changes wait for the next beat, and impacts land exactly on their picture cue.
"""
import json, sys, wave
import numpy as np

SR = 44100
BPM = 100.0
BEAT = 60.0 / BPM
RNG = np.random.default_rng(7)

def note(n):  # MIDI note number to Hz
    return 440.0 * 2 ** ((n - 69) / 12)

# chords as MIDI notes; bar = 4 beats
PROG = {"tension": [[45, 57, 60, 64], [41, 57, 60, 65], [45, 57, 60, 64], [43, 55, 59, 62]],   # Am  F  Am  G
        "groove":  [[45, 57, 60, 64], [41, 53, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]],   # Am  F  C   G
        "lift":    [[41, 53, 60, 65, 69], [43, 55, 62, 67, 71], [45, 57, 64, 69, 72], [48, 55, 64, 67, 72]],  # F  G  Am  C
        "resolve": [[48, 55, 60, 64, 67, 72]],
        "calm":    [[45, 57, 60, 64], [41, 53, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]]}  # Am  F  C   G                                                  # C

def additive(freq, dur, bright=6.0, harm=10, detune=0.0):
    """A soft saw-like tone: harmonics rolled off by 'bright' (stands in for a filter)."""
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for k in range(1, harm + 1):
        a = (1.0 / k) * np.exp(-(k - 1) / bright)
        out += a * np.sin(2 * np.pi * freq * k * (1 + detune) * t + RNG.uniform(0, 6.28))
    return out / 1.8

def env(n, a, r, sus=1.0):
    e = np.ones(n) * sus
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:min(na, n)] = np.linspace(0, sus, min(na, n))
    if nr < n: e[-nr:] *= np.linspace(1, 0, nr)
    return e

class Mix:
    def __init__(self, total):
        self.n = int(total * SR) + SR
        self.L = np.zeros(self.n); self.R = np.zeros(self.n)
    def add(self, x, t, gain=1.0, pan=0.0):
        i = int(t * SR)
        if i >= self.n or i + len(x) <= 0: return
        if i < 0: x = x[-i:]; i = 0
        x = x[: self.n - i]
        l, r = gain * np.sqrt((1 - pan) / 2) * x, gain * np.sqrt((1 + pan) / 2) * x
        self.L[i:i + len(x)] += l; self.R[i:i + len(x)] += r

def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 85 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(1.6 * np.sin(ph) * np.exp(-t / 0.16))

def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR
    nz = np.diff(RNG.standard_normal(n + 1)) * 0.5
    burst = sum(np.exp(-np.maximum(t - d, 0) / 0.012) * (t >= d) for d in (0, 0.011, 0.022))
    return nz * (0.6 * burst + 0.5 * np.exp(-t / 0.09)) * 0.5

def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); t = np.arange(n) / SR
    nz = np.diff(np.diff(RNG.standard_normal(n + 2)))
    return nz * np.exp(-t / (0.06 if open_ else 0.014)) * 0.18

def pluck(freq, dur=0.32):
    n = int(dur * SR); t = np.arange(n) / SR
    return additive(freq, dur, bright=3.5, harm=8) * np.exp(-t / 0.11)

def bass(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t)
    return np.tanh(1.4 * x) * env(n, 0.006, 0.05) * np.exp(-t / 0.5)

def pad(chord, dur, bright=4.0, gain=1.0):
    n = int(dur * SR)
    out = np.zeros(n)
    for m in chord:
        out += additive(note(m), dur, bright=bright, harm=9, detune=0.0)
        out += additive(note(m), dur, bright=bright, harm=9, detune=0.004) * 0.7
    return out / len(chord) * env(n, min(0.9, dur / 3), min(1.0, dur / 3)) * gain

def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = RNG.standard_normal(n)
    hp = np.concatenate([[0], np.diff(nz)])
    p = t / dur
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * p ** 2) / SR) * 0.25
    return ((1 - p) * nz * 0.15 + p * hp * 0.35 + sweep) * p ** 2.2

def impact():
    n = int(2.2 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (38 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.7)
    nz = RNG.standard_normal(n) * np.exp(-t / 0.05) * 0.4
    return np.tanh(1.3 * (boom + nz))

def space(x, taps=((0.083, .32), (0.137, .24), (0.211, .18), (0.307, .12), (0.419, .08))):
    """A cheap room: a few decaying echoes."""
    out = x.copy()
    for d, g in taps:
        k = int(d * SR); out[k:] += g * x[:-k]
    return out

def build(plan):
    sc = plan["scenes"]; total = sc[-1]["start"] + sc[-1]["dur"]
    course = plan.get("course", "academy")
    SECT = ({"cold": "tension", "tags": "tension", "counter": "tension", "twist": "riser", "method": "groove", "ttl": "groove",
             "tear": "groove", "proof": "lift", "course": "lift", "cert": "resolve", "end": "resolve"} if course == "academy" else
            {"lsave": "tension", "lsales": "tension", "lcurve": "riser", "lfive": "groove", "end": "resolve"})
    mix = Mix(total)
    pads = Mix(total)  # pads and arps go through the room
    # the section in force at each beat
    nbeats = int(total / BEAT) + 2
    def section_at(t):
        cur = "tension"
        for s in sc:
            if s["start"] <= t + 1e-6: cur = s.get("sect") or SECT.get(s["id"], cur)
        return cur
    def snap(t): return np.ceil(t / BEAT - 1e-6) * BEAT

    # the reveal: an impact exactly on the cut, a swell before it, a breath of silence around it
    reveal = None
    for s in sc:
        if s["id"] == "twist": reveal = s["start"] + s["dur"] * 0.45
        if s["id"] == "lcurve": reveal = s["start"] + 1.7
    if reveal:
        mix.add(riser(2.6), reveal - 2.6, 0.32)
        mix.add(impact(), reveal, 0.9)

    for b in range(nbeats):
        t = b * BEAT
        if t >= total: break
        sec = section_at(t)
        if reveal and reveal - 1.0 <= t < reveal: continue          # hold back just before the reveal
        bar, beat = divmod(b, 4)
        prog = PROG["groove" if sec == "riser" else sec]
        chord = prog[bar % len(prog)]
        if sec == "calm":                                           # under a voice: pads and a slow arpeggio only
            if beat == 0:
                pads.add(pad(chord[1:], 4 * BEAT + 0.6, bright=3.5, gain=0.5), t, pan=-0.15)
                pads.add(pad(chord[1:], 4 * BEAT + 0.6, bright=3.5, gain=0.45), t + 0.012, pan=0.15)
                mix.add(bass(note(chord[0]), 2 * BEAT) * np.linspace(1, .3, int(2 * BEAT * SR)), t, 0.3)
            arp = [chord[1], chord[2], chord[3], chord[2]]
            for e in range(2): pads.add(pluck(note(arp[(beat * 2 + e) % 4] + 12)), t + e * BEAT / 2, 0.09, pan=-0.3 if e else 0.3)
            continue
        if beat == 0 and sec != "resolve":                          # a pad per bar
            pads.add(pad(chord[1:], 4 * BEAT + 0.6, bright=3.0 if sec == "tension" else 5.0, gain=0.55 if sec == "tension" else 0.7), t, pan=-0.15)
            pads.add(pad(chord[1:], 4 * BEAT + 0.6, bright=3.0 if sec == "tension" else 5.0, gain=0.5 if sec == "tension" else 0.65), t + 0.012, pan=0.15)
        if sec in ("tension", "riser"):
            if beat in (0, 2): mix.add(bass(note(chord[0]), 0.5) * np.linspace(1, .4, int(0.5 * SR)), t, 0.55)   # heartbeat
            if beat == 3 and bar % 2 == 1: pads.add(pluck(note(chord[-1] + 12)), t + BEAT / 2, 0.22, pan=0.4)
        if sec in ("groove", "lift"):
            mix.add(kick(), t, 0.85)
            if beat in (1, 3): mix.add(clap(), t, 0.55)
            for h in range(2): mix.add(hat(open_=(h == 1 and beat == 3)), t + h * BEAT / 2, 0.42, pan=0.25)
            for e in range(2): mix.add(bass(note(chord[0]), BEAT / 2 * 0.9), t + e * BEAT / 2, 0.45)
            arp = [chord[1], chord[2], chord[3], chord[2] + 12] if sec == "groove" else [chord[2], chord[3], chord[-1] + 12, chord[3] + 12]
            for s16 in range(4):
                pads.add(pluck(note(arp[(beat * 4 + s16) % 4] + 12)), t + s16 * BEAT / 4, 0.16 if sec == "groove" else 0.2, pan=-0.35 if s16 % 2 else 0.35)
            if sec == "lift" and beat == 0:
                pads.add(pad([m + 12 for m in chord[2:]], 4 * BEAT, bright=7, gain=0.35), t, pan=0.0)

    # resolve: drums out, one major chord that rings to the end, and a soft final hit
    res = next((s["start"] for s in sc if (s.get("sect") or SECT.get(s["id"])) == "resolve"), None)
    if res is not None:
        rt = snap(res)
        dur = total - rt + 0.5
        pads.add(pad(PROG["resolve"][0], dur, bright=6, gain=1.0), rt, pan=-0.1)
        pads.add(pad([m + 12 for m in PROG["resolve"][0][2:]], dur, bright=8, gain=0.4), rt + 0.02, pan=0.1)
        mix.add(bass(note(36), 2.5), rt, 0.6)
        mix.add(impact() * 0.6, rt, 0.5)

    L = mix.L + space(pads.L); R = mix.R + space(pads.R)
    # fade in and out
    n = len(L); fi, fo = int(0.4 * SR), int(2.0 * SR)
    end = int(total * SR)
    for ch in (L, R):
        ch[:fi] *= np.linspace(0, 1, fi)
        ch[end - fo:end] *= np.linspace(1, 0, fo)
        ch[end:] = 0
    st = np.stack([L[:end], R[:end]], axis=1)
    st /= max(1e-9, np.abs(st).max()) / 0.89
    return st

def write(st, path):
    pcm = (np.clip(st, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

if __name__ == "__main__":
    plan = json.load(open(sys.argv[1]))
    write(build(plan), sys.argv[2])
    print("music:", sys.argv[2])
