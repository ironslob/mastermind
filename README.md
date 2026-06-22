# Daily Mastermind

A Wordle-style daily Mastermind game — one puzzle per day, same code for everyone, 20 guesses to crack a hidden 4-colour code.

Play locally:

```bash
python3 -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765).

## Cache busting

Browsers (especially mobile) aggressively cache static assets. This project appends a git commit hash to CSS and JS URLs, for example `styles.css?v=ae3593b`.

Before pushing a release, run:

```bash
./scripts/inject-version.sh
git add index.html app.js version.txt
```

If you deploy via **GitHub Actions** (`.github/workflows/pages.yml`), the workflow injects the version automatically on each push to `main`. Enable it under **Settings → Pages → Build and deployment → Source: GitHub Actions**.

If you deploy from the **`main` branch** directly, run the script yourself before each push so the updated query strings are committed.

`index.html` also sends `Cache-Control: no-cache` so the shell page is revalidated and picks up new asset URLs.

## Terminology

This project uses standard Mastermind vocabulary where possible. The table below is the canonical reference for docs, issues, and UI copy.

### Game concepts

| Term | Meaning | Notes |
| --- | --- | --- |
| **Code** (or **secret code**) | The hidden 4-colour solution for today’s puzzle | `secret` in `game.js`; shown as **Today’s code** after a loss |
| **Guess** | One submitted attempt — a sequence of four colours | Stored in `history`; each guess occupies one **guess row** |
| **Puzzle** | A single daily game instance | Identified by **puzzle number** (`#1`, `#2`, …) and **date key** (`YYYY-MM-DD`) |
| **Turn** | The player’s current in-progress guess before Submit | Not persisted until submitted |

### Board (guess history)

| Term | Meaning | Code / markup |
| --- | --- | --- |
| **Board** | The scroll-free area showing all 20 guess rows | `#board.board` |
| **Board column** | Left column (guesses 1–10) or right column (11–20) | `.board-column` |
| **Guess row** | One horizontal line: row number + four colour pegs + feedback box | `.guess-row.guess-row-compact` |
| **Row number** | The guess index (1–20) at the start of a row | `.guess-number` |
| **Active row** | The highlighted row for the current turn | `.guess-row-compact.active` |
| **Completed row** | A row that has already been submitted | `.guess-row-compact.completed` |
| **Colour peg** | A circular marker showing a palette colour in a guess row | `.peg.peg-compact` |
| **Empty peg** | An unfilled placeholder in a future or active row | `.peg.empty` |

### Feedback (scoring indicators)

| Term | Meaning | Code / markup |
| --- | --- | --- |
| **Feedback** (or **feedback box**) | The grey square beside each submitted guess | `.feedback.feedback-compact` |
| **Feedback peg** | A small black or white dot inside the feedback box | `.feedback-peg.black`, `.feedback-peg.white` |
| **Feedback slot** | One of the four cells in the feedback box, filled left-to-right, top-to-bottom | `.feedback-slot` |
| **Exact** | Correct colour **and** correct position | Code: `black`; shown as a **black feedback peg** |
| **Partial** | Correct colour, **wrong** position | Code: `white`; shown as a **white feedback peg** |

Feedback pegs are always ordered **exact before partial** (black, then white), filling the feedback box left-to-right, top-to-bottom.

Traditional Mastermind rules often call black/white indicators **key pegs**. This codebase prefers **feedback peg** in code and CSS to distinguish them from **colour pegs**.

User-facing copy uses plain language (*correct colour, correct position*) rather than “black peg” / “white peg”.

### Input area (play dock)

| Term | Meaning | Code / markup |
| --- | --- | --- |
| **Play dock** (or **input dock**) | Bottom panel during active play: Submit, current guess, palette | `#play-dock.input-dock` |
| **Completed dock** | Bottom panel after win/loss: message, secret code (on loss), Share/Stats | `#completed-dock.input-dock` |
| **Current guess** | The four slots the player is filling before Submit | `#current-row` |
| **Guess slot** | One of the four interactive positions in the current guess (numbered 1–4) | `#guess-slots .peg` |
| **Palette** | The row of eight choosable colours | `#palette.palette` |
| **Palette button** | A single tappable colour in the palette | `.palette-btn` |
| **Colour** | A named hue from the palette (Blue, Rose, Green, …) | `COLORS` in `game.js` |

### Overlays & chrome

| Term | Meaning | Code / markup |
| --- | --- | --- |
| **Header** | Title, puzzle info, theme toggle, help button | `.header` |
| **Intro modal** | First-visit “How to play” dialog | `#intro-modal` |
| **Stats modal** | Played / win % / streaks / guess distribution | `#stats-modal` |
| **Toast** | Brief clipboard confirmation after Share | `#toast` |

### Naming conventions

- **Peg** — any circular game piece (colour peg or feedback peg).
- **Slot** — a position index (1–4) in the *current* guess input only.
- **Row** — a line on the board, including its number, pegs, and feedback.
- **Colour** — British spelling in player-facing text; **color** appears in some code identifiers and ARIA labels.
- **Black / white** — scoring terms in `game.js` (`scoreGuess`); prefer **exact / partial** in user-facing prose.

### Files

| File | Role |
| --- | --- |
| `index.html` | Structure and modals |
| `styles.css` | Layout and theme |
| `app.js` | UI rendering, events, localStorage restore |
| `game.js` | Rules, scoring, daily seed, stats, share text |
