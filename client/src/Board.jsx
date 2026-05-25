import React, { useEffect, useRef, useState } from 'react';
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
    overflow: visible;
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

const counterStyle = css`
    position: absolute;
    z-index: 1;
    background: #00000093;
    color: ${colors.textPrimary};
    border-radius: ${radius.sm};
    padding: 2px 6px;
`

const counterModalOverlayStyle = css`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 700;
`;

const counterModalBoxStyle = css`
    background: ${colors.bgRaised};
    border: 1px solid ${colors.border};
    border-radius: ${radius.md};
    padding: ${spacing.lg};
    min-width: 280px;
    display: flex;
    flex-direction: column;
    gap: ${spacing.md};
`;

const counterRowStyle = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${spacing.md};
`;

const counterStepBtnStyle = css`
    background: ${colors.bgSurface};
    border: 1px solid ${colors.border};
    color: ${colors.textPrimary};
    border-radius: ${radius.sm};
    width: 32px;
    height: 32px;
    font-size: 1.2rem;
    cursor: pointer;
    &:hover { border-color: ${colors.accent}; }
`;

const counterAddBtnStyle = css`
    background: ${colors.accent};
    border: none;
    color: white;
    border-radius: ${radius.sm};
    padding: ${spacing.xs} ${spacing.md};
    cursor: pointer;
    font-size: 0.9rem;
    align-self: flex-end;
    &:hover { background: ${colors.accentHover}; }
`;

// ---- CounterModal ----

function CounterModal({ card, counters, onAdd, onClose }) {
    const [oneOne, setOneOne] = useState(0);
    const [generic, setGeneric] = useState(0);

    return (
        <motion.div
            css={counterModalOverlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
        >
            <motion.div
                css={counterModalBoxStyle}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.2 }}
                onClick={e => e.stopPropagation()}
            >
                <span css={css`color: ${colors.textPrimary}; font-weight: bold;`}>{card.name}</span>

                <div css={counterRowStyle}>
                    <span css={css`color: ${colors.textMuted}; font-size: 0.9rem;`}>+1/+1 counters ({counters.oneOne})</span>
                    <div css={css`display: flex; align-items: center; gap: ${spacing.sm};`}>
                        <button css={counterStepBtnStyle} onClick={() => setOneOne(v => Math.max(-(counters.oneOne), v - 1))}>−</button>
                        <span css={css`color: ${colors.textPrimary}; min-width: 24px; text-align: center;`}>{oneOne > 0 ? `+${oneOne}` : oneOne}</span>
                        <button css={counterStepBtnStyle} onClick={() => setOneOne(v => v + 1)}>+</button>
                    </div>
                </div>

                <div css={counterRowStyle}>
                    <span css={css`color: ${colors.textMuted}; font-size: 0.9rem;`}>Generic counters ({counters.generic})</span>
                    <div css={css`display: flex; align-items: center; gap: ${spacing.sm};`}>
                        <button css={counterStepBtnStyle} onClick={() => setGeneric(v => Math.max(-(counters.generic), v - 1))}>−</button>
                        <span css={css`color: ${colors.textPrimary}; min-width: 24px; text-align: center;`}>{generic > 0 ? `+${generic}` : generic}</span>
                        <button css={counterStepBtnStyle} onClick={() => setGeneric(v => v + 1)}>+</button>
                    </div>
                </div>

                <button css={counterAddBtnStyle} onClick={() => { onAdd(card.instanceId, oneOne, generic); onClose(); }}>
                    Apply
                </button>
            </motion.div>
        </motion.div>
    );
}

// ---- BattlefieldCard ----

function BattlefieldCard({ card, onTap, onContextMenu, getDropZone, onMove, battlefieldRef, zIndex, onFocus, oneOneCounters, genericCounters }) {
    const timerRef = useRef(null);
    const didLongPress = useRef(false);
    const dragRef = useRef(null);
    const [pos, setPos] = useState(card.position ?? { x: 100, y: 100 });
    const [dragging, setDragging] = useState(false);

    function onPointerDown(e) {
        e.preventDefault();
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
            setDragging(true);
            onFocus(card.instanceId);
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
        const wasDragged = dragRef.current?.moved;
        dragRef.current = null;
        setDragging(false);

        if (wasDragged) {
            const zone = getDropZone(e.clientX, e.clientY);
            if (zone) {
                onMove(card.instanceId, zone);
                return;
            }
        }

        const GRID = 20;
        const bf = battlefieldRef.current;
        const maxX = bf ? bf.clientWidth - CARD_W : Infinity;
        const maxY = bf ? bf.clientHeight - CARD_H : Infinity;
        setPos(prev => ({
            x: Math.min(maxX, Math.max(0, Math.round(prev.x / GRID) * GRID)),
            y: Math.min(maxY, Math.max(0, Math.round(prev.y / GRID) * GRID)),
        }));
    }

    function onPointerCancel() {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        dragRef.current = null;
    }

    return (
        <motion.div
            initial={{ opacity: 0.9, scale: 1.2 }}
            animate={{ opacity: 1, scale: dragging ? 1.05 : 1, rotate: card.tapped ? 90 : 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.3 }}
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: CARD_W,
                height: CARD_H,
                cursor: dragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                zIndex: dragging ? zIndex + 100 : zIndex,
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
            {oneOneCounters > 0 && <span css={[counterStyle, { bottom: spacing.xs, left: spacing.xs }]}>+{oneOneCounters}/+{oneOneCounters}</span>}
            {genericCounters > 0 && <span css={[counterStyle, { bottom: '50%', right: '50%', transform: 'translate(50%, 50%)' }]}>{genericCounters}</span>}
        </motion.div>
    );
}

// ---- CardViewer ----

const cardViewerOverlayStyle = css`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 600;
    cursor: pointer;
