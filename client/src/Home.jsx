import Header from './Header';
import SocketStatusIcon from './SocketStatusIcon';
import { Button, colors, radius, spacing } from "@mtg/shared"
import { exit } from '@tauri-apps/plugin-process';
import { getDb, getDecks } from './db';
import { useEffect, useState } from 'react'
import DeckCard from './DeckCard';
import DeckSelectSidebar from './DeckSelectSidebar';
import CreateDeck from './CreateDeck';
import { css } from '@emotion/react'

export default function HomeScreen({ selectedDeck, setSelectedDeck, onDeckEdit, onCreateGame }) {
  const [decks, setDecks] = useState([])
  const [addDeck, setAddDeck] = useState(false)

  useEffect(() => { getDb(); }, []);

  useEffect(() => {
    getDecks().then(setDecks);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedDeck(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedDeck]);

  function handleDeckDeleted(deckId) {
    setDecks(currentDecks => currentDecks.filter(deck => deck.id !== deckId));
    setSelectedDeck(null);
  }

  function handleDeckImported() {
    setAddDeck(false);
    getDecks().then(setDecks);
  }

  return (
    <div
      css={css`
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        height: 100vh;
        overflow: hidden;
      `}
    >
      <Header
        title="MTG Board"
        actions={
          <>
            <SocketStatusIcon />
            <Button onClick={() => { exit(0) }} danger>Quit</Button>
          </>
        }
      />
      <div
        css={css`
          display: flex;
          flex: 1;
          min-height: 0;
          min-width: 0;
          overflow: hidden;
        `}
      >
        <div
          css={css`
            flex: 1;
            min-height: 0;
            min-width: 0;
            width: 100%;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            align-content: start;
            gap: 1rem;
            padding: 1rem;
            overflow: hidden;
          `}
          onClick={() => setSelectedDeck(null)}
        >
          {decks.map(deck => (
            <DeckCard
              key={deck.id}
              deck={deck}
              selected={selectedDeck?.id === deck.id}
              onDeckSelect={() => setSelectedDeck(deck)}
              onDeckEdit={onDeckEdit}
            />
          ))}
          <button
            css={css`
                min-height: 70px;
                display: flex;
                align-items: center;
                background: none;
                justify-content: center;
                padding: ${spacing.sm};
                border: 2px dashed ${colors.border};
                border-radius: ${radius.md};
                transition: 0.1s ease-in border;
                &:hover {
                  border: 2px dashed ${colors.borderFocus};
                }
                color: ${colors.textPrimary};
                width: 100%;
                height: 100%;
                cursor: pointer;
                font-size: 1rem;
              `}
            onClick={(e) => { e.stopPropagation(); setAddDeck(true); }}
          >
            + Create Deck
          </button>
        </div>
        <DeckSelectSidebar
          selectedDeck={selectedDeck}
          onClose={() => setSelectedDeck(null)}
          onDeckEdit={onDeckEdit}
          onCreateGame={onCreateGame}
          onDeckDeleted={handleDeckDeleted}
        />
      </div>
      <CreateDeck
        isOpen={addDeck}
        onClose={handleDeckImported}
      />
    </div >
  )
}
