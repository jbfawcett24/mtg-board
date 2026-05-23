# MTG Board — Developer Docs

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Running the Project](#running-the-project)
4. [Backend (`/backend`)](#backend-backend)
5. [Board Client (`/client`)](#board-client-client)
6. [Hand PWA (`/hand`)](#hand-pwa-hand)
7. [Socket Event Reference](#socket-event-reference)
8. [Database Reference](#database-reference)
9. [Custom Card Image Uploads](#custom-card-image-uploads)
10. [Tauri Reference](#tauri-reference)

---

## Project Overview

Three separate apps that work together:

| Folder | What it is | Runs on |
|--------|-----------|---------|
| `backend/` | Node.js + Socket.io server | A hosted server (or localhost) |
| `client/` | React board UI wrapped in Tauri | Laptop / tablet (desktop app) |
| `hand/` | React PWA | Phone browser |

**Game flow:**
1. Board (Tauri app) connects to backend and calls `create_game` → gets a 6-character code
2. Player opens the Hand PWA on their phone, enters the code → calls `join_game`
3. Both are now in the same Socket.io "room" — all game events are routed through the backend

---

## Architecture

```
┌──────────────────┐        WebSocket        ┌─────────────────────┐
│   Tauri Client   │ ◄────────────────────► │   Node.js Backend   │
│  (board/laptop)  │                         │   (Socket.io room)  │
└──────────────────┘                         └─────────────────────┘
                                                        ▲
                                                        │ WebSocket
                                                        ▼
                                              ┌─────────────────────┐
                                              │    Hand PWA         │
                                              │  (phone browser)    │
                                              └─────────────────────┘
```

The backend never holds game state long-term — it owns the session room and routes events between board and hand. All game state lives in the client apps' React state.

---

## Running the Project

> Run each in its own terminal tab.

### 1. Backend
```sh
cd backend
npm run dev
# Runs on http://localhost:3001
# Uses --watch so it restarts on file changes
```

### 2. Board (React dev mode — no Tauri required)
```sh
cd client
npm run dev
# Opens at http://localhost:5173
```

### 3. Hand
```sh
cd hand
npm run dev
# Opens at http://localhost:5174
# Access from your phone via http://<your-local-ip>:5174
```

To find your local IP on Mac: `ipconfig getifaddr en0`

### Running as a Desktop App (Tauri)

Install Rust first (one time):
```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Then from `client/`:
```sh
npm run tauri dev      # Opens a native desktop window backed by the Vite dev server
npm run tauri build    # Produces a distributable .dmg / .exe / .AppImage
```

---

## Backend (`/backend`)

### Stack
- **Express** — HTTP server (used for health checks / future REST endpoints)
- **Socket.io** — real-time communication
- **ES Modules** — use `import`/`export`, not `require`

### File structure
```
backend/
  src/
    index.js   ← entry point, all server logic lives here for now
```

### Adding a new Socket event

Open `src/index.js` and add a listener inside the `io.on('connection', ...)` block:

```js
// Inside io.on('connection', (socket) => { ... })

socket.on('your_event_name', (data) => {
  const { code } = socket.data;  // the game code this socket is in
  // do something with data...

  // Send back to the sender only:
  socket.emit('your_response', { ... });

  // Send to everyone in the room (board + hand):
  io.to(code).emit('your_broadcast', { ... });

  // Send to everyone in the room EXCEPT the sender:
  socket.to(code).emit('your_broadcast', { ... });
});
```

### Session state

Active games are stored in a `Map` at the top of `index.js`:

```js
const sessions = new Map();
// key: game code (e.g. "XK9F2A")
// value: { boardSocketId, handSocketId }
```

Add fields here as the game needs more shared state (e.g. whose turn it is).

### Adding a REST endpoint

```js
app.get('/health', (req, res) => {
  res.json({ ok: true, sessions: sessions.size });
});
```

---

## Board Client (`/client`)

### Stack
- **React + Vite** — UI
- **Tauri v2** — wraps the React app as a native desktop window
- **Socket.io-client** — connects to backend
- **SQLite via tauri-plugin-sql** — local deck storage (add when ready)

### File structure
```
client/
  src/
    main.jsx        ← React entry point
    App.jsx         ← root component
    socket.js       ← shared socket instance
    index.css       ← global styles
    App.css
  src-tauri/
    src/
      main.rs       ← Tauri entry point (rarely touched)
      lib.rs        ← register Tauri commands here
    tauri.conf.json ← app name, window size, bundle config
    Cargo.toml      ← Rust dependencies
    capabilities/
      default.json  ← what permissions the frontend has
```

### Using the socket

The socket instance is a singleton in `src/socket.js`. Import it wherever you need it:

```jsx
import { socket } from './socket';

// Emit an event to the backend
socket.emit('event_name', { key: 'value' });

// Listen for an event (inside a useEffect to avoid duplicate listeners)
useEffect(() => {
  socket.on('event_name', (data) => {
    console.log(data);
  });

  // Always clean up listeners when the component unmounts
  return () => {
    socket.off('event_name');
  };
}, []);
```

> Always clean up with `socket.off(...)` in the useEffect return. Without it, navigating away and back will register duplicate listeners.

### Emitting with an acknowledgement (optional)

Socket.io supports callbacks for one-off request/response patterns:

```js
socket.emit('create_game', {}, (response) => {
  console.log('Server confirmed:', response);
});
```

The backend handles it like this:

```js
socket.on('create_game', (data, callback) => {
  // ...
  callback({ code });
});
```

---

## Hand PWA (`/hand`)

### Stack
- **React + Vite** — UI
- **Socket.io-client** — same backend connection
- Mobile-first CSS (uses `100dvh` for correct height on iOS Safari)

### File structure
```
hand/
  src/
    main.jsx     ← React entry point
    App.jsx      ← root component (join screen + hand screen)
    socket.js    ← shared socket instance
    index.css
    App.css
```

### Using the socket

Identical pattern to the board client:

```jsx
import { socket } from './socket';

useEffect(() => {
  socket.on('event_name', (data) => {
    // update state
  });

  return () => socket.off('event_name');
}, []);
```

### Pointing at a deployed backend

By default both `client` and `hand` connect to `http://localhost:3001`.

Create a `.env` file in `hand/` to override:
```
VITE_BACKEND_URL=https://your-deployed-backend.com
```

Same for `client/`:
```
VITE_BACKEND_URL=https://your-deployed-backend.com
```

---

## Socket Event Reference

This table should be kept up to date as new events are added.

### Client → Server

| Event | Payload | Sender | Description |
|-------|---------|--------|-------------|
| `create_game` | _(none)_ | Board | Creates a new game session, returns a code |
| `join_game` | `{ code: string }` | Hand | Joins an existing session by code |

### Server → Client

| Event | Payload | Recipient | Description |
|-------|---------|-----------|-------------|
| `game_created` | `{ code: string }` | Board | Confirms game was created with this code |
| `game_joined` | `{ code: string }` | Hand | Confirms hand successfully joined |
| `player_joined` | `{ role: 'hand' }` | Room | Broadcast when hand connects |
| `player_left` | `{ role: 'hand' }` | Room | Broadcast when hand disconnects |
| `game_ended` | _(none)_ | Room | Sent when the board disconnects |
| `error` | `{ message: string }` | Sender | Something went wrong (e.g. bad code) |

---

## Database Reference

All database logic lives in `client/src/db.js`. It uses `@tauri-apps/plugin-sql` to talk to a local SQLite file stored on the user's machine at `~/Library/Application Support/com.mtgboard.client/mtg.db` (Mac) or the platform equivalent.

The `getDb()` function is a singleton — the database is opened once on first call and reused on every subsequent call. Tables are created automatically on first launch via `runMigrations()`.

### Schema

**`decks`**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key, auto-increment |
| name | TEXT | Deck name |
| format | TEXT | e.g. `'commander'`, `'modern'` |
| created_at | DATETIME | Set automatically on insert |

**`deck_cards`**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| deck_id | INTEGER | Foreign key → `decks.id`, cascades on delete |
| scryfall_id | TEXT | Scryfall card UUID |
| name | TEXT | Card name |
| quantity | INTEGER | Number of copies |
| image_uri | TEXT | Scryfall image URL (front face) |
| image_uri_back | TEXT | Scryfall image URL (back face, double-faced cards only) |
| board | TEXT | `'main'`, `'sideboard'`, or `'commander'` |

**`tokens`**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| deck_id | INTEGER | Foreign key → `decks.id`, cascades on delete |
| scryfall_id | TEXT | Scryfall UUID (null for generic tokens) |
| name | TEXT | Token name |
| image_uri | TEXT | Scryfall image URL |
| power | TEXT | e.g. `'1'`, `'*'` |
| toughness | TEXT | e.g. `'1'`, `'*'` |
| colors | TEXT | Comma-separated color letters, e.g. `'W,G'` |

### Available functions

Import any function directly from `db.js`:

```js
import { getDecks, createDeck, deleteDeck, renameDeck,
         getCardsForDeck, insertCard,
         getTokensForDeck, insertToken } from './db.js';
```

**Decks**

```js
// Get all decks, newest first
const decks = await getDecks();
// returns: [{ id, name, format, created_at }, ...]

// Create a new deck — returns { lastInsertId } with the new deck's id
const result = await createDeck('My Deck', 'commander');
const newDeckId = result.lastInsertId;

// Rename a deck
await renameDeck(deckId, 'New Name');

// Delete a deck and all its cards/tokens (cascades automatically)
await deleteDeck(deckId);
```

**Cards**

```js
// Get all cards for a deck
const cards = await getCardsForDeck(deckId);
// returns: [{ id, deck_id, scryfall_id, name, quantity, image_uri, image_uri_back, board }, ...]

// Insert a card into a deck
await insertCard(deckId, {
  scryfall_id: 'abc123',
  name: 'Sol Ring',
  quantity: 1,
  image_uri: 'https://cards.scryfall.io/normal/...',
  image_uri_back: null,  // only set for double-faced cards
  board: 'main',         // 'main', 'sideboard', or 'commander'
});
```

**Tokens**

```js
// Get all tokens for a deck
const tokens = await getTokensForDeck(deckId);

// Insert a token (populated at deck import time from Scryfall all_parts)
await insertToken(deckId, {
  scryfall_id: 'xyz789',   // null for generic/custom tokens
  name: '1/1 Soldier',
  image_uri: 'https://cards.scryfall.io/normal/...',
  power: '1',
  toughness: '1',
  colors: 'W',
});
```

### Using db.js in a component

Always call db functions inside an `async` function or `useEffect`:

```jsx
import { useEffect, useState } from 'react';
import { getDecks, createDeck } from './db.js';

export default function DeckList() {
  const [decks, setDecks] = useState([]);

  useEffect(() => {
    getDecks().then(setDecks);
  }, []);

  async function handleCreate() {
    const result = await createDeck('New Deck', 'commander');
    // refresh the list
    const updated = await getDecks();
    setDecks(updated);
  }

  return (...);
}
```

### Writing custom queries

If the provided functions don't cover your need, call `getDb()` directly:

```js
import { getDb } from './db.js';

const db = await getDb();

// SELECT with a parameter
const results = await db.select(
  'SELECT * FROM deck_cards WHERE deck_id = $1 AND board = $2',
  [deckId, 'commander']
);

// Any write operation
await db.execute(
  'UPDATE deck_cards SET quantity = $1 WHERE id = $2',
  [newQuantity, cardId]
);
```

Parameters are always positional (`$1`, `$2`, ...) — never interpolate values directly into query strings.

---

## Custom Card Image Uploads

Custom card images (proxies, alters, etc.) are uploaded to the backend server and served as static files. This means both the board and hand app load them from the same URL — no local-path issues.

### How it works

1. User triggers a file picker via Tauri's native dialog
2. The selected file is read from disk using `tauri-plugin-fs`
3. The bytes are sent to `POST /upload/card-image` on the backend as `multipart/form-data`
4. The backend saves the file to `backend/uploads/` with a UUID filename and returns the full URL
5. That URL is stored in `image_uri` in SQLite — identical to a Scryfall URL from the renderer's perspective

### Backend

**Endpoint:** `POST /upload/card-image`
- Accepts: `multipart/form-data` with a single field named `image`
- Allowed types: `.jpg`, `.jpeg`, `.png`, `.webp`
- Max size: 5MB
- Returns: `{ url: "http://yourserver.com/uploads/abc123.png" }`

Uploaded files are stored in `backend/uploads/` and served statically at `/uploads/<filename>`. This directory is created automatically on first run.

**Endpoint:** `GET /uploads/<filename>`
- Serves the uploaded file directly — use this URL as `src` in `<img>` tags

### Client

The upload utility is at `client/src/api/uploadImage.js`:

```js
import { pickAndUploadCardImage } from './api/uploadImage.js';

const url = await pickAndUploadCardImage();
// url = "http://localhost:3001/uploads/abc123.png"
// or null if the user cancelled the dialog
```

Calling this function opens a native OS file picker filtered to image types, reads the selected file, uploads it to the backend, and returns the URL. Store the returned URL in SQLite as `image_uri` just like any Scryfall URL.

### Tauri plugins required

These are already registered in `lib.rs`, `Cargo.toml`, and `capabilities/default.json`:

| Plugin | Purpose |
|--------|---------|
| `tauri-plugin-dialog` | Opens the native file picker |
| `tauri-plugin-fs` | Reads the selected file from disk as bytes |

### Deployment note

When deployed, the backend URL will be your server's domain (e.g. `https://yourserver.com`). The returned URL will automatically use the correct host since it's built from `req.protocol + req.get('host')`. Make sure the `uploads/` directory is writable by the server process and is not wiped on redeploy (exclude it from `.gitignore` changes or mount it as a persistent volume).

---

## Tauri Reference

Tauri lets your React frontend call Rust functions and access native OS features. You won't need this for most game logic — sockets handle communication. But you'll need it for things like file system access, SQLite, and OS dialogs.

### Calling Rust from React (Tauri Commands)

**Step 1:** Define the command in `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
```

**Step 2:** Register it in the builder in `lib.rs`:

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet])  // add your command here
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

**Step 3:** Call it from React:

```js
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('greet', { name: 'James' });
console.log(result); // "Hello, James!"
```

> Note: Rust function names use `snake_case` and are called the same way from JS.

### SQLite

SQLite is already set up. See the [Database Reference](#database-reference) section for the schema, all available functions, and usage examples. To write a custom query not covered by the helper functions, use `getDb()` directly as shown at the bottom of that section.

### Window configuration

Edit `src-tauri/tauri.conf.json` to change window defaults:

```json
"windows": [
  {
    "title": "MTG Board",
    "width": 1280,
    "height": 800,
    "resizable": true,
    "fullscreen": false,
    "decorations": true
  }
]
```

To go fullscreen programmatically from React:

```js
import { getCurrentWindow } from '@tauri-apps/api/window';

await getCurrentWindow().setFullscreen(true);
```
