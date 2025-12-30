// server/stateManager.js
const path = require('path');
// Make sure these are imported correctly as you had them
const { loadDeck, loadTokens } = require("./deckLoader");
const {networkInterfaces} = require("node:os");

// 1. Add 'async' keyword
async function setGameState(deckName, deckPath) {
    let gameState = {
        commander: [],
        library: [],
        hand: [],
        board: [],
        graveyard: [],
        exile: [],
        tokenList: [],
        tokenBoard: [],
        theme: {}
    };

    // 2. Use Promise.all to wait for both files to load
    const fullFolderPath = path.join(deckPath, deckName);

    const [deckCards, tokenCards] = await Promise.all([
        loadDeck(deckName, fullFolderPath),
        loadTokens(deckName, fullFolderPath)
    ]);

    gameState.theme = deckCards.theme;

    // 3. Process Deck Cards
    gameState.commander = deckCards.commander.map(card => ({
        ...card,
        x: 100,
        y: 100
    }));

    gameState.library = deckCards.deck.sort(() => Math.random() - 0.5);
    gameState.hand = gameState.library.splice(0, 7);

    console.log(`Game ready! Hand: ${gameState.hand.length}`);

    // 4. Process Tokens
    gameState.tokenList = tokenCards;

    // 5. Return the FULLY populated object
    return gameState;
}

function getLocalIp() {
    const interfaces = networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {

            // 1. Must be IPv4 and not internal (localhost)
            if (iface.family === 'IPv4' && !iface.internal) {

                // 2. Filter out Virtual Adapters by Name
                const lowerName = name.toLowerCase();
                if (
                    lowerName.includes("virtual") ||
                    lowerName.includes("vmware") ||
                    lowerName.includes("wsl") ||     // Windows Subsystem for Linux
                    lowerName.includes("vethernet")  // Hyper-V
                ) {
                    continue;
                }

                // If it passes all checks, it's likely your real LAN IP
                return iface.address;
            }
        }
    }
    return 'localhost'; // Fallback
}

module.exports = { setGameState, getLocalIp };