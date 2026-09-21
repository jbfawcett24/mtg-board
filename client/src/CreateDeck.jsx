import { useState } from 'react';
import { css } from '@emotion/react';
import { toDbCard } from './api/scryfall.js';
import { createDeck, insertCard } from './db.js';
import { colors, spacing, radius } from '@mtg/shared';
import DropDownSearchBar from './DropDownSearchBar.jsx';
import { SearchScryfallCommander, SearchItemsComponent } from './SearchUtils.jsx';

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

export default function CreateDeck({ onClose }) {
  const [commanderSelection, setCommanderSelection] = useState(null);

  async function formSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const deckName = formData.get('deckName');

    const result = await createDeck(deckName);
    const deckId = result.lastInsertId;

    const commanderCard = toDbCard(commanderSelection, 1, "commander");
    await insertCard(deckId, commanderCard);

    onClose();
  }

  return (
    <>
      <form css={formStyle} onSubmit={formSubmit}>
        <p css={headingStyle}>Create New Deck</p>

        <div css={fieldStyle}>
          <label css={labelStyle} htmlFor="deckName">Deck Name</label>
          <input css={inputStyle} type="text" id="deckName" name="deckName" placeholder="My Commander Deck" required />
        </div>
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          `}
        >
          <h3>Commander: </h3>
          <DropDownSearchBar
            onSearch={SearchScryfallCommander}
            SearchItemComponent={SearchItemsComponent}
            onItemSelect={(data) => setCommanderSelection(data)}
          />
        </div>
        <div css={footerStyle}>
          <button css={submitBtnStyle} type="submit" disabled={!!status}>Import</button>
        </div>
      </form>
    </>
  );
}
