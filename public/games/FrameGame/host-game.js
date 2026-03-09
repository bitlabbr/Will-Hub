(() => {
    const localContainer = document.getElementById('game-container');

    // ATUALIZAÇÃO UI: Adicionado o Placar (Esquerda) e Botão Encerrar (Direita)
    localContainer.innerHTML = `
        <div style="position: relative; width: 100%; height: 100vh; background: #2c3e50; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
            
            <div id="tv-scoreboard" style="position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; min-width: 200px;"></div>

            <div id="tv-header" style="position: absolute; top: 20px; right: 30px; font-size: 2em; font-weight: bold; color: #f1c40f;"></div>
            
            <h1 id="tv-title" style="font-size: 3em; margin-bottom: 10px;">Título Mestre</h1>
            <h2 id="tv-subtitle" style="color: #bdc3c7; margin-bottom: 30px;">Aguardando jogadores ficarem prontos...</h2>
            <audio id="game-music" src="/games/FrameGame/data/sound/game-soundtrack.mp3" loop></audio>
            <img id="tv-image" src="" style="display: none; max-width: 800px; max-height: 45vh; border-radius: 15px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); margin-bottom: 30px; object-fit: contain;">
            
            <div id="tv-content" style="width: 80%; display: flex; flex-direction: column; gap: 15px; align-items: center;"></div>

            <button id="btn-end-game" style="position: absolute; bottom: 20px; right: 20px; padding: 15px 25px; background: #c0392b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.2em; font-weight: bold;">Finalizar Partida</button>
        </div>
    `;

    const tvTitle = localContainer.querySelector('#tv-title');
    const tvSubtitle = localContainer.querySelector('#tv-subtitle');
    const tvImage = localContainer.querySelector('#tv-image');
    const tvContent = localContainer.querySelector('#tv-content');
    const tvHeader = localContainer.querySelector('#tv-header');
    const tvScoreboard = localContainer.querySelector('#tv-scoreboard');
    const btnEndGame = localContainer.querySelector('#btn-end-game');
    const gameMusic = localContainer.querySelector('#game-music');
    gameMusic.volume = 0.4;
    gameMusic.play();

    // Estado do Jogo
    const players = window.getConnectedPlayers();
    let scores = {};
    let readyCount = 0;
    let submissions = [];
    let votes = {};
    let timerInterval;
    let currentPhase = 'WAITING'; // WAITING, WRITE, VOTE, END

    // Inicializa placar
    Object.keys(players).forEach(id => scores[id] = 0);

    // ==========================================
    // BARALHO DE IMAGENS
    // ==========================================
    const TOTAL_IMAGENS_IA = 21;
    const GAME_FOLDER_NAME = 'FrameGame';
    let baralhoDisponivel = [];

    function prepararBaralho() {
        baralhoDisponivel = Array.from({length: TOTAL_IMAGENS_IA}, (_, i) => i + 1);
        for (let i = baralhoDisponivel.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [baralhoDisponivel[i], baralhoDisponivel[j]] = [baralhoDisponivel[j], baralhoDisponivel[i]];
        }
    }

    function getProximaImagemLocal() {
        // Se esgotou, retorna null para engatilhar o Game Over
        if (baralhoDisponivel.length === 0) return null;
        const num = baralhoDisponivel.pop();
        return `/games/${GAME_FOLDER_NAME}/data/img/picture_${num}.png`;
    }

    prepararBaralho();

    // ==========================================
    // FUNÇÕES DE UI
    // ==========================================

    function updatePersistentScoreboard() {
        let html = '<div style="font-size: 1.2em; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; color: #bdc3c7;">Ranking</div>';

        // Ordena os jogadores por pontos (maior para o menor)
        const sortedIds = Object.keys(players).sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

        sortedIds.forEach(id => {
            const nome = players[id] ? players[id].name : 'Desconhecido';
            const pontos = scores[id] || 0;
            html += `<div style="font-size: 1.2em; display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>${nome}</span>
                        <span style="color: #2ecc71; font-weight: bold;">${pontos}</span>
                     </div>`;
        });
        tvScoreboard.innerHTML = html;
    }

    function endGameAndShowWinners() {
        currentPhase = 'END';
        clearInterval(timerInterval);
        tvHeader.innerText = "";
        tvTitle.innerText = "Fim de Jogo!";
        tvSubtitle.innerText = "Ranking Final";
        tvImage.style.display = 'none';
        btnEndGame.style.display = 'none'; // Esconde o botão

        // Manda os celulares para a tela de aguardo
        window.broadcastToClients('STATE_WAITING');

        updatePersistentScoreboard(); // Garante o placar final

        const sortedIds = Object.keys(players).sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
        let html = '<div style="display: flex; flex-direction: column; gap: 15px; width: 60%;">';

        sortedIds.forEach((id, index) => {
            let medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👏';
            let pt = scores[id] || 0;
            html += `<div style="background: ${index === 0 ? '#f39c12' : '#34495e'}; padding: 15px 30px; border-radius: 8px; font-size: 1.8em; display: flex; justify-content: space-between;">
                        <span>${medal} ${players[id].name}</span>
                        <b>${pt} pts</b>
                     </div>`;
        });
        html += '</div>';

        // Botão para voltar ao hub principal do console
        html += `<button id="btn-return-lobby" style="margin-top: 40px; padding: 20px 40px; font-size: 1.5em; background: #2ecc71; color: white; border: none; border-radius: 8px; cursor: pointer;">Sair do Jogo</button>`;

        tvContent.innerHTML = html;

        document.getElementById('btn-return-lobby').addEventListener('click', () => {
            gameMusic.pause();
            window.endGameAndReturnToLobby();
        });
    }

    // Botão manual de encerrar jogo na TV
    btnEndGame.addEventListener('click', endGameAndShowWinners);

    // ==========================================
    // MÁQUINA DE ESTADOS DO JOGO
    // ==========================================

    function startRound() {
        if (currentPhase === 'END') return; // Previne recomeço se o jogo acabou
        currentPhase = 'WAITING';
        readyCount = 0;
        submissions = [];
        votes = {};

        updatePersistentScoreboard();
        tvTitle.innerText = "Preparando...";
        tvSubtitle.innerText = "Apertem 'Estou Pronto' no celular.";
        tvImage.style.display = 'none';
        tvContent.innerHTML = '';

        window.broadcastToClients('STATE_READY');
    }

    function startWritingPhase() {
        const imgSrc = getProximaImagemLocal();
        if (!imgSrc) {
            endGameAndShowWinners(); // Acabaram as cartas!
            return;
        }

        currentPhase = 'WRITE';
        tvTitle.innerText = "Escreva um Título!";
        tvSubtitle.innerText = "Você tem 30 segundos.";
        tvImage.src = imgSrc;
        tvImage.style.display = 'block';
        tvContent.innerHTML = '';

        window.broadcastToClients('STATE_WRITE');

        // TIMER DE 30 SEGUNDOS
        let timeLeft = 30;
        tvHeader.innerText = `⏱️ ${timeLeft}s`;
        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            timeLeft--;
            tvHeader.innerText = `⏱️ ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                checkSubmissionsAndAdvance();
            }
        }, 1000);
    }

    function checkSubmissionsAndAdvance() {
        // Se ninguém mandou nada, pula a votação e reinicia a rodada
        if (submissions.length === 0) {
            tvTitle.innerText = "Ninguém mandou nada!";
            tvSubtitle.innerText = "Que falta de criatividade... Pulando rodada.";
            window.broadcastToClients('STATE_WAITING');
            setTimeout(() => startRound(), 5000);
        } else {
            startVotingPhase();
        }
    }

    function startVotingPhase() {
        currentPhase = 'VOTE';
        tvTitle.innerText = "Hora de Votar!";
        tvSubtitle.innerText = "Você tem 15 segundos!";
        tvContent.innerHTML = '';

        submissions.forEach(sub => {
            const div = document.createElement('div');
            div.style.cssText = 'background: #34495e; padding: 15px 30px; font-size: 1.5em; border-radius: 10px; width: 80%; text-align: center;';
            div.innerText = `"${sub.text}"`;
            tvContent.appendChild(div);
        });

        window.broadcastToClients('STATE_VOTE', { titles: submissions });

        // TIMER DE 15 SEGUNDOS
        let timeLeft = 15;
        tvHeader.innerText = `⏱️ ${timeLeft}s`;
        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            timeLeft--;
            tvHeader.innerText = `⏱️ ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                calculateResults();
            }
        }, 1000);
    }

    function calculateResults() {
        currentPhase = 'RESULTS';
        clearInterval(timerInterval);
        tvHeader.innerText = "";

        window.broadcastToClients('STATE_WAITING');

        Object.values(votes).forEach(votedId => {
            if (scores[votedId] !== undefined) scores[votedId] += 1;
        });

        updatePersistentScoreboard();

        tvTitle.innerText = "Resultados!";
        tvImage.style.display = 'none';

        let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        submissions.forEach(sub => {
            let numVotes = Object.values(votes).filter(id => id === sub.playerId).length;
            let autor = players[sub.playerId] ? players[sub.playerId].name : 'Alguém';
            html += `<div style="font-size: 1.5em; background: #2980b9; padding: 10px 20px; border-radius: 8px;">
                        "${sub.text}" - <b>${autor}</b> (+${numVotes} pts)
                     </div>`;
        });
        html += '</div>';
        tvContent.innerHTML = html;

        // A MÁGICA ACONTECE AQUI:
        if (baralhoDisponivel.length === 0) {
            tvSubtitle.innerText = "Calculando ranking final...";
            // Se o baralho acabou, espera 7s para a galera ler a última piada e vai pro pódio!
            setTimeout(() => endGameAndShowWinners(), 5000);
        } else {
            tvSubtitle.innerText = "Próxima rodada em 5 segundos...";
            // Se ainda tem carta, segue o jogo
            setTimeout(() => startRound(), 5000);
        }
    }

    // ==========================================
    // ESCUTANDO OS CELULARES
    // ==========================================
    const actionListener = (e) => {
        const action = e.detail;
        const totalPlayers = Object.keys(players).length;

        if (action.type === 'player_ready' && currentPhase === 'WAITING') {
            readyCount++;
            if (readyCount >= totalPlayers && totalPlayers > 0) startWritingPhase();
        }

        if (action.type === 'submit_title' && currentPhase === 'WRITE') {
            // Verifica se o jogador já enviou para não enviar duas vezes
            if (!submissions.some(s => s.playerId === action.playerId)) {
                submissions.push({ playerId: action.playerId, text: action.payload.text });
            }
            // Se todos enviaram antes dos 30s, avança!
            if (submissions.length >= totalPlayers) {
                clearInterval(timerInterval);
                checkSubmissionsAndAdvance();
            }
        }

        if (action.type === 'submit_vote' && currentPhase === 'VOTE') {
            // REGRA DE NEGÓCIO: O jogador não pode votar no próprio ID
            if (action.playerId !== action.payload.targetPlayerId) {
                votes[action.playerId] = action.payload.targetPlayerId;

                // Se todos votaram, avança!
                if (Object.keys(votes).length >= totalPlayers) calculateResults();
            }
        }
    };

    window.addEventListener('ClientActionEvent', actionListener);

    // Inicia!
    startRound();
})();