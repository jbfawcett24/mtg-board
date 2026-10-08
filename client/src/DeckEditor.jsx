import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { changeCardImage, deleteDeck, getCardsForDeck, getDb, insertCard, removeCard, setCommander, getDeck } from "./db.js"
import { css } from "@emotion/react"
import { colors, spacing, radius, cardRadius } from "@mtg/shared"
import Modal from "./Modal.jsx"
import { getAllImages, scryfallSearch, toDbCard } from "./api/scryfall.js"
import DropDownSearchBar from "./DropDownSearchBar.jsx"
import { SearchItemsComponent } from "./SearchUtils.jsx"
import Button from "@mtg/shared/src/Button.jsx"
import DeckEditorFooter from "./DeckEditorFooter.jsx"
import { Card } from "@mtg/shared"
import Header from "./Header.jsx"

const mainCss = css`
  background-color: yellow;
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr 4fr;
  grid-template-rows: auto 1fr auto;
`

export default function DeckEditor({ deck, onBack }) {
  const [deckName, setDeckName] = useState(deck.name);
  const [deleteModal, setDeleteModal] = useState(false)
  const [hoverCardImage, setHoverCardImage] = useState(null)
  const [totalCards, setTotalCards] = useState(0)
  const [cardsRefreshKey, setCardsRefreshKey] = useState(0)

  async function deckNameChange() {
    const newName = deckName.trim();
    if (!newName || newName === deck.name) return
    const db = await getDb()
    await db.execute('UPDATE decks SET name = $1 WHERE id = $2', [newName, deck.id])
    deck.name = newName
  }

  function handleDelete() {
    setDeleteModal(true)
  }

  return (
    <>
      <div
        css={mainCss}
      >
        <EditorHeader
          onBack={onBack}
          deckName={deckName}
          setDeckName={setDeckName}
          deckNameChange={async () => { deckNameChange() }}
          onDelete={handleDelete}
        />
        <HoverCardImage card={hoverCardImage} />
        <CardList
          deck={deck}
          refreshKey={cardsRefreshKey}
          onCardHover={setHoverCardImage}
          onTotalCardsChange={setTotalCards}
        />
        <DeckEditorFooter
          deckId={deck.id}
          totalCards={totalCards}
          onCardsImported={() => setCardsRefreshKey((key) => key + 1)}
        />
      </div>
      <Modal
        onClose={() => setDeleteModal(false)}
        isOpen={deleteModal}
        size="sm"
        title="Delete Deck?"
        actions={<>
          <Button
            danger
            onClick={async () => {
              await deleteDeck(deck.id)
              onBack()
            }}
          >
            Delete
          </Button>
          <Button
            onClick={() => { setDeleteModal(false) }}
          >
            Cancel
          </Button>
        </>
        }
      >
        This will permanently delete the deck {deckName}. This can't be undone
      </Modal >
    </>
  )
}

