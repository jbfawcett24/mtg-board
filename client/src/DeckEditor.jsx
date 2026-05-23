import { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCardsForDeck, getTokensForDeck, getDb, deleteDeck } from './db.js';
import { pickAndUploadCardImage } from './api/uploadImage.js';
import { colors, spacing, radius } from '@mtg/shared';
import ImageSelector from './ImageSelector.jsx';

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
    align-items: center;
    gap: ${spacing.md};
    padding: ${spacing.sm} ${spacing.lg};
    background: ${colors.bgSurface};
    border-bottom: 1px solid ${colors.border};
    flex-shrink: 0;
`;

const backBtnStyle = css`
    padding: ${spacing.xs} ${spacing.md};
    background: none;
    border: 1px solid ${colors.border};
    color: ${colors.textMuted};
    border-radius: ${radius.md};
    cursor: pointer;
    font-size: 0.8rem;
    min-width: fit-content;
    &:hover { border-color: ${colors.accent}; color: ${colors.textPrimary}; }
`;

const titleStyle = css`
    font-size: 1.1rem;
    font-weight: bold;
    width: fit-content;
    color: ${colors.textPrimary};
`;

const deleteBtnStyle = css`
    padding: ${spacing.xs} ${spacing.md};
    background: none;
    border: 1px solid ${colors.error};
    color: ${colors.error};
    border-radius: ${radius.md};
    cursor: pointer;
    font-size: 0.8rem;
    min-width: fit-content;
    &:hover { background: ${colors.error}; color: ${colors.textPrimary}; }
`

const bodyStyle = css`
    flex: 1;
    display: flex;
    overflow: hidden;
`;

const listStyle = css`
    width: 320px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid ${colors.border};
`;

const listScrollStyle = css`
    flex: 1;
    overflow-y: auto;
    padding: ${spacing.xs} 0;
`;

const previewPaneStyle = css`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const previewImgStyle = css`
    width: 280px;
    border-radius: ${radius.card};
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
`;

const placeholderStyle = css`
    color: ${colors.textFaint};
    font-size: 0.9rem;
`;

const rowBaseStyle = css`
    display: flex;
    align-items: center;
    padding: ${spacing.xs} ${spacing.sm};
    gap: ${spacing.xs};
    cursor: default;
`;

const rowNameStyle = css`
    font-size: 0.9rem;
    color: ${colors.textPrimary};
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const boardSelectStyle = css`
    background: ${colors.bgRaised};
    border: 1px solid ${colors.border};
    color: ${colors.textMuted};
    border-radius: ${radius.sm};
    font-size: 0.7rem;
    padding: 2px ${spacing.xs};
    cursor: pointer;
    &:focus { outline: none; border-color: ${colors.accent}; }
`;

const rowBtnStyle = (visible) => css`
    opacity: ${visible ? 1 : 0};
    padding: 2px ${spacing.sm};
    background: none;
    border: 1px solid ${colors.border};
    color: ${colors.textMuted};
    border-radius: ${radius.sm};
    cursor: pointer;
    font-size: 0.75rem;
    white-space: nowrap;
    transition: opacity 0.1s;
    flex-shrink: 0;
    &:hover { border-color: ${colors.accent}; color: ${colors.textPrimary}; }
`;

const addRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${spacing.xs};
    padding: ${spacing.sm};
    border-top: 1px solid ${colors.border};
    flex-shrink: 0;
`;

const nameInputStyle = css`
    flex: 1;
    padding: ${spacing.xs} ${spacing.sm};
    background: ${colors.bgRaised};
    border: 1px solid ${colors.border};
    border-radius: ${radius.sm};
    color: ${colors.textPrimary};
    font-size: 0.85rem;
    min-width: 0;
    &:focus { outline: none; border-color: ${colors.accent}; }
`;

