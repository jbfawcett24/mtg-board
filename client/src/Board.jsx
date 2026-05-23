import { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, spacing, radius } from '@mtg/shared';

const LONG_PRESS_MS = 500;
const CARD_W = 160;
const CARD_H = CARD_W * 1.4;

// ---- styles ----

const boardStyle = css`
    width: 100vw;
    height: 100vh;
    display: flex;
    overflow: hidden;
    background: ${colors.bgBase};
    font-family: sans-serif;
    user-select: none;
`;

const sidebarStyle = css`
    width: ${CARD_W + 16}px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
    padding: ${spacing.sm};
    background: ${colors.bgSurface};
    border-right: 1px solid ${colors.border};
`;

const zoneStyle = css`
    flex-shrink: 0;
    width: ${CARD_W}px;
    height: ${CARD_H}px;
    position: relative;
    border-radius: ${radius.card};
    border: 1px solid ${colors.border};
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s;
    &:hover { border-color: ${colors.accent}; }
`;

const zoneLabelStyle = css`
    position: absolute;
    bottom: ${spacing.xs};
    left: 0;
    right: 0;
    text-align: center;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${colors.textMuted};
    background: rgba(0,0,0,0.55);
    padding: 2px 0;
`;

const zoneCountStyle = css`
    position: absolute;
    top: ${spacing.xs};
    right: ${spacing.xs};
    font-size: 0.85rem;
    font-weight: bold;
    color: ${colors.textPrimary};
    background: rgba(0,0,0,0.6);
    border-radius: ${radius.sm};
    padding: 1px 6px;
`;

const zoneImgStyle = css`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

const zoneEmptyStyle = css`
    width: 100%;
    height: 100%;
    background: ${colors.bgRaised};
`;

const battlefieldStyle = css`
    flex: 1;
    position: relative;
    overflow: hidden;
`;

const cardImgStyle = css`
    width: ${CARD_W}px;
    height: auto;
    border-radius: 12px;
    display: block;
    box-shadow: 0 4px 16px rgba(0,0,0,0.6);
    pointer-events: none;
`;

const hamburgerBtnStyle = css`
    background: none;
    border: none;
    color: ${colors.textPrimary};
    cursor: pointer;
    font-size: 2rem;
    padding: 0;
    line-height: 1;
    opacity: 0.75;
    align-self: flex-start;
    justify-self: flex-start;
    margin: 0;
    &:hover { opacity: 1; }
`;

const contextMenuStyle = css`
    position: fixed;
    background: ${colors.bgRaised};
    border: 1px solid ${colors.border};
    border-radius: ${radius.md};
    min-width: 160px;
    z-index: 500;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
`;

const menuItemStyle = css`
    display: block;
    width: 100%;
    text-align: left;
    padding: ${spacing.sm} ${spacing.md};
    background: none;
    border: none;
    color: ${colors.textPrimary};
    font-size: 0.9rem;
    cursor: pointer;
    &:hover { background: ${colors.bgSurface}; }
`;

const menuItemDangerStyle = css`
    ${menuItemStyle};
    color: ${colors.error};
