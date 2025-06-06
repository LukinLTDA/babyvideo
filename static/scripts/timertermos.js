document.addEventListener('DOMContentLoaded', function() {
    const timerElement = document.getElementById('timer');
    const btnContinuar = document.getElementById('btnContinuar');
    const aceitarTermos = document.getElementById('aceitarTermos');
    let timeLeft = 5;
    let timerInterval;

    // Função para atualizar o botão baseado no timer e checkbox
    function updateButtonState() {
        btnContinuar.disabled = timeLeft > 0 || !aceitarTermos.checked;
    }

    // Iniciar o timer quando o modal for aberto
    const termosModal = document.getElementById('termosModal');
    termosModal.addEventListener('show.bs.modal', function() {
        timeLeft = 5;
        timerElement.textContent = timeLeft;
        btnContinuar.disabled = true;
        aceitarTermos.checked = false;

        timerInterval = setInterval(function() {
            timeLeft--;
            timerElement.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                updateButtonState();
            }
        }, 1000);
    });

    // Limpar o timer quando o modal for fechado
    termosModal.addEventListener('hidden.bs.modal', function() {
        clearInterval(timerInterval);
    });

    // Atualizar o estado do botão quando o checkbox for alterado
    aceitarTermos.addEventListener('change', updateButtonState);

    // Mostrar o modal automaticamente quando a página carregar
    const modal = new bootstrap.Modal(termosModal);
    modal.show();

    // Adicionar evento de clique no botão continuar
    btnContinuar.addEventListener('click', function() {
        modal.hide();
    });
});