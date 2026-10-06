import { AnimatePresence, motion } from 'framer-motion';
import { css } from '@emotion/react';
import { Button, colors, spacing } from '@mtg/shared';
import Modal from './Modal';
import { deleteDeck } from './db.js';
import SpinningCard from './SpinningCard';
import { useState } from 'react'

export default function DeckSelectSidebar({
  selectedDeck,
  onClose,
  onDeckEdit,
  onCreateGame,
  onDeckDeleted,
}) {
  const isOpen = selectedDeck !== null;
  const [deleteModal, setDeleteModal] = useState(false)

  async function handleDelete() {
    await deleteDeck(selectedDeck.id);
    setDeleteModal(false);
    onDeckDeleted?.(selectedDeck.id);
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key={selectedDeck.id}
            aria-label="Selected deck"
            initial={{ width: 0 }}
            animate={{ width: 320 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            css={css`
            flex: 0 0 auto;
            width: 320px;
            align-self: stretch;
            min-height: 0;
            background: ${colors.bgSurface};
            box-shadow: -8px 0 24px rgba(0, 0, 0, 0.28);
            overflow: hidden;
          `}
          >
            <div
              css={css`
                box-sizing: border-box;
                width: 320px;
                min-width: 320px;
                height: 100%;
                display: flex;
                align-items: center;
                flex-direction: column;
                justify-content: flex-start;
                padding: ${spacing.xxl} ${spacing.lg};
              `}
            >
            <SpinningCard
              src={selectedDeck.commander_image}
              alt={selectedDeck.name}
            />
            <div
              css={css`
                width: 100%;
                flex: 1;
                min-height: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                color: ${colors.textPrimary};
                text-align: center;
              `}
            >
              <h3
                css={css`
                  font-size: 1.35rem;
                  line-height: 1.2;
                `}
              >
                {selectedDeck.name}
              </h3>
            </div>
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${spacing.xs};
                width: 100%;
                margin-top: ${spacing.lg};
              `}
            >
              <div
                css={css`
                  display: grid;
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                  gap: ${spacing.sm};
                  padding: ${spacing.sm} 0;
                `}
              >
                <Button
                  variant="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeckEdit(selectedDeck);
                  }}
                  spread
                  size="lg"
                >
                  Edit
                </Button>
                <Button
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteModal(true);
                  }}
                  danger
                  spread
                  size="lg"
                >
                  Delete
                </Button>
              </div>
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateGame(selectedDeck);
                }}
                size="xl"
                spread
              >
                Create Game
              </Button>
            </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <Modal
        onClose={() => setDeleteModal(false)}
        isOpen={deleteModal}
        title="Delete Deck?"
        alert
        actions={
          <>
            <Button
              variant="secondary"
              data-autofocus
              onClick={() => setDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button danger onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        This will permanently delete {selectedDeck?.name}. This cannot be undone.
      </Modal>
    </>
  );
}
