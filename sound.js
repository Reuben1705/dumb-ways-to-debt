/* =========================================================
   SOUND: tiny synthesised effects, no audio files needed.
   Swap any of these for real samples later if you like.
   Browsers only allow audio after the first key/tap, which
   the engine handles by calling Game.sound.unlock().
   ========================================================= */
(function () {
  'use strict';

  const Game = (window.Game = window.Game || {});
  let ctx = null;
  let muted = false;
  let unlocked = false; // browsers block audio until the first key/tap

  function audio() {
    if (!unlocked) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = 'square', vol = 0.06, at = 0, slide = null } = {}) {
    if (muted) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + at;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  Game.sound = {
    unlock() { unlocked = true; audio(); },
    start() { tone(523, 0.1); tone(784, 0.16, { at: 0.1 }); },
    whoosh() { tone(300, 0.14, { type: 'triangle', vol: 0.05, slide: 900 }); },
    pass() { tone(988, 0.08, { vol: 0.05 }); tone(1319, 0.22, { at: 0.08, vol: 0.05 }); },
    fail() {
      tone(196, 0.22, { type: 'sawtooth', vol: 0.07 });
      tone(147, 0.4, { type: 'sawtooth', vol: 0.07, at: 0.2 });
    },
    bankrupt() { // sad trombone
      [392, 370, 349].forEach((f, i) => tone(f, 0.34, { type: 'triangle', vol: 0.09, at: i * 0.34 }));
      tone(330, 0.9, { type: 'triangle', vol: 0.09, at: 1.02, slide: 247 });
    },
    blip() { tone(660, 0.05, { vol: 0.03 }); },
    toggleMute() { muted = !muted; return muted; },
  };
})();
