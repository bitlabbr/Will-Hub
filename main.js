const { app, BrowserWindow } = require('electron');

// 1. Inicia o seu servidor Node.js (Express + Socket.io) silenciosamente no background
require('./server.js');

let mainWindow;

function createWindow() {
    // 2. Configura a janela do aplicativo
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "Web Party Console",
        autoHideMenuBar: true, // Esconde a barra de menus no Windows/Linux
        webPreferences: {
            nodeIntegration: false // Boa prática de segurança
        }
    });

    // 3. Aguarda 1 segundinho pro Express subir, e aponta a janela para o seu jogo
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
    }, 1000);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// Quando o Electron estiver pronto, cria a janela
app.on('ready', createWindow);

// Fecha o app quando todas as janelas forem fechadas (padrão Windows/Linux)
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
