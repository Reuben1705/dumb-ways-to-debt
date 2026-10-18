# Dumb Ways to Debt

> Two buttons. One wallet. Don't go broke.

You've got £1,000 and about five seconds to make a decision. Is that email from your bank, or from someone pretending to be your bank? Is your mate's "ground floor opportunity" a business, or a goose-rental scheme? Get it right and you keep your cash. Get it wrong and watch it fly out of your wallet. Hit £0 and you're bankrupt, with a receipt to prove it.

It's a fast, silly browser game that sneaks in real money lessons (scams, interest, bad deals, daft investments). Built with plain HTML, CSS and JavaScript, so there's nothing to install and nothing to build.

**Controls:** `←` and `→`, or `A` / `D`, or tap the left / right half of the screen. That's the whole game.

---

## Run it

Open `index.html`. Done.

If your browser gets fussy about local files (scripts not loading, scores not saving), serve the folder instead:

```bash
python3 -m http.server 8000
# then go to http://localhost:8000
```

Want to try one microgame on its own? Use `test.html` (see [Testing a game](#testing-a-game)).

---

## What's where

```
index.html          the game
test.html           test one microgame on a loop
style.css           colours, fonts, shared styles
sound.js            sound effects (all synthesised, no audio files)
input.js            the two-button input system
engine.js           HUD, timer, rounds, results, bankrupt screen
games/
  manifest.js       the list of microgames (add yours here)
  phishing.js
  pumpdump.js
  compound.js
  startup.js
  bettervalue.js
  contactless.js
  debttugofwar.js
  shoulder.js
  inboxrush.js      the boss round
```

Load order is `sound.js` → `input.js` → `engine.js` → `games/manifest.js`, and the manifest pulls in every microgame. `index.html` and `test.html` already do this for you.

**Who owns what**

| Part | Owner |
| --- | --- |
| Engine, HUD, input, sound, shared styles | Person 1 |
| Microgames | Person 3 (and anyone adding new ones) |

Microgames never need to touch `engine.js`. If your game needs something the engine doesn't offer, ask Person 1.

---

## How a run goes

```
title → [ instruction → play → result ] × N → bankrupt
```

1. **Title.** Press either button. The top 3 scores sit in the corner.
2. **Instruction.** A big flash tells you what to do and which button does what.
3. **Play.** The microgame runs on the stage while the timer bar drains.
4. **Result.** A pass or fail stamp and a receipt. Fails come with a money tip.
5. **Bankrupt.** Rounds survived, peak wallet, best streak, your "money personality", and a receipt showing where it all went.

### It gets harder

| Thing | How it works |
| --- | --- |
| Starting money | £1,000 |
| Speed | goes up every 5 rounds by 0.25, from ×1 to a max of ×2.5 |
| Game order | a shuffled "bag": every game plays once per cycle, never the same one twice in a row |
| Boss round | every 10th round, never before round 6 |
| Timer | `duration / speed` |
| Instruction time | `readTime / speed` (at least 650 ms), doubled for bosses |

Bosses can set `fixedSpeed` to ignore all that (Scam Inbox Rush always runs at ×2.5). Every number above lives in `CONFIG` at the top of `engine.js`.

---

## The microgames

| id | Name | Buttons | Time (×1) | Fail cost | The idea |
| --- | --- | --- | --- | --- | --- |
| `phishing` | Phishing Email | ← BIN IT / OPEN IT → | 5.0 s | £150 (£50 for binning a real one) | Bin the scams, open the real ones. Check the sender. |
| `pumpdump` | Pump and Dump | ← CASH OUT / INVEST £100 → | 6.0 s | whatever you invested | Ride the coin up, bail before the rug pull. |
| `compound` | Compound Interest | ← INVEST / INVEST → | 6.0 s | £100 | Hit the green zone, on the right side, 3 years running. Win £400. |
| `startup` | Your Mate's Startup | ← NAH / INVEST → | 4.8 s | £200 (£50 for turning down a good one) | Say no to daft pitches, yes to sensible ones. |
| `bettervalue` | Better Value | ← THIS ONE / THIS ONE → | 6.0 s | £100 | Pick the better deal per item or per kg. Fake "BIG SAVING" stickers show up from ×1.25. |
| `contactless` | Contactless Chaos | hold ← / → to move | 4.5 s | £120 | Dodge the card skimmers. Survive the timer to pass. |
| `debttugofwar` | Debt Tug of War | alternate ← → | 5.0 s | £150 | Out-mash the loan shark. Same button twice means you slip. |
| `shoulder` | Shoulder Surfer | ← SHIELD / TYPE → | 8.0 s | £200 | Type your PIN, cover the keypad when the spy looks. |
| `inboxrush` | Scam Inbox Rush (boss) | ← BIN / OPEN → | 35 s ÷ 2.5 = 14 s | £250 (win £200) | 10 emails, 3 mistakes and you're out. |

---

## Make your own microgame

A microgame is one file in `games/`, wrapped in an IIFE, that calls `Game.register({...})`. Here's the smallest useful one:

```js
(function () {
  'use strict';

  Game.css('mygame', `
    .mg-box { position: absolute; inset: 20px; }
  `);

  let s = null; // this round's state

  Game.register({
    id: 'mygame',
    name: 'My Game',
    instruction: 'DO THE THING!',
    subtitle: 'One line explaining the rule',
    controls: { left: 'NO', right: 'YES' },
    duration: 5000,          // ms at speed ×1
    cost: 150,               // lost on a fail
    passOnTimeout: false,    // true = surviving the timer is a pass
    failWord: 'OUCH!',
    lesson: 'The money tip shown on the fail screen.',
    personality: { title: 'THE SOMETHING', roast: 'A one-line roast.' },

    start(stage, ctx) {
      s = { done: false };
      stage.innerHTML = `<div class="mg-box">...</div>`;
    },

    onInput(button, pressed, ctx) {
      if (!pressed || !s || s.done) return;
      s.done = true;
      ctx.end(button === 'right'); // true = pass, false = fail
    },

    cleanup() { s = null; },
  });
})();
```

Then add `'mygame'` to the list in `games/manifest.js`. That's it.

### Definition fields

You need `id`, `instruction`, `duration`, `cost` and `start`. If one's missing, the engine warns you in the console.

| Field | What it does |
| --- | --- |
| `id` | Unique name. Duplicates are ignored (with a warning). |
| `name` | Shown on receipts and in test mode. |
| `instruction` | The big flash text. Over 14 characters gets a smaller font. |
| `subtitle` | Optional one-liner under the instruction. |
| `controls` | `{ left, right }` labels for the on-screen buttons. |
| `duration` | Milliseconds at ×1. Real time is `duration / speed`. |
| `cost` | Money lost on a fail. |
| `reward` | Money won on a pass (default 0). |
| `passOnTimeout` | Timer runs out: `true` = pass, `false` = fail. |
| `handsOff` | Player must not press anything. Any press fails. Shows a "HANDS OFF!" sticker. |
| `boss` | Only turns up every 10th round (not before round 6). |
| `fixedSpeed` | Ignore the global speed and use this one. |
| `readTime` | How long the instruction screen stays, in ms at ×1 (default 1200). |
| `passWord`, `failWord`, `timeoutWord` | The words on the stamp. |
| `lesson`, `timeoutLesson` | The tip on the fail receipt. |
| `personality` | `{ title, roast }` for the bankrupt screen. `roast` can be a string or an array (one is picked at random). The game that cost the player most wins the title. |

### Hooks

| Hook | When it runs |
| --- | --- |
| `start(stage, ctx)` | Round begins. Draw into `stage`. |
| `onInput(button, pressed, ctx)` | Every press **and release**. `button` is `'left'` or `'right'`, so check `pressed`. |
| `cleanup()` | Every time the round ends: pass, fail, timeout or abort. Reset your state here. |

If `start()` crashes, the engine logs it and passes the round, so nobody gets stuck.

### What's on `ctx`

| Property | What it is |
| --- | --- |
| `ctx.end(pass, extra)` | Finish the round. Only the first call counts. |
| `ctx.speed` | Current speed multiplier. |
| `ctx.round` | Round number. |
| `ctx.money` | The player's balance at the start of the round. |
| `ctx.duration` | Round length in ms (already divided by speed). |
| `ctx.after(ms, fn)` | A `setTimeout` that cancels itself when the round ends. |
| `ctx.every(ms, fn)` | A `setInterval` that cancels itself when the round ends. |
| `ctx.isHeld('left' \| 'right')` | Is that button down right now? Handy for movement games. |
| `ctx.rand(min, max)` | Random **whole number**, inclusive. |
| `ctx.pick(arr)` | Random item from an array. |
| `ctx.esc(str)` | HTML-escapes text. Use it before anything goes into `innerHTML`. |
| `ctx.fmt(n)` | Formats a number as `£1,234`. |

Use `ctx.after` and `ctx.every` instead of raw timers, so nothing leaks into the next round.

### `ctx.end(pass, extra)` options

All optional. They override the definition for this one result.

| Key | Effect |
| --- | --- |
| `reward` | Money gained (on a pass). |
| `cost` | Money lost (on a fail). |
| `passWord`, `passLabel`, `passRight` | Stamp word, receipt label and right-hand receipt text on a pass. |
| `failWord`, `failLabel` | Stamp word and receipt label on a fail. |
| `lesson` | Tip on the fail receipt. |

The engine adds `timedOut: true` (timer ran out) or `crashed: true` (`start()` threw) to what it reports to `onResult`.

### Shared tools

- **Helpers:** `Game.css(id, cssText)` injects your styles once. Also `Game.rand`, `Game.pick`, `Game.esc`, `Game.fmt`, `Game.sound.*`, and `Game.makeEmail()` (from `phishing.js`, reused by Scam Inbox Rush).
- **Sound:** use `Game.sound.blip()` in games. The engine handles whoosh, pass, fail, start and bankrupt sounds itself.
- **CSS variables** (from `style.css`): `--sky`, `--ink`, `--cream`, `--paper`, `--yellow`, `--green`, `--red`, `--stamp`, `--stamp-good`, `--night`, and the fonts `--font-display`, `--font-body`, `--font-receipt`.
- **Shared classes:** `.sticker`, `.pill`, `.receipt-wrap` + `.receipt` (with `.line`, `.bold`, `.center`, `.dash`), `.stamp`, `.hint`.

### Rules of thumb

- The stage is about **800 × 400 px**. Keep everything inside `#stage`.
- Prefix your CSS classes (`.pd-`, `.ci-`, `.su-`) so games don't trample each other.
- Keep state in one variable (`let s = null`) and clear it in `cleanup()`.
- Start `onInput` with `if (!pressed || !s || s.done) return;` so releases and late presses are ignored.
- Escape anything you insert with `ctx.esc()`.
- Keep the scams and lessons accurate. The game is meant to teach.
- Make everything scale with `ctx.speed`: timings, spawn rates, difficulty.

---

## Testing a game

Open `test.html`:

```
test.html?game=phishing&speed=1.5
```

- Pick the game and speed from the dropdowns, or put them in the URL.
- The game loops forever and your money never runs out.
- The top bar shows PASS or FAIL (and whether it timed out or crashed), plus a running tally. `Restart` resets it.

Handy extras:

| URL | What it does |
| --- | --- |
| `test.html?game=pumpdump&pd=boom` | Forces Pump and Dump to be a boom (`pd=crash` forces the rug pull) |
| `test.html?game=inboxrush` | Plays the boss round on its own |

Try every game at ×1, ×1.5 and ×2.5, and keep the console open for `[game-id]` errors.

---

## Scores

The top 10 runs are saved in the browser's `localStorage` under `dwlm-scores-v1`, ranked by rounds survived, then peak wallet. The title screen shows the top 3. Scores stay on whichever machine ran the game. Clear that key to wipe the leaderboard.

---

## Credits

Built at a hackathon by a team of three. Fonts: Lilita One, Nunito and Courier Prime (Google Fonts, loaded from the CDN).
