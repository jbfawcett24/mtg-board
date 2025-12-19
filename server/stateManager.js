// server/stateManager.js
const path = require('path');
// Make sure these are imported correctly as you had them
const { loadDeck, loadTokens } = require("./deckLoader");

// 1. Add 'async' keyword
async function setGameState(deckName) {
    let gameState = {
        commander: [],
        library: [],
        hand: [],
        board: [],
        graveyard: [],
        exile: [],
        tokenList: [],
        tokenBoard: [],
    };

    // 2. Use Promise.all to wait for both files to load
    const [deckCards, tokenCards] = await Promise.all([
        loadDeck(path.join(__dirname, "decks", deckName, 'deck.txt')),
        loadTokens(path.join(__dirname, "decks", deckName, 'tokens.txt'))
    ]);

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

module.exports = { setGameState };