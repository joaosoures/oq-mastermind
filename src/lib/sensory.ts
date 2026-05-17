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

function blip(opts: { freq: number; dur: number; type?: OscillatorType; gain?: number; sweep?: number; filterFreq?: number }) {
  const c = ensureAudio();
  if (!c || !unlocked) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freq + opts.sweep), t + opts.dur);
  
  g.gain.setValueAtTime(0.0001, t);
  const volume = (typeof window !== "undefined" && (window as any).__OQ_SETTINGS__?.soundVolume) ?? 0.4;
  g.gain.exponentialRampToValueAtTime((opts.gain ?? 0.08) * volume, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);

  if (opts.filterFreq) {
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(opts.filterFreq, t);
    osc.connect(filter).connect(g).connect(c.destination);
  } else {
    osc.connect(g).connect(c.destination);
  }

  osc.start(t);
  osc.stop(t + opts.dur + 0.02);
}

export const sfx = {
  wheelTick: () => blip({ freq: 800, dur: 0.015, type: "sine", gain: 0.03 }), // Som mais seco e rápido
  buttonDown: () => blip({ freq: 440, dur: 0.04, type: "sine", gain: 0.06, sweep: -100 }),
  buttonUp: () => blip({ freq: 550, dur: 0.03, type: "sine", gain: 0.04 }),
  hint: () => { 
    // Som de dica: um "ping" suave e sério
    blip({ freq: 523.25, dur: 0.1, type: "sine", gain: 0.06 }); 
  },
  success: () => {
    // Som de acerto: acorde neutro e pontual
    blip({ freq: 440, dur: 0.12, type: "sine", gain: 0.07 });
    setTimeout(() => blip({ freq: 659.25, dur: 0.15, type: "sine", gain: 0.07 }), 40);
  },
  error: () => {
    // Som de erro: baixo, curto e sério (sem agressividade)
    blip({ freq: 110, dur: 0.2, type: "sine", gain: 0.08, sweep: -20 });
  },
  flip: () => blip({ freq: 400, dur: 0.05, type: "sine", gain: 0.04 }),
  woosh: () => blip({ freq: 800, dur: 0.15, type: "sine", gain: 0.03, sweep: -400 }), // Woosh baixo
};

export const haptics = {
  tick: () => {
    if ("vibrate" in navigator) navigator.vibrate(30);
  },
  tap: () => {
    if ("vibrate" in navigator) navigator.vibrate(45);
  },
  success: () => {
    if ("vibrate" in navigator) navigator.vibrate([50, 60, 50]);
  },
  error: () => {
    if ("vibrate" in navigator) navigator.vibrate([120, 60, 120]);
  },
  hint: () => {
    if ("vibrate" in navigator) navigator.vibrate(45);
  },
  light: () => {
    if ("vibrate" in navigator) navigator.vibrate(20);
  },
};

function getPrefs() {
  const s = (typeof window !== "undefined" && (window as any).__OQ_SETTINGS__) || {};
  const focus = !!s.focusMode;
  return {
    sound: s.sound !== false && !focus,
    haptics: s.haptics !== false && !focus,
  };
}

export function feedback(kind: "tick" | "tap" | "success" | "error" | "hint" | "flip" | "woosh") {
  const p = getPrefs();
  switch (kind) {
    case "tick":    if (p.sound) sfx.wheelTick();  if (p.haptics) haptics.tick(); break;
    case "tap":     if (p.sound) sfx.woosh();      if (p.haptics) haptics.tap(); break; // Woosh + vibração para seleção geral
    case "success": if (p.sound) sfx.success();    if (p.haptics) haptics.success(); break;
    case "error":   if (p.sound) sfx.error();      if (p.haptics) haptics.error(); break;
    case "hint":    if (p.sound) sfx.hint();       if (p.haptics) haptics.hint(); break;
    case "flip":    if (p.sound) sfx.flip();       if (p.haptics) haptics.tick(); break;
    case "woosh":   if (p.sound) sfx.woosh();      if (p.haptics) haptics.light(); break;
  }
}
