import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { changeCardImage, deleteDeck, getCardsForDeck, getDb, insertCard, removeCard, setCommander } from "./db.js"
import { css } from "@emotion/react"
import { colors, spacing, radius } from "@mtg/shared"
import Modal from "./Modal.jsx"
import { getAllImages, scryfallSearch, toDbCard } from "./api/scryfall.js"

const mainCss = css`
  background-color: yellow;
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr 4fr;
  grid-template-rows: ${spacing.xxl} 1fr;
`


const deleteCss = css`
    padding: ${spacing.xs} ${spacing.sm};
    background-color: ${colors.accent};
    border: 1px solid transparent;
    cursor: pointer;
    border-radius: ${radius.sm};
    color: ${colors.textPrimary};
    &:hover { background-color: ${colors.accentHover}
  `


export default function DeckEditor({ deck, onBack }) {
  const [deckName, setDeckName] = useState(deck.name);
  const [deleteModal, setDeleteModal] = useState(false)
  const [hoverCardImage, setHoverCardImage] = useState(null)

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
        <CardList deck={deck} onCardHover={setHoverCardImage} />
      </div>
      <Modal
        onClose={() => setDeleteModal(false)}
        isOpen={deleteModal}
        size="sm"
      >
        <div
          css={css`
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: ${spacing.xxl}
          `}
        >
          <h2>Confirm Delete</h2>
          <div
            css={css`
              display: flex;
              align-items: center;
              justify-content: space-evenly;
              width: 100%;
            `}
          >
            <button
              css={deleteCss}
              onClick={async () => {
                await deleteDeck(deck.id)
                onBack()
              }}
            >
              Delete
            </button>
            <button
              css={css`
                padding: ${spacing.xs} ${spacing.sm};
                cursor: pointer;
              `}
              onClick={() => {
                setDeleteModal(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal >
      )
    </>
  )
}

function EditorHeader({ deckName, setDeckName, onBack, deckNameChange, onDelete }) {

  const headerCss = css`
    grid-row: 1/2;
    grid-column: 1/-1;
    background-color: ${colors.bgSurface};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 ${spacing.lg};
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

  const buttonCss = css`
    background: none;
    padding: ${spacing.xs} ${spacing.sm};
    border: 1px solid ${colors.border};
    border-radius: ${radius.sm};
    color: ${colors.textPrimary};
    cursor: pointer;
    &:hover { 
      background-color: ${colors.bgRaised};
    }
  `

  return (
    <div
      css={headerCss}
    >
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
      <div
        css={css`
          display: flex;
          gap: 10px;
        `}
      >
        <button
          css={deleteCss}
          onClick={onDelete}
        >
          Delete
        </button>
        <button
          css={buttonCss}
          onClick={onBack}
        >Back</button>
      </div>
    </div >
  )
}

function CardList({ deck, onCardHover }) {
  const [cards, setCards] = useState([])
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState(null)
  const [displayCardList, setDisplayCardList] = useState([])
  const [menu, setMenu] = useState(null)
  const [addMoreModal, setAddMoreModal] = useState(null)
  const [addMoreAmount, setAddMoreAmount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [cardImages, setCardImages] = useState({ loading: false, images: null })

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
  ]

  function getCardCategory(card) {
    if (card.board === 'commander') return 'Commander'

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
  }, [deck.id])

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

  const handleSearch = async (e) => {
    setLoading((true))
    e.preventDefault()
    if (!search.trim()) return;
    const data = await scryfallSearch(search, deck.format)
    setSearchResults(data.data)
    setLoading(false)
  }

  async function addCard(card) {
    const dbCard = toDbCard(card, 1, "main")
    await insertCard(deck.id, dbCard)
    const updated = await getCardsForDeck(deck.id)
    setCards(updated)
  }

  const cardListCss = css`
    grid-row: 2/-1;
    grid-column: 2/-1;
    background-color: ${colors.bgBase};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: ${spacing.md};
  `

  return (
    <>
      <div
        css={cardListCss}
      >
        <form
          css={css`
            display: flex;
          `}
          onSubmit={(e) => { handleSearch(e) }}
        >
          <input placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value) }} />
          <button type="submit">Search</button>
          {loading && <p>Loading...</p>}
        </form>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            flex-wrap: wrap;
            height: 100%;
            align-content: flex-start;
          `}
        >
          {displayCardList.map(({ category, cards }) => (
            <div
              key={category}
              css={css`
                width: 200px;
                margin-top: ${spacing.md};
                margin-right: ${spacing.sm};
              `}
            >
              <h3
                css={css`
                  border-bottom: 1px solid ${colors.textPrimary};
                  margin-bottom: ${spacing.xs};
                `}
              >
                {category}
              </h3>
              {cards.map(card => (
                <CardListItem
                  card={card}
                  onHover={() => onCardHover(card)}
                  onMenuSelect={(e) => { setMenu({ card, x: e.clientX, y: e.clientY }); }}
                  menuOpen={menu?.card.id === card.id}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <MenuItem onClick={async () => {
            setCardImages({ loading: true, images: false })
            const images = await getAllImages(menu.card)
            setCardImages({ loading: false, images: images })
          }}>
            Change Image
          </MenuItem>
          {menu.card.type_line.includes('Creature') && menu.card.is_legendary && menu.card.board !== 'commander' && (
            <MenuItem onClick={async () => {
              await setCommander(deck.id, menu.card)
              const newCards = await getCardsForDeck(deck.id)
              setCards(newCards)
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
            />
          }
        </div>
      </Modal >
      <Modal
        onClose={() => { setAddMoreModal((false)) }}
        isOpen={addMoreModal}
        size="sm"
      >
        <form
          css={css`
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          `}
          onSubmit={async (e) => {
            e.preventDefault()
            await insertCard(deck.id, addMoreModal, addMoreAmount)
            setAddMoreAmount(3)
            setAddMoreModal(false)
            const newCards = await getCardsForDeck(deck.id)
            setCards(newCards)
          }}
        >
          <h2>Add More</h2>
          <div
            css={css`
              margin-bottom: ${spacing.xxl};
              display: flex;
              flex-direction: column;
              gap: ${spacing.md};
            `}
          >
            <input
              type="number"
              value={addMoreAmount}
              onChange={(e) => setAddMoreAmount(e.target.value)}
            />
            <button
              type="submit"
              css={css`
                padding: ${spacing.xs} ${spacing.sm}
              `}
            >Add</button>
          </div>
        </form>
      </Modal>
      <Modal
        onClose={() => { setCardImages({ loading: false, images: null }) }}
        isOpen={cardImages.loading || cardImages.images}
        size="xl"
      >
        <div css={css`
          max-height: 100%;
          overflow-y: auto;
          padding: ${spacing.md};
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

                await changeCardImage(deck.id, menu.card, newUrlFront, newUrlBack)

                const newCards = await getCardsForDeck(deck.id)
                setCards(newCards)
                setCardImages({ loading: false, images: null })
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

function SearchResults({ results, addCard }) {
  return (
    <>
      {results.map(card => {
        const imageUrl = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal
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
              &:hover .card-overlay {
                opacity: 1;
              }
            `}
          >
            <img
              css={css`
                border-radius: ${radius.md};
                width: 100%;
              `}
              src={imageUrl}
              alt={card.name}
              loading="lazy"
            />
            <div
              className="card-overlay"
              onClick={() => addCard(card)}
              css={css`
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                border-radius: ${radius.md};
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
        &:hover .menu {
          opacity: 100%;
          pointer-events: auto;
        }
      `}
      onMouseEnter={onHover}
    >
      <p>{card.quantity} {card.name}</p>
      <div
        className="menu"
        css={css`
          opacity: ${menuOpen ? "100%" : "0"};
          transition: opacity 0.1s ease-in-out;
          cursor: pointer;
          pointer-events: none;
          background-color: ${colors.bgRaised};
          aspect-ratio: 1/1;
          width: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: ${radius.sm};
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
      </div>
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
        width: 100%;
        height: 100%;
        background-color: ${colors.bgBase};
        display: flex;
        padding-top: ${spacing.xxl};
        align-items: flex-start;
        justify-content: center;
      `}
    >
      {card &&
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: ${spacing.sm};
          `}
        >
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
          <p>{card.name}</p>
        </div>
      }
    </div>
  )
}
