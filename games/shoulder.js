/* =========================================================
   SHOULDER SURFER (v2): red light, green light. Owner: Person 3
   ← HOLD FOR PRIVACY SHIELD   → TYPE

   Type your PIN (4), the amount (£200) and press ENTER.
   A spy in a trench coat keeps glancing over. The warning
   builds in stages so players can read it:

     AWAY   eyes on his phone          meter empty   TYPE NOW
     NOSY   eyes slide over, "hmm?"    meter yellow  HE'S GETTING NOSY...
     TURN   head turns, big red "!"    meter red     COVER NOW!   (red border)
     LOOK   leans in, sight-lines      meter red     KEEP COVERING!

   While he LOOKS, you must be holding ← (shield down).
   The shield blocks typing, so you can't hold it forever.
   The "!" ALWAYS means he's about to look. From speed ×1.25
   he sometimes gets nosy and then goes back to his phone.
   ========================================================= */
(function () {
  'use strict';

  const PIN_LEN = 4;
  const AMOUNT = ['2', '0', '0'];
  const TOTAL = PIN_LEN + AMOUNT.length + 1; // + ENTER
  const TYPE_GAP = 250;    // ms between accepted presses at ×1 (stops mashing past him)
  const LOOK_GRACE = 80;   // ms after he looks before he can catch you
  const FAKE_CHANCE = 0.3; // chance "nosy" goes back to "away" (from ×1.25)

  // Stage timings at ×1 (all shrink with speed)
  const NOSY_MS = 650;
  const TURN_MS = 550;

  Game.css('shoulder', `
    .sp-wrap { position: absolute; inset: 0; }

    .sp-atm { position: absolute; left: 28px; top: 8px; width: 330px; height: 378px; overflow: hidden;
              background: #DDE3E8; border: 5px solid var(--ink); border-radius: 18px; box-shadow: 6px 6px 0 var(--ink);
              display: flex; flex-direction: column; }
    .sp-sign { height: 36px; flex: none; background: var(--yellow); border-bottom: 4px solid var(--ink);
               display: flex; align-items: center; justify-content: center;
               font-family: var(--font-display); font-size: 20px; letter-spacing: 1px; }
    .sp-screen { margin: 12px 14px 0; flex: none; background: var(--night); border: 4px solid var(--ink); border-radius: 10px;
                 padding: 10px 14px; display: flex; flex-direction: column; gap: 10px; }
    .sp-label { font-family: var(--font-receipt); font-weight: 700; font-size: 14px; color: var(--yellow); letter-spacing: 1px; }
    .sp-boxes { display: flex; gap: 10px; }
    .sp-box { width: 38px; height: 38px; background: var(--cream); border: 3px solid var(--ink); border-radius: 8px;
              display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 24px; }
    .sp-pad { margin: 12px 14px 0; display: flex; gap: 10px; }
    .sp-keys { flex: 1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
    .sp-key, .sp-fn div { border: 3px solid var(--ink); border-radius: 8px; box-shadow: 2px 2px 0 var(--ink);
              display: flex; align-items: center; justify-content: center; font-family: var(--font-display); }
    .sp-key { height: 36px; background: var(--cream); font-size: 18px; }
    .sp-fn { width: 84px; display: flex; flex-direction: column; gap: 7px; }
    .sp-fn div { flex: 1; font-size: 13px; }
    .sp-cancel { background: var(--red); } .sp-clear { background: var(--yellow); } .sp-enter { background: var(--green); }
    .sp-key.hit, .sp-fn div.hit { background: var(--yellow); transform: translate(2px, 2px); box-shadow: none; }
    .sp-slot { margin: 14px auto 0; width: 180px; height: 14px; background: var(--ink); border-radius: 7px; }

    .sp-shield { position: absolute; left: 34px; top: 158px; width: 324px; height: 196px; z-index: 3; pointer-events: none;
                 transform-origin: 50% 0; transform: scaleY(0); transition: transform .1s ease-out; }
    .sp-shield.on { transform: scaleY(1); }
    .sp-shield.nope { animation: sp-nope .2s; }
    .sp-shield svg { display: block; width: 100%; height: 100%; overflow: visible; }

    .sp-meter { position: absolute; left: 418px; top: 8px; width: 356px; z-index: 2;
                background: var(--cream); border: 4px solid var(--ink); border-radius: 14px; box-shadow: 5px 5px 0 var(--ink);
                padding: 8px 12px; display: flex; align-items: center; gap: 10px; }
    .sp-eye { width: 32px; height: 22px; flex: none; }
    .sp-meter-label { font-family: var(--font-display); font-size: 17px; white-space: nowrap; min-width: 98px; }
    .sp-segs { flex: 1; display: flex; gap: 5px; }
    .sp-seg { flex: 1; height: 20px; border: 3px solid var(--ink); border-radius: 6px; background: #FFFFFF; transition: background-color .12s; }
    .sp-seg.warn { background: var(--yellow); }
    .sp-seg.alarm { background: var(--red); }

    .sp-spy { position: absolute; left: 472px; top: 56px; width: 260px; height: 300px; }
    .sp-spy svg { display: block; overflow: visible; }
    .sp-spy .sp-body, .sp-spy .sp-head, .sp-spy .sp-collar, .sp-spy .sp-phone {
      transform-box: view-box; transition: transform .16s ease-out, opacity .12s; }
    .sp-spy .sp-head { transform-origin: 130px 160px; }
    .sp-spy .sp-body, .sp-spy .sp-collar { transform-origin: 130px 300px; }
    .sp-spy .sp-phone { transform-origin: 0 0; }
    .sp-spy.away .sp-head { transform: rotate(8deg); }
    .sp-spy.turn .sp-head { transform: translate(-16px, 4px) rotate(-12deg); }
    .sp-spy.look .sp-head { transform: translate(-44px, 10px) rotate(-18deg); }
    .sp-spy.look .sp-body, .sp-spy.look .sp-collar { transform: rotate(-7deg); }
    .sp-spy.away .sp-phone { transform: translate(166px, 190px) rotate(-10deg); }
    .sp-spy.nosy .sp-phone { transform: translate(168px, 210px) rotate(-2deg); }
    .sp-spy.turn .sp-phone { transform: translate(170px, 232px) rotate(12deg); }
    .sp-spy.look .sp-phone { transform: translate(170px, 262px) rotate(20deg); opacity: 0; }
    .sp-spy .eyes { display: none; }
    .sp-spy.away .eyes-away, .sp-spy.nosy .eyes-nosy, .sp-spy.turn .eyes-turn, .sp-spy.look .eyes-look { display: inline; }
    .sp-spy .sp-beam { opacity: 0; transition: opacity .1s; }
    .sp-spy.look .sp-beam { opacity: 1; }

    .sp-bubble { position: absolute; z-index: 2; background: #FFFFFF; border: 4px solid var(--ink); border-radius: 14px;
                 box-shadow: 4px 4px 0 var(--ink); padding: 4px 14px; font-family: var(--font-display); font-size: 24px;
                 white-space: nowrap; }
    .sp-bubble.quiet { font-family: var(--font-body); font-weight: 800; font-size: 15px; color: #555555;
                       border-width: 3px; border-radius: 12px; padding: 3px 10px; box-shadow: none; }
    .sp-bubble:empty { display: none; }
    .sp-bang { position: absolute; left: 440px; top: 72px; width: 76px; height: 92px; z-index: 3;
               background: var(--red); border: 5px solid var(--ink); border-radius: 16px; box-shadow: 5px 5px 0 var(--ink);
               display: none; align-items: center; justify-content: center;
               font-family: var(--font-display); font-size: 70px; line-height: 1; color: var(--cream); }
    .sp-bang.show { display: flex; animation: sp-pop .2s cubic-bezier(.2, 1.6, .4, 1) both; }

    .sp-status-wrap { position: absolute; left: 418px; top: 338px; width: 356px; display: flex; justify-content: center; z-index: 2; }
    .sp-status { font-family: var(--font-display); font-size: 24px; white-space: nowrap; padding: 4px 18px;
                 border: 4px solid var(--ink); border-radius: 14px; box-shadow: 5px 5px 0 var(--ink); }
    .sp-status.go { background: var(--green); }
    .sp-status.warn { background: var(--yellow); }
    .sp-status.alarm { background: var(--red); animation: pulse .25s ease-in-out infinite alternate; }

    .sp-blocked { position: absolute; left: 286px; top: 296px; z-index: 4; display: none;
                  background: var(--red); border: 4px solid var(--ink); border-radius: 12px; box-shadow: 4px 4px 0 var(--ink);
                  padding: 2px 10px; font-family: var(--font-display); font-size: 18px; transform: rotate(-8deg); }
    .sp-blocked.show { display: block; }

    .sp-vignette { position: absolute; inset: 0; pointer-events: none; z-index: 5; transition: box-shadow .12s; }
    .sp-wrap.alarm .sp-vignette { box-shadow: inset 0 0 0 10px rgba(240, 74, 62, .85); }
    .sp-wrap.turning .sp-vignette { animation: sp-flash .18s ease-in-out infinite alternate; }

    @keyframes sp-pop { from { transform: scale(.3) rotate(-10deg); } to { transform: scale(1) rotate(-10deg); } }
    @keyframes sp-nope { 25% { transform: scaleY(1) translateX(-8px); } 75% { transform: scaleY(1) translateX(8px); } }
    @keyframes sp-flash { from { box-shadow: inset 0 0 0 4px rgba(240, 74, 62, .6); } to { box-shadow: inset 0 0 0 14px rgba(240, 74, 62, .95); } }
  `);

  /* ---------- art ---------- */
  const SPY = `<svg width="260" height="300" viewBox="0 0 260 300" aria-hidden="true">
    <g class="sp-beam">
      <line x1="70" y1="104" x2="-150" y2="196" stroke="#FFD23F" stroke-width="7" stroke-dasharray="12 10" stroke-linecap="round"/>
      <line x1="94" y1="110" x2="-150" y2="236" stroke="#FFD23F" stroke-width="7" stroke-dasharray="12 10" stroke-linecap="round"/>
    </g>
    <g class="sp-body">
      <path d="M36 300 L36 214 Q36 156 130 156 Q224 156 224 214 L224 300 Z" fill="#E5C78E" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
      <line x1="130" y1="262" x2="130" y2="300" stroke="#111" stroke-width="4"/>
      <circle cx="146" cy="284" r="5" fill="#111"/>
    </g>
    <g class="sp-head">
      <ellipse cx="130" cy="118" rx="50" ry="48" fill="#111"/>
      <g class="eyes eyes-away">
        <ellipse cx="112" cy="112" rx="14" ry="10" fill="#FFF"/><ellipse cx="148" cy="112" rx="14" ry="10" fill="#FFF"/>
        <circle cx="117" cy="116" r="4.5" fill="#111"/><circle cx="153" cy="116" r="4.5" fill="#111"/>
        <rect x="96" y="100" width="32" height="9" fill="#111"/><rect x="132" y="100" width="32" height="9" fill="#111"/>
      </g>
      <g class="eyes eyes-nosy">
        <ellipse cx="112" cy="112" rx="14" ry="10" fill="#FFF"/><ellipse cx="148" cy="112" rx="14" ry="10" fill="#FFF"/>
        <circle cx="103" cy="113" r="4.5" fill="#111"/><circle cx="139" cy="113" r="4.5" fill="#111"/>
        <rect x="96" y="100" width="32" height="5" fill="#111"/><path d="M132 99 L164 99 L164 108 Z" fill="#111"/>
      </g>
      <g class="eyes eyes-turn">
        <ellipse cx="112" cy="110" rx="15" ry="13" fill="#FFF"/><ellipse cx="148" cy="110" rx="15" ry="13" fill="#FFF"/>
        <circle cx="101" cy="110" r="5" fill="#111"/><circle cx="137" cy="110" r="5" fill="#111"/>
      </g>
      <g class="eyes eyes-look">
        <ellipse cx="112" cy="110" rx="15" ry="13" fill="#FFF"/><ellipse cx="148" cy="110" rx="15" ry="13" fill="#FFF"/>
        <circle cx="100" cy="113" r="5" fill="#111"/><circle cx="136" cy="113" r="5" fill="#111"/>
        <path d="M95 96 L129 105 L129 95 Z M165 96 L131 105 L131 95 Z" fill="#111"/>
      </g>
      <path d="M86 80 Q84 42 102 32 Q118 24 130 36 Q142 24 158 32 Q176 42 174 80 Z" fill="#C9A04A" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
      <rect x="87" y="58" width="86" height="12" fill="#7A5A2A"/>
      <ellipse cx="130" cy="80" rx="80" ry="13" fill="#C9A04A" stroke="#111" stroke-width="5"/>
    </g>
    <g class="sp-collar">
      <path d="M66 120 Q58 178 84 242 L118 218 L130 264 L126 172 Q98 156 66 120 Z" fill="#EDD29C" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
      <path d="M194 120 Q202 178 176 242 L142 218 L130 264 L134 172 Q162 156 194 120 Z" fill="#EDD29C" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
    </g>
    <g class="sp-phone">
      <rect x="0" y="0" width="34" height="54" rx="7" fill="#24244A" stroke="#111" stroke-width="4"/>
      <rect x="6" y="8" width="22" height="34" rx="3" fill="#7FD1F7"/>
      <circle cx="16" cy="56" r="13" fill="#2A2A2A" stroke="#111" stroke-width="4"/>
    </g>
  </svg>`;

  const SHIELD = `<svg viewBox="0 0 324 196" aria-hidden="true">
    <path d="M20 16 L316 16 L328 192 L8 192 Z" fill="#111"/>
    <path d="M14 10 L310 10 L322 186 L2 186 Z" fill="#C3CBD2" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
    <path d="M40 26 L120 26 L60 176 L16 176 Z" fill="#FFF" opacity=".35"/>
    <line x1="30" y1="150" x2="294" y2="150" stroke="#8E99A3" stroke-width="4" stroke-linecap="round"/>
    <line x1="28" y1="164" x2="296" y2="164" stroke="#8E99A3" stroke-width="4" stroke-linecap="round"/>
    <rect x="6" y="0" width="312" height="22" rx="6" fill="#8E99A3" stroke="#111" stroke-width="5"/>
    <rect x="40" y="-6" width="34" height="14" rx="4" fill="#C3CBD2" stroke="#111" stroke-width="4"/>
    <rect x="250" y="-6" width="34" height="14" rx="4" fill="#C3CBD2" stroke="#111" stroke-width="4"/>
    <rect x="62" y="70" width="200" height="50" rx="10" fill="#FFD23F" stroke="#111" stroke-width="4"/>
    <text x="162" y="104" text-anchor="middle" font-family="Lilita One, Arial Black, sans-serif" font-size="24" fill="#111"
          textLength="176" lengthAdjust="spacingAndGlyphs">PRIVACY SHIELD</text>
    <circle cx="26" cy="40" r="5" fill="#8E99A3" stroke="#111" stroke-width="3"/>
    <circle cx="298" cy="40" r="5" fill="#8E99A3" stroke="#111" stroke-width="3"/>
    <circle cx="20" cy="132" r="5" fill="#8E99A3" stroke="#111" stroke-width="3"/>
    <circle cx="304" cy="132" r="5" fill="#8E99A3" stroke="#111" stroke-width="3"/>
  </svg>`;

  const EYE_ICON = {
    away: `<svg class="sp-eye" viewBox="0 0 32 22" aria-hidden="true"><path d="M3 9 Q16 20 29 9" fill="none" stroke="#111" stroke-width="3.5" stroke-linecap="round"/><path d="M8 14 L5 19 M16 16 L16 21 M24 14 L27 19" stroke="#111" stroke-width="3" stroke-linecap="round"/></svg>`,
    nosy: `<svg class="sp-eye" viewBox="0 0 32 22" aria-hidden="true"><path d="M3 11 Q16 2 29 11 Q16 20 3 11 Z" fill="#FFF" stroke="#111" stroke-width="3" stroke-linejoin="round"/><path d="M3 11 Q16 4 29 11" fill="#C9A66B" stroke="#111" stroke-width="3"/><circle cx="16" cy="13" r="3.5" fill="#111"/></svg>`,
    alarm: `<svg class="sp-eye" viewBox="0 0 32 22" aria-hidden="true"><path d="M2 11 Q16 -2 30 11 Q16 24 2 11 Z" fill="#FFF" stroke="#111" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="11" r="5" fill="#D7261B" stroke="#111" stroke-width="2"/></svg>`,
  };

  const STATE_UI = {
    away: { status: 'TYPE NOW', tone: 'go', segs: 0, segTone: '', eye: 'away', label: 'NOSY METER',
            bubble: 'scrolling...', quiet: true, at: [648, 78] },
    nosy: { status: "HE'S GETTING NOSY...", tone: 'warn', segs: 2, segTone: 'warn', eye: 'nosy', label: 'NOSY METER',
            bubble: 'hmm?', quiet: false, at: [462, 98] },
    turn: { status: 'COVER NOW!', tone: 'alarm', segs: 3, segTone: 'alarm', eye: 'alarm', label: 'NOSY METER',
            bubble: '', quiet: false, at: [0, 0] },
    look: { status: 'KEEP COVERING!', tone: 'alarm', segs: 3, segTone: 'alarm', eye: 'alarm', label: 'LOOKING!',
            bubble: 'ooh, a PIN...', quiet: false, at: [590, 76] },
  };

  let s = null;

  /* ---------- state + rendering ---------- */
  function setState(state) {
    s.state = state;
    const ui = STATE_UI[state];
    s.el.spy.className = 'sp-spy ' + state;
    s.el.wrap.classList.toggle('alarm', state === 'turn' || state === 'look');
    s.el.wrap.classList.toggle('turning', state === 'turn');
    s.el.segs.forEach((seg, i) => { seg.className = 'sp-seg ' + (i < ui.segs ? ui.segTone : ''); });
    s.el.eye.innerHTML = EYE_ICON[ui.eye];
    s.el.meterLabel.textContent = ui.label;
    s.el.status.className = 'sp-status ' + ui.tone;
    s.el.status.textContent = ui.status;
    s.el.bubble.className = 'sp-bubble' + (ui.quiet ? ' quiet' : '');
    s.el.bubble.textContent = ui.bubble;
    s.el.bubble.style.left = ui.at[0] + 'px';
    s.el.bubble.style.top = ui.at[1] + 'px';
    s.el.bang.classList.toggle('show', state === 'turn');
    if (state === 'look') s.lookT0 = performance.now();
  }

  /* away → nosy → turn → look → away … ("!" always leads to a look) */
  function cycle(ctx) {
    if (s.done) return;
    const k = Math.sqrt(ctx.speed);
    setState('away');
    const awayMs = s.first ? ctx.rand(150, 300) : Math.round(ctx.rand(650, 1300) / k);
    s.first = false;
    ctx.after(awayMs, () => {
      setState('nosy');
      ctx.after(Math.max(380, Math.round(NOSY_MS / k)), () => {
        if (ctx.speed >= 1.25 && Math.random() < FAKE_CHANCE) { cycle(ctx); return; } // back to his phone
        setState('turn');
        ctx.after(Math.max(300, Math.round(TURN_MS / k)), () => {
          setState('look');
          ctx.after(Math.round(ctx.rand(700, 1100) / k), () => cycle(ctx));
        });
      });
    });
  }

  function renderScreen() {
    const t = s.typed;
    let label;
    let boxes;
    if (t < PIN_LEN) {
      label = 'ENTER YOUR PIN';
      boxes = [0, 1, 2, 3].map((i) => (i < t ? '*' : ''));
    } else if (t < PIN_LEN + AMOUNT.length) {
      label = 'ENTER AMOUNT';
      boxes = ['£'].concat(AMOUNT.map((d, i) => (i < t - PIN_LEN ? d : '')));
    } else {
      label = 'PRESS ENTER';
      boxes = ['£'].concat(AMOUNT);
    }
    s.el.label.textContent = label;
    s.el.boxes.forEach((b, i) => { b.textContent = boxes[i]; });
  }

  function flash(el, ctx) {
    el.classList.add('hit');
    ctx.after(90, () => el.classList.remove('hit'));
  }

  function type(ctx) {
    const now = performance.now();
    if (now - s.lastType < TYPE_GAP / Math.sqrt(ctx.speed)) return;
    s.lastType = now;
    s.typed++;
    if (s.typed <= PIN_LEN) flash(s.el.digitKeys[ctx.rand(0, s.el.digitKeys.length - 1)], ctx);
    else if (s.typed <= PIN_LEN + AMOUNT.length) flash(s.el.keyFor[AMOUNT[s.typed - PIN_LEN - 1]], ctx);
    else flash(s.el.enter, ctx);
    Game.sound.blip();
    renderScreen();
    if (s.typed >= TOTAL) {
      s.done = true;
      ctx.end(true, { passLabel: 'Withdrew £200 safely' });
    }
  }

  function caught(ctx, how) {
    s.done = true;
    s.el.shield.classList.remove('on');
    setState('look');
    s.el.bubble.textContent = 'ooh, a PIN...';
    ctx.end(false, { failLabel: how });
  }

  /* ---------- register ---------- */
  Game.register({
    id: 'shoulder',
    name: 'Shoulder Surfer',
    instruction: "DON'T GET PEEPED!",
    subtitle: 'Tap → to type. Hold ← for the privacy shield when he looks.',
    controls: { left: 'SHIELD', right: 'TYPE' },
    duration: 8000,
    cost: 200,
    passOnTimeout: false,
    failWord: 'PEEPED!',
    passWord: 'PIN SAFE!',
    timeoutWord: 'CARD SWALLOWED!',
    timeoutLesson: "Shielding is right, but you still have to finish. Type while he's on his phone.",
    lesson: 'Always shield the keypad when you type your PIN. Shoulder surfing is a common way cards get stolen.',
    personality: { title: 'THE OPEN BOOK', roast: "You'd read your PIN out loud if someone asked nicely." },

    start(stage, ctx) {
      const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];
      stage.innerHTML = `
        <div class="sp-wrap">
          <div class="sp-atm">
            <div class="sp-sign">CASH MACHINE</div>
            <div class="sp-screen">
              <span class="sp-label">ENTER YOUR PIN</span>
              <div class="sp-boxes">${'<span class="sp-box"></span>'.repeat(4)}</div>
            </div>
            <div class="sp-pad">
              <div class="sp-keys">${labels.map((k) => `<div class="sp-key" data-k="${k}">${k}</div>`).join('')}</div>
              <div class="sp-fn"><div class="sp-cancel">CANCEL</div><div class="sp-clear">CLEAR</div><div class="sp-enter">ENTER</div></div>
            </div>
            <div class="sp-slot"></div>
          </div>
          <div class="sp-shield">${SHIELD}</div>
          <div class="sp-meter">
            <span class="sp-eye-slot"></span>
            <span class="sp-meter-label">NOSY METER</span>
            <div class="sp-segs">${'<div class="sp-seg"></div>'.repeat(3)}</div>
          </div>
          <div class="sp-spy away">${SPY}</div>
          <div class="sp-bubble quiet"></div>
          <div class="sp-bang">!</div>
          <div class="sp-blocked">BLOCKED!</div>
          <div class="sp-status-wrap"><div class="sp-status go">TYPE NOW</div></div>
          <div class="sp-vignette"></div>
        </div>`;

      const q = (sel) => stage.querySelector(sel);
      const keys = [...stage.querySelectorAll('.sp-key')];
      s = {
        state: 'away', typed: 0, lastType: 0, lookT0: 0, first: true, done: false,
        el: {
          wrap: q('.sp-wrap'), spy: q('.sp-spy'), bubble: q('.sp-bubble'), bang: q('.sp-bang'),
          blocked: q('.sp-blocked'), status: q('.sp-status'), shield: q('.sp-shield'),
          eye: q('.sp-eye-slot'), meterLabel: q('.sp-meter-label'), segs: [...stage.querySelectorAll('.sp-seg')],
          label: q('.sp-label'), boxes: [...stage.querySelectorAll('.sp-box')],
          digitKeys: keys.filter((k) => k.dataset.k),
          keyFor: Object.fromEntries(keys.filter((k) => k.dataset.k).map((k) => [k.dataset.k, k])),
          enter: q('.sp-enter'),
        },
      };

      cycle(ctx);
      ctx.every(16, () => {
        if (!s || s.done) return;
        const shielded = ctx.isHeld('left');
        s.el.shield.classList.toggle('on', shielded);
        const looking = s.state === 'look';
        s.el.blocked.classList.toggle('show', looking && shielded);
        if (looking) s.el.bubble.textContent = shielded ? 'drat.' : 'ooh, a PIN...';
        if (looking && !shielded && performance.now() - s.lookT0 > LOOK_GRACE) caught(ctx, 'He saw your PIN');
      });
    },

    onInput(button, pressed, ctx) {
      if (!pressed || !s || s.done || button !== 'right') return;
      if (ctx.isHeld('left')) {
        // Shield's down: can't type through it.
        s.el.shield.classList.remove('nope');
        void s.el.shield.offsetWidth;
        s.el.shield.classList.add('nope');
        return;
      }
      if (s.state === 'look') {
        caught(ctx, 'Typed while he was watching');
        return;
      }
      type(ctx);
    },

    cleanup() { s = null; },
  });
})();