function EditorHeader({ deckName, setDeckName, onBack, deckNameChange, onDelete }) {

  const headerCss = css`
    grid-row: 1/2;
    grid-column: 1/-1;
  `

  const inputWrapper = css`
    position: relative;
    width: 33%;

    &:after {
      content: "";
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
      width: 0;
      background-color: ${colors.border};
      transition: width 0.3s ease, background-color 0.3s ease;
    }

    &:hover:after {
      width: 100%;
    }

    &:focus-within:after {
      width: 100%;
      background-color: ${colors.borderFocus};
    }
  `;

  const inputCss = css`
    background-color: transparent;
    font-size: 1.1rem;
    font-weight: bold;
    width: 100%;
    color: ${colors.textPrimary};
    border: none;
    outline: none;
  `;

  // return (
  {/*   <div */ }
  {/*     css={headerCss} */ }
  {/*   > */ }
  {/*     <div */ }
  {/*       css={inputWrapper} */ }
  {/*     > */ }
  {/*       <input */ }
  {/*         css={inputCss} */ }
  {/*         type="text" */ }
  {/*         value={deckName} */ }
  {/*         onChange={(e) => { setDeckName(e.target.value) }} */ }
  {/*         onBlur={() => { deckNameChange() }} */ }
  {/*       /> */ }
  {/*     </div> */ }
  {/*     <div */ }
  {/*       css={css` */ }
  {/*         display: flex; */ }
  {/*         gap: 10px; */ }
  {/*       `} */ }
  {/*     > */ }
  {/*       <Button danger onClick={onDelete}>Delete</Button> */ }
  {/*       <Button onClick={onBack}>Back</Button> */ }
  {/*     </div> */ }
  {/*   </div > */ }
  {/* ) */ }

  return (
    <div css={headerCss}>
      <Header
        title={
          <div
            css={inputWrapper}
          >
            <input
              css={inputCss}
              type="text"
              value={deckName}
              onChange={(e) => { setDeckName(e.target.value) }}
              onBlur={() => { deckNameChange() }}
            />
          </div>
        }
        actions={
          <>
            <Button danger onClick={onDelete}>Delete</Button>
            <Button onClick={onBack}>Back</Button>
          </>
        }
      />
    </div>
  )
}

