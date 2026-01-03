const express = require("express");
const http = require('http');
const { Server } = require('socket.io');
const cors = require("cors");
const path = require("path");
const {getDeckList} = require("./deckLoader");
const {setGameState, getLocalIp} = require("./stateManager");
const { exec } = require("child_process");
const { getDeckFromURL } = require("./getDeck");

async function createServer(staticPath, deckPath) {
    const app = express();
    app.use(cors());

    app.use(express.static(staticPath));

    console.log(`Getting decks from: ${deckPath}`);
    app.use("/decks", express.static(deckPath));

    app.get(/.*/, (req, res) => {
        if (!req.url.startsWith('/socket.io/')) {
            res.sendFile(path.join(staticPath, 'index.html'));
        }
    });

    const server = http.createServer(app);
    const io = new Server(server, {cors: {origin: "*", methods: ["GET", "POST"]}})

    const SHARED_SECRET = "mtg2025"

    let gameState = { // Initialize with empty defaults so it never crashes
        board: [], hand: [], commander: [], exile: [], graveyard: [], library: [], tokenBoard: [], tokens: []
    };

    let decks = await getDeckList(deckPath).then((decks) => {
        if(decks && decks.length >= 1) {
            setGameState(decks[0].name, deckPath).then(initialDeck => {
                gameState = initialDeck;
                console.log("Initial game loaded")
            });
        }
    });

    io.use((socket, next) => {
        const code = socket.handshake.auth.code;
        if (code === SHARED_SECRET) next();
        else next(new Error('Not authorized'));
    });

    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.emit('update_state', gameState);

        if (decks) {
            console.log("decks found, sending");
            io.emit("decks_loaded", decks);
        } else {
            io.emit("no_decks");
        }

        socket.on("refresh_decks", async () => {
            const foundDecks = await getDeckList(deckPath);
            if (foundDecks && foundDecks.length > 0) {
                // gameState = await setGameState(foundDecks[0].name, deckPath);
                // console.log("Initial game loaded from refresh");
                io.emit("decks_loaded", {decks: foundDecks, ip: getLocalIp()});
            } else {
                io.emit("no_decks");
            }
        })

        socket.on('card_update', ({id, changes}) => {
            let card = gameState.board.find(card => card.id === id);

            if(!card) {
                card = gameState.tokenBoard.find(card => card.id === id);
            }

            if(!card) {
                card = gameState.commander.find(card => card.id === id);
            }

            if(!card) {
                card = gameState.hand.find(card => card.id === id)
            }

            if (card) {
                console.log("card found, making changes");
                Object.assign(card, changes);
                io.emit('update_state', gameState);
            }
        })

        socket.on("play_card", (id) => {
            const cardIndex = gameState.hand.findIndex(hand => hand.id === id);

            if (cardIndex !== -1) {
                const [card] = gameState.hand.splice(cardIndex, 1);

                card.x = 200 + (Math.random() * 50)
                card.y = 200 + (Math.random() * 50)

                gameState.board.push(card);

                io.emit('update_state', gameState);
                console.log(`Played Card: ${card.name}`);
            }
        })

        socket.on("play_token", (id) => {
            const card = gameState.tokenList.find(token => token.id === id);

            if(card) {
                const newToken = {
                    ...card, // Copy name, image, type_line
                    id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
                    x: 200 + (Math.random() * 50),
                    y: 200 + (Math.random() * 50),
                    rotation: 0,
                    isToken: true // Mark as token
                };

                gameState.tokenBoard.push(newToken);
            }
            io.emit('update_state', gameState);
        })

        socket.on("draw_card", () => {
            if (gameState.library.length > 0) {
                const card = gameState.library.pop();
                gameState.hand.push(card)
                io.emit('update_state', gameState);
                console.log(`Player drew card: ${card.name}`);
            } else {
                console.log("Library Empty");
            }
        })

        socket.on('move_zone', ({ cardId, targetZone, position}) => {
            const findAndRemoveCard = () => {
                const allZones = ['hand', 'board', 'graveyard', 'exile', 'library', 'tokenBoard'];
                for (const zone of allZones) {
                    const index = gameState[zone].findIndex(c => c.id === cardId);
                    if (index !== -1) {
                        return gameState[zone].splice(index, 1)[0];
                    }
                }
                return null
            }
            const card = findAndRemoveCard();

            if (card) {
                if ((card.isToken || card.isTokenReference) && targetZone !== 'board' && targetZone !== 'tokenBoard') {
                    console.log(`Token ${card.name} ceased to exist (Poof).`);
                    io.emit('update_state', gameState);
                    return; // STOP EXECUTION HERE
                }

                delete card.x;
                delete card.y;
                delete card.rotation;

                if (targetZone === 'library') {
                    if (position === 'top') {
                        gameState.library.push(card);
                    } else if (position === 'bottom') {
                        gameState.library.unshift(card);
                    } else if (typeof position === 'number') {
                        console.log(`Moving ${card.name} to ${position} in library`);
                        let targetIndex = gameState.library.length - position;
                        const safeIndex = Math.min(Math.max(0, targetIndex), gameState.library.length);
                        gameState.library.splice(safeIndex, 0, card);
                    } else {
                        gameState.library.unshift(card);
                    }

                } else if (targetZone === 'board') {
                    card.x = 200 + (Math.random() * 50)
                    card.y = 200 + (Math.random() * 50)
                    gameState.board.push(card);
                } else if (gameState[targetZone]) {
                    gameState[targetZone].push(card);
                }
            }

            io.emit('update_state', gameState);
        })

// 1. Make the callback async
        socket.on("reset_game", async () => {

            // 2. Await the deck list here
            const currentDecks = await getDeckList(deckPath);

            // 3. Send the actual data
            io.emit('select_deck', currentDecks);

            console.log(`Game restarted, sending deck list...`);
        });

        socket.on('deck_selected', async (deck) => {
            console.log(`Deck selected: ${deck.deckName}`);

            gameState = await setGameState(deck.deckName, deckPath);
            io.emit('update_state', gameState);
        })

        socket.on("shuffle", () => {
            gameState.library.sort(() => Math.random() - 0.5);

            io.emit('update_state', gameState);
        })

        socket.on("add_counter", ({id, changes}) => {
            const checkZones = ["commander", "board","tokenBoard"];

            let foundCard = null;
            for (const zone of checkZones) {
                // Safety check: ensure the zone actually exists in gameState
                if (gameState[zone]) {
                    const card = gameState[zone].find(c => c.id === id);

                    // 2. If we found it, save it and STOP looking
                    if (card) {
                        foundCard = card;
                        break;
                    }
                }
            }

            foundCard.power = (foundCard.power || 0) + changes.power
            foundCard.toughness = (foundCard.toughness || 0) + changes.toughness;

            io.emit("update_state", gameState);
        })

        socket.on("add_generic", ({id, num}) => {
            const checkZones = ["commander", "board","tokenBoard"];

            let foundCard = null;
            for (const zone of checkZones) {
                // Safety check: ensure the zone actually exists in gameState
                if (gameState[zone]) {
                    const card = gameState[zone].find(c => c.id === id);

                    // 2. If we found it, save it and STOP looking
                    if (card) {
                        foundCard = card;
                        break;
                    }
                }
            }

            foundCard.counters = (foundCard.counters || 0) + num;

            io.emit("update_state", gameState);
        })

        socket.on("open_folder", () => {
            let command;
            switch (process.platform) {
                case 'darwin': // MacOS
                    command = `open "${deckPath}"`;
                    break;
                case "win32": // Windows
                    command = `start "" "${deckPath}"`;
                    break;
                default: // Linux
                    command = `xdg-open "${deckPath}"`;
                    break;
            }
            exec(command, (error) => {
                if (error) {
                    console.error("Could not open folder:", error);
                }
            });
        })

        socket.on('create_new_deck', async (url) => {
            try {
                console.log(`Attempting to import deck from: ${url}`);
                await getDeckFromURL(url, deckPath);

                // Success! Now auto-refresh the decks
                const decks = await getDeckList(deckPath);
                io.emit("decks_loaded", { decks, ip: getLocalIp() });

            } catch (err) {
                console.error("Import failed:", err);
                // Send specific error message back to the client who requested it
                socket.emit("import_error", err.message || "Failed to import deck");
            }
        })

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        })
    });

    return server;
}

module.exports = { createServer };