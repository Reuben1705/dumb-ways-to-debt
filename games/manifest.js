/* =========================================================
   GAME LIST: add one line per microgame file.
   Both index.html and test.html load games from here, so
   you only ever add a new game in this one place.
   ========================================================= */
[  
  'phishing',
  'impulse',
  'pumpdump',
  'compound',
   'startup',
   'bettervalue',
   'billdodger',
  'contactless',
   'debttugofwar'
  'inboxrush',   // boss round: set boss: true in its register()
].forEach((name) => {
  document.write(`<script src="games/${name}.js"><\/script>`);
});