function CardList({ deck, refreshKey, onCardHover, onTotalCardsChange }) {
  const [cards, setCards] = useState([])
  const [searchResults, setSearchResults] = useState(null)
  const [displayCardList, setDisplayCardList] = useState([])
  const [menu, setMenu] = useState(null)
  const [addMoreModal, setAddMoreModal] = useState(null)
  const [addMoreAmount, setAddMoreAmount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [cardImages, setCardImages] = useState({ loading: false, images: null, card: null })

  const CATEGORY_ORDER = [
    'Commander',
    'Creature',
    'Sorcery',
    'Instant',
    'Artifact',
    'Enchantment',
    'Planeswalker',
    'Battle',
    'Land',
    'Sideboard',
  ]

  function getCardCategory(card) {
    if (card.board === 'commander') return 'Commander'
    if (card.board === 'sideboard') return 'Sideboard'

    const typeLine = card.type_line ?? ''
    if (typeLine.includes('Creature')) return 'Creature'
    if (typeLine.includes('Sorcery')) return 'Sorcery'
    if (typeLine.includes('Instant')) return 'Instant'
    if (typeLine.includes('Artifact')) return 'Artifact'
    if (typeLine.includes('Enchantment')) return 'Enchantment'
    if (typeLine.includes('Planeswalker')) return 'Planeswalker'
    if (typeLine.includes('Battle')) return 'Battle'
    if (typeLine.includes('Land')) return 'Land'
    return 'Other'
  }

  useEffect(() => {
    getCardsForDeck(deck.id).then(setCards)
  }, [deck.id, refreshKey])

  useEffect(() => {
    onTotalCardsChange(
      cards
        .filter(card => card.board !== 'sideboard')
        .reduce((total, card) => total + card.quantity, 0)
    )
  }, [cards, onTotalCardsChange])

  useEffect(() => {
    const grouped = CATEGORY_ORDER.reduce((acc, category) => {
      acc[category] = []
      return acc
    }, {})

    cards.forEach(card => {
      const category = getCardCategory(card)
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(card)
    })

    const displayList = [...CATEGORY_ORDER, 'Other']
      .filter(category => grouped[category]?.length > 0)
      .map(category => ({ category, cards: grouped[category] }))

    setDisplayCardList(displayList)
  }, [cards])

  const handleSearch = async (query) => {
    if (!query?.trim()) return []
    try {
      const data = await scryfallSearch(query, deck.format, deck.color_identity)
      return data.data ?? []
    } catch (err) {
      console.error("Search failed:", err)
      return []
    }
  }

  const handleSubmit = async (query, currentResults) => {
    if (currentResults !== undefined) {
      setSearchResults(currentResults)
      return
    }
    if (!query?.trim()) return
    setLoading(true)
    try {
      const data = await scryfallSearch(query, deck.format, deck.color_identity)
      setSearchResults(data.data ?? [])
    } catch (err) {
      console.error("Search submit failed:", err)
    } finally {
      setLoading(false)
    }
  }

  async function addCard(card) {
    const dbCard = toDbCard(card, 1, "main")
    await insertCard(deck.id, dbCard)
    const updated = await getCardsForDeck(deck.id)
    setCards(updated)
  }

  const cardListCss = css`
    grid-row: 2/3;
    grid-column: 2/-1;
    background-color: ${colors.bgBase};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    padding: ${spacing.md};
  `

  return (
    <>
      <div
        css={cardListCss}
      >
        <div
          css={css`
            display: flex;
            justify-content: flex-end;
          `}
        >
          <DropDownSearchBar
            onSearch={handleSearch}
            onItemSelect={addCard}
            onSubmit={handleSubmit}
            SearchItemComponent={SearchItemsComponent}
            label="Add Cards"
          />
        </div>
        <div
          css={css`
            column-width: 200px;
            column-gap: ${spacing.sm};
            column-fill: auto;
            flex: 1;
            min-height: 0;
            overflow-x: auto;
            overflow-y: hidden;
            margin-top: ${spacing.md}
          `}
        >
          {displayCardList.map(({ category, cards }) => (
            <div
              key={category}
              css={css`
                width: 200px;
                margin-top: ${spacing.md};
                break-inside: avoid-column;
              `}
            >
              <h3
                css={css`
                  border-bottom: 1px solid ${colors.textPrimary};
                  margin-bottom: ${spacing.xs};
                `}
              >
                {category} - {cards.reduce((acc, card) => acc + card.quantity, 0)}
              </h3>
              {cards.sort((a, b) => a.name.localeCompare(b.name)).map(card => (
                <CardListItem
                  key={card.id}
                  card={card}
                  onHover={() => onCardHover(card)}
                  onMenuSelect={(e) => { setMenu({ card, x: e.clientX, y: e.clientY }); }}
                  menuOpen={menu?.card.id === card.id}
                />
              ))}
            </div>
          ))}
        </div>
      </div >
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <MenuItem onClick={async () => {
            const targetCard = menu.card
            setCardImages({ loading: true, images: false, card: targetCard })
            const images = await getAllImages(targetCard)
            setCardImages({ loading: false, images, card: targetCard })
            setMenu(null)
          }}>
            Change Image
          </MenuItem>
          {menu.card.type_line.includes('Creature') && !!menu.card.is_legendary && menu.card.board !== 'commander' && (
            <MenuItem onClick={async () => {
              await setCommander(deck.id, menu.card)
              const updatedDeck = await getDeck(deck.id)
              deck.color_identity = updatedDeck.color_identity
              const newCards = await getCardsForDeck(deck.id)
              setCards(newCards)
              setMenu(null)
            }}>
              Set as Commander
            </MenuItem>
          )}
          <MenuItem onClick={async () => {
            await insertCard(deck.id, menu.card,)
            const newCards = await getCardsForDeck(deck.id)
            setCards(newCards)
            setMenu(null)
          }}>
            Add One
          </MenuItem>
          <MenuItem onClick={() => {
            setAddMoreModal(menu.card)
            setMenu(null)
          }}>
            Add More
          </MenuItem>
          {menu.card.quantity > 1 && (
            <MenuItem onClick={async () => {
              await removeCard(deck.id, menu.card, 1)
              const newCards = await getCardsForDeck(deck.id)
              setCards(newCards)
              setMenu(null)
            }} danger>
              Remove One
            </MenuItem>
          )}
          <MenuItem onClick={async () => {
            await removeCard(deck.id, menu.card, menu.card.quantity)
            const newCards = await getCardsForDeck(deck.id)
            setCards(newCards)
            setMenu(null)
          }} danger>
            Remove
          </MenuItem>
        </ContextMenu >
      )
      }

      <Modal
        onClose={() => { setSearchResults(null) }}
        isOpen={searchResults}
        size="xl"
      >
        <div css={css`
          max-height: 100%;
          overflow-y: auto;
          padding: ${spacing.md};
        `}
        >
          {searchResults &&
            <SearchResults
              results={searchResults}
              addCard={addCard}
              showCardNumber={true}
              deckCards={cards}
            />
          }
        </div>
      </Modal >
      <Modal
        onClose={() => { setAddMoreModal((false)) }}
        isOpen={addMoreModal}
        size="sm"
        title="Add More"
        actions={
          <Button onClick={async (e) => {
            e.preventDefault()
            await insertCard(deck.id, addMoreModal, addMoreAmount)
            setAddMoreAmount(3)
            setAddMoreModal(false)
            const newCards = await getCardsForDeck(deck.id)
            setCards(newCards)
          }}>Add</Button>
        }
      >
        <input
          type="number"
          value={addMoreAmount}
          onChange={(e) => setAddMoreAmount(parseInt(e.target.value))}
          css={css`
            min-height: 30px;
            min-width: 30px;
          `}
        />
      </Modal>
      <Modal
        onClose={() => { setCardImages({ loading: false, images: null, card: null }) }}
        isOpen={cardImages.loading || cardImages.images}
        size="xl"
        title="Change Image"
      >
        <div css={css`
          max-height: 100%;
          overflow-y: auto;
          padding: ${spacing.md};
          margin: auto;
        `}
        >

          {cardImages.loading
            ? "loading" :
            <SearchResults
              results={cardImages.images}
              addCard={async (card) => {
                const isDoubleFaced = card.card_faces?.length > 0 && card.card_faces[0].image_uris;

                const newUrlFront = isDoubleFaced
                  ? card.card_faces[0].image_uris.normal
                  : card.image_uris?.normal ?? null;

                const newUrlBack = isDoubleFaced
                  ? card.card_faces[1].image_uris.normal
                  : null;
                const newArtCrop = isDoubleFaced
                  ? card.card_faces[0].image_uris?.art_crop ?? null
                  : card.image_uris?.art_crop ?? null;

                await changeCardImage(deck.id, cardImages.card, newUrlFront, newUrlBack, newArtCrop)

                const newCards = await getCardsForDeck(deck.id)
                setCards(newCards)
                setCardImages({ loading: false, images: null, card: null })
              }} />
          }
        </div>
      </Modal>
    </>
  )
}

