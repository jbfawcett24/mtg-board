import { getCardsForDeck, replaceTokensForDeck } from '../db.js';

const SCRYFALL_API = 'https://api.scryfall.com';

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function toIdentifier(card) {
  return {
    set: card.setCode.toLowerCase(),
    collector_number: card.setNumber,
  };
}

export function toDbCard(scryfallCard, quantity, board) {
  const frontFace = scryfallCard.card_faces?.[0];
  const isDoubleFaced = Boolean(frontFace);
  const typeLine = scryfallCard.type_line ?? frontFace?.type_line ?? '';

  return {
    scryfall_id: scryfallCard.id,
    name: scryfallCard.name,
    quantity,
    image_uri: isDoubleFaced
      ? frontFace.image_uris?.normal ?? null
      : scryfallCard.image_uris?.normal ?? null,
    image_uri_back: isDoubleFaced
      ? scryfallCard.card_faces[1]?.image_uris?.normal ?? null
      : null,
    board,
    is_legendary: typeLine.includes('Legendary'),
    // Scryfall puts these fields on the faces for double-faced cards.
    // The database columns are NOT NULL, so always provide a string.
    oracle_text: scryfallCard.oracle_text ?? frontFace?.oracle_text ?? '',
    type_line: typeLine,
    color_identity: JSON.stringify(scryfallCard.color_identity ?? [])
  };
}

function toDbTokens(scryfallCard) {
  if (!scryfallCard.all_parts) return [];
  return scryfallCard.all_parts
    .filter(part => part.component === 'token')
    .map(part => ({
      scryfall_id: part.id,
      name: part.name,
      image_uri: null,
    }));
}

async function fetchTokenImages(tokens) {
  if (tokens.length === 0) return tokens;
  const chunks = chunkArray(tokens, 75);
  const resolved = [];

  for (const chunk of chunks) {
    const identifiers = chunk.map(t => ({ id: t.scryfall_id }));
    const { found } = await fetchCollection(identifiers);
    for (const scryfallCard of found) {
      const token = chunk.find(t => t.scryfall_id === scryfallCard.id);
      if (token) resolved.push({
        ...token,
        image_uri: scryfallCard.image_uris?.normal ?? null,
        power: scryfallCard.power ?? null,
        toughness: scryfallCard.toughness ?? null,
        colors: scryfallCard.colors?.join(',') ?? null,
      });
    }
  }

  return resolved;
}

/**
 * Rechecks every card currently stored in a deck and replaces its token list
 * with the token data currently returned by Scryfall.
 *
 * @param {number} deckId
 * @returns {Promise<DbToken[]>}
 */
export async function refreshDeckTokens(deckId) {
  const cards = await getCardsForDeck(deckId);
  const cardIds = [...new Set(
    cards
      .map(card => card.scryfall_id)
      .filter(Boolean)
  )];

  const chunks = chunkArray(cardIds, 75);
  const allFound = [];

  for (const chunk of chunks) {
    const { found } = await fetchCollection(chunk.map(id => ({ id })));
    allFound.push(...found);
  }

  const seenTokenNames = new Set();
  const uniqueTokens = allFound
    .flatMap(toDbTokens)
    .filter(token => {
      if (seenTokenNames.has(token.name)) return false;
      seenTokenNames.add(token.name);
      return true;
    });

  const tokens = await fetchTokenImages(uniqueTokens);
  await replaceTokensForDeck(deckId, tokens);
  return tokens;
}

