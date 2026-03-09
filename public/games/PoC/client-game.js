(() => {
    const localContainer = document.getElementById('controller-container');
    localContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: white;">
            <h3 style="margin-bottom: 30px;">Controle (D-Pad)</h3>
            
            <div style="display: grid; grid-template-columns: 80px 80px 80px; gap: 10px;">
                <div></div>
                <button class="btn-dpad" data-dir="up" style="height: 80px; font-size: 2em; border-radius: 15px; background: #3498db; color: white; border: none;">⬆️</button>
                <div></div>
                <button class="btn-dpad" data-dir="left" style="height: 80px; font-size: 2em; border-radius: 15px; background: #3498db; color: white; border: none;">⬅️</button>
                <button class="btn-dpad" data-dir="down" style="height: 80px; font-size: 2em; border-radius: 15px; background: #3498db; color: white; border: none;">⬇️</button>
                <button class="btn-dpad" data-dir="right" style="height: 80px; font-size: 2em; border-radius: 15px; background: #3498db; color: white; border: none;">➡️</button>
            </div>
            
            <button id="btn-quit" style="margin-top: 50px; padding: 15px 30px; font-size: 1.2em; background: #e74c3c; color: white; border: none; border-radius: 8px;">Encerrar Jogo</button>
        </div>
    `;

    // Mapeia os eventos
    localContainer.querySelectorAll('.btn-dpad').forEach(btn => {
        const triggerMove = (e) => {
            e.preventDefault();
            const direction = btn.getAttribute('data-dir');
            window.sendGameAction('move', { direction: direction });
            if (navigator.vibrate) navigator.vibrate(20);
        };

        btn.addEventListener('touchstart', triggerMove);
        btn.addEventListener('mousedown', triggerMove);
    });

    localContainer.querySelector('#btn-quit').addEventListener('click', () => {
        window.sendGameAction('quit_game');
    });
})();