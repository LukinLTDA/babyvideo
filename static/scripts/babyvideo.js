// Função para mostrar notificações
function mostrarNotificacao(mensagem, tipo = 'success') {
    const toast = document.getElementById('toastNotificacao');
    const toastBody = toast.querySelector('.toast-body');
    const toastIcon = toast.querySelector('.fas');
    
    // Atualiza o ícone baseado no tipo
    toastIcon.className = tipo === 'success' ? 'fas fa-check-circle me-2' : 'fas fa-exclamation-circle me-2';
    
    // Atualiza a mensagem
    toastBody.textContent = mensagem;
    
    // Mostra o toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

function getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

// Função para enviar vídeo
function enviarVideo() {
    const form = document.getElementById('formNovoVideo');
    const formData = new FormData(form);
    
    fetch('/novo_video', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoVideo'));
            modal.hide();
            
            // Limpa o formulário
            form.reset();
            
            // Mostra notificação de sucesso
            mostrarNotificacao('Vídeo enviado com sucesso!');
            
            // Adiciona o novo vídeo à lista
            const listaVideos = document.getElementById('listaVideos');
            const novoVideo = criarCardVideo(data.video);
            listaVideos.insertAdjacentHTML('afterbegin', novoVideo);
        } else {
            mostrarNotificacao(data.message || 'Erro ao enviar vídeo', 'error');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarNotificacao('Erro ao enviar vídeo. Tente novamente.', 'error');
    });
}

// Função para criar card de vídeo
function criarCardVideo(video) {
    return `
        <div class="col" data-video-id="${video.id}">
            <div class="card h-100">
                <div class="card-body">
                    <h6 class="card-title">${video.titulo}</h6>
                    <p class="card-text small text-muted">${video.descricao || ''}</p>
                    <div class="ratio ratio-16x9 mb-2">
                        <video controls class="rounded">
                            <source src="${video.url}" type="video/mp4">
                            Seu navegador não suporta o elemento de vídeo.
                        </video>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>
                            ${new Date(video.created_at).toLocaleString()}
                        </small>
                        <a href="${video.url}" download class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-download me-1"></i>Baixar
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Função para lidar com o envio do novo vídeo
function handleNovoVideo(event) {
    event.preventDefault();
    enviarVideo();
    return false;
}

// Função para excluir um vídeo
function excluirVideo(id) {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) {
        return;
    }

    fetch(`/excluir_video/${id}`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const card = document.querySelector(`[data-video-id="${id}"]`);
            if (card) {
                card.remove();
            }
            mostrarNotificacao('Vídeo excluído com sucesso!');
        } else {
            mostrarNotificacao(data.message || 'Erro ao excluir vídeo', 'error');
        }
    })
    .catch(error => {
        console.error('Erro ao excluir vídeo:', error);
        mostrarNotificacao('Erro ao excluir vídeo', 'error');
    });
}

// Inicialização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Não precisamos mais adicionar o listener aqui, pois já temos o onsubmit no HTML
}); 