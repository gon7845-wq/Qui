// Tribunal audio engine — pure Web Audio synthesis (no asset deps).
//
// All sounds are procedurally generated so the bundle stays tiny and we
// avoid licensing/sourcing headaches. The vibe is "courtroom toolkit":
// a wooden gavel knock, a brass bell ding for votes, a low tension drone
// during voting, a verdict sting, a victory fanfare.
//
// AudioContext must be created lazily after a user gesture (autoplay
// policy), so we don't init in the module — init happens on first use.

type Stoppable = { stop: () => void };

const MUTE_KEY = "qui.muted";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private tension: Stoppable | null = null;
  private listeners = new Set<(muted: boolean) => void>();

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* */
    }
  }

  // ─── Mute API ─────────────────────────────────────────────────

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {
      /* */
    }
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.now());
      this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.now(), 0.05);
    }
    if (m && this.tension) this.stopTension();
    this.listeners.forEach((cb) => cb(m));
  }

  public subscribe(cb: (muted: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // ─── Sound API ────────────────────────────────────────────────

  public gavel(): void {
    if (!this.unlock()) return;
    const ctx = this.ctx!;
    const t = this.now();

    // Wooden knock — short bandpassed noise burst
    const noise = this.makeNoiseBuffer(0.07);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 380;
    bp.Q.value = 1.4;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0, t);
    nGain.gain.linearRampToValueAtTime(0.9, t + 0.005);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    noiseSrc.connect(bp).connect(nGain).connect(this.master!);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.1);

    // Low thump — sine sweep
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.18);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0, t);
    og.gain.linearRampToValueAtTime(0.6, t + 0.005);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(og).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public ding(): void {
    if (!this.unlock()) return;
    const ctx = this.ctx!;
    const t = this.now();
    [1320, 1980].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      const g = ctx.createGain();
      const peak = i === 0 ? 0.35 : 0.15;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g).connect(this.master!);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  public tick(): void {
    if (!this.unlock()) return;
    const ctx = this.ctx!;
    const t = this.now();
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(720, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public verdictSting(): void {
    if (!this.unlock()) return;
    const ctx = this.ctx!;
    const t = this.now();

    // Three-note descending sting (low brass): G4 → E4 → C4
    const notes = [392, 329.63, 261.63];
    notes.forEach((freq, i) => {
      const start = t + i * 0.16;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.value = freq / 2;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1400;
      lp.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.22, start + 0.02);
      g.gain.setTargetAtTime(0, start + 0.4, 0.1);
      osc.connect(lp);
      sub.connect(lp);
      lp.connect(g).connect(this.master!);
      osc.start(start);
      sub.start(start);
      osc.stop(start + 0.7);
      sub.stop(start + 0.7);
    });

    // Cymbal swell at the head
    const noise = this.makeNoiseBuffer(0.5);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.12, t + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    src.connect(hp).connect(ng).connect(this.master!);
    src.start(t);
  }

  public victoryFanfare(): void {
    if (!this.unlock()) return;
    const ctx = this.ctx!;
    const t = this.now();

    // Triumphant arpeggio: C5 - E5 - G5 - C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const start = t + i * 0.13;
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.18, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(lp).connect(g).connect(this.master!);
      osc.start(start);
      osc.stop(start + 0.3);
    });

    // Sustained final chord
    const chordStart = t + 0.55;
    [261.63, 329.63, 392, 523.25].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, chordStart);
      g.gain.linearRampToValueAtTime(0.1, chordStart + 0.05);
      g.gain.setTargetAtTime(0, chordStart + 1.2, 0.4);
      osc.connect(g).connect(this.master!);
      osc.start(chordStart);
      osc.stop(chordStart + 2.5);
    });
  }

  public startTension(): void {
    if (!this.unlock()) return;
    if (this.tension) return;
    const ctx = this.ctx!;
    const t = this.now();

    const drone = ctx.createOscillator();
    drone.type = "sawtooth";
    drone.frequency.value = 55;
    const droneG = ctx.createGain();
    droneG.gain.setValueAtTime(0, t);
    droneG.gain.linearRampToValueAtTime(0.07, t + 0.5);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 280;
    lp.Q.value = 2;

    // Slow LFO on filter cutoff for breathing tension
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain).connect(lp.frequency);

    drone.connect(lp).connect(droneG).connect(this.master!);
    drone.start(t);
    lfo.start(t);

    // Sub-bass pulse every 1.4s for heart-beat feel
    const pulseInterval = window.setInterval(() => {
      if (!this.ctx || this.muted) return;
      const pt = this.now();
      const p = ctx.createOscillator();
      p.type = "sine";
      p.frequency.setValueAtTime(80, pt);
      p.frequency.exponentialRampToValueAtTime(45, pt + 0.18);
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(0, pt);
      pg.gain.linearRampToValueAtTime(0.12, pt + 0.01);
      pg.gain.exponentialRampToValueAtTime(0.001, pt + 0.25);
      p.connect(pg).connect(this.master!);
      p.start(pt);
      p.stop(pt + 0.3);
    }, 1400);

    this.tension = {
      stop: () => {
        clearInterval(pulseInterval);
        const stopT = this.now();
        droneG.gain.cancelScheduledValues(stopT);
        droneG.gain.setTargetAtTime(0, stopT, 0.15);
        drone.stop(stopT + 0.6);
        lfo.stop(stopT + 0.6);
      },
    };
  }

  public stopTension(): void {
    if (!this.tension) return;
    this.tension.stop();
    this.tension = null;
  }

  // ─── Internals ────────────────────────────────────────────────

  /** Ensures AudioContext is created and resumed. Returns false if it can't run. */
  private unlock(): boolean {
    if (this.muted) return false;
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx.state !== "closed";
  }

  private now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private makeNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      // White noise with exponential decay
      const decay = Math.exp(-i / (length * 0.5));
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    return buf;
  }
}

export const audio = new AudioEngine();
