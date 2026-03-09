const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve os arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Objeto em memória para mapear { 'CODIGO_DA_SALA': 'socket_id_do_host' }
const rooms = {};

function generateRoomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

io.on('connection', (socket) => {
    console.log(`Novo dispositivo conectado: ${socket.id}`);

    // --- HOST ---
    socket.on('createRoom', () => {
        let roomCode;
        // Garante que o código é único
        do {
            roomCode = generateRoomCode();
        } while (rooms[roomCode]);

        rooms[roomCode] = socket.id; // Atrela a sala ao Host
        socket.join(roomCode);
        console.log(`Host ${socket.id} criou a sala ${roomCode}`);

        socket.emit('roomCreated', roomCode);
    });

    // --- CLIENT ---
    socket.on('joinRoom', (data) => {
        const { roomCode, playerName } = data;
        const code = roomCode.toUpperCase();

        if (rooms[code]) {
            socket.join(code);
            socket.roomId = code; // Salva o código da sala no socket do client
            socket.playerName = playerName; // Salva o nome

            console.log(`${playerName} entrou na sala ${code}`);

            // Avisa APENAS o Host que um novo jogador entrou
            io.to(rooms[code]).emit('playerJoined', { id: socket.id, name: playerName });

            // Confirma para o Client que ele entrou com sucesso
            socket.emit('joinSuccess');
        } else {
            socket.emit('joinError', 'Sala não encontrada. Verifique o código.');
        }
    });

    socket.on('playerAction', (actionData) => {
        // Se o client está em uma sala válida, repassa a ação para o Host daquela sala
        if (socket.roomId && rooms[socket.roomId]) {
            const hostId = rooms[socket.roomId];
            io.to(hostId).emit('actionReceived', {
                playerId: socket.id,
                playerName: socket.playerName,
                action: actionData
            });
        }
    });

    // --- DESCONEXÃO ---
    socket.on('disconnect', () => {
        // 1. Verifica se quem desconectou foi um Host
        const hostRoomCode = Object.keys(rooms).find(key => rooms[key] === socket.id);
        if (hostRoomCode) {
            console.log(`Host desconectado. Sala ${hostRoomCode} encerrada.`);
            delete rooms[hostRoomCode];
            return;
        }

        // 2. Verifica se quem desconectou foi um Client (Celular)
        if (socket.roomId && rooms[socket.roomId]) {
            const hostId = rooms[socket.roomId];
            console.log(`${socket.playerName} saiu da sala ${socket.roomId}`);

            // Avisa a TV que este jogador específico saiu
            io.to(hostId).emit('playerLeft', { playerId: socket.id, playerName: socket.playerName });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});