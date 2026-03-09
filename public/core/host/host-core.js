const socket = io();

// Elementos da UI
const startScreen = document.getElementById('start-screen');
const lobbyView = document.getElementById('lobby-view');
const gameContainer = document.getElementById('game-container');
const roomCodeDisplay = document.getElementById('room-code-display');
const playersList = document.getElementById('players-list');
const playerCount = document.getElementById('player-count');
const bgMusic = document.getElementById('bg-music');

let players = {};
let activeGameScript = null;

// --- INICIALIZAÇÃO E ÁUDIO ---
document.getElementById('start-btn').addEventListener('click', () => {
    startScreen.style.display = 'none';
    lobbyView.style.display = 'block';

    // Inicia a música
    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => console.log("Áudio bloqueado:", e));

    // Pede ao servidor para criar a sala
    socket.emit('createRoom');
});

// --- GERENCIAMENTO DO LOBBY ---
socket.on('roomCreated', (data) => {
    roomCodeDisplay.innerText = data.code;

    // Monta a URL completa baseada no IP local
    const clientUrl = `http://${data.ip}:3000/core/client`;
    document.getElementById('join-url').innerText = clientUrl;

    // Limpa a div e gera o QR Code apontando para a URL
    const qrContainer = document.getElementById('qrcode-container');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: clientUrl,
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M
    });
});

socket.on('playerJoined', (player) => {
    players[player.id] = player;
    updatePlayersList();
});

socket.on('playerLeft', (data) => {
    delete players[data.playerId];
    updatePlayersList();
});

function updatePlayersList() {
    playersList.innerHTML = '';
    playerCount.innerText = Object.keys(players).length;
    Object.values(players).forEach(p => {
        const li = document.createElement('li');
        li.className = 'player-card';
        li.innerText = p.name;
        playersList.appendChild(li);
    });
}

// --- LANÇAMENTO DE JOGOS (O MICROKERNEL) ---

// O Host clica em um jogo no catálogo
document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
        const gameId = card.getAttribute('data-game-id');
        socket.emit('launchGame', gameId);
    });
});

// O Servidor confirma que o jogo iniciou
socket.on('gameLaunched', (gameId) => {
    lobbyView.style.display = 'none';
    gameContainer.style.display = 'block';
    bgMusic.pause(); // Pausa a música do lobby para o jogo ter seu próprio som

    // Injeta o HTML e o Script do jogo dinamicamente
    loadGamePlugin(gameId);
});

// O Servidor manda voltar para o Lobby
socket.on('backToLobby', () => {
    gameContainer.style.display = 'none';
    gameContainer.innerHTML = ''; // Limpa a DOM do jogo anterior
    lobbyView.style.display = 'block';
    bgMusic.play(); // Volta a música do lobby

    if (activeGameScript) {
        activeGameScript.remove(); // Remove o script da memória
    }
});

// Roteador de Eventos: Pega o evento do celular e despacha internamente na DOM da TV
socket.on('hostGameEvent', (data) => {
    // Cria um evento customizado que o script do jogo (plugin) vai escutar
    const event = new CustomEvent('ClientActionEvent', { detail: data });
    window.dispatchEvent(event);
});

function loadGamePlugin(gameId) {
    // Cria a tag <script src="/games/jogo-de-teste/host-game.js">
    activeGameScript = document.createElement('script');
    activeGameScript.src = `/games/${gameId}/host-game.js`;
    document.body.appendChild(activeGameScript);
}

// Função global para o script do jogo pedir para voltar ao Lobby
window.endGameAndReturnToLobby = () => {
    socket.emit('returnToLobby');
};

// Permite que o jogo na TV envie comandos para os celulares e acesse os jogadores
window.broadcastToClients = (actionType, payloadData = {}) => {
    socket.emit('hostBroadcast', { type: actionType, payload: payloadData });
};
window.getConnectedPlayers = () => players;