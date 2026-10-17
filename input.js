/* =========================================================
   INPUT: the only two buttons in the game.
   Keyboard: ← / A = left, → / D = right.
   Touch / mouse: left or right half of the game frame.
   Emits (button, pressed) where button is 'left' | 'right'
   and pressed is true on press, false on release.
   ========================================================= */
(function () {
  'use strict';

  const Game = (window.Game = window.Game || {});
  const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  const listeners = [];
  const held = { left: false, right: false };

  function emit(button, pressed) {
    if (held[button] === pressed) return; // ignore duplicates (key repeat, two fingers)
    held[button] = pressed;
    listeners.forEach((fn) => fn(button, pressed));
  }

  Game.input = {
    on(fn) { listeners.push(fn); },
    isHeld(button) { return held[button]; },

    attach(frame) {
      window.addEventListener('keydown', (e) => {
        const b = KEYS[e.code];
        if (!b) return;
        e.preventDefault();
        if (!e.repeat) emit(b, true);
      });
      window.addEventListener('keyup', (e) => {
        const b = KEYS[e.code];
        if (!b) return;
        e.preventDefault();
        emit(b, false);
      });

      const pointers = new Map();
      frame.addEventListener('pointerdown', (e) => {
        const r = frame.getBoundingClientRect();
        const b = e.clientX - r.left < r.width / 2 ? 'left' : 'right';
        pointers.set(e.pointerId, b);
        e.preventDefault();
        emit(b, true);
      });
      const release = (e) => {
        const b = pointers.get(e.pointerId);
        if (!b) return;
        pointers.delete(e.pointerId);
        if (![...pointers.values()].includes(b)) emit(b, false);
      };
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);

      // Losing focus mid-press shouldn't leave a button stuck down.
      window.addEventListener('blur', () => {
        pointers.clear();
        emit('left', false);
        emit('right', false);
      });
    },
  };
})();
