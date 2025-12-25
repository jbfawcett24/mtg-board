const {app, BrowserWindow, Menu } = require('electron');
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

    const template = [
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                { role: 'resetZoom' },
                {
                    label: 'Zoom In',
                    // Force the shortcut to be Ctrl + Equal sign (no Shift needed)
                    accelerator: 'CommandOrControl+=',
                    role: 'zoomIn'
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CommandOrControl+-',
                    role: 'zoomOut'
                },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);


    mainWindow = new BrowserWindow({fullscreen: true, webPreferences: {
            zoomFactor: 1.0,
            contextIsolation: false
        }});
    mainWindow.loadURL('http://localhost:3001');
    //mainWindow.webContents.setVisualZoomLevelLimits(-5, 5)

}

app.disableHardwareAcceleration();

app.whenReady().then(startApp)