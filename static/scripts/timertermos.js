document.addEventListener('DOMContentLoaded', function() {
    // Mostra o modal automaticamente
    var termosModal = new bootstrap.Modal(document.getElementById('termosModal'));
    termosModal.show();

    // Timer de 10 segundos
    var timer = 15;
    var timerElement = document.getElementById('timer');
    var btnContinuar = document.getElementById('btnContinuar');

    var countdown = setInterval(function() {
        timer--;
        timerElement.textContent = timer;
        
        if (timer <= 0) {
            clearInterval(countdown);
            btnContinuar.disabled = false;
        }
    }, 1500);

    // Evento de clique no botão continuar
    btnContinuar.addEventListener('click', function() {
        termosModal.hide();
    });
});