import { css } from "@emotion/react"
import { Card, colors, spacing } from "@mtg/shared"
import { Upload, ChartSpline, PlayingCardsFan } from "lucide-react"
import Button from "@mtg/shared/src/Button.jsx"
import { useEffect, useState } from "react"
import Modal from "./Modal.jsx"
import { refreshDeckTokens, resolveCollection, stringToIdentifiers } from "./api/scryfall.js"
import { getTokensForDeck, insertCard, insertToken } from "./db.js"


export default function DeckEditorFooter({ deckId, totalCards, onCardsImported }) {
  const [importCardsModal, setImportCardsModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importCardsString, setImportCardsString] = useState("")

  const [showTokens, setShowTokens] = useState(false)
  const [tokens, setTokens] = useState([])
  const [tokensLoading, setTokensLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!showTokens) return

    let cancelled = false
    setTokensLoading(true)
    getTokensForDeck(deckId)
      .then(deckTokens => {
        if (!cancelled) setTokens(deckTokens)
      })
      .catch(error => {
        console.error("Failed to load deck tokens:", error)
        if (!cancelled) setTokens([])
      })
      .finally(() => {
        if (!cancelled) setTokensLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [deckId, showTokens])

  const importCards = async (e) => {
    e.preventDefault()
    setImporting(true)
    try {
      const cardIdentifiers = stringToIdentifiers(importCardsString)
      const { cards, tokens } = await resolveCollection(cardIdentifiers)

      // Insert cards one at a time so duplicate entries are merged by
      // insertCard and the imported quantity is preserved.
      for (const card of cards) {
        await insertCard(deckId, card, card.quantity)
      }

      for (const token of tokens) {
        await insertToken(deckId, token)
      }

      onCardsImported?.()
      setImportCardsString("")
      setImportCardsModal(false)
    } catch (error) {
      console.error("Card import failed:", error)
    } finally {
      setImporting(false)
    }
  }

  const refreshTokens = async () => {
    setRefreshing(true)
    try {
      await refreshDeckTokens(deckId)
      const deckTokens = await getTokensForDeck(deckId)
      setTokens(deckTokens)
    } catch (error) {
      console.error("Failed to refresh deck tokens:", error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <>
      <div
        css={css`
        width: 100%;
        background-color: ${colors.bgSurface};
        grid-column: 1/-1;
        grid-row: 3/4;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 ${spacing.md};
      `}
      >
        <h3>Total Cards: {totalCards}</h3>
        <div
          css={css`
            display: flex;
            gap: ${spacing.sm};
          `}
        >
          <Button
            onClick={() => setImportCardsModal(true)}
            variant="secondary"
            aria-label="Import deck"
            size="xs"
            square
          >
            <Upload size={15} />
          </Button>
          {/* <Button */}
          {/*   variant="secondary" */}
          {/*   aria-label="Mana Curve" */}
          {/*   square */}
          {/* > */}
          {/*   <ChartSpline size={15} /> */}
          {/* </Button> */}
          <Button
            onClick={() => setShowTokens(true)}
            variant="secondary"
            aria-label="Tokens"
            square
          >
            <PlayingCardsFan size={15} />
          </Button>
        </div>
      </div>
      <Modal
        onClose={() => setImportCardsModal(false)}
        isOpen={importCardsModal}
        title="Import Cards"
        actions={
          <>
            <Button
              danger
              onClick={() => setImportCardsModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="import-form"
              loading={importing}
            >
              Submit
            </Button>
          </>
        }
      >
        <form
          id="import-form"
          onSubmit={importCards}
        >
          <textarea
            name="import-cards"
            id="import-cards"
            value={importCardsString}
            onChange={(e) => setImportCardsString(e.target.value)}
          >
          </textarea>
        </form>
      </Modal>
      <Modal
        onClose={() => setShowTokens(false)}
        isOpen={showTokens}
        title="Tokens"
        size="xl"
        actions={
          <Button
            onClick={refreshTokens}
            loading={refreshing}
          >
            Refresh List
          </Button>
        }
      >
        {tokensLoading ? (
          <p>Loading tokens…</p>
        ) : tokens.length === 0 ? (
          <p>No tokens have been added to this deck.</p>
        ) : (
          <div
            css={css`
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
              gap: ${spacing.md};
            `}
          >
            {tokens.map(token => (
              <div
                key={token.id}
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: ${spacing.xs};
                  min-width: 0;
                `}
              >
                <Card card={token} />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}
