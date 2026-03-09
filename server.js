const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Roteamento de arquivos estáticos apontando para a nova estrutura
app.use('/core', express.static(path.join(__dirname, 'public/core')));
app.use('/games', express.static(path.join(__dirname, 'public/games')));

// Rota raiz redireciona para o Hub do Host
app.get('/', (req, res) => res.redirect('/core/host'));

const rooms = {};

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

io.on('connection', (socket) => {
    console.log(`Dispositivo conectado: ${socket.id}`);

    // ===============
    // LÓGICA DO CORE
    // ==============

    socket.on('createRoom', () => {
        let roomCode;
        do { roomCode = generateRoomCode(); } while (rooms[roomCode]);

        // Inicializa o estado complexo da sala
        rooms[roomCode] = {
            hostId: socket.id,
            status: 'LOBBY',
            players: {}
        };

        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
    });

    socket.on('joinRoom', ({ roomCode, playerName }) => {
        const code = roomCode.toUpperCase();
        const room = rooms[code];

        if (room) {
            socket.join(code);
            socket.roomId = code;

            // Registra o jogador no estado da sala
            room.players[socket.id] = { id: socket.id, name: playerName };

            // Avisa o Host e confirma para o Client
            io.to(room.hostId).emit('playerJoined', room.players[socket.id]);
            socket.emit('joinSuccess', { roomCode: code, status: room.status });
        } else {
            socket.emit('joinError', 'Sala não encontrada.');
        }
    });

    // ============
    // DISPATCHER
    // ===========

    socket.on('launchGame', (gameId) => {
        const roomCode = Object.keys(rooms).find(key => rooms[key].hostId === socket.id);
        if (roomCode) {
            rooms[roomCode].status = gameId; // Muda o estado da sala para o jogo escolhido
            // Avisa todos na sala (Host e Clients) para carregarem os scripts desse jogo
            io.to(roomCode).emit('gameLaunched', gameId);
            console.log(`Sala ${roomCode} iniciou o jogo: ${gameId}`);
        }
    });

    // O Host decide voltar para o Lobby Principal
    socket.on('returnToLobby', () => {
        const roomCode = Object.keys(rooms).find(key => rooms[key].hostId === socket.id);
        if (roomCode) {
            rooms[roomCode].status = 'LOBBY';
            io.to(roomCode).emit('backToLobby');
        }
    });

    // Payload esperado: { type: 'move_left', payload: { speed: 5 } }
    socket.on('gameEvent', (eventData) => {
        if (socket.roomId && rooms[socket.roomId]) {
            const hostId = rooms[socket.roomId].hostId;
            // Repassa o evento para a TV embutindo quem foi o autor
            io.to(hostId).emit('hostGameEvent', {
                playerId: socket.id,
                ...eventData
            });
        }
    });

    // ==========================
    // CICLO DE VIDA E DESCONEXÃO
    // =========================
    socket.on('disconnect', () => {
        // Verifica se era um Host
        const hostRoomCode = Object.keys(rooms).find(key => rooms[key] && rooms[key].hostId === socket.id);
        if (hostRoomCode) {
            delete rooms[hostRoomCode];
            return;
        }

        // Verifica se era um Client
        if (socket.roomId && rooms[socket.roomId]) {
            const room = rooms[socket.roomId];
            const playerName = room.players[socket.id]?.name;

            delete room.players[socket.id];
            io.to(room.hostId).emit('playerLeft', { playerId: socket.id, playerName });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor Hub rodando em http://localhost:${PORT}`));