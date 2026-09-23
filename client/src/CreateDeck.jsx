import { useState } from 'react';
import { css } from '@emotion/react';
import { toDbCard } from './api/scryfall.js';
import { createDeck, insertCard } from './db.js';
import { colors, spacing, radius } from '@mtg/shared';
import Button from '@mtg/shared/src/Button.jsx';
import DropDownSearchBar from './DropDownSearchBar.jsx';
import { SearchScryfallCommander, SearchItemsComponent } from './SearchUtils.jsx';
import ModalPopup from './Modal.jsx';

const FORM_ID = 'create-deck-form';

// The modal body now handles padding and scrolling, so the form only lays out its fields
const formStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${spacing.md};
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
    border: none;
    width: 300px;
    border-radius: ${radius.sm};
    font-size: 0.9rem;
    &:focus { outline: none; border-color: ${colors.accent}; }
`;

const errorStyle = css`
    margin: 0;
    color: ${colors.error};
    font-size: 0.85rem;
`;

export default function CreateDeck({ onClose, isOpen }) {
  const [commanderSelection, setCommanderSelection] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset when closing so a stale commander isn't carried into the next deck
  function handleClose() {
    setCommanderSelection(null);
    setError('');
    onClose();
  }

  async function formSubmit(e) {
    e.preventDefault();
    const deckName = new FormData(e.currentTarget).get('deckName');

    if (!commanderSelection) {
      setError('Choose a commander from the search results.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const commanderCard = toDbCard(commanderSelection, 1, 'commander');
      const result = await createDeck(deckName, 'commander', commanderCard.color_identity);
      const deckId = result.lastInsertId;

      await insertCard(deckId, commanderCard);

      handleClose();
    } catch (err) {
      console.error('Failed to create deck:', err);
      setError('Something went wrong creating the deck. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalPopup
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      title="Create New Deck"
      actions={
        // Lives in the modal footer, outside the <form>, so it points at the form by id
        <Button type="submit" form={FORM_ID} size="sm" loading={submitting}>
          Create
        </Button>
      }
    >
      <form id={FORM_ID} css={formStyle} onSubmit={formSubmit}>
        <div css={fieldStyle}>
          <label css={labelStyle} htmlFor="deckName">Deck Name</label>
          <input
            css={inputStyle}
            type="text"
            id="deckName"
            name="deckName"
            placeholder="My Commander Deck"
            required
          />
        </div>

        <div css={fieldStyle}>
          <span css={labelStyle} aria-hidden="true">Commander</span>
          <DropDownSearchBar
            label="Commander"
            placeholder="Search for a commander"
            onSearch={SearchScryfallCommander}
            SearchItemComponent={SearchItemsComponent}
            onItemSelect={(data) => {
              setCommanderSelection(data);
              setError('');
            }}
            // Typing again invalidates the previous pick
            onInputChange={() => setCommanderSelection(null)}
          />
        </div>

        {error && <p role="alert" css={errorStyle}>{error}</p>}
      </form>
    </ModalPopup>
  );
}