`;

const cardViewerImgStyle = css`
    max-height: 85vh;
    max-width: 90vw;
    width: auto;
    border-radius: 16px;
    box-shadow: 0 8px 48px rgba(0,0,0,0.8);
    pointer-events: none;
`;

function CardViewer({ card, onClose }) {
    return (
        <motion.div
            css={cardViewerOverlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
        >
            <motion.img
                css={cardViewerImgStyle}
                src={card.image_uri}
                alt={card.name}
                draggable={false}
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.85 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.25 }}
            />
        </motion.div>
    );
}

// ---- ZoneStack ----

const ZoneStack = React.forwardRef(function ZoneStack({ label, cards, onClick, revealedState, zoneName, onDragStart, onDragMove, onDragEnd }, ref) {
    const top = cards[cards.length - 1];
    const dragRef = useRef(null);

    function onPointerDown(e) {
        if (!top) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { moved: false, startX: e.clientX, startY: e.clientY };
    }

    function onPointerMove(e) {
        if (!dragRef.current) return;
        const dx = Math.abs(e.clientX - dragRef.current.startX);
        const dy = Math.abs(e.clientY - dragRef.current.startY);
        if (!dragRef.current.moved && (dx > 6 || dy > 6)) {
            dragRef.current.moved = true;
            onDragStart(top, zoneName, e.clientX, e.clientY);
        }
        if (dragRef.current.moved) {
            onDragMove(e.clientX, e.clientY);
        }
    }

    function onPointerUp(e) {
        if (!dragRef.current) return;
        const wasDragged = dragRef.current.moved;
        dragRef.current = null;
        if (wasDragged) {
            onDragEnd(top, zoneName, e.clientX, e.clientY);
        } else {
            onClick();
        }
    }

    function onPointerCancel() {
        if (dragRef.current?.moved) onDragEnd(null, zoneName, 0, 0);
        dragRef.current = null;
    }

    return (
        <div
            ref={ref}
            css={zoneStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
        >
            {top && revealedState ? (
                <img css={zoneImgStyle} src={top.image_uri} alt={top.name} draggable={false} />
            ) : (
                <div css={zoneEmptyStyle} />
            )}
            {cards.length > 0 && <span css={zoneCountStyle}>{cards.length}</span>}
            <span css={zoneLabelStyle}>{label}</span>
        </div>
    );
});

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
        transformOrigin: 'top left',
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

function ZoneViewer({ zoneName, cards, onMove, onClose, socket }) {
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
                <div css={css`display: flex; gap: ${spacing.sm};`}>
                    {(zoneName === 'graveyard' || zoneName === 'exile') && (
                        <button
                            css={zoneViewerCloseStyle}
                            onClick={() => { socket.emit('shuffle_zone_into_library', { zone: zoneName }); onClose(); }}
                        >
                            Shuffle into Library
                        </button>
                    )}
                    <button css={zoneViewerCloseStyle} onClick={onClose}>Close</button>
                </div>
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
    const [layers, setLayers] = useState({});
    const layerCounter = useRef(0);
    const [contextMenu, setContextMenu] = useState(null);
    const [cardViewer, setCardViewer] = useState(null);
    const [boardMenu, setBoardMenu] = useState(null);
    const [zoneViewer, setZoneViewer] = useState(null);
    const [revealedState, setRevealedState] = useState(false);
    const [cardCounters, setCardCounters] = useState({}); // { [instanceId]: { oneOne, generic } }
    const [counterModal, setCounterModal] = useState(null); // card

    useEffect(() => {
        socket.on('game_state_update', (state) => {
            setGameState(state);
            if (!state) { setBattlefield([]); return; }
            setBattlefield(prev => {
                const prevMap = Object.fromEntries(prev.map(c => [c.instanceId, c]));
                return state.battlefield.map((c, i) => ({
                    ...c,
                    position: prevMap[c.instanceId]?.position ?? (c.position?.x || c.position?.y ? c.position : {
                        x: 20,
                        y: 20,
                    }),
                }));
            });
            setLayers(prev => {
                const next = { ...prev };
                for (const c of state.battlefield) {
                    if (!(c.instanceId in next)) {
                        next[c.instanceId] = ++layerCounter.current;
                    }
                }
                return next;
            });
        });
        return () => socket.off('game_state_update');
    }, []);

    function focusCard(instanceId) {
        setLayers(prev => ({ ...prev, [instanceId]: ++layerCounter.current }));
    }

    function handleTap(card) {
        const tapped = !card.tapped;
        setBattlefield(prev => prev.map(c => c.instanceId === card.instanceId ? { ...c, tapped } : c));
        socket.emit('tap_card', { instanceId: card.instanceId, tapped });
    }

    function move(instanceId, to) {
        socket.emit('move_card', { instanceId, to });
    }

    function handleAddCounters(instanceId, oneOne, generic) {
        setCardCounters(prev => {
            const cur = prev[instanceId] ?? { oneOne: 0, generic: 0 };
            return { ...prev, [instanceId]: { oneOne: Math.max(0, cur.oneOne + oneOne), generic: Math.max(0, cur.generic + generic) } };
        });
    }

    function handleContextMenu(card, x, y) {
        const items = [];
        items.push({ label: 'View Card', action: () => setCardViewer(card) });
        items.push({ label: 'Add/Remove Counters', action: () => setCounterModal(card) });
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

    const battlefieldRef = useRef(null);
    const [zoneDrag, setZoneDrag] = useState(null); // { card, x, y }

    function handleZoneDragStart(card, fromZone, clientX, clientY) {
        setZoneDrag({ card, fromZone, x: clientX, y: clientY });
    }

    function handleZoneDragMove(clientX, clientY) {
        setZoneDrag(prev => prev ? { ...prev, x: clientX, y: clientY } : null);
    }

    function handleZoneDragEnd(card, fromZone, clientX, clientY) {
        setZoneDrag(null);
        if (!card) return;
        const bfRect = battlefieldRef.current?.getBoundingClientRect();
        const x = bfRect ? Math.max(0, clientX - bfRect.left - CARD_W / 2) : clientX;
        const y = bfRect ? Math.max(0, clientY - bfRect.top - CARD_H / 2) : clientY;
        const GRID = 20;
        socket.emit('move_zone_card', {
            instanceId: card.instanceId ?? card.id,
            from: fromZone,
            to: 'battlefield',
            position: { x: Math.round(x / GRID) * GRID, y: Math.round(y / GRID) * GRID },
        });
    }

    const libraryRef = useRef(null);
    const graveyardRef = useRef(null);
    const exileRef = useRef(null);

    function getDropZone(clientX, clientY) {
        const zones = [
            { ref: libraryRef, name: 'library_top' },
            { ref: graveyardRef, name: 'graveyard' },
            { ref: exileRef, name: 'exile' },
        ];
        for (const { ref, name } of zones) {
            if (!ref.current) continue;
            const rect = ref.current.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                return name;
            }
        }
        return null;
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
                <ZoneStack ref={libraryRef} label="Library" cards={library} onClick={() => setZoneViewer('library')} revealedState={revealedState} zoneName="library" onDragStart={handleZoneDragStart} onDragMove={handleZoneDragMove} onDragEnd={handleZoneDragEnd} />
                <ZoneStack ref={graveyardRef} label="Graveyard" cards={graveyard} onClick={() => setZoneViewer('graveyard')} revealedState={true} zoneName="graveyard" onDragStart={handleZoneDragStart} onDragMove={handleZoneDragMove} onDragEnd={handleZoneDragEnd} />
                <ZoneStack ref={exileRef} label="Exile" cards={exile} onClick={() => setZoneViewer('exile')} revealedState={true} zoneName="exile" onDragStart={handleZoneDragStart} onDragMove={handleZoneDragMove} onDragEnd={handleZoneDragEnd} />
                <div css={css`flex: 1;`} />
            </div>

            <div ref={battlefieldRef} css={battlefieldStyle}>
                <AnimatePresence>
                    {battlefield.map(card => (
                        <BattlefieldCard
                            key={card.instanceId}
                            card={card}
                            onTap={handleTap}
                            onContextMenu={handleContextMenu}
                            getDropZone={getDropZone}
                            onMove={move}
                            battlefieldRef={battlefieldRef}
                            zIndex={layers[card.instanceId] ?? 1}
                            onFocus={focusCard}
                            oneOneCounters={cardCounters[card.instanceId]?.oneOne ?? 0}
                            genericCounters={cardCounters[card.instanceId]?.generic ?? 0}
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
                        socket={socket}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {cardViewer && (
                    <CardViewer
                        card={cardViewer}
                        onClose={() => setCardViewer(null)}
                    />
                )}
                {counterModal && (
                    <CounterModal
                        card={counterModal}
                        counters={cardCounters[counterModal.instanceId] ?? { oneOne: 0, generic: 0 }}
                        onAdd={handleAddCounters}
                        onClose={() => setCounterModal(null)}
                    />
                )}
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

            {zoneDrag && (
                <img
                    src={zoneDrag.card.image_uri}
                    alt={zoneDrag.card.name}
                    draggable={false}
                    style={{
                        position: 'fixed',
                        left: zoneDrag.x - CARD_W / 2,
                        top: zoneDrag.y - CARD_H / 2,
                        width: CARD_W,
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                        pointerEvents: 'none',
                        opacity: 0.9,
                        zIndex: 1000,
                        scale: 1.2
                    }}
                />
            )}
        </div>
    );
}
