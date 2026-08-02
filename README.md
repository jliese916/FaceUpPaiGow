# Casa del Jefe — The Pai Gow Practice Pit

A standalone, dependency-free Face Up Pai Gow Poker practice app designed to match the other Casa del Jefe casino rooms.

## Included

- Play mode with bankroll history comparing the player's results against optimal setting on the same hands, plus outcomes, accuracy, and missed-winning-set review
- Train mode with hand-setting accuracy
- Look Up mode for seven dealer cards and seven player cards, including Import from Play
- MGM-style dealer house-way setting based on the supplied house way
- Full 53-card Pai Gow evaluator with the semi-wild Joker
- Face Up Pai Gow automatic push when the dealer has Ace-high Pai Gow
- 100-hand El Jefe Challenge requiring 100% for the Grand Master certificate
- Responsive seven-card fan, installable web-app manifest, and offline service worker
- Casa del Jefe crest card backs, larger card ranks, and a four-color horizontal Joker design

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

- Automatic round completion when the dealer has Ace-high Pai Gow; no player setting is required
- Rules dropdown omits commission language
- Strategy guide reminds players to search patiently for a combination that wins both hands


## v5 cache and Ace-high push fix

- Detects dealer Ace-high Pai Gow directly from the seven dealt dealer cards.
- Forces newly deployed JavaScript and service-worker updates to activate immediately.
- Uses network-first loading for page navigations so an older cached build cannot silently remain active.


## v6 sealed Challenge results

- El Jefe Challenge decisions are recorded without revealing the hand outcome or accuracy.
- After a legal top hand is submitted, the next challenge hand appears immediately.
- Automatic-push hands are counted silently and skipped without exposing the result.
- Full scoring and missed-hand review remain hidden until the 100-hand summary.

## v7 Grand Master certificate redesign

- Matches the cooler Let It Ride Hall of Masters certificate styling.
- Adds the purple-and-gold radial background, animated rays, suit insignia, crown crest, and enhanced score panel.
- Retains the Face Up Pai Gow title, perfect hand-setting designation, and challenge date.


## v8 muck and best-result accuracy update

- Adds **Muck Hand** to Play and Train. It is available with zero or one selected card and switches to **Set Top Hand** after the second card is selected.
- Scores decisions against the best achievable outcome: win first, then push, then loss.
- Marks a losing set or muck as inaccurate when a push was available.
- Treats every legal set, plus mucking, as optimal when the player is guaranteed to lose.
- Replaces check/X accuracy markers with plus/minus markers in Play and Train.
- Condenses the table labels and removes the dealer house-way explanation and "Your Set Hand" heading.
- Keeps only the round result visible after play; high-hand, low-hand, and net-result comparisons are inside a collapsed disclosure panel.
- Updates session and challenge reviews to include missed pushes as missed best results.
