import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { drawCard } from './handFunctions.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const UPLOADS_DIR = join(__dirname, '../../uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
  },
});

const app = express();
app.use(cors());
app.use('/uploads', express.static(UPLOADS_DIR));

app.post('/upload/card-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file or invalid file type' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const sessions = new Map();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('create_game', (deck) => {
    let code;
    do { code = generateCode(); } while (sessions.has(code));

    sessions.set(code, { boardSocketId: socket.id, handSocketId: null });
    socket.join(code);
    socket.data.code = code;
    socket.data.role = 'board';

    socket.emit('game_created', { code });
    console.log(`Game created: ${code}`);
  });

  socket.on('join_game', ({ code }) => {
    const session = sessions.get(code);
    if (!session) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    session.handSocketId = socket.id;
    socket.join(code);
    socket.data.code = code;
    socket.data.role = 'hand';

    socket.emit('game_joined', { code });
    io.to(code).emit('player_joined', { role: 'hand' });
    if (session.gameState) socket.emit('game_state_update', session.gameState);
    console.log(`Hand joined game: ${code}`);
  });

  socket.on('start_game', (deck) => {
    const { code } = socket.data;
    if (!code) return;

    const session = sessions.get(code);
    if (!session || session.boardSocketId !== socket.id) return;

    session.gameState = {
      library: deck.cards.filter(c => c.board === "main")
        .flatMap(c => Array.from({ length: c.quantity }, (_, i) => ({ 
          ...c, 
          instanceId: `${c.id}-${c.scryfall_id}-${i}`,
          tapped: false,
          position: { x: 0, y: 0 },
          counters: []
        })))
        .sort(() => Math.random() - 0.5),
      commandZone: deck.cards.filter(c => c.board === "commander"),
      hand: [],
      battlefield: [],
      graveyard: [],
      exile: [],
      tokens: deck.tokens
    }

    for(let i = 0; i < 7; i++) {
      drawCard(session);
    }

    console.log("Game Started: ", session.gameState)

    syncGameState(session, code);
  })

  socket.on('tap_card', ({ instanceId, tapped }) => {
    const { code } = socket.data;
    if (!code) return;
    const session = sessions.get(code);
    if (!session?.gameState) return;
    const card = session.gameState.battlefield.find(c => c.instanceId === instanceId);
    if (card) card.tapped = tapped;
    syncGameState(session, code);
  });

  socket.on('draw_card', () => {
    const { code, role } = socket.data;
    if (!code || role !== 'hand') return;
    const session = sessions.get(code);
    if (!session?.gameState) return;
    drawCard(session);
    syncGameState(session, code);
  });

  socket.on('play_card', ({ instanceId }) => {
    const { code, role } = socket.data;
    if (!code || role !== 'hand') return;
    const session = sessions.get(code);
    if (!session?.gameState) return;

    const card = session.gameState.hand.find(c => c.instanceId === instanceId);
    if (!card) return;

    session.gameState.hand = session.gameState.hand.filter(c => c.instanceId !== instanceId);
    session.gameState.battlefield.push({ ...card, tapped: false, position: { x: 0, y: 0 }, counters: [] });
    syncGameState(session, code);
  });

  socket.on('play_token', ({ tokenId }) => {
    const { code, role } = socket.data;
    if (!code || role !== 'hand') return;
    const session = sessions.get(code);
    if (!session?.gameState) return;

    const token = session.gameState.tokens.find(t => t.id === tokenId);
    if (!token) return;

    const instanceId = `token-${token.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    session.gameState.battlefield.push({ ...token, instanceId, isToken: true, tapped: false, position: { x: 0, y: 0 }, counters: [] });
    syncGameState(session, code);
  });

  socket.on('play_commander', ({ instanceId }) => {
    const { code, role } = socket.data;
    if (!code || role !== 'hand') return;
    const session = sessions.get(code);
    if (!session?.gameState) return;

    const card = session.gameState.commandZone.find(c => c.instanceId === instanceId || c.id === instanceId);
    if (!card) return;

    session.gameState.commandZone = session.gameState.commandZone.filter(c => (c.instanceId ?? c.id) !== instanceId);
    const id = `commander-${card.id ?? card.scryfall_id}-${Date.now()}`;
    session.gameState.battlefield.push({ ...card, instanceId: id, isCommander: true, tapped: false, position: { x: 0, y: 0 }, counters: [] });
    syncGameState(session, code);
  });

  // move_zone_card: move a card that is already in a non-battlefield zone
  socket.on('move_zone_card', ({ instanceId, from, to, position }) => {
    const { code } = socket.data;
    if (!code) return;
    const session = sessions.get(code);
    if (!session?.gameState) return;

    const zone = session.gameState[from];
    if (!Array.isArray(zone)) return;
    const card = zone.find(c => (c.instanceId ?? c.id) === instanceId);
    if (!card) return;

    session.gameState[from] = zone.filter(c => (c.instanceId ?? c.id) !== instanceId);

    const clean = { ...card, tapped: false, counters: [] };
    if (to === 'battlefield') {
      const id = clean.instanceId ?? `${from}-${clean.id}-${Date.now()}`;
      session.gameState.battlefield.push({ ...clean, instanceId: id, position: position ?? { x: 0, y: 0 } });
    } else if (to === 'hand') {
      session.gameState.hand.push(clean);
    } else if (to === 'graveyard') {
      session.gameState.graveyard.push(clean);
    } else if (to === 'exile') {
      session.gameState.exile.push(clean);
    } else if (to === 'library' || to === 'library_top') {
      session.gameState.library.push(clean);
    } else if (to === 'library_bottom') {
      session.gameState.library.unshift(clean);
    }
    syncGameState(session, code);
  });

  // move_card: move a battlefield card to another zone
  // zone: 'graveyard' | 'exile' | 'hand' | 'commandZone'
  socket.on('move_card', ({ instanceId, to }) => {
    const { code } = socket.data;
    if (!code) return;
    const session = sessions.get(code);
    if (!session?.gameState) return;

    const card = session.gameState.battlefield.find(c => c.instanceId === instanceId);
    if (!card) return;

    session.gameState.battlefield = session.gameState.battlefield.filter(c => c.instanceId !== instanceId);

    const isToken = !!card.isToken || card.instanceId?.startsWith('token-');
    const clean = { ...card, tapped: false, counters: [] };
    if (!isToken) {
      if (to === 'graveyard') session.gameState.graveyard.push(clean);
      else if (to === 'exile') session.gameState.exile.push(clean);
      else if (to === 'hand') session.gameState.hand.push(clean);
      else if (to === 'commandZone') session.gameState.commandZone.push(clean);
      else if (to === 'library_top') session.gameState.library.push(clean);
      else if (to === 'library_bottom') session.gameState.library.unshift(clean);
    }
    // tokens are simply removed from the game regardless of destination

    syncGameState(session, code);
  });

  socket.on('reset_game', () => { 
    const { code } = socket.data;
    if (!code) return;
    const session = sessions.get(code);
    if (!session || session.boardSocketId !== socket.id) return;

    session.gameState = null;
    syncGameState(session, code);
  })

  socket.on('shuffle_library', () => {
    const session = getSession(socket);
    if (!session) return;
    console.log("Shuffling library for game: ", socket.data.code);
    session.gameState.library.sort(() => Math.random() - 0.5);
    syncGameState(session, socket.data.code);
  })

  socket.on('untap_all', () => {
    const session = getSession(socket);
    if (!session) return;
    session.gameState.battlefield.forEach(c => c.tapped = false);
    syncGameState(session, socket.data.code);
  });

  socket.on('disconnect', () => {
    const { code, role } = socket.data;
    if (!code) return;

    const session = sessions.get(code);
    if (!session) return;

    if (role === 'board') {
      sessions.delete(code);
      io.to(code).emit('game_ended');
      console.log(`Game ended: ${code}`);
    } else if (role === 'hand') {
      session.handSocketId = null;
      io.to(code).emit('player_left', { role: 'hand' });
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});


function syncGameState(session, code) {
  io.to(code).emit('game_state_update', session.gameState);
}

function getSession(socket, { needsGameState = true, role = null } = {}) {
  const { code, role: socketRole } = socket.data;
  if (!code) return null;
  if (role && socketRole !== role) return null;
  const session = sessions.get(code);
  if (!session) return null;
  if (needsGameState && !session.gameState) return null;
  return session;
}