`;

// ---- BattlefieldCard ----

function BattlefieldCard({ card, onTap, onContextMenu }) {
    const timerRef = useRef(null);
    const didLongPress = useRef(false);
    const dragRef = useRef(null);
    const [pos, setPos] = useState(card.position ?? { x: 100, y: 100 });

    function onPointerDown(e) {
        e.currentTarget.setPointerCapture(e.pointerId);
        didLongPress.current = false;
        const startX = e.clientX - pos.x;
        const startY = e.clientY - pos.y;
        dragRef.current = { startX, startY, moved: false };

        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            didLongPress.current = true;
            onContextMenu(card, e.clientX, e.clientY);
        }, LONG_PRESS_MS);
    }

    function onPointerMove(e) {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        if (!dragRef.current.moved && (Math.abs(dx - pos.x) > 4 || Math.abs(dy - pos.y) > 4)) {
            dragRef.current.moved = true;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }
        if (dragRef.current.moved) {
            setPos({ x:dx, y: dy });
        }
    }

    function onPointerUp(e) {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (!dragRef.current?.moved && !didLongPress.current) {
            onTap(card);
        }
        dragRef.current = null;
        const GRID = 20;
        setPos(prev => ({ x: Math.round(prev.x / GRID) * GRID, y: Math.round(prev.y / GRID) * GRID }));
    }

    function onPointerCancel() {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        dragRef.current = null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1, rotate: card.tapped ? 90 : 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.3 }}
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: CARD_W,
                height: CARD_H,
                cursor: 'grab',
                touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={e => { e.preventDefault(); onContextMenu(card, e.clientX, e.clientY); }}
        >
            <img
                src={card.image_uri}
                alt={card.name}
                css={cardImgStyle}
                draggable={false}
            />
        </motion.div>
    );
}

// ---- ZoneStack ----

function ZoneStack({ label, cards, onClick, revealedState }) {
    const top = cards[cards.length - 1];
    return (
        <div css={zoneStyle} onClick={onClick}>
            {top && revealedState ? (
                <img css={zoneImgStyle} src={top.image_uri} alt={top.name} />
            ) : (
                <div css={zoneEmptyStyle} />
            )}
            {cards.length > 0 && <span css={zoneCountStyle}>{cards.length}</span>}
            <span css={zoneLabelStyle}>{label}</span>
        </div>
    );
}

// ---- ContextMenu ----

function ContextMenu({ card, x, y, onClose, items }) {
    const menuRef = useRef(null);

    useEffect(() => {
        function handleDown(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        }
        document.addEventListener('pointerdown', handleDown);
        return () => document.removeEventListener('pointerdown', handleDown);
    }, [onClose]);

    const style = {
        top: Math.min(y, window.innerHeight - (items.length * 44 + 8)),
        left: Math.min(x, window.innerWidth - 180),
    };

    return (
        <motion.div
            ref={menuRef}
            css={contextMenuStyle}
            style={style}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
        >
            {items.map(item => (
                <button
                    key={item.label}
                    css={item.danger ? menuItemDangerStyle : menuItemStyle}
                    onClick={() => { item.action(); onClose(); }}
                >
                    {item.label}
                </button>
            ))}
        </motion.div>
    );
}

// ---- ZoneViewer ----

const zoneViewerOverlayStyle = css`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    display: flex;
    flex-direction: column;
    z-index: 300;
`;

const zoneViewerHeaderStyle = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${spacing.sm} ${spacing.md};
    background: ${colors.bgSurface};
    border-bottom: 1px solid ${colors.border};
    flex-shrink: 0;
`;

const zoneViewerTitleStyle = css`
    font-size: 1rem;
    font-weight: bold;
    color: ${colors.textPrimary};
    text-transform: capitalize;
`;

const zoneViewerCloseStyle = css`
    background: none;
    border: 1px solid ${colors.border};
    color: ${colors.textMuted};
    border-radius: ${radius.md};
    padding: ${spacing.xs} ${spacing.md};
    cursor: pointer;
    font-size: 0.85rem;
    &:hover { border-color: ${colors.accent}; color: ${colors.textPrimary}; }
`;

const zoneViewerGridStyle = css`
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.md};
    padding: ${spacing.md};
    overflow-y: auto;
    align-content: flex-start;
`;

const zoneCardWrapStyle = css`
    position: relative;
    cursor: pointer;
    border-radius: ${radius.card};
    overflow: visible;
`;

const zoneCardImgStyle = css`
    width: 140px;
    height: auto;
    border-radius: ${radius.card};
    display: block;
    box-shadow: 0 4px 16px rgba(0,0,0,0.6);
`;

