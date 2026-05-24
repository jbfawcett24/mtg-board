import { useState } from 'react';
import { css } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveCollection } from './api/scryfall.js';
import { createDeck, insertCard, insertToken } from './db.js';
import { colors, spacing, radius } from '@mtg/shared';

const regex = /^(\d+)\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\d+).*/;

function parseDecklist(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            const match = line.match(regex);
            if (!match) return null;
            return {
                quantity:  parseInt(match[1]),
                name:      match[2],
                setCode:   match[3],
                setNumber: match[4],
            };
        })
        .filter(Boolean);
}

async function saveDeck(deckName, format, cards, tokens, commanderScryfallId) {
    const result = await createDeck(deckName, format);
    const deckId = result.lastInsertId;

    for (const card of cards) {
        const board = card.scryfall_id === commanderScryfallId ? 'commander' : card.board;
        await insertCard(deckId, { ...card, board });
    }

    for (const token of tokens) {
        await insertToken(deckId, token);
    }
}

// ---- styles ----

const formStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${spacing.md};
    padding: ${spacing.lg};
    height: 100%;
    overflow-y: auto;
`;

const headingStyle = css`
    font-size: 1.2rem;
    font-weight: bold;
    color: ${colors.textPrimary};
    margin: 0;
`;

const fieldStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${spacing.xs};
`;

const labelStyle = css`
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${colors.textMuted};
`;

const inputStyle = css`
    padding: ${spacing.xs} ${spacing.sm};
    background: ${colors.bgRaised};
    border: 1px solid ${colors.border};
    border-radius: ${radius.sm};
    color: ${colors.textPrimary};
    font-size: 0.9rem;
    &:focus { outline: none; border-color: ${colors.accent}; }
`;

const selectStyle = css`
    ${inputStyle};
    cursor: pointer;
`;

const textareaStyle = css`
    ${inputStyle};
    resize: vertical;
    min-height: 180px;
    font-family: monospace;
    font-size: 0.8rem;
    line-height: 1.5;
`;

const footerStyle = css`
    display: flex;
    justify-content: flex-end;
    margin-top: auto;
    padding-top: ${spacing.sm};
`;

const submitBtnStyle = css`
    padding: ${spacing.sm} ${spacing.xl};
    background: ${colors.accent};
    color: ${colors.textPrimary};
    border: none;
    border-radius: ${radius.md};
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: bold;
    &:hover { background: ${colors.accentHover}; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const savingStyle = css`
    font-size: 0.85rem;
    color: ${colors.textMuted};
    align-self: center;
`;

// ---- commander picker ----

const pickerOverlayStyle = css`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
`;

const pickerPanelStyle = css`
    background: ${colors.bgSurface};
    border: 1px solid ${colors.border};
    border-radius: ${radius.lg};
    padding: ${spacing.lg};
    width: min(600px, 90vw);
    display: flex;
    flex-direction: column;
    gap: ${spacing.md};
`;

const pickerHeadingStyle = css`
    font-size: 1rem;
    font-weight: bold;
    color: ${colors.textPrimary};
    margin: 0;
`;

const pickerGridStyle = css`
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.md};
    max-height: 60vh;
    overflow-y: auto;
    padding: ${spacing.xs};
`;

const pickerCardStyle = css`
    width: 160px;
    flex-shrink: 0;
`;

const cardButtonStyle = (selected) => css`
    background: none;
    border: 2px solid ${selected ? colors.accent : colors.border};
    border-radius: ${radius.card};
    cursor: pointer;
    padding: 0;
    overflow: hidden;
    transition: border-color 0.15s;
    &:hover { border-color: ${colors.accent}; }
`;

const cardImgStyle = css`
    width: 100%;
    display: block;
`;

const confirmBtnStyle = css`
    padding: ${spacing.sm} ${spacing.lg};
    background: ${colors.accent};
    color: ${colors.textPrimary};
    border: none;
    border-radius: ${radius.md};
    cursor: pointer;
    font-size: 0.9rem;
    align-self: flex-end;
    &:disabled { opacity: 0.4; cursor: not-allowed; }
    &:hover:not(:disabled) { background: ${colors.accentHover}; }