function MenuItem({ onClick, children, danger = false }) {
  return (
    <div
      onClick={onClick}
      css={css`
        padding: ${spacing.xs} ${spacing.sm};
        cursor: pointer;
        white-space: nowrap;
        color: ${danger ? colors.error : colors.textPrimary};
        &:hover {
          background-color: ${colors.bgRaised};
        }
`}
    >
      {children}
    </div>
  )
}

function SearchResults({ results, addCard, showCardNumber = false, deckCards }) {
  return (
    <>
      {results.map(card => {
        const imageUrl = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal
        const deckCard = deckCards?.find(dc => dc.scryfall_id === card.id)

        return (
          <div
            key={card.id}
            css={css`
              position: relative;
              display: inline-block;
              width: 200px;
              aspect-ratio: 2.5/3.5;
              overflow: hidden;
              margin: ${spacing.md};
              user-select: none;
              -webkit-user-select: none;
              -webkit-tap-highlight-color: transparent;
              &:hover .card-overlay {
                opacity: 1;
              }
            `}
          >
            <Card size="lg" card={{ ...card, image_uri: imageUrl }} />
            {showCardNumber && deckCard?.quantity != null && (
              <div
                css={css`
                  position: absolute;
                  top: ${spacing.xs};
                  right: ${spacing.xs};
                  background: rgba(0, 0, 0, 0.75);
                  color: white;
                  font-size: 0.85rem;
                  font-weight: bold;
                  padding: 2px 8px;
                  border-radius: ${radius.sm};
                  line-height: 1.4;
                `}
              >
                {deckCard.quantity}
              </div>
            )}
            <div
              className="card-overlay"
              onClick={() => addCard(card)}
              css={css`
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                border-radius: ${cardRadius(200)};
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.15s ease;
                cursor: pointer;
                font-size: 2rem;
                color: white;
              `}
            >
              +
            </div>
          </div>
        )
      })}
    </>
  )
}

