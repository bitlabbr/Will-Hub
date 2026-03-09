(() => {
    const localContainer = document.getElementById('game-container');

    localContainer.innerHTML = `
        <div style="position: relative; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center;">
            <canvas id="game-canvas" style="background: #2c3e50; box-shadow: 0 0 20px rgba(0,0,0,0.5);"></canvas>
        </div>
    `;

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // Define um tamanho fixo para o "tabuleiro"
    canvas.width = 800;
    canvas.height = 600;

    // Estado interno do jogo
    const playersInGame = {};
    const colors = ['#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];

    // O Listener Principal
    const actionListener = (e) => {
        const action = e.detail;

        if (action.type === 'quit_game') {
            cleanupAndExit();
            return;
        }

        if (action.type === 'move') {
            const id = action.playerId;

            if (!playersInGame[id]) {
                playersInGame[id] = {
                    x: canvas.width / 2 - 25,
                    y: canvas.height / 2 - 25,
                    color: colors[Object.keys(playersInGame).length % colors.length],
                    size: 50
                };
            }

            const player = playersInGame[id];
            const speed = 25;
            const dir = action.payload.direction;

            if (dir === 'up') player.y -= speed;
            if (dir === 'down') player.y += speed;
            if (dir === 'left') player.x -= speed;
            if (dir === 'right') player.x += speed;

            // Colisão com as bordas
            player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
            player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
        }
    };

    window.addEventListener('ClientActionEvent', actionListener);

    // O Loop de Animação
    let animationId;
    function gameLoop() {
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (const id in playersInGame) {
            const p = playersInGame[id];
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, p.size, p.size);
        }

        animationId = requestAnimationFrame(gameLoop);
    }

    // Função de Limpeza ao sair do jogo
    function cleanupAndExit() {
        window.removeEventListener('ClientActionEvent', actionListener);
        cancelAnimationFrame(animationId);
        window.endGameAndReturnToLobby();
    }

    gameLoop();
})();