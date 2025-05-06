// Função para mostrar notificações
function mostrarNotificacao(mensagem, tipo = 'success') {
    const toast = document.getElementById('toast');
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

// Função para enviar vídeo
function enviarVideo() {
    const form = document.getElementById('uploadForm');
    const formData = new FormData(form);
    
    fetch('/upload_video', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
            modal.hide();
            
            // Limpa o formulário
            form.reset();
            
            // Mostra notificação de sucesso
            mostrarNotificacao('Vídeo enviado com sucesso!');
            
            // Recarrega a página após 1 segundo
            setTimeout(() => {
                window.location.reload();
            }, 1000);
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
        <div class="col-12 col-sm-6 col-lg-4">
            <div class="card h-100">
                <div class="card-body p-2">
                    <video class="w-100 rounded" controls>
                        <source src="${video.url}" type="video/mp4">
                        Seu navegador não suporta o elemento de vídeo.
                    </video>
                    <div class="mt-2">
                        <small class="text-muted d-block mb-1">
                            <i class="fas fa-calendar me-1"></i>${new Date(video.data_upload).toLocaleString()}
                        </small>
                        <a href="${video.url}" download class="btn btn-sm btn-outline-primary w-100">
                            <i class="fas fa-download me-1"></i>Baixar
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Inicialização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Adiciona listener para o formulário de upload
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            enviarVideo();
        });
    }
}); 