async function fetchCollection(identifiers) {
  const res = await fetch(`${SCRYFALL_API}/cards/collection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers }),
  });

  if (!res.ok) throw new Error(`Scryfall collection request failed: ${res.status}`);
  const json = await res.json();
  return { found: json.data, notFound: json.not_found ?? [] };
}

/**
 * Takes the parsed card list from the CreateDeck form and resolves all cards
 * against Scryfall in batches of 75.
 *
 * @param {Array<{ quantity, name, setCode, setNumber, board? }>} parsedCards
 * @returns {Promise<{ cards: DbCard[], tokens: DbToken[], notFound: any[] }>}
 */
export async function resolveCollection(parsedCards) {
  const chunks = chunkArray(parsedCards, 75);
  const allFound = [];
  const allNotFound = [];

  for (const chunk of chunks) {
    const identifier = chunk.map(toIdentifier)
    const { found, notFound } = await fetchCollection(identifier);
    allFound.push(...found.map(scryfallCard => {
      const frontName = scryfallCard.name.split(/\s+\/\//)[0].trim().toLowerCase();
      const source = chunk.find(
        c => c.setCode.toLowerCase() === scryfallCard.set.toLowerCase()
          && c.setNumber === scryfallCard.collector_number
      ) ?? chunk.find(c => {
        const name = c.name.split(/\s+\/\//)[0].split(/\s+\/\s+/)[0].trim().toLowerCase();
        return name === frontName;
      });
      console.log(scryfallCard)
      return { scryfallCard, quantity: source?.quantity ?? 1, board: source?.board ?? 'main' };
    }));
    allNotFound.push(...notFound);
  }

  const cards = allFound.map(({ scryfallCard, quantity, board }) =>
    toDbCard(scryfallCard, quantity, board)
  );

  const tokens = allFound.flatMap(({ scryfallCard }) =>
    toDbTokens(scryfallCard)
  );

  const seenTokenNames = new Set();
  const uniqueTokens = tokens.filter(t => {
    if (seenTokenNames.has(t.name)) return false;
    seenTokenNames.add(t.name);
    return true;
  });

  const tokensWithImages = await fetchTokenImages(uniqueTokens);

  console.log(`cards from scryfall: ${cards}`)

  return { cards, tokens: tokensWithImages, notFound: allNotFound };
}

export async function scryfallSearch(query, format, colors) {
  const baseUrl = 'https://api.scryfall.com/cards/search'
  let colorConstraint = ''
  if (colors) {
    try {
      const parsed = Array.isArray(colors) ? colors : JSON.parse(colors)
      if (parsed.length === 0) {
        colorConstraint = ' id<=c'
      } else {
        colorConstraint = ` id<=${parsed.join('')}`
      }
    } catch {
      colorConstraint = ` id<=${colors}`
    }
  }
  const formatConstraint = format ? ` f:${format}` : ''
  const q = `${query}${formatConstraint}${colorConstraint}`
  const params = new URLSearchParams({ q })
  const url = `${baseUrl}?${params.toString()}`
  return fetch(url).then(res => res.json())
}

export function isColorIdentityLegal(deckColorIdentity, cardColorIdentity) {
  const deckColors = new Set(JSON.parse(deckColorIdentity ?? '[]'));
  const cardColors = JSON.parse(cardColorIdentity ?? '[]');
  return cardColors.every(color => deckColors.has(color));
}

export async function getAllImages(card) {
  const id = card.scryfall_id

  const url = `${SCRYFALL_API}/cards/${id}`
  const cardData = await fetch(url).then(res => res.json())
  console.log(cardData)
  const printsUrl = cardData.prints_search_uri;
  const allData = await fetch(printsUrl).then(res => res.json())

  return allData.data

}

export function stringToIdentifiers(inputString) {
  if (typeof inputString !== 'string') return [];

  // A deck-list line has the form:
  // quantity Card Name (SET) collector-number [optional flags]
  // Trailing flags such as "*F*" are ignored.
  const linePattern = /^\s*(\d+)\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)(?:\s+.*)?$/;
  let board = 'main';

  return inputString
    .split(/\r?\n/)
    .map(line => line.trim())
    .flatMap(line => {
      if (!line) return [];
      if (/^sideboard\s*:/i.test(line)) {
        board = 'sideboard';
        return [];
      }

      const match = line.match(linePattern);
      if (!match) return [];

      const [, quantity, name, setCode, setNumber] = match;
      return [{
        quantity: Number(quantity),
        name: name.trim(),
        setCode,
        setNumber,
        board,
      }];
    });
}
