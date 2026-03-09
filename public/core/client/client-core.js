const socket = io();

const loginView = document.getElementById('login-view');
const waitingView = document.getElementById('waiting-view');
const controllerContainer = document.getElementById('controller-container');

let activeControllerScript = null;

// --- LOGIN ---
document.getElementById('join-btn').addEventListener('click', () => {
    const roomCode = document.getElementById('room-code').value.trim();
    const playerName = document.getElementById('player-name').value.trim();
    if(roomCode && playerName) {
        socket.emit('joinRoom', { roomCode, playerName });
    }
});

socket.on('joinError', msg => alert(msg));

socket.on('joinSuccess', (data) => {
    loginView.style.display = 'none';

    // Se o jogador entrou no meio de uma partida, carrega o jogo direto
    if (data.status !== 'LOBBY') {
        loadControllerPlugin(data.status);
    } else {
        waitingView.style.display = 'block';
    }
});

// --- LANÇAMENTO DE JOGOS ---
socket.on('gameLaunched', (gameId) => {
    waitingView.style.display = 'none';
    loadControllerPlugin(gameId);
});

socket.on('backToLobby', () => {
    controllerContainer.style.display = 'none';
    controllerContainer.innerHTML = ''; // Limpa a interface do controle
    waitingView.style.display = 'block';
    if (activeControllerScript) activeControllerScript.remove();
});

function loadControllerPlugin(gameId) {
    controllerContainer.style.display = 'block';

    // Injeta o script do controle específico do jogo
    activeControllerScript = document.createElement('script');
    activeControllerScript.src = `/games/${gameId}/client-game.js`;
    document.body.appendChild(activeControllerScript);
}

// Função global para o script do celular enviar comandos pro servidor
window.sendGameAction = (actionType, payloadData = {}) => {
    socket.emit('gameEvent', {
        type: actionType,
        payload: payloadData
    });
};

// Ouve a TV e despacha para o script do jogo no celular
socket.on('hostGameEventToClient', (data) => {
    const event = new CustomEvent('HostActionEvent', { detail: data });
    window.dispatchEvent(event);
});