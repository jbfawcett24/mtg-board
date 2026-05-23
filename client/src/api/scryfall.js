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

function toDbCard(scryfallCard, quantity, board) {
    const isDoubleFaced = scryfallCard.card_faces?.length > 0 &&
        scryfallCard.card_faces[0].image_uris;

    return {
        scryfall_id:    scryfallCard.id,
        name:           scryfallCard.name,
        quantity,
        image_uri:      isDoubleFaced
                            ? scryfallCard.card_faces[0].image_uris.normal
                            : scryfallCard.image_uris?.normal ?? null,
        image_uri_back: isDoubleFaced
                            ? scryfallCard.card_faces[1].image_uris.normal
                            : null,
        board,
        is_legendary:   scryfallCard.type_line?.includes('Legendary') ?? false,
    };
}

function toDbTokens(scryfallCard) {
    if (!scryfallCard.all_parts) return [];
    return scryfallCard.all_parts
        .filter(part => part.component === 'token')
        .map(part => ({
            scryfall_id: part.id,
            name:        part.name,
            image_uri:   null,
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
                image_uri:  scryfallCard.image_uris?.normal ?? null,
                power:      scryfallCard.power ?? null,
                toughness:  scryfallCard.toughness ?? null,
                colors:     scryfallCard.colors?.join(',') ?? null,
            });
        }
    }

    return resolved;
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
        const identifiers = chunk.map(toIdentifier);
        const { found, notFound } = await fetchCollection(identifiers);
        allFound.push(...found.map(scryfallCard => {
            const frontName = scryfallCard.name.split(' //')[0].trim().toLowerCase();
            const source = chunk.find(
                c => c.name.toLowerCase() === frontName
            );
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

    return { cards, tokens: tokensWithImages, notFound: allNotFound };
}
