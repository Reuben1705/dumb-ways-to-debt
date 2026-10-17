# Dumb Ways to Lose Money

Two buttons. One wallet. Don't go broke.

## Run it

No build step. Either open `index.html` in Chrome, or (better) open the folder in VS Code and use the **Live Server** extension.

- `index.html` is the real game.
- `test.html` loops **one** microgame forever with infinite money. Pick the game and speed from the bar at the top. Use this while building.

Controls: **← / A** and **→ / D**, or tap the left / right half of the screen.

## Files

| File | Owner | What it does |
|---|---|---|
| `engine.js` | Person 1 | Game loop, wallet, timer, instruction flash, results, bankrupt screen, leaderboard |
| `input.js` | Person 1 | Keys + touch → `left` / `right` |
| `sound.js` | Person 3 | Synthesised sound effects (swap for real samples if you want) |
| `style.css` | Person 3 | Palette, fonts, shared pieces (`.sticker`, `.receipt`, `.stamp`, `.pill`) |
| `games/manifest.js` | everyone | One line per game. Add yours here |
| `games/*.js` | one person per file | A microgame |

Each person works in their own files, so merges stay painless.

## Making a microgame

1. Copy `games/phishing.js` (a choice game) or `games/impulse.js` (a hands-off game).
2. Rename it, change the `id`, and add the name to `games/manifest.js`.
3. Open `test.html?game=yourid` and iterate.

```js
Game.register({
  id: 'pumpdump',                 // unique, matches the file name
  name: 'Pump and Dump',          // shown on receipts and the bankrupt screen
  instruction: 'SELL BEFORE THE CRASH!',
  controls: { left: 'SELL', right: 'HOLD' },  // button labels for this game
  duration: 4000,                 // ms at speed ×1 (engine divides by speed)
  cost: 200,                      // money lost on fail
  reward: 0,                      // money gained on pass (optional)
  passOnTimeout: false,           // what happens if the timer runs out
  handsOff: false,                // true = any press fails (engine handles it)
  failWord: 'REKT!',              // big stamp on fail (keep it short)
  passWord: 'CASHED OUT!',        // big stamp on pass (optional)
  lesson: 'If it only goes up, someone is about to sell.',
  personality: { title: 'THE DIAMOND HANDS', roast: 'You held all the way to zero.' },
  boss: false,                    // true = only appears every 10th round

  start(stage, ctx) { /* draw inside stage */ },
  onInput(button, pressed, ctx) { /* button: 'left'|'right', pressed: true/false */ },
  cleanup() { /* optional: reset your variables */ },
});
```

### `ctx`, what your game gets

| | |
|---|---|
| `ctx.end(pass, extra?)` | Finish the round. Safe to call more than once (only the first counts). |
| `ctx.after(ms, fn)` / `ctx.every(ms, fn)` | Timers that the engine clears automatically. **Always use these instead of `setTimeout` / `setInterval`.** |
| `ctx.speed` | 1 → 2.5. Use it to make your game harder, not just shorter. |
| `ctx.duration` | This round's actual length in ms. |
| `ctx.isHeld('left')` | Is a button currently held? Useful for hold games. |
| `ctx.rand(min, max)`, `ctx.pick(array)`, `ctx.esc(text)`, `ctx.fmt(pounds)` | Helpers. Use `esc` on any text you put in HTML. |

`extra` can override anything for this one result: `{ lesson, failWord, failLabel, cost, passWord, passLabel, passRight, reward }`. Phishing uses this to give a different tip for every email.

### Patterns for your games

- **Choice** (Phishing, Your Mate's Startup, Better Value): on the first press, compare `button` with the right answer and call `ctx.end`.
- **Hands off** (Impulse Buy): `handsOff: true, passOnTimeout: true`. No `onInput` needed.
- **Hold / release** (Pump and Dump + Panic Sell): watch `pressed === true` and `pressed === false` in `onInput`, and move things with `ctx.every(30, ...)`.
- **Timing** (Compound Interest): animate with `ctx.every`, and on press check whether you're inside the target zone.
- **Movement** (Contactless Chaos): keep positions in variables, update them in `ctx.every(16, ...)`, and set `style.transform`.

### Rules of thumb

- Draw only inside `stage` (800 × 400). The engine owns everything else.
- Put your CSS in `Game.css('yourid', \`...\`)` and prefix class names with your game (`.ph-`, `.ib-`) so they don't clash.
- Use the palette variables from `style.css`: `var(--red)`, `var(--green)`, `var(--yellow)`, `var(--ink)`, `var(--cream)`, `var(--paper)`.
- Left = no / sell / bin. Right = yes / buy / keep. Keep that consistent in every game.
- If a game isn't fun after one tweak, cut it.

## Plan

1. **First:** everyone runs `test.html` and plays Phishing until it makes sense.
2. **Person 1:** boss round support is already in the engine (`boss: true`). Build **Scam Inbox Rush** from the Phishing code, then polish: arcade initials on the bankrupt screen, mute toggle, tuning `Game.config`.
3. **Person 2:** Your Mate's Startup, Better Value / Free Trial, then help write content (emails, pitches, tips).
4. **Person 3:** Pump and Dump + Panic Sell, Compound Interest, Contactless Chaos, and the visual/sound polish.
5. **Final 3–4 hours:** feature freeze, test on a phone, record a backup video, rehearse the pitch.

Tuning lives in `Game.config` at the top of `engine.js` (starting money, speed-up rate, how long results show).

## Demo-day notes

- Fonts load from Google Fonts. If the venue Wi-Fi is bad it falls back to system fonts. Download the three fonts into a `fonts/` folder beforehand if you're worried.
- The leaderboard is saved in the browser, so play on the same laptop all day.
- Run in full screen (F11) so the frame scales up.
