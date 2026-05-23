# MTG Board — Claude Context

## What this project is

A Magic: The Gathering digital aid for a single player who sits at a table with others using physical cards. Three separate apps:

| Folder | What | Runs on |
|--------|------|---------|
| `backend/` | Node.js + Express + Socket.io | Hosted server (personal server or Render.com) |
| `client/` | React + Tauri v2 desktop app | Laptop or Android tablet on the game table |
| `hand/` | React PWA | Player's phone (browser, add to home screen) |
| `shared/` | Shared theme/constants package (`@mtg/shared`) | Imported by client and hand |

This is an **npm workspace** — always run `npm install` from the root (`/mtg-board-v2/`), not from individual folders.

## The concept

- The **board** (laptop/tablet) sits on the table facing other players. It shows the battlefield, zones, life total.
- The **hand** (phone) is the player's private view — their cards, library actions, command zone, tokens.
- They connect via a **6-character game code**: board creates a game → gets a code → player types it into the hand app → both join the same Socket.io room on the backend.

## Format & gameplay scope

- **Commander** is the primary format. Design should accommodate other formats in future.
- **No turn structure** — fully manual, free-form.
- **No stack** — not needed.
- Life total starts at 40. Player counters (poison, experience, etc.) are tracked on the board.

## Tech stack

### Frontend (client + hand)
- **React 18** + **Vite**
- **Emotion** (`@emotion/react`) for CSS-in-JS. The `jsxImportSource` is already configured in both `vite.config.js` files so the `css` prop works without extra imports.
- **Framer Motion** for animations (card movements, zone modals, transitions)
- **Socket.io-client** for backend communication
- **`@mtg/shared`** for shared theme tokens (colors, spacing, radius, font)

### Client only
- **Tauri v2** wraps the React app as a native desktop app
- **`tauri-plugin-sql` + SQLite** for local deck storage (not yet implemented — Phase 1a)
- Tauri Rust code lives in `client/src-tauri/`. The Rust side is minimal — avoid adding complexity there unless absolutely necessary.
- Android tablet support is planned via Tauri v2's Android target (not yet set up)

### Backend
- **Node.js ES Modules** (use `import`/`export`)
- **Express** + **Socket.io**
- Game state is held in memory per session — no database on the backend
- Sessions stored in a `Map`, keyed by game code

## Shared theme (`@mtg/shared`)

All colors, spacing, and radius values live in `shared/src/theme.js`. Import like:

```js
import { colors, spacing, radius } from '@mtg/shared';
```

Never hardcode hex values in component files — always use the theme tokens.

## Emotion usage

Both `client` and `hand` have `jsxImportSource: '@emotion/react'` set in `vite.config.js`, so the `css` prop works directly:

```jsx
import { css } from '@emotion/react';
import { colors, spacing } from '@mtg/shared';

const style = css`
  background: ${colors.bgSurface};
  padding: ${spacing.md};
`;

<div css={style}>...</div>
```

Or use `styled`:

```jsx
import styled from '@emotion/styled';
import { colors } from '@mtg/shared';

const Card = styled.div`
  background: ${colors.bgSurface};
  transform: ${p => p.tapped ? 'rotate(90deg)' : 'none'};
`;
```

## Framer Motion usage

Use `motion.div` (or any element) for animated components. Use `AnimatePresence` when elements are conditionally rendered and need exit animations:

```jsx
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {cards.map(card => (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', bounce: 0.3 }}
    />
  ))}
</AnimatePresence>
```

## Socket architecture

The socket instance in each app is a singleton defined in `src/socket.js`. Always import from there, never create new instances.

All game state changes flow through the backend:
1. Client or hand emits an event (e.g. `play_card`)
2. Backend updates session state
3. Backend broadcasts `game_state_sync` to everyone in the room
4. Both apps re-render from the new state

See `DOCS.md` for the full socket event reference table. Keep it updated as new events are added.

## Board zones (client)

- **Battlefield** — center, large, cards are draggable
- **Graveyard** — bottom-left corner, shows top card + count, tap to open viewer modal
- **Exile** — bottom-right corner, same as graveyard
- **Command Zone** — top-left, commander card
- **Library** — top-right, card back + count
- **Header bar** — life total, player counters, untap-all button

## Hand screens (hand PWA)

Bottom nav with 4 tabs:
1. **Hand** — scrollable card row, long-press for context menu
2. **Library** — draw, reveal top, scry/surveil, shuffle
3. **Command Zone** — commander card(s), cast button, tax counter
4. **Tokens** — deck tokens + generic token creator

## Card interactions

- **Single tap** on battlefield card → toggle tapped (rotate 90°)
- **Long press / right click** → context menu (move zones, add/remove counters, flip)
- **Untap All** button → untaps entire battlefield at once
- Counters: +1/+1 counter and a generic named counter per card
- Tokens: auto-detected from deck at import time via Scryfall `all_parts`; generic token creator also available

## Deck management (not yet built — Phase 1)

- Decks stored in SQLite via `tauri-plugin-sql` (client only)
- Cards resolved against **Scryfall API** at import time
- Import format: standard MTG text list (e.g. `4 Lightning Bolt`) — also handle MTGA format (`4x Lightning Bolt`) and Commander format
- Store `image_uris.normal` and `card_faces[].image_uris.normal` for double-faced cards
- Images always loaded from Scryfall CDN at runtime — not cached locally
- Token detection: check `all_parts` on each card for `component: "token"` entries

## Scryfall API

- Base URL: `https://api.scryfall.com`
- Card lookup: `GET /cards/named?fuzzy=<name>`
- Rate limit: max ~10 req/sec — use a queue when importing full decks
- No auth required
- No image caching — always load from `image_uris.normal` URL directly

## What's built so far

- Full project scaffolding (all three apps)
- Socket connection between board and hand
- Game creation (board) and joining (hand) with code
- Basic lobby UI on both board and hand
- Shared theme package wired up
- Tauri desktop app compiles and opens

## What's not built yet

Everything in Phases 1–7 of `ROADMAP.md`. The app currently shows a lobby screen only — no deck management, no gameplay, no zones.

## Key files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Full phased build plan with checkboxes |
| `DOCS.md` | Developer reference: socket events, Tauri commands, patterns |
| `shared/src/theme.js` | All color/spacing/radius tokens |
| `backend/src/index.js` | All backend socket logic |
| `client/src/socket.js` | Singleton socket instance (board) |
| `hand/src/socket.js` | Singleton socket instance (hand) |
| `client/src-tauri/tauri.conf.json` | Tauri window + bundle config |
| `client/src-tauri/src/lib.rs` | Tauri command registration |
| `client/src-tauri/capabilities/default.json` | Tauri permission grants |

## Deployment plan

- **Backend**: personal server with pm2 + nginx, or Render.com. Cloudflare Workers is NOT suitable (no persistent WebSocket support without Durable Objects).
- **Hand PWA**: Cloudflare Pages (static deploy, `npm run build` → `dist/`)
- **Client**: distributed as a Tauri-built `.dmg` / `.exe` / `.apk`

## User notes

- The user is familiar with React and JavaScript but is newer to Rust/Tauri — keep Rust changes minimal and well-explained.
- The user is familiar with Electron but chose Tauri for Android support.
- The user has used Framer Motion and Emotion before.
- Prefer editing existing files over creating new ones.
- Don't add comments unless the reason is non-obvious.
