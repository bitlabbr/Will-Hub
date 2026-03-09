(() => {
    const localContainer = document.getElementById('controller-container');

    // (O HTML do container continua exatamente o mesmo de antes)
    localContainer.innerHTML = `
        <div id="ui-ready" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
            <button id="btn-im-ready" style="padding: 20px; font-size: 1.5em; background: #3498db; color: white; border: none; border-radius: 10px; width: 80%;">Estou Pronto!</button>
        </div>
        <div id="ui-write" style="display: none; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px;">
            <h3 style="color: white; text-align: center;">Escreva o melhor título:</h3>
            <input type="text" id="input-title" placeholder="Digite aqui..." style="width: 100%; padding: 15px; font-size: 1.2em; border-radius: 8px; margin-bottom: 20px;">
            <button id="btn-send-title" style="padding: 15px; font-size: 1.2em; background: #2ecc71; color: white; border: none; border-radius: 10px; width: 100%;">Enviar</button>
        </div>
        <div id="ui-vote" style="display: none; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px;">
            <h3 style="color: white;">Vote no melhor:</h3>
            <div id="vote-options" style="width: 100%; display: flex; flex-direction: column; gap: 10px;"></div>
        </div>
        <div id="ui-waiting" style="display: none; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
            <h3 style="color: #bdc3c7;">Aguarde a TV...</h3>
        </div>
    `;

    const uiReady = localContainer.querySelector('#ui-ready');
    const uiWrite = localContainer.querySelector('#ui-write');
    const uiVote = localContainer.querySelector('#ui-vote');
    const uiWaiting = localContainer.querySelector('#ui-waiting');

    // NOVA VARIÁVEL: Guarda o que este celular enviou
    let meuTituloEnviado = "";

    localContainer.querySelector('#btn-im-ready').addEventListener('click', () => {
        window.sendGameAction('player_ready');
        showUI(uiWaiting);
    });

    localContainer.querySelector('#btn-send-title').addEventListener('click', () => {
        const title = localContainer.querySelector('#input-title').value.trim();
        if (title) {
            meuTituloEnviado = title; // Salva o título localmente antes de enviar
            window.sendGameAction('submit_title', { text: title });
            localContainer.querySelector('#input-title').value = '';
            showUI(uiWaiting);
        }
    });

    const hostListener = (e) => {
        const action = e.detail;

        if (action.type === 'STATE_READY') showUI(uiReady);
        if (action.type === 'STATE_WRITE') showUI(uiWrite);
        if (action.type === 'STATE_WAITING') showUI(uiWaiting);

        if (action.type === 'STATE_VOTE') {
            showUI(uiVote);
            const voteContainer = localContainer.querySelector('#vote-options');
            voteContainer.innerHTML = '';

            action.payload.titles.forEach(item => {
                const btn = document.createElement('button');
                btn.style.cssText = 'padding: 15px; font-size: 1.2em; background: #9b59b6; color: white; border: none; border-radius: 8px; margin-bottom: 10px;';

                // VERIFICAÇÃO VISUAL: É o meu título?
                if (item.text === meuTituloEnviado) {
                    btn.style.background = '#7f8c8d'; // Fica cinza
                    btn.style.cursor = 'not-allowed';
                    btn.innerText = item.text + " (Seu Título)";
                    btn.disabled = true; // Impede o clique no HTML
                } else {
                    btn.innerText = item.text;
                    btn.onclick = () => {
                        window.sendGameAction('submit_vote', { targetPlayerId: item.playerId });
                        showUI(uiWaiting);
                    };
                }
                voteContainer.appendChild(btn);
            });
        }
    };

    window.addEventListener('HostActionEvent', hostListener);

    function showUI(activeElement) {
        [uiReady, uiWrite, uiVote, uiWaiting].forEach(el => el.style.display = 'none');
        activeElement.style.display = 'flex';
    }
})();