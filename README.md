# 🏓 Ping Pong Scoreboard

A scoreboard for your phone, tablet or computer.
Put the device next to the table and tap the half of the screen belonging to the player who won the point.

## Getting started

No installation or server needed. Just open `index.html` in a browser.

> The fonts (Orbitron and Rubik) load from Google Fonts, so without an internet connection a default font is shown.

## Features

**Setup screen**
- Choose the language with the small toggle to the left of the title: **עב** (Hebrew) or **EN** (English).
  - The page direction flips to match (right-to-left or left-to-right).
  - Default names are translated ("שחקן 1" ↔ "Player 1"). Names you typed stay as they are.
- Choose how many points a game is played to: 11 or 21.
- Choose how often the serve switches: every 1 to 5 points.
- Give each player a name and pick one of 8 colors.
  - If you pick a color the other player already has, the two players swap colors.
- Choose who serves first.

Settings are saved in the browser and stay after closing and reopening the page.

**Game screen**
- Tap a half of the screen to give a point to the player shown there.
- The "Serving" badge shows who serves now, and which serve of the turn it is (e.g. 1/2).
- At deuce (10:10 in a game to 11):
  - An amber label shows "Deuce" or "Advantage".
  - The serve switches after every point.
- To win, a player must reach the target with a lead of at least 2 points.
- After a win you can choose:
  - **Rematch**: the other player serves first, and the win counter is kept.
  - **Undo last point**: also cancels the win.
  - **Settings**.
- On devices that support it, the screen stays on during a game.
- On a phone in portrait the players are stacked top and bottom; in landscape they are side by side.

| Button | Action |
|---|---|
| ⚙️ | Back to settings (the game is kept, and you can return to it) |
| ⛶ | Fullscreen |
| ⇄ | Swap sides |
| ↶ | Undo last point |

**Keyboard**

| Key | Action |
|---|---|
| ← | Point for the player on the left |
| → | Point for the player on the right |
| Backspace or Z | Undo last point |

## Project structure

```
ping-pong/
├── index.html          Page structure: setup screen and game screen
├── main.js             All the logic: scoring, serve, deuce, saving, buttons
└── css/
    ├── variables.css   Colors, fonts, sizes, spacing, animation timings
    └── style.css       Component styles (uses only variables from variables.css)
```

## Common changes

- **UI colors, fonts and sizes**: in `css/variables.css`. Each rem value has its pixel equivalent in a comment.
- **Texts and translations**: the `TEXT` dictionary at the top of `main.js`, with the same keys in every language.
  - In `index.html`, translated text is marked with `data-i18n="key"`, and a translated aria-label with `data-i18n-aria="key"`.
  - To add a language: add it to `TEXT` and to `LANGUAGE_LABELS`. If it is written right-to-left, add it to `RTL_LANGUAGES` too.
- **Player colors**: the `PALETTE` array at the top of `main.js`.
- **"Play to" and "Switch serve every" options**: `TARGET_OPTIONS` and `SERVE_OPTIONS` at the top of `main.js`.
- **Length of the "+1" effect**: `--dur-plus` in `variables.css`. Also update `EFFECT_DURATION_MS` in `main.js`, so the element is removed only after the animation ends.