function CardListItem({ card, onHover, onMenuSelect, menuOpen }) {
  return (
    <div
      css={css`
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        justify-content: space-between;
        gap: ${spacing.xs};
        min-height: 30px;
        width: 100%;
        min-width: 0;
        &:hover .menu {
          opacity: 100%;
          pointer-events: auto;
        }
      `}
      onMouseEnter={onHover}
    >
      <p>{card.quantity} {card.name}</p>
      <Button
        className="menu"
        type="button"
        variant="secondary"
        size="xs"
        square
        aria-label={`Options for ${card.name}`}
        css={css`
          opacity: ${menuOpen ? "100%" : "0"};
          transition: opacity 0.1s ease-in-out;
          pointer-events: none;
          flex: 0 0 28px;
          width: 28px;
          height: 28px;
          padding: 0;
          line-height: 1;
          font-size: 1.2rem;
          span {
            transform: translateY(1px);
            font-weight: bold;
          }
        `}
        onClick={(e) => onMenuSelect(e)}
      >
        <span>⋮</span>
      </Button>
    </div>
  )
}

function ContextMenu({ x, y, onClose, children }) {
  const menuRef = useRef()
  const [position, setPosition] = useState({ top: y, left: x, ready: null })

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return

    const { offsetWidth, offsetHeight } = el
    const padding = 8

    let left = x
    let top = y

    if (left + offsetWidth > window.innerWidth - padding) {
      left = window.innerWidth - offsetWidth - padding
    }
    if (top + offsetHeight > window.innerHeight - padding) {
      top = window.innerHeight - offsetHeight - padding
    }

    left = Math.max(padding, left)
    top = Math.max(padding, top)

    setPosition({ top, left, ready: true })
  }, [x, y])
  return (
    <>
      <div
        onClick={onClose}
        css={css`
          inset: 0;
          position: fixed;
          z-index: 999;
        `}
      />
      <div
        ref={menuRef}
        css={css`
          position: fixed;
          top: ${position.top}px;
          left: ${position.left}px;
          background: ${colors.bgSurface};
          border-radius: ${radius.sm};
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 1000;
          min-width: 140px;
          overflow: hidden;
          visibility: ${position.ready ? 'visible' : 'hidden'};
        `}
      >
        {children}
      </div>
    </>
  )
}

function HoverCardImage({ card }) {
  return (
    <div
      css={css`
        grid-row: 2/3;
        grid-column: 1/2;
        width: 100%;
        height: 100%;
        background-color: ${colors.bgBase};
        display: flex;
        padding-top: ${spacing.xxl};
        align-items: flex-start;
        justify-content: center;
      `}
    >
      <div
        css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: ${spacing.sm};
          `}
      >
        {card ?
          <>
            <img
              src={card.image_uri
              }
              alt={card.name}
              css={css`
                width: 200px;
                aspect-ratio: 2.5/3.5;
                border-radius: ${radius.lg};
              `}
            />
            <p
              css={css`
                max-width: 190px;
                margin: auto;
              `}
            >
              {card.name}
            </p>
          </>
          :
          <div
            css={css`
                width: 200px;
                aspect-ratio: 2.5/3.5;
                border-radius: ${radius.lg};
                background-color: ${colors.bgSurface};
              `}
          >
          </div>
        }
      </div>
    </div>
  )
}