const ZONE_DESTINATIONS = {
    graveyard: [
        { to: 'battlefield',    label: 'Move to Battlefield' },
        { to: 'hand',           label: 'Move to Hand' },
        { to: 'exile',          label: 'Move to Exile' },
        { to: 'library_top',    label: 'Put on top of Library' },
        { to: 'library_bottom', label: 'Put on bottom of Library' },
    ],
    exile: [
        { to: 'battlefield',    label: 'Move to Battlefield' },
        { to: 'hand',           label: 'Move to Hand' },
        { to: 'graveyard',      label: 'Move to Graveyard' },
        { to: 'library_top',    label: 'Put on top of Library' },
        { to: 'library_bottom', label: 'Put on bottom of Library' },
    ],
    library: [
        { to: 'battlefield',    label: 'Move to Battlefield' },
        { to: 'hand',           label: 'Move to Hand' },
        { to: 'graveyard',      label: 'Move to Graveyard' },
        { to: 'exile',          label: 'Move to Exile' },
        { to: 'library_bottom', label: 'Put on bottom of Library' },
    ],
};

function ZoneViewer({ zoneName, cards, onMove, onClose }) {
    const [cardMenu, setCardMenu] = useState(null); // { card, x, y }

    const destinations = ZONE_DESTINATIONS[zoneName] ?? [];

    function openMenu(card, e) {
        e.stopPropagation();
        setCardMenu({ card, x: e.clientX, y: e.clientY });
    }

    const menuItems = cardMenu ? destinations.map(dest => ({
        label: dest.label,
        action: () => onMove(cardMenu.card, dest.to),
    })) : [];

    return (
        <motion.div
            css={zoneViewerOverlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => { if (cardMenu) setCardMenu(null); }}
        >
            <div css={zoneViewerHeaderStyle}>
                <span css={zoneViewerTitleStyle}>{zoneName} ({cards.length})</span>
                <button css={zoneViewerCloseStyle} onClick={onClose}>Close</button>
            </div>

            <div css={zoneViewerGridStyle}>
                {cards.length === 0 && (
                    <p css={css`color:${colors.textFaint}; font-size:0.9rem;`}>Empty</p>
                )}
                {cards.map((card, i) => (
                    <div
                        key={card.instanceId ?? card.id ?? i}
                        css={zoneCardWrapStyle}
                        onClick={e => openMenu(card, e)}
                    >
                        <img css={zoneCardImgStyle} src={card.image_uri} alt={card.name} draggable={false} />
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {cardMenu && (
                    <ContextMenu
                        card={cardMenu.card}
                        x={cardMenu.x}
                        y={cardMenu.y}
                        items={menuItems}
                        onClose={() => setCardMenu(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ---- BoardMenu ----

function BoardMenu({ x, y, onClose, setPage, revealedState, setRevealedState, socket }) {
    const menuRef = useRef(null);

    useEffect(() => {
        function handleDown(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        }
        document.addEventListener('pointerdown', handleDown);
        return () => document.removeEventListener('pointerdown', handleDown);
    }, [onClose]);

    const style = {
        top: Math.min(y, window.innerHeight - 200),
        left: Math.min(x, window.innerWidth - 180),
    };

    const items = [
        { label: 'Untap All', action: () => { socket.emit('untap_all'); } },
        { label: 'Shuffle Library', action: () => { socket.emit('shuffle_library'); } },
        { label: 'Play with Top Revealed', action: () => {setRevealedState(!revealedState)} },
        { label: 'Restart Game', danger: true, action: () => { socket.emit('reset_game'); } },
        { label: 'Return to Home', danger: true, action: () => {setPage('home')} },
    ];

    return (
        <motion.div
            ref={menuRef}
            css={contextMenuStyle}
            style={style}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
        >
            {items.map(item => (
                <button
                    key={item.label}
                    css={item.danger ? menuItemDangerStyle : menuItemStyle}
                    onClick={() => { item.action?.(); onClose(); }}
                >
                    {item.label}
                </button>
            ))}
        </motion.div>
    );
}

// ---- Board ----

export default function Board({ socket, setPage }) {
    const [gameState, setGameState] = useState(null);
    const [battlefield, setBattlefield] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [boardMenu, setBoardMenu] = useState(null);
    const [zoneViewer, setZoneViewer] = useState(null); // 'library' | 'graveyard' | 'exile'
    const [revealedState, setRevealedState] = useState(false);

    useEffect(() => {
        socket.on('game_state_update', (state) => {
            setGameState(state);
            setBattlefield(prev => {
                // merge: keep local positions for existing cards, add new ones
                const prevMap = Object.fromEntries(prev.map(c => [c.instanceId, c]));
                return state.battlefield.map((c, i) => ({
                    ...c,
                    position: prevMap[c.instanceId]?.position ?? {
                        x: 140 + (i % 6) * 120,
                        y: 60 + Math.floor(i / 6) * 160,
                    },
                }));
            });
        });
        return () => socket.off('game_state_update');
    }, []);

    function handleTap(card) {
        const tapped = !card.tapped;
        setBattlefield(prev => prev.map(c => c.instanceId === card.instanceId ? { ...c, tapped } : c));
        socket.emit('tap_card', { instanceId: card.instanceId, tapped });
    }

    function move(instanceId, to) {
        socket.emit('move_card', { instanceId, to });
    }

    function handleContextMenu(card, x, y) {
        const items = [];
        if (!card.isToken) {
            items.push({ label: 'Move to Graveyard', action: () => move(card.instanceId, 'graveyard') });
            items.push({ label: 'Move to Exile', action: () => move(card.instanceId, 'exile') });
            items.push({ label: 'Return to Hand', action: () => move(card.instanceId, 'hand'), danger: true });
            items.push({ label: 'Put on top of Library', action: () => move(card.instanceId, 'library_top'), danger: true });
            items.push({ label: 'Put on bottom of Library', action: () => move(card.instanceId, 'library_bottom'), danger: true });
            if (card.isCommander) {
                items.push({ label: 'Return to Command Zone', action: () => move(card.instanceId, 'commandZone'), danger: true });
            }
        } else {
            items.push({ label: 'Remove Token', action: () => move(card.instanceId, 'remove'), danger: true });
        }
        setContextMenu({ card, x, y, items });
    }

    function handleZoneMove(card, to) {
        socket.emit('move_zone_card', { instanceId: card.instanceId ?? card.id, from: zoneViewer, to });
        if (to === 'battlefield' || to === 'hand') setZoneViewer(null);
    }

    const library = gameState?.library ?? [];
    const graveyard = gameState?.graveyard ?? [];
    const exile = gameState?.exile ?? [];
    const zoneViewerCards = zoneViewer === 'library' ? library : zoneViewer === 'graveyard' ? graveyard : zoneViewer === 'exile' ? exile : [];

    return (
        <div css={boardStyle}>
            <div css={sidebarStyle}>
                <div css={css`flex: 1; display: flex; align-items: center; justify-content: center;`}>
                    <button
                        css={hamburgerBtnStyle}
                        onClick={e => setBoardMenu({ x: e.clientX, y: e.clientY })}
                    >
                        ☰
                    </button>
                </div>
                <ZoneStack label="Library" cards={library} onClick={() => setZoneViewer('library')} revealedState={revealedState} />
                <ZoneStack label="Graveyard" cards={graveyard} onClick={() => setZoneViewer('graveyard')} revealedState={true} />
                <ZoneStack label="Exile" cards={exile} onClick={() => setZoneViewer('exile')} revealedState={true} />
                <div css={css`flex: 1;`} />
            </div>

            <div css={battlefieldStyle}>
                <AnimatePresence>
                    {battlefield.map(card => (
                        <BattlefieldCard
                            key={card.instanceId}
                            card={card}
                            onTap={handleTap}
                            onContextMenu={handleContextMenu}
                        />
                    ))}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {zoneViewer && (
                    <ZoneViewer
                        zoneName={zoneViewer}
                        cards={zoneViewerCards}
                        onMove={handleZoneMove}
                        onClose={() => setZoneViewer(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {contextMenu && (
                    <ContextMenu
                        card={contextMenu.card}
                        x={contextMenu.x}
                        y={contextMenu.y}
                        items={contextMenu.items}
                        onClose={() => setContextMenu(null)}
                    />
                )}
                {boardMenu && (
                    <BoardMenu
                        x={boardMenu.x}
                        y={boardMenu.y}
                        onClose={() => setBoardMenu(null)}
                        setPage={setPage}
                        revealedState={revealedState}
                        setRevealedState={setRevealedState}
                        socket={socket}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
