const {parseArchDeckInfo} = require("./archidecktRequest.js");
const getDeck = async (url, type) => {
    const proxyUrl = "https://corsproxy.io/?";
    const targetUrl = proxyUrl + encodeURIComponent(url);

    console.log(`targetUrl: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.moxfield.com/'
            }
        });

        // Always check if the response is actually OK
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const deck = await response.json();
        if(type === "Moxfield") {
            return parseMoxDeckInfo(deck);
        } else {
            return parseArchDeckInfo(deck)
        }
    } catch (error) {
        console.error("Failed to fetch deck:", error);
    }
}

const parseMoxDeckInfo = (deck) => {
    const commandString = Object.values(deck.commanders).map(card => {
        return `${card.quantity} ${card.card.name} (${card.card.set}) ${card.card.cn}\n`
    }).join("");
    const deckString = Object.values(deck.mainboard).map(card => {
        if(card.printingData) {
            return card.printingData.map((item) => {
                return `${item.quantity} ${card.card.name} (${item.set}) ${item.cn}\n`
            }).join("");
        } else {
            return `${card.quantity} ${card.card.name} (${card.card.set}) ${card.card.cn}\n`
        }
    }).join("");

    let tokenString = "";
    const tokenMap = new Set();
    tokenString += deck.tokens.filter(entry => {
        if(!tokenMap.has(entry.name)) {
            tokenMap.add(entry.name);
            return entry.isToken === true;
        }
    }).map(card => {
        return `${card.name} [${card.set}]\n`
    }).join("")

    return {
        name: deck.name,
        deck: deckString,
        tokens: tokenString,
        commanders: commandString
    };
}

module.exports = {getDeck};