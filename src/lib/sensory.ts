// Som mecânico (Web Audio API) + haptics (Vibration API).
// Tudo opt-in via singleton — chame ensureAudio() em qualquer interação do usuário antes do primeiro som.

let ctx: AudioContext | null = null;
let unlocked = false;

export function ensureAudio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  unlocked = true;
  return ctx;
}

function blip(opts: { freq: number; dur: number; type?: OscillatorType; gain?: number; sweep?: number }) {
  const c = ensureAudio();
  if (!c || !unlocked) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freq + opts.sweep), t + opts.dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.08, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + opts.dur + 0.02);
}

export const sfx = {
  wheelTick: () => blip({ freq: 1800, dur: 0.025, type: "square", gain: 0.04 }),
  buttonDown: () => blip({ freq: 320, dur: 0.05, type: "square", gain: 0.09, sweep: -120 }),
  buttonUp: () => blip({ freq: 520, dur: 0.04, type: "triangle", gain: 0.05 }),
  hint: () => { blip({ freq: 880, dur: 0.07, type: "sine", gain: 0.07 }); setTimeout(() => blip({ freq: 1320, dur: 0.08, type: "sine", gain: 0.07 }), 60); },
  success: () => {
    blip({ freq: 660, dur: 0.08, type: "triangle", gain: 0.08 });
    setTimeout(() => blip({ freq: 990, dur: 0.10, type: "triangle", gain: 0.09 }), 70);
    setTimeout(() => blip({ freq: 1320, dur: 0.14, type: "triangle", gain: 0.09 }), 150);
  },
  error: () => {
    blip({ freq: 220, dur: 0.18, type: "sawtooth", gain: 0.10, sweep: -120 });
    setTimeout(() => blip({ freq: 160, dur: 0.18, type: "sawtooth", gain: 0.09, sweep: -80 }), 80);
  },
  flip: () => blip({ freq: 600, dur: 0.06, type: "sine", gain: 0.05, sweep: 200 }),
};

export const haptics = {
  tick: () => navigator.vibrate?.(8),
  tap: () => navigator.vibrate?.(15),
  success: () => navigator.vibrate?.([18, 60, 18]),
  error: () => navigator.vibrate?.(220),
  hint: () => navigator.vibrate?.(12),
};

export function feedback(kind: "tick" | "tap" | "success" | "error" | "hint" | "flip") {
  switch (kind) {
    case "tick": sfx.wheelTick(); haptics.tick(); break;
    case "tap": sfx.buttonDown(); haptics.tap(); break;
    case "success": sfx.success(); haptics.success(); break;
    case "error": sfx.error(); haptics.error(); break;
    case "hint": sfx.hint(); haptics.hint(); break;
    case "flip": sfx.flip(); haptics.tick(); break;
  }
}
