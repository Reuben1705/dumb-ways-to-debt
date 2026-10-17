/* =========================================================
   Dumb Ways to Debt: ENGINE
   Owner: Person 1. Microgames never need to edit this file.

   Flow:  title → [instruction → play → result] × N → bankrupt
   The engine owns the HUD, timer, controls and screens.
   A microgame only draws inside #stage. See README.md.
   ========================================================= */
(function () {
  'use strict';

  const Game = (window.Game = window.Game || {});

  const CONFIG = (Game.config = {
    startMoney: 1000,
    roundsPerSpeedUp: 5,   // speed steps up every N rounds
    speedStep: 0.25,
    maxSpeed: 2.5,
    instructionMs: 1200,   // instruction flash at speed ×1
    minInstructionMs: 650,
    passMs: 800,
    failMs: 2100,          // long enough to read the tip
    bossEvery: 10,         // boss round every N rounds (if a boss is registered)
    lowMoney: 250,         // mascot panics below this
  });

  /* ---------- helpers (also handed to games via ctx) ---------- */
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => '£' + Math.round(n).toLocaleString('en-GB');
  const fmt2 = (n) => (n < 0 ? '−' : '') + '£' +
    Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  Object.assign(Game, { rand, pick, esc, fmt });

  /* Games call Game.css('id', `...`) once to add their own styles. */
  const injected = new Set();
  Game.css = function (id, cssText) {
    if (injected.has(id)) return;
    injected.add(id);
    const tag = document.createElement('style');
    tag.dataset.game = id;
    tag.textContent = cssText;
    document.head.appendChild(tag);
  };

  /* ---------- registry ---------- */
  const registry = [];
  Game.register = function (def) {
    const missing = ['id', 'instruction', 'duration', 'cost', 'start'].filter((k) => def[k] === undefined);
    if (missing.length) console.warn(`[Game] "${def.id || '?'}" is missing: ${missing.join(', ')}`);
    if (registry.some((g) => g.id === def.id)) {
      console.warn(`[Game] duplicate id "${def.id}" ignored`);
      return;
    }
    registry.push(def);
  };
  Game.list = () => registry.slice();

  /* ---------- mascot face ---------- */
  const MOUTHS = {
    happy: 'M7.5 14c2 2.6 7 2.6 9 0',
    ok: 'M8.5 15.5h7',
    sad: 'M8.5 16.5c1.8-1.3 5.2-1.3 7 0',
  };
  const face = (mood) =>
    `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="10" r="1.6" fill="currentColor"/><circle cx="15" cy="10" r="1.6" fill="currentColor"/>
      <path d="${MOUTHS[mood]}" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  /* ---------- state ---------- */
  let el = {};
  let opts = {};
  let state = null;
  let mode = 'title';
  let current = null;        // the microgame being played
  let flowTimer = null;
  let lastGameId = null;
  let inputLockedUntil = 0;

  function setMode(m) { mode = m; el.frame.dataset.mode = m; }
  function flow(ms, fn) { clearTimeout(flowTimer); flowTimer = setTimeout(fn, ms); }

  /* ---------- DOM ---------- */
  function buildDom(root) {
    root.innerHTML = `
      <div id="scaler">
        <div id="frame" data-mode="title">
          <header id="hud">
            <div class="wallet">
              <div id="mascot" class="mascot">${face('happy')}</div>
              <span id="money">£1,000</span>
              <div class="bar"><div id="money-fill"></div><div id="money-ghost"></div></div>
            </div>
            <span id="round-pill" class="pill">ROUND 1 · ×1</span>
          </header>
          <div id="timer"><div id="timer-fill"></div></div>
          <main id="stage"></main>
          <footer id="controls">
            <div id="btn-left" class="ctl ctl-left" aria-hidden="true">←</div>
            <div id="btn-right" class="ctl ctl-right" aria-hidden="true">→</div>
            <div id="hands-off" class="sticker">HANDS OFF!</div>
          </footer>
          <div id="result"></div>
          <div id="screen"></div>
        </div>
      </div>`;
    const $ = (id) => root.querySelector('#' + id);
    el = {
      root, scaler: $('scaler'), frame: $('frame'), stage: $('stage'),
      money: $('money'), moneyFill: $('money-fill'), moneyGhost: $('money-ghost'),
      mascot: $('mascot'), round: $('round-pill'), timerFill: $('timer-fill'),
      btnLeft: $('btn-left'), btnRight: $('btn-right'),
      result: $('result'), screen: $('screen'),
    };
  }

  function fit() {
    const r = el.root.getBoundingClientRect();
    const s = Math.min(r.width / 800, r.height / 600) * 0.98;
    el.scaler.style.transform = `scale(${s})`;
  }

  /* ---------- HUD ---------- */
  const pctOf = (m) => Math.max(0, Math.min(100, (m / CONFIG.startMoney) * 100));

  function updateHud() {
    el.money.textContent = fmt(Math.max(0, state.money));
    el.moneyFill.style.width = pctOf(state.money) + '%';
    el.round.textContent = `ROUND ${state.round} · ×${state.speed}`;
    const low = state.money <= CONFIG.lowMoney;
    const mood = low ? 'sad' : state.money >= CONFIG.startMoney ? 'happy' : 'ok';
    el.mascot.innerHTML = face(mood);
    el.mascot.classList.toggle('low', low);
  }

  function changeMoney(delta) {
    const before = pctOf(state.money);
    state.money += delta;
    state.peak = Math.max(state.peak, state.money);
    const g = el.moneyGhost;
    g.style.transition = 'none';
    g.style.width = Math.max(0, before - pctOf(state.money)) + '%';
    el.moneyFill.style.transition = delta < 0 ? 'none' : '';
    updateHud();
    void g.offsetWidth; // restart the transition
    g.style.transition = 'width .5s ease-in .7s';
    g.style.width = '0%';
    el.moneyFill.style.transition = '';
  }

  function startTimerBar(ms) {
    const f = el.timerFill;
    f.style.transition = 'none';
    f.style.width = '100%';
    void f.offsetWidth;
    f.style.transition = `width ${ms}ms linear`;
    f.style.width = '0%';
  }
  function stopTimerBar() {
    const f = el.timerFill;
    f.style.width = getComputedStyle(f).width;
    f.style.transition = 'none';
  }

  function flash(kind) {
    el.frame.classList.remove('flash-pass', 'flash-fail');
    if (kind) el.frame.classList.add('flash-' + kind);
  }
  function shake() {
    el.frame.classList.remove('shake');
    void el.frame.offsetWidth;
    el.frame.classList.add('shake');
  }
  function coins(n = 8) {
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'coin';
      c.style.setProperty('--dx', rand(40, 420) + 'px');
      c.style.setProperty('--dy', rand(120, 480) + 'px');
      c.style.setProperty('--spin', rand(-360, 360) + 'deg');
      c.style.animationDelay = i * 40 + 'ms';
      el.frame.appendChild(c);
      setTimeout(() => c.remove(), 1400);
    }
  }
  function setButton(button, on) {
    (button === 'left' ? el.btnLeft : el.btnRight).classList.toggle('pressed', on);
  }

  /* ---------- run flow ---------- */
  function newRun() {
    abort();
    state = {
      money: CONFIG.startMoney, peak: CONFIG.startMoney,
      round: 0, speed: 1, streak: 0, bestStreak: 0, losses: {},
    };
    updateHud();
    nextRound();
  }

  const speedFor = (round) =>
    Math.min(CONFIG.maxSpeed, 1 + Math.floor((round - 1) / CONFIG.roundsPerSpeedUp) * CONFIG.speedStep);

  function pickGame() {
    if (opts.test) return registry.find((g) => g.id === opts.test.gameId) || registry[0];
    const bosses = registry.filter((g) => g.boss);
    if (bosses.length && state.round % CONFIG.bossEvery === 0) return pick(bosses);
    let pool = registry.filter((g) => !g.boss);
    if (pool.length > 1) pool = pool.filter((g) => g.id !== lastGameId);
    return pick(pool);
  }

  function nextRound() {
    state.round++;
    const prevSpeed = state.speed;
    state.speed = opts.test ? Number(opts.test.speed) || 1 : speedFor(state.round);
    const def = pickGame();
    if (!def) return showError('No microgames registered. Check games/manifest.js.');
    lastGameId = def.id;
    updateHud();
    showInstruction(def, !opts.test && state.speed > prevSpeed);
  }

  function controlsHtml(def) {
    if (def.handsOff) return '<span class="hint hint-off">HANDS OFF!</span>';
    const c = def.controls || {};
    return `<span class="hint hint-left">← ${esc(c.left || 'LEFT')}</span>
            <span class="hint hint-right">${esc(c.right || 'RIGHT')} →</span>`;
  }

  function showInstruction(def, spedUp) {
    setMode('instruction');
    flash(null);
    el.result.innerHTML = '';
    el.stage.innerHTML = '';
    let ms = Math.max(CONFIG.minInstructionMs, CONFIG.instructionMs / state.speed);
    if (def.boss) ms *= 2;
    const text = def.instruction;
    el.screen.innerHTML = `
      <div class="instr ${def.boss ? 'boss' : ''}">
        <div class="instr-top">
          <span class="pill">${def.boss ? 'BOSS ROUND' : 'ROUND ' + state.round}</span>
          ${spedUp ? '<span class="pill pill-hot">SPEED UP!</span>' : ''}
          <span class="pill">×${state.speed}</span>
        </div>
        <div class="instr-text ${text.length > 14 ? 'long' : ''}">${esc(text)}</div>
        ${def.subtitle ? `<div class="instr-sub sticker">${esc(def.subtitle)}</div>` : ''}
        <div class="instr-controls">${controlsHtml(def)}</div>
        <div class="instr-bar"><div style="animation-duration:${ms}ms"></div></div>
      </div>`;
    Game.sound.whoosh();
    flow(ms, () => play(def));
  }

  function play(def) {
    el.screen.innerHTML = '';
    setMode('play');
    el.frame.classList.toggle('hands-off', !!def.handsOff);
    const c = def.controls || {};
    el.btnLeft.textContent = '← ' + (c.left || '');
    el.btnRight.textContent = (c.right || '') + ' →';

    const duration = Math.round(def.duration / state.speed);
    const run = { def, ended: false, timers: [] };
    run.ctx = {
      speed: state.speed,
      round: state.round,
      duration,
      end: (pass, extra) => endGame(run, pass, extra),
      after: (ms, fn) => {
        const t = setTimeout(() => { if (!run.ended) fn(); }, ms);
        run.timers.push(t);
        return t;
      },
      every: (ms, fn) => {
        const t = setInterval(() => { if (!run.ended) fn(); }, ms);
        run.timers.push(t);
        return t;
      },
      isHeld: Game.input.isHeld,
      rand, pick, esc, fmt,
    };
    current = run;
    startTimerBar(duration);
    run.timeout = setTimeout(() => endGame(run, !!def.passOnTimeout, { timedOut: true }), duration);

    try {
      def.start(el.stage, run.ctx);
    } catch (err) {
      console.error(`[${def.id}] start() crashed:`, err);
      endGame(run, true, { crashed: true });
    }
  }

  function stopRun(run) {
    run.ended = true;
    clearTimeout(run.timeout);
    run.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    try { if (run.def.cleanup) run.def.cleanup(); } catch (err) { console.error(`[${run.def.id}] cleanup() crashed:`, err); }
    if (current === run) current = null;
  }

  function endGame(run, pass, extra = {}) {
    if (run.ended || run !== current) return;
    stopRun(run);
    stopTimerBar();
    setButton('left', false);
    setButton('right', false);

    const def = run.def;
    if (pass) {
      const reward = extra.reward ?? def.reward ?? 0;
      if (reward) changeMoney(reward);
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      showPass(def, reward, extra);
    } else {
      const cost = extra.cost ?? def.cost ?? 0;
      changeMoney(-cost);
      state.losses[def.id] = (state.losses[def.id] || 0) + cost;
      state.streak = 0;
      showFail(def, cost, extra);
    }
    if (opts.onResult) opts.onResult({ id: def.id, pass, ...extra });
  }

  /* ---------- result screens ---------- */
  function showPass(def, reward, extra) {
    setMode('result');
    flash('pass');
    Game.sound.pass();
    const word = extra.passWord || def.passWord || pick(['NICE!', 'SMART!', 'SAVED!']);
    const label = (extra.passLabel || def.passLabel || def.name || def.id).toUpperCase();
    const right = extra.passRight || (reward > 0 ? '+' + fmt2(reward) : `${fmt2(def.cost || 0)} SAVED`);
    el.result.innerHTML = `
      <div class="result-main"><div class="stamp good ${word.length > 9 ? 'stamp-long' : ''}">${esc(word)}</div></div>
      <div class="receipt-wrap result-receipt small"><div class="receipt">
        <div class="line bold"><span>${esc(label)}</span><span>${esc(right)}</span></div>
        <div class="line"><span>BALANCE</span><span>${fmt2(state.money)}</span></div>
      </div></div>`;
    flow(CONFIG.passMs, nextRound);
  }

  function showFail(def, cost, extra) {
    setMode('result');
    flash('fail');
    shake();
    coins();
    Game.sound.fail();
    const word = extra.failWord || (extra.timedOut && def.timeoutWord) || def.failWord || 'OUCH!';
    const lesson = extra.lesson || (extra.timedOut && def.timeoutLesson) || def.lesson || '';
    const label = (extra.failLabel || def.name || def.id).toUpperCase();
    el.result.innerHTML = `
      <div class="result-main">
        <div class="stamp ${word.length > 9 ? 'stamp-long' : ''}">${esc(word)}</div>
        <div class="loss">−${fmt(cost)}</div>
      </div>
      <div class="receipt-wrap result-receipt"><div class="receipt">
        <div class="line bold"><span>${esc(label)}</span><span>${fmt2(-cost)}</span></div>
        <div class="line"><span>BALANCE</span><span>${fmt2(Math.max(0, state.money))}</span></div>
        ${lesson ? `<div class="dash"></div><div class="tip">TIP: ${esc(lesson)}</div>` : ''}
      </div></div>`;

    if (state.money <= 0 && opts.test) {
      state.money = CONFIG.startMoney; // test mode never goes bankrupt
      flow(CONFIG.failMs, () => { updateHud(); nextRound(); });
    } else if (state.money <= 0) {
      flow(CONFIG.failMs, gameOver);
    } else {
      flow(CONFIG.failMs, nextRound);
    }
  }

  /* ---------- leaderboard (localStorage on the demo laptop) ---------- */
  const SCORE_KEY = 'dwlm-scores-v1';
  function loadScores() {
    try { return JSON.parse(localStorage.getItem(SCORE_KEY)) || []; } catch (e) { return []; }
  }
  function saveScore(entry) {
    try {
      const list = loadScores();
      list.push(entry);
      list.sort((a, b) => b.rounds - a.rounds || b.peak - a.peak);
      localStorage.setItem(SCORE_KEY, JSON.stringify(list.slice(0, 10)));
    } catch (e) { /* storage blocked: fine */ }
  }

  /* ---------- title ---------- */
  function showTitle() {
    abort();
    setMode('title');
    flash(null);
    const top = loadScores().slice(0, 3);
    const rows = top.length
      ? top.map((s, i) => `<div class="line"><span>${i + 1}. ${s.rounds} ROUNDS</span><span>${fmt(s.peak)} PEAK</span></div>`).join('')
      : '<div class="center">No scores yet. Be the first.</div>';
    el.screen.innerHTML = `
      <div class="title">
        <div class="mascot mascot-big bob">${face('happy')}</div>
        <h1 class="wordmark">DUMB WAYS<br>TO DEBT</h1>
        <p class="tagline">Don't go broke!</p>
        <div class="start sticker">PRESS ← OR → TO START</div>
        <div class="title-keys sticker">← → keys, or tap either side</div>
        <div class="receipt-wrap title-board"><div class="receipt">
          <div class="center bold">*** TOP SURVIVORS ***</div>
          <div class="dash"></div>
          ${rows}
        </div></div>
      </div>`;
  }

  /* ---------- bankrupt ---------- */
  function gameOver() {
    setMode('over');
    flash(null);
    Game.sound.bankrupt();
    const survived = state.round - 1;
    saveScore({ rounds: survived, peak: state.peak, at: Date.now() });

    const losses = Object.entries(state.losses).sort((a, b) => b[1] - a[1]);
    const byId = (id) => registry.find((g) => g.id === id);
    const worst = losses.length ? byId(losses[0][0]) : null;
    const persona = (worst && worst.personality) ||
      { title: 'THE UNLUCKY ONE', roast: 'Honestly, the market was against you.' };
    const total = losses.reduce((sum, [, amt]) => sum + amt, 0);
    const lines = losses.slice(0, 4).map(([id, amt]) => {
      const d = byId(id);
      return `<div class="line"><span>${esc(((d && d.name) || id).toUpperCase())}</span><span>${fmt2(-amt)}</span></div>`;
    }).join('');

    el.screen.innerHTML = `
      <div class="over">
        <div class="over-head">
          <div class="mascot mascot-big low">${face('sad')}</div>
          <div class="stamp">BANKRUPT</div>
        </div>
        <div class="over-stats">
          <div class="stat sticker"><span class="stat-label">ROUNDS SURVIVED</span><span class="stat-value">${survived}</span></div>
          <div class="stat sticker"><span class="stat-label">PEAK WALLET</span><span class="stat-value">${fmt(state.peak)}</span></div>
          <div class="stat sticker"><span class="stat-label">BEST STREAK</span><span class="stat-value">${state.bestStreak}</span></div>
        </div>
        <div class="over-body">
          <div class="persona">
            <span class="persona-label">YOUR MONEY PERSONALITY</span>
            <span class="persona-title">${esc(persona.title)}</span>
            <span class="persona-roast">${esc(persona.roast)}</span>
          </div>
          <div class="receipt-wrap"><div class="receipt">
            <div class="center bold">WHERE YOUR MONEY WENT</div>
            <div class="dash"></div>
            ${lines}
            <div class="dash"></div>
            <div class="line bold"><span>TOTAL</span><span>${fmt2(-total)}</span></div>
          </div></div>
        </div>
        <div class="over-actions">
          <span class="hint hint-left">← PLAY AGAIN</span>
          <span class="hint hint-right">TITLE →</span>
        </div>
      </div>`;
    inputLockedUntil = performance.now() + 1300; // stop panic-mashing skipping this screen
  }

  function showError(msg) {
    setMode('error');
    el.screen.innerHTML = `<div class="error sticker">${esc(msg)}</div>`;
  }

  /* ---------- input routing ---------- */
  function onInput(button, pressed) {
    if (pressed && performance.now() < inputLockedUntil) return;
    if (pressed) Game.sound.unlock();

    if (mode === 'title') {
      if (pressed) { Game.sound.start(); newRun(); }
    } else if (mode === 'over') {
      if (pressed) (button === 'left' ? newRun : showTitle)();
    } else if (mode === 'play') {
      setButton(button, pressed);
      if (!current) return;
      if (current.def.handsOff) {
        if (pressed) endGame(current, false);
        return;
      }
      try {
        if (current.def.onInput) current.def.onInput(button, pressed, current.ctx);
      } catch (err) {
        console.error(`[${current.def.id}] onInput() crashed:`, err);
      }
    }
  }

  /* Stops whatever is happening without showing a result. */
  function abort() {
    clearTimeout(flowTimer);
    if (current) stopRun(current);
    if (el.frame) {
      stopTimerBar();
      el.result.innerHTML = '';
      el.screen.innerHTML = '';
      el.stage.innerHTML = '';
      el.frame.classList.remove('hands-off');
    }
  }

  /* ---------- public ---------- */
  Game.boot = function (root, options = {}) {
    opts = { test: null, onResult: null, ...options };
    buildDom(root);
    fit();
    window.addEventListener('resize', fit);
    Game.input.attach(el.frame);
    Game.input.on(onInput);
    if (opts.test) newRun();
    else showTitle();
  };

  Game.test = {
    restart(changes = {}) {
      if (!opts.test) return;
      Object.assign(opts.test, changes);
      newRun();
    },
  };
})();
