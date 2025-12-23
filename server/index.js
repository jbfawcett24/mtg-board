const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { loadDeck, loadTokens, getDeckList} = require('./deckLoader');
const path = require('path');
const { setGameState } = require("./stateManager");
const {homedir} = require("node:os");
const {resolvePath} = require("./pathHandler");

const { createServer } = require("./server");

const staticPath = path.join(__dirname, "../client/dist");

const server = createServer(staticPath, path.resolve("/app/decks"));

server.listen(3001, () => {
    console.log(`Server started on port 3001`);
})