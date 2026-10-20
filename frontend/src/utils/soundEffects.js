// Web Audio API mechanical keyboard & power sound synthesizer
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playKeyClickSound(type = 'key') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    if (type === 'power-off') {
      // Mechanical switch latch click + low power down glide
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.22);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);

      // Mechanical switch thud
      playSnap(ctx, t, 1200, 0.15);
      return;
    }

    if (type === 'power-on') {
      // Mechanical switch latch click + rising power on chord
      playSnap(ctx, t, 1800, 0.2);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t + 0.02);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.25);
      gain.gain.setValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + 0.02);
      osc.stop(t + 0.25);
      return;
    }

    // Standard tactile mechanical keyboard click
    // 1. High-frequency crisp snap (tactile leaf spring)
    playSnap(ctx, t, 2400 + Math.random() * 400, 0.14);

    // 2. Low-frequency casing bottom-out thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(180 + Math.random() * 40, t);
    thudOsc.frequency.exponentialRampToValueAtTime(50, t + 0.035);
    thudGain.gain.setValueAtTime(0.18, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(t);
    thudOsc.stop(t + 0.04);
  } catch (err) {
    // Ignore audio permission or autoplay errors silently
  }
}

function playSnap(ctx, t, freq, volume) {
  const snapOsc = ctx.createOscillator();
  const snapGain = ctx.createGain();
  snapOsc.type = 'triangle';
  snapOsc.frequency.setValueAtTime(freq, t);
  snapOsc.frequency.exponentialRampToValueAtTime(600, t + 0.016);
  snapGain.gain.setValueAtTime(volume, t);
  snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  snapOsc.connect(snapGain);
  snapGain.connect(ctx.destination);
  snapOsc.start(t);
  snapOsc.stop(t + 0.02);
}
