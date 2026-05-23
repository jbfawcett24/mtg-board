# MTG Board — Build Roadmap

Work top-to-bottom. Each phase builds on the last. Phases within a section can sometimes be parallelized but the section order matters.

---

## Phase 0 — Environment Setup
> Do this before writing any real code.

- [x] Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [x] Confirm Tauri dev works: `cd client && npm run tauri dev` (should open a desktop window)
- [ ] Install Android SDK + NDK (for Android tablet support)
  - Tauri v2 supports Android — follow the [Tauri Android setup guide](https://tauri.app/start/prerequisites/)
  - You'll need Android Studio installed
- [x] Run the full stack once (`backend`, `client`, `hand`) and confirm sockets connect end-to-end

---

## Phase 1 — Deck Management (Client)
> You need a deck before you can play. This is the first real feature.

### 1a — SQLite Setup
- [x] Install Rust toolchain add-on: `cargo add tauri-plugin-sql --features sqlite` (in `client/src-tauri/`)
- [x] Install JS side: `npm install @tauri-apps/plugin-sql` (in `client/`)
- [x] Register the plugin in `lib.rs`
- [x] Add SQL permissions to `capabilities/default.json`
- [x] On app startup, run migrations to create tables:
  - `decks` (id, name, format, created_at)
  - `deck_cards` (id, deck_id, scryfall_id, name, quantity, image_uri, image_uri_back, board)
  - `tokens` (id, deck_id, scryfall_id, name, image_uri, power, toughness, colors) — populated at import time

### 1b — Scryfall Integration
- [x] Create a `src/api/scryfall.js` utility in `client/src/`
- [x] Implement `resolveCard(name)` — calls `https://api.scryfall.com/cards/named?fuzzy=<name>`
- [x] Store `image_uris.normal` (and `card_faces[].image_uris.normal` for double-faced cards)
- [x] Implement `getTokensForCard(scryfallId)` — calls Scryfall's `/cards/<id>` and reads `all_parts` for related tokens
- [x] Rate limit calls to Scryfall (max ~10 req/sec) — use a small queue utility

### 1c — Deck Import UI
- [z] Deck list screen: shows all saved decks, button to create new
- [x] Import screen: textarea to paste a deck list in standard format:
  ```
  1 Sol Ring
  4 Lightning Bolt
  ```
  Also handle MTGA format (`1x Sol Ring`) and commander format (commander listed first with `*CMDR*` or in a `Commander` section)
- [x] Parse the pasted text into `{ name, quantity, board }` entries
- [x] Resolve each card against Scryfall (show a progress indicator — this takes a few seconds for 100-card decks)
- [x] Detect tokens: for each card, check Scryfall `all_parts` for entries with `component: "token"` and save them to the `tokens` table
- [x] Save resolved deck to SQLite
- [x] Error handling: show which card names failed to resolve, let user correct them

### 1d — Deck Management UI
- [x] View deck: list all cards with images
- [ ] Delete deck
- [x] Rename deck
- [ ] (Stretch) Import from URL: detect if input is a Moxfield/Archidekt URL, fetch their public API, convert to text list

---

## Phase 2 — Game Session Setup
> Already scaffolded. This phase wires the deck into the session.

### 2a — Backend: Game State
- [x] Add a `gameState` object to each session in `backend/src/index.js`:
  ```js
  {
    deck: [],          // full resolved card list sent at game start
    library: [],       // card ids in order
    hand: [],          // card ids currently in hand
    battlefield: [],   // { cardId, tapped, counters: [] }
    graveyard: [],
    exile: [],
    commandZone: [],
    tokens: [],        // token templates available this game
    lifeTotal: 40,
    playerCounters: [] // poison, experience, etc.
  }
  ```
- [x] Emit `game_state_sync` whenever state changes so both board and hand stay in sync
- [x] Add `start_game` event: board sends resolved deck + token list, backend stores it and emits initial state

### 2b — Client: Game Start Flow
- [x] After creating a game and hand connects, show a "Start Game" button
- [x] Deck picker: select which deck to use from SQLite
- [x] On start, send deck to backend via `start_game` event
- [x] Navigate to board view

### 2c — Hand: Game Start Flow
- [x] After joining, wait for `game_state_sync` from backend
- [x] Navigate to hand view once initial state is received

---

## Phase 3 — Board UI
> The main visual for the laptop/tablet. This is what sits on the table.

### 3a — Layout
- [x] Divide the screen into zones:
  - Large center area: **Battlefield**
  - Bottom-left corner: **Graveyard** (shows top card + count)
  - Bottom-right corner: **Exile** (shows top card + count)
  - Top-left corner: **Command Zone** (commander card)
  - Top-right corner: **Library** (shows card back + count)
  - Header bar: life total, player counters, untap-all button
- [ ] Make layout responsive for different tablet/screen sizes
- [ ] Consider landscape-only lock (makes sense for a game table)

### 3b — Zone Viewers (Modal/Drawer)
- [ ] Tap graveyard → opens scrollable modal showing all cards in graveyard
- [ ] Tap exile → same for exile
- [ ] Tap library → opens library viewer (see Phase 5b)
- [ ] All zone modals should allow moving cards back out (right-click / long-press context menu)

### 3c — Card Display on Battlefield
- [x] Render cards as images using Scryfall `image_uri`
- [x] Tapped state: rotate card 90° visually
- [ ] Counter badges: show "+1/+1 ×3" or "☆×2" overlaid on the card
- [ ] Cards should be draggable to rearrange on the battlefield (use a library like `dnd-kit`)

### 3d — Life Total & Player Counters
- [ ] Life total displayed prominently — tap +/- to adjust, or tap and type a number
- [ ] Player counters list below life total (poison, experience, energy, rad, etc.)
- [ ] Button to add a new counter type (with a name input)
- [ ] Each counter has +/- buttons

---

## Phase 4 — Hand UI
> The phone app. This is the player's private view.

### 4a — Main Hand Screen
- [x] Horizontal scrollable row of cards (the hand)
- [x] Card count displayed
- [x] Tap a card to select it / see it larger
- [x] Long-press a card for a context menu (play to battlefield, play to command zone, discard, bottom of library)

### 4b — Navigation
- [x] Bottom nav bar with 4 sections:
  - **Hand** — cards in hand (default)
  - **Library** — library actions
  - **Command Zone** — commander card(s)
  - **Tokens** — available tokens

### 4c — Library Screen
- [x] Show library card count
- [x] **Draw** button — draws the top card into hand
- [ ] **Reveal Top** toggle — shows the top card face-up on the board (as a "revealed" zone), without drawing it
- [ ] **Scry N** — input N, shows top N cards face-up, drag to reorder back to top or send to bottom
- [ ] **Surveil N** — same as scry but bottom option sends to graveyard instead
- [ ] **Shuffle** button

### 4d — Command Zone Screen
- [ ] Shows commander card(s)
- [ ] Button to play commander to battlefield
- [ ] Commander tax counter (tracks how many times it's been cast)

### 4e — Tokens Screen
- [ ] List of all tokens detected from the imported deck (populated at game start)
- [ ] Each token shows image, name, power/toughness
- [ ] Tap to create a token → it appears on the battlefield on the board
- [ ] **Generic Token** creator at the bottom: input power/toughness, color, name → creates a custom token on the board

---

## Phase 5 — Card Interactions
> The moment-to-moment gameplay actions.

### 5a — Battlefield Interactions (Board)
- [ ] **Tap**: single tap/click on a card → toggles tapped state (rotate 90°)
- [ ] **Long press / right click**: opens context menu with:
  - Move to Graveyard
  - Move to Exile
  - Return to Hand
  - Move to Command Zone
  - Add +1/+1 Counter
  - Remove +1/+1 Counter
  - Add Generic Counter (prompts for a label, e.g. "loyalty", "charge")
  - Remove Generic Counter
  - Flip (for double-faced cards)
  - Destroy (shortcut for Move to Graveyard)
- [ ] **Untap All** button in header: untaps every card on the battlefield at once
- [ ] Counter display: small badge on each card showing counter totals

### 5b — Zone Card Interactions (Graveyard / Exile viewers)
- [ ] Right-click / long press inside zone viewer:
  - Return to Hand
  - Move to Battlefield
  - Move to Exile (from graveyard) / Move to Graveyard (from exile)
  - Move to Bottom of Library
  - Move to Top of Library

### 5c — Socket Events to Add
For each action above, add a corresponding socket event so the board stays in sync. Example pattern:
```
hand emits:   play_card       { cardId, zone: 'battlefield' }
board emits:  tap_card        { cardId }
hand emits:   move_card       { cardId, from: 'hand', to: 'graveyard' }
hand emits:   add_counter     { cardId, type: '+1/+1' }
hand emits:   create_token    { tokenId }
board emits:  untap_all       {}
board emits:  adjust_life     { delta: -1 }
```
The backend receives these, updates `gameState`, and broadcasts `game_state_sync` to the room.

---

## Phase 6 — Polish & Platform
> Make it feel good to use at a real table.

### 6a — Touch & Tablet UX
- [ ] Ensure all tap targets are large enough for finger use (min 44×44px)
- [ ] Long-press duration feels natural (300-400ms — test on real device)
- [ ] Prevent browser zoom/scroll interference on the board (`touch-action: none` where needed)
- [ ] Prevent screen sleep on the board while a game is active (use Wake Lock API: `navigator.wakeLock.request('screen')`)
- [ ] Lock board to landscape orientation

### 6b — Android Support (Tauri)
- [ ] Follow Tauri's Android setup to build an `.apk`
- [ ] Test touch interactions on Android tablet
- [ ] Test long-press context menu on Android (ensure it doesn't trigger browser long-press menu)
- [ ] Consider releasing as a side-loadable APK rather than Play Store (simpler, no review process)

### 6c — Hand PWA (Add to Home Screen)
- [ ] Add a `manifest.json` to `hand/public/`:
  - `display: "standalone"` — hides browser chrome
  - `orientation: "portrait"`
  - App name and icons
- [ ] Link manifest in `hand/index.html`
- [ ] Test "Add to Home Screen" on both iOS Safari and Android Chrome
- [ ] Confirm it launches full-screen without browser bar

### 6d — Visual Polish
- [ ] Loading states during Scryfall API calls
- [ ] Animations for card movements (card flies from hand to battlefield)
- [ ] Empty state illustrations for zones (e.g. "No cards in exile")
- [ ] Connection lost / reconnection handling (show a banner, auto-reconnect)

---

## Phase 7 — Deployment

### 7a — Backend
- [ ] **Personal server (recommended for Socket.io)**: set up with `pm2` (process manager) + `nginx` reverse proxy
  - `npm install -g pm2`
  - `pm2 start backend/src/index.js --name mtg-backend`
  - nginx config proxies `wss://yourdomain.com` → `localhost:3001`
- [ ] **Alternative — Render.com**: free tier works, deploy as a Node.js web service, set `PORT` env var
- [ ] **Cloudflare note**: Cloudflare Workers does not support persistent WebSocket connections without Durable Objects (paid, complex). Cloudflare Tunnel *can* proxy to your personal server — that's a good combo.

### 7b — Hand PWA
- [ ] Deploy `hand/` as a static site to **Cloudflare Pages** (free, fast, global CDN)
  - Build command: `npm run build`
  - Output dir: `dist`
- [ ] Set `VITE_BACKEND_URL` environment variable in Cloudflare Pages settings

### 7c — Client (Tauri Desktop App)
- [ ] Update `VITE_BACKEND_URL` in `client/.env.production` to point at deployed backend
- [ ] Build distributable: `npm run tauri build`
  - Outputs: `.dmg` (Mac), `.exe` / `.msi` (Windows), `.AppImage` / `.deb` (Linux)
- [ ] Build Android APK: `npm run tauri android build`
- [ ] Share the installable file however works for you (direct download, Google Drive, etc.)

---

## Stretch Goals (Post-Launch)

- [ ] Multiple game profiles (e.g. switch between two Commander decks mid-session without restarting)
- [ ] Import deck from Moxfield/Archidekt URL
- [ ] Spectator mode: read-only socket role that can observe the board
- [ ] Game log: scrollable list of actions taken this game ("Drew Lightning Bolt", "Tapped Sol Ring")
- [ ] Photo tokens: take a photo of a physical token and use it as a token image
- [ ] Offline mode: cache Scryfall images locally after first load so the app works without internet mid-game

---

## Recommended Order Summary

If you want to reach a playable state as fast as possible, do them in this order:

1. Phase 0 — get Rust + Tauri working
2. Phase 1a + 1b — SQLite + Scryfall (can't play without a deck)
3. Phase 1c — deck import (text paste)
4. Phase 2 — game session wired to a deck
5. Phase 3a + 3b — board layout + zone viewers
6. Phase 4a + 4b + 4c — hand screen + draw
7. Phase 5a + 5c — tap, context menu, socket events
8. Phase 3c — cards on battlefield (drag/drop)
9. Phase 4d + 4e — command zone + tokens
10. Phase 6a — touch polish (before testing on a real table)
11. Phase 6b + 6c — Android + PWA manifest
12. Phase 7 — deploy
