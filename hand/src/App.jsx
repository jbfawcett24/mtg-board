import { useEffect, useState } from 'react';
import { socket } from './socket';
import { colors, spacing } from '@mtg/shared';
import { css } from '@emotion/react';
import GameHand from './GameHand';
import Button from '@mtg/shared/src/Button';

const appStyle = css`
  height: 100dvh;
  display: flex;
  flex-direction: column;
`;

const headerStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${spacing.sm} ${spacing.lg};
  background: ${colors.bgSurface};
  border-bottom: 1px solid ${colors.border};
`;

const handTitleStyle = css`
  font-size: 1.1rem;
  font-weight: bold;
  color: ${colors.accent};
`;

const handMainStyle = css`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${spacing.xl};
`;

const joinScreenStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 320px;

  & h2 {
    font-size: 1.4rem;
    color: ${colors.textPrimary};
  }
`;

const codeInputStyle = css`
  width: 100%;
  text-align: center;
  font-size: 2rem;
  letter-spacing: 0.3em;
  padding: 12px;
  background: ${colors.bgSurface};
  border: 2px solid ${colors.bgRaised};
  color: #eee;
  border-radius: 8px;
  font-family: monospace;
  text-transform: uppercase;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
  }
`;

const errorStyle = css`
  color: ${colors.error};
  font-size: 0.9rem;
`;

const statusDotStyle = (connected) => css`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${connected ? colors.success : colors.error};
  display: inline-block;
`;

export default function App() {
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [codeInput, setCodeInput] = useState('');
  const [gameCode, setGameCode] = useState(null);
  const [error, setError] = useState(null);
  const [initialState, setInitialState] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      console.log("connected")
      setSocketStatus('connected');
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) socket.emit('join_game', { code: code.toUpperCase() });
    });
    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
      setGameCode(null);
      setInitialState(null);
    });
    socket.on('game_joined', ({ code }) => {
      setGameCode(code);
      setError(null);
    });
    socket.on('game_state_update', (state) => {
      setInitialState(state);
    });
    socket.on('game_ended', () => {
      setGameCode(null);
      setInitialState(null);
      setError('The game ended.');
    });
    socket.on('error', ({ message }) => setError(message));

    return () => socket.disconnect();
  }, []);

  function joinGame() {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setError(null);
    socket.emit('join_game', { code });
  }

  if (gameCode) {
    return <GameHand initialState={initialState} />;
  }

  return (
    <div css={appStyle}>
      <header css={headerStyle}>
        <span css={handTitleStyle}>MTG Hand</span>
        <span css={statusDotStyle(socketStatus === 'connected')} />
      </header>

      <main css={handMainStyle}>
        <div css={joinScreenStyle}>
          <h2>Join a Game</h2>
          <input
            css={codeInputStyle}
            type="text"
            maxLength={6}
            placeholder="XXXXXX"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && joinGame()}
          />
          {error && <p css={errorStyle}>{error}</p>}
          <Button
            onClick={joinGame}
            disabled={socketStatus !== 'connected' || !codeInput.trim()}
            size="xl"
            spread
          >Join</Button>
        </div>
      </main>
    </div>
  );
}
