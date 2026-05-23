import { useEffect, useState } from 'react';
import { socket } from './socket';
import GameHand from './GameHand';
import './App.css';

export default function App() {
  const [status, setStatus] = useState('disconnected');
  const [codeInput, setCodeInput] = useState('');
  const [gameCode, setGameCode] = useState(null);
  const [error, setError] = useState(null);
  const [initialState, setInitialState] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => {
      setStatus('disconnected');
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
    <div className="hand-layout">
      <header className="hand-header">
        <span className="hand-title">MTG Hand</span>
        <span className={`dot ${status}`} />
      </header>

      <main className="hand-main">
        <div className="join-screen">
          <h2>Join a Game</h2>
          <input
            className="code-input"
            type="text"
            maxLength={6}
            placeholder="XXXXXX"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && joinGame()}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={joinGame} disabled={status !== 'connected' || !codeInput.trim()}>
            Join
          </button>
        </div>
      </main>
    </div>
  );
}
