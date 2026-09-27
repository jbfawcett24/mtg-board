/** @jsxImportSource @emotion/react */
import { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from './socket';
import { colors, radius, spacing } from '@mtg/shared';
import Button from '@mtg/shared/src/Button';

const LONG_PRESS_MS = 500;
const CARD_ASPECT = 1 / 1.4;
const OVERLAP = 0.5;

// ---- styles ----

const wrapStyle = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: ${colors.bgBase};
    user-select: none;
    -webkit-user-select: none;
`;

const tabBarStyle = css`
    display: flex;
    flex-shrink: 0;
    border-bottom: 1px solid ${colors.border};
    background: #16213e;
`;

const tabStyle = (active) => css`
    flex: 1;
    padding: 12px 8px;
    background: none;
    border: none;
    border-bottom: 2px solid ${active ? colors.accent : 'transparent'};
    color: ${active ? colors.textPrimary : colors.textMuted};
    font-size: 0.85rem;
    font-weight: ${active ? 'bold' : 'normal'};
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
`;

const scrollTrackStyle = css`
    flex: 1;
    display: flex;
    align-items: center;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    padding: ${spacing.sm};
    gap: 0;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const overlayStyle = css`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
`;

const previewImgStyle = css`
    width: min(92vw, 400px);
    border-radius: ${radius.card};
    box-shadow: 0 12px 48px rgba(0,0,0,0.8);
`;

const emptyStyle = css`
    color: #555;
    font-size: 0.95rem;
    text-align: center;
    width: 100%;
`;

const drawBarStyle = css`
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    padding: 10px 16px;
    background: ${colors.bgSurface};
    border-top: 1px solid ${colors.bgRaised};
`;

// ---- HandCard ----

function HandCard({ card, index, isSelected, onSelect, onPlay, playLabel }) {
  const timerRef = useRef(null);
  const cardRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);
  const [showBack, setShowBack] = useState(false);

  const maxH = window.innerHeight * 0.72;
  const maxW = window.innerWidth * 0.82;
  const cardWidth = Math.min(maxH * CARD_ASPECT, maxW);

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [isSelected]);

  function isButtonPress(e) {
    return e.target instanceof Element && e.target.closest('button');
  }

  function startPress(e) {
    if (isButtonPress(e)) return;
    e.preventDefault();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setPreviewing(true);
    }, LONG_PRESS_MS);
  }

  function endPress(e) {
    if (isButtonPress(e)) return;
    e.preventDefault();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onSelect(card);
    }
  }

  function cancelPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <>
      <div
        ref={cardRef}
        style={{
          flexShrink: 0,
          scrollSnapAlign: 'center',
          width: cardWidth,
          marginLeft: index === 0 ? 0 : -cardWidth * OVERLAP,
          zIndex: isSelected ? 999 : index,
          position: 'relative',
        }}
      >
        <motion.div
          css={css`
              border-radius: ${radius.card};
              border: ${isSelected ? `3px solid ${colors.accent}` : '3px solid transparent'};
              box-shadow: ${isSelected ? `0 0 24px ${colors.accent}88` : '0 6px 20px rgba(0,0,0,0.7)'};
              overflow: hidden;
              position: relative;
          `}
          initial={{ opacity: 0, scale: 0.9, y: 120 }}
          animate={{ opacity: 1, scale: isSelected ? 1.03 : 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -120 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.2 }}
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerCancel={cancelPress}
          onPointerLeave={cancelPress}
          onContextMenu={e => e.preventDefault()}
        >
          <img
            src={showBack ? card.image_uri_back : card.image_uri}
            alt={card.name}
            draggable={false}
            css={css`
              width: 100%;
              height: auto;
              display: block;
            `}
          />

          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                css={css`
                  position: absolute;
                  inset: 0;
                  background: rgba(0,0,0,0.55);
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: ${spacing.md};
                `}
              >
                <Button
                  onClick={(e) => { e.stopPropagation(); onPlay(); }}
                  size='lg'
                >
                  {playLabel}
                </Button>
                <Button
                  onClick={(e) => { e.stopPropagation(); onSelect(card); }}
                  variant='secondary'
                  size='lg'
                >
                  Cancel
                </Button>
                {card.image_uri_back &&
                  <Button
                    onClick={(e) => { e.stopPropagation(); setShowBack(prev => !prev); }}
                    size='md'
                  >
                    Turn Over
                  </Button>
                }
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div >
      </div >

      <AnimatePresence>
        {previewing && (
          <motion.div
            css={overlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={() => setPreviewing(false)}
          >
            <motion.img
              css={previewImgStyle}
              src={card.image_uri}
              alt={card.name}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.25, duration: 0.3 }}
              onPointerDown={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---- CardScroller ----

function CardScroller({ items, selectedId, onSelect, onPlay, playLabel, emptyText }) {
  const trackRef = useRef(null);
  const prevLengthRef = useRef(items.length);

  useEffect(() => {
    if (items.length > prevLengthRef.current && trackRef.current) {
      const el = trackRef.current;
      requestAnimationFrame(() => {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      });
    }
    prevLengthRef.current = items.length;
  }, [items.length]);

  return (
    <div ref={trackRef} css={scrollTrackStyle}>
      {items.length === 0 ? (
        <p css={emptyStyle}>{emptyText}</p>
      ) : (
        <AnimatePresence>
          {items.map((card, i) => (
            <HandCard
              key={card.instanceId ?? card.id}
              card={card}
              index={i}
              isSelected={(card.instanceId ?? card.id) === selectedId}
              onSelect={onSelect}
              onPlay={onPlay}
              playLabel={playLabel}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

// ---- main ----

const TABS = ['Hand', 'Tokens', 'Command'];

export default function GameHand({ initialState = null }) {
  const [gameState, setGameState] = useState(initialState);
  const [tab, setTab] = useState('Hand');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    socket.on('game_state_update', (state) => {
      setGameState(state);
      setSelectedId(null);
    });
    return () => socket.off('game_state_update');
  }, []);

  function handleSelect(card) {
    const id = card.instanceId ?? card.id;
    setSelectedId(prev => prev === id ? null : id);
  }

  function handlePlay() {
    if (!selectedId) return;
    if (tab === 'Hand') {
      socket.emit('play_card', { instanceId: selectedId });
      setSelectedId(null);
    } else if (tab === 'Tokens') {
      socket.emit('play_token', { tokenId: selectedId });
    } else if (tab === 'Command') {
      socket.emit('play_commander', { instanceId: selectedId });
      setSelectedId(null);
    }
  }

  function handleTabChange(t) {
    setTab(t);
    setSelectedId(null);
  }

  const hand = gameState?.hand ?? [];
  const tokens = gameState?.tokens ?? [];
  const commandZone = gameState?.commandZone ?? [];
  const libraryCount = gameState?.library?.length ?? 0;

  const activeItems = tab === 'Hand' ? hand : tab === 'Tokens' ? tokens : commandZone;
  const playLabel = tab === 'Tokens' ? 'Create' : 'Play';

  return (
    <div css={wrapStyle}>
      <div css={tabBarStyle}>
        {TABS.map(t => (
          <button key={t} css={tabStyle(tab === t)} onPointerDown={() => handleTabChange(t)}>
            {t === 'Hand' ? `Hand (${hand.length})` : t === 'Tokens' ? `Tokens (${tokens.length})` : `Command (${commandZone.length})`}
          </button>
        ))}
      </div>

      <CardScroller
        items={activeItems}
        selectedId={selectedId}
        onSelect={handleSelect}
        onPlay={handlePlay}
        playLabel={playLabel}
        emptyText={`No cards in ${tab.toLowerCase()}`}

      />

      {tab === 'Hand' && (
        <div css={drawBarStyle}>
          <Button
            disabled={libraryCount === 0}
            onClick={() => { socket.emit('draw_card') }}
            size="lg"
            variant='secondary'
          >
            Draw ({libraryCount} left)
          </Button>
        </div>
      )}
    </div>
  );
}
