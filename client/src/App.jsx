import { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { QRCodeSVG } from 'qrcode.react';
import { socket } from './socket';
import { getDb, getDecks, getCardsForDeck, getTokensForDeck } from './db.js';
import { colors, spacing, radius } from '@mtg/shared';
import Board from './Board.jsx';
import DeckEditor from './DeckEditor.jsx';
import Button from '@mtg/shared/src/Button.jsx';
import HomeScreen from './Home.jsx';

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

const mainStyle = css`
  flex: 1;
  padding: ${spacing.lg};
  overflow-y: auto;
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
      <Board socket={socket} setPage={setPage} />
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
          {/* <button css={importBtnStyle} onClick={() => setPage('home')}>Cancel</button> */}
          <Button onClick={() => setPage('home')} variant={"secondary"}>Cancel</Button>
          <Button
            size="md"
            disabled={!handConnected}
            onClick={handleStartGame}
          >
            Start Game
          </Button>
        </footer>
      </div>
    );
  }

  return (
    <HomeScreen
      selectedDeck={selectedDeck}
      setSelectedDeck={(deck) => setSelectedDeck(deck)}
      onDeckEdit={(deck) => { setSelectedDeck(deck); setPage("edit"); }}
      onCreateGame={handleCreateGame}
    />
  )
}
