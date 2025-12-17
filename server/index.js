const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { loadDeck, loadTokens} = require('./deckLoader');
const path = require('path');

const app = express();
app.use(cors());

app.use(express.static(path.join(__dirname, '../client/dist')));

// 2. Handle React Routing (Send index.html for any unknown route)
//    This ensures that if you refresh the page, it doesn't crash.
app.get(/.*/, (req, res) => {
    // Only send index.html if the request isn't for an API or socket
    if (!req.url.startsWith('/socket.io/')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    }
});

const SHARED_SECRET = "mtg2025"

let gameState = {
    commander: [],
    library: [],
    hand: [],
    board: [],
    graveyard: [],
    exile: [],
    tokenList: [],
    tokenBoard: [],
}

loadDeck(path.join(__dirname, 'deck.txt')).then(cards => {
    gameState.commander = cards.commander.map(card => {
        return {
            ...card,
            x: 100,
            y: 100
        }
    });

    gameState.library = cards.deck.sort(() => Math.random() - 0.5);

    gameState.hand = gameState.library.splice(0, 7);

    console.log(`Game ready! Hand: ${gameState.hand.length}, Library: ${gameState.library.length}`);
    console.log(`Commander: ${gameState.commander[0].name}`);
});

loadTokens(path.join(__dirname, 'tokens.txt')).then(cards => {
    gameState.tokenList = cards
    gameState.tokenList.forEach((token) => {
        console.log(token.imageUrl)
    })
})

io.use((socket, next) => {
    const code = socket.handshake.auth.code;
    if (code === SHARED_SECRET) next();
    else next(new Error('Not authorized'));
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.emit('update_state', gameState);

    socket.on('card_update', ({id, changes}) => {
        const card = gameState.board.find(card => card.id === id);
        if (card) {
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

    socket.on("reset_game", () => {
        const zonesToClear = ['board', 'exile', 'hand', 'graveyard', 'library'];
        const foundLibrary = [];

        zonesToClear.forEach(zone => {
            gameState[zone].forEach((card) => {
                delete card.x;
                delete card.y;
                delete card.rotation;

                foundLibrary.push(card);
            })

            gameState[zone] = []
        })

        gameState.tokenBoard = [];

        gameState.library = foundLibrary.sort(() => Math.random() - 0.5);
        gameState.hand = gameState.library.splice(0, 7);

        io.emit('update_state', gameState);
    })

    socket.on("shuffle", () => {
        gameState.library.sort(() => Math.random() - 0.5);

        io.emit('update_state', gameState);
    })

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    })
});

server.listen(3001, () => {
    console.log(`Server started on port 3001`);
})