const {app, BrowserWindow } = require('electron');
const path = require('path');
const { createServer } = require('./server');
const fs = require("node:fs");

let mainWindow;

app.commandLine.appendSwitch('touch-events', 'enabled');

// Optional: Prevents native "pinch to zoom" if that interferes with your game
app.commandLine.appendSwitch('disable-pinch');
app.commandLine.appendSwitch('enable-viewport-meta-pinch', 'true');

function startApp() {
    const staticPath = app.isPackaged
        ? path.join(__dirname, 'client/dist')   // Production: Inside the app
        : path.join(__dirname, '../client/dist');

    const docPath = app.getPath('documents');
    const deckPath = path.join(docPath, 'MTG-Board', 'Decks');

    if(!fs.existsSync(deckPath)) {
        fs.mkdirSync(deckPath, {recursive: true});
    }

    const server = createServer(staticPath, deckPath);
    server.listen(3001, '0.0.0.0', () => {
        console.log("Electron backend started on port 3001")
    });

    mainWindow = new BrowserWindow({fullscreen: true});
    mainWindow.loadURL('http://localhost:3001');
}

app.disableHardwareAcceleration();

app.whenReady().then(startApp)