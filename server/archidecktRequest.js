async function parseArchDeckInfo(deck) {
    const commandString = deck.cards.map(card => {
        if (card.categories.includes("Commander")) {
            return `${card.quantity} ${card.card.oracleCard.name} (${card.card.edition.editioncode}) ${card.card.collectorNumber}\n`
        }
    }).join("");

    const deckString = deck.cards.map(card => {
        if (!card.categories.includes("Commander")) {
            return `${card.quantity} ${card.card.oracleCard.name} (${card.card.edition.editioncode}) ${card.card.collectorNumber}\n`
        }
    }).join("")

    const tokenIds = new Set();

    deck.cards.forEach(card => {
        if (card.card.oracleCard.tokens && card.card.oracleCard.tokens.length > 0) {
            card.card.oracleCard.tokens.forEach(tokenId => {
                tokenIds.add(tokenId);
            });
        }
    });

    const tokenRequestUrl = `https://archidekt.com/api/cards/v2/?includeTokens&oracleCardIds=${Array.from(tokenIds).join(",")}&unique`

    console.log(tokenRequestUrl);
    try {
        const response = await fetch(tokenRequestUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.moxfield.com/'
            }
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const tokenList = await response.json()

        const tokenString = tokenList.results.map(card => {
            return `${card.oracleCard.name} [${card.edition.editioncode}]\n`
        }).join("");

        return {
            name: deck.name,
            deck: deckString,
            tokens: tokenString,
            commanders: commandString
        }

    } catch (error) {
        console.log(error);
    }
}

module.exports = {parseArchDeckInfo}