const addBtnStyle = css`
    padding: ${spacing.xs} ${spacing.md};
    background: none;
    border: 1px solid ${colors.accent};
    color: ${colors.accent};
    border-radius: ${radius.md};
    cursor: pointer;
    font-size: 0.85rem;
    flex-shrink: 0;
    &:hover { background: ${colors.accent}; color: ${colors.textPrimary}; }
`;

const menuWrapStyle = css`
    position: relative;
`;

const dotsStyle = (visible) => css`
    opacity: ${visible ? 1 : 0};
    background: none;
    border: 1px solid ${colors.border};
    color: ${colors.textMuted};
    border-radius: ${radius.sm};
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0 ${spacing.xs};
    line-height: 1.4;
    transition: opacity 0.1s;
    flex-shrink: 0;
    &:hover { border-color: ${colors.accent}; color: ${colors.textPrimary}; }
`;

const dropdownStyle = css`
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    background: ${colors.bgRaised};
    border: 1px solid ${colors.border};
    border-radius: ${radius.md};
    min-width: 140px;
    z-index: 100;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
`;

const menuItemStyle = css`
    display: block;
    width: 100%;
    text-align: left;
    padding: ${spacing.sm} ${spacing.md};
    background: none;
    border: none;
    color: ${colors.textPrimary};
    font-size: 0.85rem;
    cursor: pointer;
    &:hover { background: ${colors.bgSurface}; }
`;

const menuItemDangerStyle = css`
    ${menuItemStyle};
    color: ${colors.error};
`;

const nameEditInputStyle = css`
    flex: 1;
    background: ${colors.bgRaised};
    border: 1px solid ${colors.accent};
    border-radius: ${radius.sm};
    color: ${colors.textPrimary};
    font-size: 0.9rem;
    padding: 2px ${spacing.xs};
    min-width: 0;
    &:focus { outline: none; }
`;

