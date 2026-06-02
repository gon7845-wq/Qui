// Petits sons synthétisés (Web Audio) — aucun fichier asset.
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, start: number, dur: number, gain = 0.16, type: OscillatorType = "sine") {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.03);
}

// 3 · 2 · 1 · GO
export function playCountdown() {
  beep(523.25, 0.0, 0.22); // 3
  beep(523.25, 1.0, 0.22); // 2
  beep(523.25, 2.0, 0.22); // 1
  beep(1046.5, 2.9, 0.45, 0.2); // GO !
}
