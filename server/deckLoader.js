const fs = require('fs');
const axios = require('axios');
const config = require('../config.json');
const {resolve} = require("node:path");
const path = require("node:path");
const {resolvePath} = require("./pathHandler");

async function getDeckList() {
    const deckPath = resolvePath(config.deckPath);

    const decks = fs.readdirSync(deckPath, {withFileTypes: true})
        .filter(folder => folder.isDirectory())
        .map(folder => folder.name);

    const commanders = [];

    decks.forEach(deck => {
        commanders.push(fs.readFileSync(deckPath + '/' + deck + '/deck.txt', 'utf8').split('\n')[0]);
    })

    const identifiers = commanders.map(commander => {
        const match = commander.match(/^(\d+)\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)/);
        if (match) {
            const set = match[3];
            const collector_number = match[4];
            return {
                set: set,
                collector_number: collector_number,
            }
        } else {
            return {}
        }
    })

    const response = await axios.post("https://api.scryfall.com/cards/collection", {identifiers: identifiers});

    const cards = response.data.data;

    const returnDecks = cards.map(card => {
        return {
            imageUrl: card.image_uris ? card.image_uris.normal : card.card_faces[0].image_uris.normal,
        }
    })

    decks.forEach((name, index) => {
        returnDecks[index].name = name
    });

    console.log(returnDecks);
    return returnDecks;
}

async function loadDeck(deckName) {
    console.log(`Loading deck: ${deckName}...`);

    const folderPath = path.join(resolvePath(config.deckPath), deckName);
    const filePath = path.join(folderPath, 'deck.txt');

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter((line) => line.trim() !== '');

    const identifiers = [];

    lines.forEach(line => {
        const match = line.match(/^(\d+)\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)/);

        if (match) {
            const count = parseInt(match[1]);
            const name = match[2];
            const set = match[3];
            const number = match[4];

            for(let i = 0; i < count; i++) {
                identifiers.push({
                    set: set.toLowerCase(),
                    collector_number: number,
                    isCommander: (identifiers.length === 0),
                });
            }
        } else {
            console.warn(`Skipping unreadable line ${line}`);
        }
    });

    console.log(`Found ${identifiers.length} cards. Fetching data from Scryfall....`);

    const chunks = [];
    const fetchQueue = [...identifiers];

    while(fetchQueue.length > 0) {
        chunks.push(fetchQueue.splice(0, 75));
    }

    const cardMap = new Map()

    for(const chunk of chunks) {
        try {
            const response = await axios.post('https://api.scryfall.com/cards/collection', {
                identifiers: chunk.map(card => {return {set:card.set, collector_number:card.collector_number}}),
            });

            const cards = response.data.data;

            cards.forEach(card => {

                const key = `${card.set}:${card.collector_number}`;

                let imageUrl;
                if(card.image_uris) {
                    imageUrl = card.image_uris.normal;
                } else if(card.card_faces) {
                    imageUrl = card.card_faces[0].image_uris.normal;
                }

                const cardData = {
                    name: card.name,
                    imageUrl: imageUrl,
                    type: card.type_line,
                }

                cardMap.set(key, cardData);
            });

            if(response.data.not_found && response.data.not_found.length > 0) {
                console.error("Missing card detected")
                console.error("Scryfall could not find these cards");
                response.data.not_found.forEach(item => {
                    console.error(` - Set: ${item.set}, Number: ${item.collector_number}`);
                })
            }

        } catch (err) {
            console.error("Error fetching data from Scryfall", err.message);
        }
    }

    const validExtensions = [".png", ".jpg", ".jpeg"];
    let customBackground = null;
    let customCardBack = null;

    const findFile = (baseName) => {
        for(const ext of validExtensions) {
            console.log(`checking for ${path.join(folderPath, baseName + ext)}`);
            if(fs.existsSync(path.join(folderPath, baseName + ext))) {
                console.log("Found!");
                return `/decks/${encodeURIComponent(deckName)}/${baseName}${ext}`;
            }
        }
        return null;
    }

    customBackground = findFile("background");
    customCardBack = findFile("card-back");

    const finalDeck = {
        commander: [],
        deck: [],
        theme : {
            background: customBackground,
            cardBack: customCardBack,
        }
    }

    identifiers.forEach(identifier => {
        const key = `${identifier.set}:${identifier.collector_number}`;
        const data = cardMap.get(key);

        if (data) {
            const gameCard = {
                ...data,
                id: Math.random().toString(36).substr(2, 9),
            }

            if(identifier.isCommander) {
                finalDeck.commander.push(gameCard);
            } else {
                finalDeck.deck.push(gameCard);
            }
        }
    })

    console.log("Deck loaded! length: ", finalDeck.deck.length);
    return finalDeck;
}

async function loadTokens(deckName) {
    const folderPath = path.join(resolvePath(config.deckPath), deckName);
    const filePath = path.join(folderPath, 'tokens.txt');

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    // 1. Clean up lines
    const lines = fileContent.split('\n').filter((line) => line.trim() !== '');

    const identifiers = [];

    // 2. Parse each line to extract Name and Set
    lines.forEach(line => {
        // Regex Explanation:
        // ^(.+)   -> Capture everything at the start (The Name)
        // \s+     -> The space before the bracket
        // \[      -> The opening bracket
        // (\w+)   -> Capture the set code (letters/numbers)
        // \]      -> The closing bracket
        const match = line.match(/^(.+)\s+\[(\w+)\]$/);

        if (match) {
            const name = match[1].trim();
            const setCode = match[2].trim();

            identifiers.push({
                name: name,
                set: setCode // Telling Scryfall exactly which art to grab
            });
        }
    });

    // 3. Send Batch Request to Scryfall
    // Note: Scryfall limits this endpoint to 75 cards per request.
    // If you have more than 75 tokens, you'd need to loop this part.
    if (identifiers.length === 0) return [];

    try {
        console.log(`Fetching ${identifiers.length} tokens...`);

        const response = await axios.post('https://api.scryfall.com/cards/collection', {
            identifiers: identifiers
        });

        // 4. Convert Scryfall Data to Your Game Objects
        const validTokens = response.data.data.map(card => {

            // Handle Double-Faced Tokens (like The Ring)
            let imageUrl = card.image_uris?.normal;
            if (!imageUrl && card.card_faces) {
                imageUrl = card.card_faces[0].image_uris?.normal;
            }

            return {
                id: `token_ref_${card.id}`, // Unique ID for the menu
                name: card.name,
                imageUrl: imageUrl,
                type_line: card.type_line,
                isTokenReference: true // Marks this as a menu item, not a playing card
            };
        });

        console.log(`Successfully loaded ${validTokens.length} tokens.`);
        return validTokens;

    } catch (error) {
        console.error("Error loading tokens from Scryfall:", error.message);
        return [];
    }
}

// Example Usage:
// loadTokens('./tokens.txt').then(tokens => {
//     gameState.tokenMenu = tokens;
// });

module.exports = { getDeckList, loadDeck, loadTokens };