function TokenRow({ token, onEditImage, onRename, onRemove }) {
    const [hovered, setHovered] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(token.name);

    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e) {
            if (!e.target.closest('[data-menu]')) setMenuOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    function commitRename() {
        const trimmed = nameValue.trim();
        if (trimmed && trimmed !== token.name) onRename(token, trimmed);
        setEditingName(false);
    }

    const meta = [token.power != null && token.toughness != null ? `${token.power}/${token.toughness}` : null, token.colors || null].filter(Boolean).join(' · ');

    return (
        <div
            css={rowBaseStyle}
            style={{ background: hovered ? colors.bgSurface : 'transparent' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {editingName ? (
                <input
                    css={nameEditInputStyle}
                    autoFocus
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingName(false); }}
                />
            ) : (
                <span css={rowNameStyle}>
                    {token.name}
                </span>
            )}
            <div css={menuWrapStyle} data-menu>
                <button
                    css={dotsStyle(hovered || menuOpen)}
                    onClick={() => setMenuOpen(o => !o)}
                >
                    ···
                </button>
                {menuOpen && (
                    <div css={dropdownStyle} data-menu>
                        <button css={menuItemStyle} onClick={() => { setEditingName(true); setMenuOpen(false); }}>
                            Edit name
                        </button>
                        <button css={menuItemStyle} onClick={() => { onEditImage(token); setMenuOpen(false); }}>
                            Edit image
                        </button>
                        <button css={menuItemDangerStyle} onClick={() => { onRemove(token); setMenuOpen(false); }}>
                            Remove
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function CardRow({ card, onEditImage, onBoardChange, onRemove, onRename, onAddOne, onRemoveOne }) {
    const [hovered, setHovered] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(card.name);
    const menuRef = useState(null);

    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e) {
            if (!e.target.closest('[data-menu]')) setMenuOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    function commitRename() {
        const trimmed = nameValue.trim();
        if (trimmed && trimmed !== card.name) onRename(card, trimmed);
        setEditingName(false);
    }

    return (
        <div
            css={rowBaseStyle}
            style={{ background: hovered ? colors.bgSurface : 'transparent' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {editingName ? (
                <input
                    css={nameEditInputStyle}
                    autoFocus
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingName(false); }}
                />
            ) : (
                <span css={rowNameStyle}>{card.quantity} - {card.name}</span>
            )}
            <select
                css={boardSelectStyle}
                value={card.board}
                onChange={e => onBoardChange(card, e.target.value)}
                onClick={e => e.stopPropagation()}
            >
                <option value="main">Main</option>
                <option value="commander">Commander</option>
                <option value="sideboard">Sideboard</option>
            </select>
            <div css={menuWrapStyle} data-menu>
                <button
                    css={dotsStyle(hovered || menuOpen)}
                    onClick={() => setMenuOpen(o => !o)}
                >
                    ···
                </button>
                {menuOpen && (
                    <div css={dropdownStyle} data-menu>
                        <button css={menuItemStyle} onClick={() => { onAddOne(card); setMenuOpen(false); }}>
                            + Add one
                        </button>
                        <button css={menuItemStyle} onClick={() => { setEditingName(true); setMenuOpen(false); }}>
                            Edit name
                        </button>
                        <button css={menuItemStyle} onClick={() => { onEditImage(card); setMenuOpen(false); }}>
                            Edit image
                        </button>
                        <button css={menuItemDangerStyle} onClick={() => { onRemoveOne(card); setMenuOpen(false); }}>
                            Remove one
                        </button>
                        <button css={menuItemDangerStyle} onClick={() => { onRemove(card); setMenuOpen(false); }}>
                            Remove
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DeckEditor({ deck, onBack }) {
    const [cards, setCards] = useState([]);
    const [tokens, setTokens] = useState([]);
    const [hoveredId, setHoveredId] = useState(null);
    const [newCardName, setNewCardName] = useState('');
    const [newTokenName, setNewTokenName] = useState('');
    const [deckName, setDeckName] = useState(deck.name);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [imageModalCard, setImageModalCard] = useState(false);

    useEffect(() => {
        getCardsForDeck(deck.id).then(setCards);
        getTokensForDeck(deck.id).then(setTokens);
    }, [deck.id]);

    const previewCard = cards.find(c => `card:${c.id}` === hoveredId) ?? tokens.find(t => `token:${t.id}` === hoveredId) ?? null;

    async function handleEditImage(card) {
        setImageModalCard(card);
    }

    async function handleImageSelect(printing) {
        const card = imageModalCard;
        const image_uri = printing.image_uris?.normal ?? printing.card_faces?.[0]?.image_uris?.normal ?? null;
        const image_uri_back = printing.card_faces?.[1]?.image_uris?.normal ?? null;
        const db = await getDb();
        await db.execute(
            'UPDATE deck_cards SET image_uri = $1, image_uri_back = $2 WHERE id = $3',
            [image_uri, image_uri_back, card.id]
        );
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, image_uri, image_uri_back } : c));
        setImageModalCard(false);
    }

    async function handleBoardChange(card, newBoard) {
        const db = await getDb();
        await db.execute('UPDATE deck_cards SET board = $1 WHERE id = $2', [newBoard, card.id]);
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, board: newBoard } : c));
    }

    async function handleRemove(card) {
        const db = await getDb();
        await db.execute('DELETE FROM deck_cards WHERE id = $1', [card.id]);
        setCards(prev => prev.filter(c => c.id !== card.id));
    }

    async function handleRename(card, name) {
        const db = await getDb();
        await db.execute('UPDATE deck_cards SET name = $1 WHERE id = $2', [name, card.id]);
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, name } : c));
    }

    async function handleAddOne(card) {
        const db = await getDb();
        const newQty = card.quantity + 1;
        await db.execute('UPDATE deck_cards SET quantity = $1 WHERE id = $2', [newQty, card.id]);
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, quantity: newQty } : c));
    }

    async function handleRemoveOne(card) {
        const db = await getDb();
        if (card.quantity === 1) {
            await db.execute('DELETE FROM deck_cards WHERE id = $1', [card.id]);
            setCards(prev => prev.filter(c => c.id !== card.id));
        } else {
            const newQty = card.quantity - 1;
            await db.execute('UPDATE deck_cards SET quantity = $1 WHERE id = $2', [newQty, card.id]);
            setCards(prev => prev.map(c => c.id === card.id ? { ...c, quantity: newQty } : c));
        }
    }

    async function handleEditTokenImage(token) {
        const url = await pickAndUploadCardImage();
        if (!url) return;
        const db = await getDb();
        await db.execute('UPDATE tokens SET image_uri = $1 WHERE id = $2', [url, token.id]);
        setTokens(prev => prev.map(t => t.id === token.id ? { ...t, image_uri: url } : t));
    }

    async function handleRenameToken(token, name) {
        const db = await getDb();
        await db.execute('UPDATE tokens SET name = $1 WHERE id = $2', [name, token.id]);
        setTokens(prev => prev.map(t => t.id === token.id ? { ...t, name } : t));
    }

    async function handleRemoveToken(token) {
        const db = await getDb();
        await db.execute('DELETE FROM tokens WHERE id = $1', [token.id]);
        setTokens(prev => prev.filter(t => t.id !== token.id));
    }

    async function handleDeleteDeck() {
        await deleteDeck(deck.id);
        onBack();
    }

    async function handleAddToken() {
        const name = newTokenName.trim();
        if (!name) return;
        const url = await pickAndUploadCardImage();
        if (!url) return;
        const db = await getDb();
        const result = await db.execute(
            'INSERT INTO tokens (deck_id, name, image_uri) VALUES ($1, $2, $3)',
            [deck.id, name, url]
        );
        setTokens(prev => [...prev, { id: result.lastInsertId, deck_id: deck.id, scryfall_id: null, name, image_uri: url, power: null, toughness: null, colors: null }]);
        setNewTokenName('');
    }

    async function handleAddCard() {
        const name = newCardName.trim();
        if (!name) return;
        const url = await pickAndUploadCardImage();
        if (!url) return;

        const db = await getDb();
        const result = await db.execute(
            `INSERT INTO deck_cards (deck_id, scryfall_id, name, quantity, image_uri, board, is_legendary)
             VALUES ($1, $2, $3, 1, $4, 'main', 0)`,
            [deck.id, null, name, url]
        );
        setCards(prev => [...prev, {
            id: result.lastInsertId,
            deck_id: deck.id,
            scryfall_id: null,
            name,
            quantity: 1,
            image_uri: url,
            image_uri_back: null,
            board: 'main',
            is_legendary: 0,
        }]);
        setNewCardName('');
    }

    return (
        <>
        <div css={layoutStyle}>
            <header css={headerStyle}>
                <button css={backBtnStyle} onClick={onBack}>← Back</button>
                <input
                    css={css`
                        ${titleStyle};
                        background: none;
                        border: none;
                        border-bottom: 1px solid transparent;
                        outline: none;
                        width: 100%;
                        &:hover { border-bottom-color: ${colors.border}; }
                        &:focus { border-bottom-color: ${colors.accent}; }
                    `}
                    value={deckName}
                    onChange={e => setDeckName(e.target.value)}
                    onBlur={async () => {
                        const name = deckName.trim();
                        if (!name || name === deck.name) return;
                        const db = await getDb();
                        await db.execute('UPDATE decks SET name = $1 WHERE id = $2', [name, deck.id]);
                        deck.name = name;
                    }}
                />
                {confirmingDelete ? (
                    <>
                        <span css={css`font-size:0.8rem; color:${colors.textMuted}; white-space:nowrap;`}>Delete "{deckName}"?</span>
                        <button css={deleteBtnStyle} onClick={handleDeleteDeck}>Yes, delete</button>
                        <button css={backBtnStyle} onClick={() => setConfirmingDelete(false)}>Cancel</button>
                    </>
                ) : (
                    <button css={deleteBtnStyle} onClick={() => setConfirmingDelete(true)}>Delete</button>
                )}
            </header>

            <div css={bodyStyle}>
                <div css={listStyle}>
                    <div css={listScrollStyle}>
                        {['commander', 'main', 'sideboard'].map(board => {
                            const section = [...cards]
                                .filter(c => c.board === board)
                                .sort((a, b) => a.name.localeCompare(b.name));
                            if (section.length === 0) return null;
                            return (
                                <div key={board}>
                                    <p css={css`
                                        font-size: 0.7rem;
                                        text-transform: uppercase;
                                        letter-spacing: 0.08em;
                                        color: ${colors.textMuted};
                                        padding: ${spacing.sm} ${spacing.sm} ${spacing.xs};
                                        border-bottom: 1px solid ${colors.border};
                                        margin-bottom: ${spacing.xs};
                                    `}>
                                        {board} ({section.reduce((sum, c) => sum + c.quantity, 0)})
                                    </p>
                                    {section.map(card => (
                                        <div
                                            key={card.id}
                                            onMouseEnter={() => setHoveredId(`card:${card.id}`)}
                                            onMouseLeave={() => setHoveredId(null)}
                                        >
                                            <CardRow
                                                card={card}
                                                onEditImage={handleEditImage}
                                                onBoardChange={handleBoardChange}
                                                onRemove={handleRemove}
                                                onRename={handleRename}
                                                onAddOne={handleAddOne}
                                                onRemoveOne={handleRemoveOne}
                                            />
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                        <div>
                            <p css={css`
                                font-size: 0.7rem;
                                text-transform: uppercase;
                                letter-spacing: 0.08em;
                                color: ${colors.textMuted};
                                padding: ${spacing.sm} ${spacing.sm} ${spacing.xs};
                                border-bottom: 1px solid ${colors.border};
                                margin-bottom: ${spacing.xs};
                            `}>
                                tokens ({tokens.length})
                            </p>
                            {[...tokens].sort((a, b) => a.name.localeCompare(b.name)).map(token => (
                                <div
                                    key={token.id}
                                    onMouseEnter={() => setHoveredId(`token:${token.id}`)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    <TokenRow
                                        token={token}
                                        onEditImage={handleEditTokenImage}
                                        onRename={handleRenameToken}
                                        onRemove={handleRemoveToken}
                                    />
                                </div>
                            ))}
                            <div css={addRowStyle}>
                                <input
                                    css={nameInputStyle}
                                    type="text"
                                    placeholder="New token name…"
                                    value={newTokenName}
                                    onChange={e => setNewTokenName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddToken()}
                                />
                                <button css={addBtnStyle} onClick={handleAddToken}>+ Add</button>
                            </div>
                        </div>
                    </div>

                    <div css={addRowStyle}>
                        <input
                            css={nameInputStyle}
                            type="text"
                            placeholder="New card name…"
                            value={newCardName}
                            onChange={e => setNewCardName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddCard()}
                        />
                        <button css={addBtnStyle} onClick={handleAddCard}>+ Add</button>
                    </div>
                </div>

                <div css={previewPaneStyle}>
                    <AnimatePresence mode="wait">
                        {previewCard ? (
                            <motion.img
                                key={hoveredId}
                                css={previewImgStyle}
                                src={previewCard.image_uri}
                                alt={previewCard.name}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                            />
                        ) : (
                            <motion.p
                                key="placeholder"
                                css={placeholderStyle}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                Hover a card to preview
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
        {imageModalCard && <ImageSelector card={imageModalCard} onClose={() => setImageModalCard(false)} onSelect={handleImageSelect} />}
        </>
    );
}
