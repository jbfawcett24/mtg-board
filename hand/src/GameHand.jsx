/** @jsxImportSource @emotion/react */
import { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from './socket';
import { radius } from '@mtg/shared';

const LONG_PRESS_MS = 500;
const CARD_ASPECT = 1 / 1.4;
const OVERLAP = 0.5;

// ---- styles ----

const wrapStyle = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: #1a1a2e;
    user-select: none;
    -webkit-user-select: none;
`;

const tabBarStyle = css`
    display: flex;
    flex-shrink: 0;
    border-bottom: 1px solid #0f3460;
    background: #16213e;
`;

const tabStyle = (active) => css`
    flex: 1;
    padding: 12px 8px;
    background: none;
    border: none;
    border-bottom: 2px solid ${active ? '#e94560' : 'transparent'};
    color: ${active ? '#eeeeee' : '#aaaaaa'};
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
    padding: 16px;
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
    border-radius: 18px;
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
    background: #16213e;
    border-top: 1px solid #0f3460;
`;

const drawBtnStyle = (disabled) => css`
    padding: 10px 32px;
    border-radius: 8px;
    border: 1px solid ${disabled ? '#333' : '#e94560'};
    background: none;
    color: ${disabled ? '#444' : '#e94560'};
    font-size: 0.95rem;
    font-weight: bold;
    cursor: ${disabled ? 'not-allowed' : 'pointer'};
`;

// ---- HandCard ----

function HandCard({ card, index, isSelected, onSelect, onPlay, playLabel }) {
    const timerRef = useRef(null);
    const cardRef = useRef(null);
    const [previewing, setPreviewing] = useState(false);

    const maxH = window.innerHeight * 0.72;
    const maxW = window.innerWidth * 0.82;
    const cardWidth = Math.min(maxH * CARD_ASPECT, maxW);

    useEffect(() => {
        if (isSelected && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [isSelected]);

    function startPress(e) {
        e.preventDefault();
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setPreviewing(true);
        }, LONG_PRESS_MS);
    }

    function endPress(e) {
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
                        border: ${isSelected ? '3px solid #e94560' : '3px solid transparent'};
                        box-shadow: ${isSelected ? '0 0 24px rgba(233,69,96,0.5)' : '0 6px 20px rgba(0,0,0,0.7)'};
                        overflow: hidden;
                        position: relative;
                    `}
                    initial={{ opacity: 0, scale: 0.9, y: 120}}
                    animate={{ opacity: 1, scale: isSelected ? 1.03 : 1, y: 0}}
                    exit={{ opacity: 0, scale: 0.9, y: -120 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.2 }}
                    onPointerDown={startPress}
                    onPointerUp={endPress}
                    onPointerCancel={cancelPress}
                    onPointerLeave={cancelPress}
                    onContextMenu={e => e.preventDefault()}
                >
                    <img
                        src={card.image_uri}
                        alt={card.name}
                        draggable={false}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />

                    <AnimatePresence>
                        {isSelected && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.55)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                }}
                            >
                                <button
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: '#e94560',
                                        color: '#eeeeee',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        minWidth: 120,
                                    }}
                                    onPointerDown={e => { e.stopPropagation(); onPlay(); }}
                                >
                                    {playLabel}
                                </button>
                                <button
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        background: 'none',
                                        color: '#cccccc',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        minWidth: 120,
                                    }}
                                    onPointerDown={e => { e.stopPropagation(); onSelect(card); }}
                                >
                                    Cancel
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

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
                    <button
                        css={drawBtnStyle(libraryCount === 0)}
                        disabled={libraryCount === 0}
                        onPointerDown={() => socket.emit('draw_card')}
                    >
                        Draw ({libraryCount} left)
                    </button>
                </div>
            )}
        </div>
    );
}
