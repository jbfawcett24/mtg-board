# MTG Board

A digital aid for Magic: The Gathering — designed for a single player sitting at a table with others using physical cards.

Three apps work together:

| App | What it is | Runs on |
|-----|-----------|---------|
| `backend/` | Node.js + Socket.io server | Hosted server |
| `client/` | React board UI wrapped in Tauri | Laptop or tablet (desktop app) |
| `hand/` | React PWA | Player's phone (browser) |

**How it works:** The board app creates a game and displays a 6-character code and QR code. The player scans the QR code on their phone to open the hand app and join the same session. Both apps stay in sync over WebSockets.

---

## Using the app

### Starting a game

1. Open the **MTG Board** desktop app
2. Import a deck using the **+ Import Deck** button — paste a decklist in MTGA format:
   ```
   1 Sol Ring (CMR) 263
   1 Command Tower (CMR) 333
   ```
3. Select your deck from the home screen
4. Click **Create Game** — a QR code and 6-character code will appear
5. On your phone, scan the QR code or navigate to the hand app URL and enter the code
6. Once your phone connects, click **Start Game**

### Board controls

| Action | How |
|--------|-----|
| Tap a card | Toggle tapped (rotates 90°) |
| Long press / right-click a card | Open context menu |
| Drag a card | Move it around the battlefield |
| Drag a card onto a zone | Send it to that zone |
| Drag from a zone onto the battlefield | Play it from that zone |
| Click a zone (library/graveyard/exile) | Open zone viewer |

### Hand controls

- **Hand tab** — long press a card to play it or move it to a zone
- **Library tab** — draw, reveal top card, scry, shuffle
- **Command Zone tab** — cast your commander, track commander tax
- **Tokens tab** — create tokens from your deck's token list

---

## Local development setup

### Prerequisites

- **Node.js** v20+
- **Rust** (required for Tauri)

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Linux only** — install Tauri system dependencies:

```sh
# Arch
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg

# Ubuntu / Debian
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

### Install

This is an npm workspace — always install from the root:

```sh
git clone https://github.com/jbfawcett24/mtg-board
cd mtg-board
git checkout v2_rewrite
npm install
```

### Run

Open three terminal tabs:

```sh
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — board
cd client && npm run dev
# http://localhost:5173

# Terminal 3 — hand
cd hand && npm run dev
# http://localhost:5174
# Access from your phone via http://<local-ip>:5174
```

To find your local IP on Mac: `ipconfig getifaddr en0`

To run the board as a native desktop window:

```sh
cd client && npm run tauri dev
```

---

## Project structure

```
mtg-board/
  backend/    Node.js + Socket.io server
  client/     Tauri desktop app (React + Vite)
  hand/       Phone PWA (React + Vite)
  shared/     Shared theme tokens (@mtg/shared)
  DOCS.md     Developer reference — socket events, DB schema, patterns
  ROADMAP.md  Phased build plan
```
