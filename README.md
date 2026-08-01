# Casa del Jefe — Face Up Pai Gow Salon

A standalone, dependency-free Face Up Pai Gow Poker trainer designed to match the other Casa del Jefe casino trainers.

## Included

- Play mode with bankroll history, outcomes, accuracy, and missed-winning-set review
- Train mode with hand-setting accuracy
- Look Up mode for seven dealer cards and seven player cards
- MGM-style dealer house-way setting based on the supplied house way
- Full 53-card Pai Gow evaluator with the semi-wild Joker
- Face Up Pai Gow automatic push when the dealer has Ace-high Pai Gow
- 100-hand El Jefe Challenge requiring 100% for the Grand Master certificate
- Responsive seven-card fan, installable web-app manifest, and offline service worker

## Publish with GitHub Pages

1. Create an empty GitHub repository.
2. Upload the contents of this folder to the repository root (not the enclosing ZIP folder).
3. In **Settings → Pages**, deploy from the repository's main branch and root folder.

There is no build step and there are no third-party dependencies. `index.html` is the entry point.

## Local testing

Serve the folder with any basic local web server. Opening `index.html` directly will run the trainer, but a local server is recommended so the service worker can register normally.

The evaluator test suite is in `test-engine.js` and can be run with Node.js:

```text
node test-engine.js
```
