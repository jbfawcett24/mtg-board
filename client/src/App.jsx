import { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { socket } from './socket';
import { getDb, getDecks, getCardsForDeck, getTokensForDeck } from './db.js';
import Modal from './Modal.jsx';
import CreateDeck from './CreateDeck.jsx';
import { colors, spacing, radius } from '@mtg/shared';
import Board from './Board.jsx';
import DeckEditor from './DeckEditor.jsx';

const HAND_URL = import.meta.env.VITE_HAND_URL || 'http://localhost:5174';

// ---- styles ----

const layoutStyle = css`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${colors.bgBase};
  color: ${colors.textPrimary};
  font-family: sans-serif;
`;

const headerStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${spacing.sm} ${spacing.lg};
  background: ${colors.bgSurface};
  border-bottom: 1px solid ${colors.border};
`;

const titleStyle = css`
  font-size: 1.2rem;
  font-weight: bold;
  color: ${colors.accent};
`;

const headerActionsStyle = css`
  display: flex;
  align-items: center;
  gap: ${spacing.md};
`;

const importBtnStyle = css`
  padding: ${spacing.xs} ${spacing.md};
  background: none;
  border: 1px solid ${colors.border};
  color: ${colors.textMuted};
  border-radius: ${radius.md};
  cursor: pointer;
  font-size: 0.85rem;
  &:hover { border-color: ${colors.accent}; color: ${colors.textPrimary}; }
`;

const mainStyle = css`
  flex: 1;
  padding: ${spacing.lg};
  overflow-y: auto;
`;

const sectionTitleStyle = css`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${colors.textMuted};
  margin-bottom: ${spacing.md};
`;

const deckGridStyle = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${spacing.md};
`;

const deckCardStyle = (selected) => css`
  background: ${selected ? colors.bgRaised : colors.bgSurface};
  border: 2px solid ${selected ? colors.accent : colors.border};
  border-radius: ${radius.md};
  padding: ${spacing.md};
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  &:hover { border-color: ${colors.accent}; }
`;

const deckNameStyle = css`
  font-size: 1rem;
  font-weight: bold;
  color: ${colors.textPrimary};
  margin-bottom: ${spacing.xs};
`;

const deckMetaStyle = css`
  font-size: 0.8rem;
  color: ${colors.textMuted};
  text-transform: capitalize;
`;

const footerStyle = css`
  padding: ${spacing.md} ${spacing.lg};
  background: ${colors.bgSurface};
  border-top: 1px solid ${colors.border};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${spacing.md};
`;

const primaryBtnStyle = (disabled) => css`
  padding: ${spacing.sm} ${spacing.xl};
  background: ${disabled ? colors.bgRaised : colors.accent};
  color: ${disabled ? colors.textFaint : colors.textPrimary};
  border: none;
  border-radius: ${radius.md};
  font-size: 1rem;
  cursor: ${disabled ? 'not-allowed' : 'pointer'};
  transition: background 0.15s;
  &:hover:not(:disabled) { background: ${colors.accentHover}; }
`;

const lobbyStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${spacing.lg};
  padding: ${spacing.xl};
`;

const gameCodeStyle = css`
  font-size: 3rem;
  font-weight: bold;
  letter-spacing: 0.3em;
  color: ${colors.accent};
  font-family: monospace;
`;

const qrWrapStyle = css`
  background: white;
  padding: ${spacing.md};
  border-radius: ${radius.md};
`;

const statusDotStyle = (connected) => css`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${connected ? colors.success : colors.error};
  display: inline-block;
`;

const handBadgeStyle = css`
  background: ${colors.bgRaised};
  border: 1px solid ${colors.success};
  color: ${colors.success};
  padding: 2px ${spacing.sm};
  border-radius: 12px;
  font-size: 0.75rem;
`;

// ---- component ----

export default function App() {
  const [page, setPage] = useState('home'); // 'home' | 'lobby' | 'board' | 'edit'
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [addDeck, setAddDeck] = useState(false);

  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [gameCode, setGameCode] = useState(null);
  const [handConnected, setHandConnected] = useState(false);

  useEffect(() => { getDb(); }, []);

  useEffect(() => {
    getDecks().then(setDecks);
  }, []);

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
      setGameCode(null);
      setHandConnected(false);
    });
    socket.on('game_created', ({ code }) => setGameCode(code));
    socket.on('player_joined', ({ role }) => { if (role === 'hand') setHandConnected(true); });
    socket.on('player_left', ({ role }) => { if (role === 'hand') setHandConnected(false); });
    socket.on('game_ended', () => { setPage('home'); setGameCode(null); setHandConnected(false); });
    return () => socket.disconnect();
  }, []);

  function handleCreateGame() {
    socket.emit('create_game');
    setPage('lobby');
  }

  async function handleStartGame() {
    const [cards, tokens] = await Promise.all([
      getCardsForDeck(selectedDeck.id),
      getTokensForDeck(selectedDeck.id),
    ]);
    socket.emit('start_game', { deck: selectedDeck, cards, tokens });
    setPage('board');
  }

  function handleDeckImported() {
    setAddDeck(false);
    getDecks().then(setDecks);
  }

  const handJoinUrl = gameCode ? `${HAND_URL}?code=${gameCode}` : '';

  if (page === 'edit') {
    return <DeckEditor deck={selectedDeck} onBack={() => { setPage('home'); getDecks().then(setDecks); setSelectedDeck(null); }} />;
  }

  if (page === 'board') {
    return (
      <Board socket={socket} setPage={setPage}/>
    );
  }

  if (page === 'lobby') {
    return (
      <div css={layoutStyle}>
        <header css={headerStyle}>
          <span css={titleStyle}>MTG Board</span>
          <div css={headerActionsStyle}>
            <span css={statusDotStyle(socketStatus === 'connected')} />
            <span css={css`font-size:0.85rem; color:${colors.textMuted};`}>
              {socketStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
            {handConnected && <span css={handBadgeStyle}>Hand connected</span>}
          </div>
        </header>

        <main css={mainStyle}>
          <div css={lobbyStyle}>
            {gameCode ? (
              <>
                <p css={css`color:${colors.textMuted};`}>
                  Scan the QR code or enter the code in the Hand app.
                </p>
                <div css={qrWrapStyle}>
                  <QRCodeSVG value={handJoinUrl} size={200} />
                </div>
                <div css={gameCodeStyle}>{gameCode}</div>
                {!handConnected && (
                  <p css={css`color:${colors.textMuted};`}>Waiting for hand to connect…</p>
                )}
              </>
            ) : (
              <p css={css`color:${colors.textMuted};`}>Creating game…</p>
            )}
          </div>
        </main>

        <footer css={footerStyle}>
          <button css={importBtnStyle} onClick={() => setPage('home')}>Cancel</button>
          <button
            css={primaryBtnStyle(!handConnected)}
            disabled={!handConnected}
            onClick={handleStartGame}
          >
            Start Game
          </button>
        </footer>
      </div>
    );
  }

  // home page
  return (
    <div css={layoutStyle}>
      <header css={headerStyle}>
        <span css={titleStyle}>MTG Board</span>
        <div css={headerActionsStyle}>
          <span css={statusDotStyle(socketStatus === 'connected')} />
          <button css={importBtnStyle} onClick={() => setAddDeck(true)}>
            + Import Deck
          </button>
        </div>
      </header>

      <main css={mainStyle}>
        <p css={sectionTitleStyle}>Your Decks</p>
        {decks.length === 0 ? (
          <p css={css`color:${colors.textFaint}; font-size:0.9rem;`}>
            No decks yet. Import one to get started.
          </p>
        ) : (
          <div css={deckGridStyle}>
            <AnimatePresence>
              {decks.map(deck => (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', bounce: 0.2 }}
                  css={deckCardStyle(selectedDeck?.id === deck.id)}
                  onClick={() => {setSelectedDeck(deck); console.log(deck)}}
                >
                  <p css={deckNameStyle}>{deck.name}</p>
                  <p css={deckMetaStyle}>{deck.format}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <footer css={footerStyle}>
        <span css={css`font-size:0.85rem; color:${colors.textMuted};`}>
          {selectedDeck ? `Selected: ${selectedDeck.name}` : 'Select a deck to play'}
        </span>
        <button
          css={importBtnStyle}
          disabled={!selectedDeck}
          onClick={() => setPage('edit')}
        >
          Edit Deck
        </button>
        <button
          css={primaryBtnStyle(!selectedDeck || socketStatus !== 'connected')}
          disabled={!selectedDeck || socketStatus !== 'connected'}
          onClick={handleCreateGame}
        >
          Create Game
        </button>
      </footer>

      <Modal onClose={() => setAddDeck(false)} isOpen={addDeck}>
        <CreateDeck onClose={handleDeckImported} />
      </Modal>
    </div>
  );
}