`;

const overlayVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2, when: 'beforeChildren' } },
    exit:    { opacity: 0, transition: { duration: 0.15, when: 'afterChildren' } },
};

const contentVariants = {
    hidden:  { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.3, duration: 0.4 } },
    exit:    { opacity: 0, y: 16, transition: { duration: 0.15 } },
};

function CommanderPicker({ legendaries, onConfirm }) {
    const [selected, setSelected] = useState(null);

    return (
        <AnimatePresence>
            <motion.div
                css={pickerOverlayStyle}
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <motion.div css={pickerPanelStyle} variants={contentVariants}>
                    <p css={pickerHeadingStyle}>Select your Commander</p>
                    <div css={pickerGridStyle}>
                        {legendaries.map(card => (
                            <div key={card.scryfall_id} css={pickerCardStyle}>
                                <button
                                    type="button"
                                    css={cardButtonStyle(selected?.scryfall_id === card.scryfall_id)}
                                    onClick={() => setSelected(card)}
                                >
                                    <img css={cardImgStyle} src={card.image_uri} alt={card.name} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        css={confirmBtnStyle}
                        disabled={!selected}
                        onClick={() => onConfirm(selected)}
                    >
                        Confirm
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ---- main component ----

export default function CreateDeck({ onClose }) {
    const [legendaries, setLegendaries] = useState(null);
    const [pendingData, setPendingData] = useState(null);
    const [status, setStatus] = useState(null);

    async function formSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const deckName = formData.get('deckName');
        const format   = formData.get('format');
        const decklist = formData.get('decklist');
        const parsed   = parseDecklist(decklist);

        setStatus('Fetching cards from Scryfall…');
        const { cards, tokens, notFound } = await resolveCollection(parsed);

        if (notFound.length > 0) {
            console.warn('Cards not found:', notFound);
        }

        if (format === 'commander') {
            setStatus(null);
            const legendaryCards = cards.filter(c => c.is_legendary);
            setPendingData({ deckName, format, cards, tokens });
            setLegendaries(legendaryCards);
        } else {
            setStatus('Saving deck…');
            await saveDeck(deckName, format, cards, tokens, null);
            setStatus(null);
            onClose();
        }
    }

    async function handleCommanderConfirm(commander) {
        setStatus('Saving deck…');
        await saveDeck(
            pendingData.deckName,
            pendingData.format,
            pendingData.cards,
            pendingData.tokens,
            commander.scryfall_id
        );
        setStatus(null);
        setLegendaries(null);
        setPendingData(null);
        onClose();
    }

    return (
        <>
            <form css={formStyle} onSubmit={formSubmit}>
                <p css={headingStyle}>Import New Deck</p>

                <div css={fieldStyle}>
                    <label css={labelStyle} htmlFor="deckName">Deck Name</label>
                    <input css={inputStyle} type="text" id="deckName" name="deckName" placeholder="My Commander Deck" required />
                </div>

                <div css={fieldStyle}>
                    <label css={labelStyle} htmlFor="format">Format</label>
                    <select css={selectStyle} name="format" id="format">
                        <option value="commander">Commander</option>
                    </select>
                </div>

                <div css={fieldStyle}>
                    <label css={labelStyle} htmlFor="decklist">Decklist</label>
                    <textarea
                        css={textareaStyle}
                        id="decklist"
                        name="decklist"
                        placeholder={`Paste your decklist here\nExample: 4 Island (THB) 251`}
                        required
                    />
                </div>

                <div css={footerStyle}>
                    {status && <span css={savingStyle}>{status}</span>}
                    <button css={submitBtnStyle} type="submit" disabled={!!status}>Import</button>
                </div>
            </form>

            {legendaries && (
                <CommanderPicker
                    legendaries={legendaries}
                    onConfirm={handleCommanderConfirm}
                />
            )}
        </>
    );
}
