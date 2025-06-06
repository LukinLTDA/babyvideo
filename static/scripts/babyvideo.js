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
    const tituloHtml = video.titulo ? `<h6 class="card-title">Título: ${video.titulo}</h6>` : '';
    const descricaoHtml = video.descricao ? `<p class="card-text small text-muted">Descrição: ${video.descricao}</p>` : '';
    
    return `
        <div class="col" data-video-id="${video.id}">
            <div class="card h-100">
                <div class="card-body">
                    ${tituloHtml}
                    ${descricaoHtml}
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
async function handleNovoVideo(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        // Mostra o loading no sidebar
        const pacienteNome = document.querySelector('.text-muted.mb-0').textContent.split(': ')[1];
        const uploadId = mostrarLoadingVideo(pacienteNome);
        
        // Fecha o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoVideo'));
        modal.hide();
        
        const response = await fetch('/novo_video', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Adiciona o novo vídeo à lista
            const video = data.video;
            const tituloHtml = video.titulo ? `<h6 class="card-title">Título: ${video.titulo}</h6>` : '';
            const descricaoHtml = video.descricao ? `<p class="card-text small text-muted">Descrição: ${video.descricao}</p>` : '';
            const videoHtml = `
                <div class="col" data-video-id="${video.id}">
                    <div class="card h-100">
                        <div class="card-body">
                            ${tituloHtml}
                            ${descricaoHtml}
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
                                <button class="btn btn-sm btn-outline-danger" onclick="excluirVideo('${video.id}', '${video.titulo}')">
                                    <i class="fas fa-trash me-1"></i>Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Insere o novo vídeo na lista
            document.getElementById('listaVideos').insertAdjacentHTML('afterbegin', videoHtml);
            
            // Mostra mensagem de sucesso e finaliza o loading
            mostrarSucessoUpload(uploadId);
            mostrarNotificacao('Vídeo adicionado com sucesso!', 'success');
            
            // Limpa o formulário
            form.reset();
        } else {
            mostrarErroUpload(data.message || 'Erro ao enviar vídeo', uploadId);
            mostrarNotificacao(data.message || 'Erro ao enviar vídeo', 'error');
        }
    } catch (error) {
        console.error('Erro ao adicionar vídeo:', error);
        const uploadId = document.querySelector('.loading-component')?.id?.split('-')[1];
        mostrarErroUpload('Erro ao adicionar vídeo. Tente novamente.', uploadId);
        mostrarNotificacao('Erro ao adicionar vídeo. Tente novamente.', 'error');
    }
}

// Função para excluir um vídeo
function excluirVideo(id, titulo) {
    // Configura o modal de confirmação
    document.getElementById('tituloVideoExclusao').textContent = titulo;
    
    // Configura o botão de confirmação
    const btnConfirmar = document.getElementById('btnConfirmarExclusao');
    btnConfirmar.onclick = async () => {
        try {
            const response = await fetch(`/excluir_video/${id}`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                const card = document.querySelector(`[data-video-id="${id}"]`);
                if (card) {
                    card.remove();
                }
                mostrarNotificacao('Vídeo excluído com sucesso!');
                
                // Fecha o modal de confirmação
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmacaoExclusao'));
                modal.hide();
            } else {
                mostrarNotificacao(data.message || 'Erro ao excluir vídeo', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir vídeo:', error);
            mostrarNotificacao('Erro ao excluir vídeo', 'error');
        }
    };
    
    // Abre o modal de confirmação
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmacaoExclusao'));
    modal.show();
}

// Função para mostrar o card de loading durante o upload
function mostrarLoadingVideo(nomePaciente) {
    const uploadId = Date.now();
    const sidebar = document.getElementById('articleSidebar');
    const uploadsContainer = document.getElementById('uploadsContainer');
    
    // Cria o componente de loading
    const loadingComponent = document.createElement('div');
    loadingComponent.className = 'loading-component';
    loadingComponent.id = `loading-${uploadId}`;
    loadingComponent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-1">
            <small class="text-muted">${nomePaciente}</small>
            <small class="text-muted">0%</small>
        </div>
        <div class="progress" style="height: 6px;">
            <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                 role="progressbar" 
                 style="width: 0%" 
                 aria-valuenow="0" 
                 aria-valuemin="0" 
                 aria-valuemax="100">
            </div>
        </div>
        <small class="text-muted d-block mt-1">Iniciando upload...</small>
    `;
    
    // Adiciona o componente ao container
    if (uploadsContainer) {
        uploadsContainer.insertBefore(loadingComponent, uploadsContainer.firstChild);
    }

    // Ativa a sidebar
    if (sidebar) {
        sidebar.classList.add('active');
    }

    // Salva o estado no localStorage
    const uploadsInfo = JSON.parse(localStorage.getItem('currentUploads') || '{}');
    uploadsInfo[uploadId] = {
        nomePaciente: nomePaciente,
        progress: 0,
        status: 'uploading',
        timestamp: Date.now()
    };
    localStorage.setItem('currentUploads', JSON.stringify(uploadsInfo));

    // Simular progresso do upload
    let progress = 0;
    const progressBar = loadingComponent.querySelector('.progress-bar');
    const progressText = loadingComponent.querySelector('small:last-child');
    const progressPercent = loadingComponent.querySelector('small:nth-child(2)');

    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
        }
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        progressPercent.textContent = `${Math.round(progress)}%`;
        
        // Atualiza o progresso no localStorage
        uploadsInfo[uploadId].progress = progress;
        localStorage.setItem('currentUploads', JSON.stringify(uploadsInfo));
        
        if (progress < 30) {
            progressText.textContent = 'Iniciando upload...';
        } else if (progress < 60) {
            progressText.textContent = 'Enviando vídeo...';
        } else if (progress < 90) {
            progressText.textContent = 'Processando vídeo...';
        } else {
            progressText.textContent = 'Finalizando...';
        }
    }, 500);

    return uploadId;
}

// Função para mostrar sucesso no upload
function mostrarSucessoUpload(uploadId) {
    const loadingComponent = document.getElementById(`loading-${uploadId}`);
    if (!loadingComponent) return;

    const progressBar = loadingComponent.querySelector('.progress-bar');
    const progressText = loadingComponent.querySelector('small:last-child');
    const progressPercent = loadingComponent.querySelector('small:nth-child(2)');

    // Atualizar para 100%
    progressBar.style.width = '100%';
    progressBar.setAttribute('aria-valuenow', 100);
    progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
    progressBar.classList.add('bg-success');
    progressPercent.textContent = '100%';

    // Mostrar mensagem de sucesso
    progressText.innerHTML = `
        <span class="loading-success">
            <i class="fas fa-check-circle success-icon"></i>
            Upload concluído com sucesso!
        </span>
    `;

    // Remover o componente após 2 segundos
    setTimeout(() => {
        loadingComponent.classList.add('removing');
        setTimeout(() => {
            loadingComponent.remove();
            
            // Remove do localStorage
            const uploadsInfo = JSON.parse(localStorage.getItem('currentUploads') || '{}');
            delete uploadsInfo[uploadId];
            localStorage.setItem('currentUploads', JSON.stringify(uploadsInfo));
            
            // Verifica se ainda existem outros uploads
            const uploadsContainer = document.getElementById('uploadsContainer');
            if (uploadsContainer && uploadsContainer.children.length === 0) {
                const sidebar = document.getElementById('articleSidebar');
                if (sidebar) {
                    sidebar.classList.remove('active');
                }
                // Limpa completamente o localStorage se não houver mais uploads
                localStorage.removeItem('currentUploads');
            }
        }, 300);
    }, 2000);
}

// Função para mostrar erro no upload
function mostrarErroUpload(mensagem, uploadId) {
    const loadingComponent = document.getElementById(`loading-${uploadId}`);
    if (!loadingComponent) return;

    const progressBar = loadingComponent.querySelector('.progress-bar');
    const progressText = loadingComponent.querySelector('small:last-child');
    const progressPercent = loadingComponent.querySelector('small:nth-child(2)');

    // Atualizar para o progresso atual
    const progress = parseInt(progressBar.getAttribute('aria-valuenow'));
    progressBar.style.width = `${progress}%`;
    progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
    progressBar.classList.add('bg-danger');

    // Mostrar mensagem de erro
    progressText.innerHTML = `
        <span class="loading-error">
            <i class="fas fa-exclamation-circle error-icon"></i>
            ${mensagem || 'Erro ao enviar vídeo'}
        </span>
    `;

    // Remover o componente após 2 segundos
    setTimeout(() => {
        loadingComponent.classList.add('removing');
        setTimeout(() => {
            loadingComponent.remove();
            
            // Remove do localStorage
            const uploadsInfo = JSON.parse(localStorage.getItem('currentUploads') || '{}');
            delete uploadsInfo[uploadId];
            localStorage.setItem('currentUploads', JSON.stringify(uploadsInfo));
            
            // Verifica se ainda existem outros uploads
            const uploadsContainer = document.getElementById('uploadsContainer');
            if (uploadsContainer && uploadsContainer.children.length === 0) {
                const sidebar = document.getElementById('articleSidebar');
                if (sidebar) {
                    sidebar.classList.remove('active');
                }
                // Limpa completamente o localStorage se não houver mais uploads
                localStorage.removeItem('currentUploads');
            }
        }, 300);
    }, 2000);
}

// Função para verificar e restaurar uploads em andamento
function verificarUploadsEmAndamento() {
    const uploadsInfo = JSON.parse(localStorage.getItem('currentUploads') || '{}');
    const sidebar = document.getElementById('articleSidebar');
    const uploadsContainer = document.getElementById('uploadsContainer');
    
    if (Object.keys(uploadsInfo).length > 0 && sidebar && uploadsContainer) {
        // Limpa os cards existentes antes de restaurar
        uploadsContainer.innerHTML = '';
        
        // Ativa a sidebar se houver uploads
        sidebar.classList.add('active');
        
        // Restaura cada upload
        Object.entries(uploadsInfo).forEach(([uploadId, info]) => {
            if (info.status === 'uploading') {
                // Recria o componente de loading
                const loadingComponent = document.createElement('div');
                loadingComponent.className = 'loading-component';
                loadingComponent.id = `loading-${uploadId}`;
                loadingComponent.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <small class="text-muted">${info.nomePaciente}</small>
                        <small class="text-muted">${Math.round(info.progress)}%</small>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                             role="progressbar" 
                             style="width: ${info.progress}%" 
                             aria-valuenow="${info.progress}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted d-block mt-1">
                        ${info.progress < 30 ? 'Iniciando upload...' :
                          info.progress < 60 ? 'Enviando vídeo...' :
                          info.progress < 90 ? 'Processando vídeo...' :
                          'Finalizando...'}
                    </small>
                `;
                
                uploadsContainer.insertBefore(loadingComponent, uploadsContainer.firstChild);

                // Reinicia a animação do progresso se ainda estiver em andamento
                if (info.progress < 100) {
                    let progress = info.progress;
                    const progressBar = loadingComponent.querySelector('.progress-bar');
                    const progressText = loadingComponent.querySelector('small:last-child');
                    const progressPercent = loadingComponent.querySelector('small:nth-child(2)');

                    const interval = setInterval(() => {
                        progress += Math.random() * 10;
                        if (progress >= 100) {
                            progress = 100;
                            clearInterval(interval);
                            
                            // Atualiza o estado para sucesso
                            const currentUploads = JSON.parse(localStorage.getItem('currentUploads') || '{}');
                            if (currentUploads[uploadId]) {
                                currentUploads[uploadId].status = 'success';
                                currentUploads[uploadId].progress = 100;
                                localStorage.setItem('currentUploads', JSON.stringify(currentUploads));
                                
                                // Mostra mensagem de sucesso
                                progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                                progressBar.classList.add('bg-success');
                                progressText.innerHTML = `
                                    <span class="loading-success">
                                        <i class="fas fa-check-circle success-icon"></i>
                                        Upload concluído com sucesso!
                                    </span>
                                `;
                                
                                // Remove o card após 2 segundos
                                setTimeout(() => {
                                    loadingComponent.classList.add('removing');
                                    setTimeout(() => {
                                        loadingComponent.remove();
                                        
                                        // Remove do localStorage
                                        const uploadsInfo = JSON.parse(localStorage.getItem('currentUploads') || '{}');
                                        delete uploadsInfo[uploadId];
                                        localStorage.setItem('currentUploads', JSON.stringify(uploadsInfo));
                                        
                                        // Se não houver mais uploads, esconde a sidebar e limpa o localStorage
                                        if (Object.keys(uploadsInfo).length === 0) {
                                            sidebar.classList.remove('active');
                                            localStorage.removeItem('currentUploads');
                                        }
                                    }, 300);
                                }, 2000);
                            }
                        }
                        
                        progressBar.style.width = `${progress}%`;
                        progressBar.setAttribute('aria-valuenow', progress);
                        progressPercent.textContent = `${Math.round(progress)}%`;
                        
                        // Atualiza o progresso no localStorage
                        const currentUploads = JSON.parse(localStorage.getItem('currentUploads') || '{}');
                        if (currentUploads[uploadId]) {
                            currentUploads[uploadId].progress = progress;
                            localStorage.setItem('currentUploads', JSON.stringify(currentUploads));
                        }
                        
                        if (progress < 30) {
                            progressText.textContent = 'Iniciando upload...';
                        } else if (progress < 60) {
                            progressText.textContent = 'Enviando vídeo...';
                        } else if (progress < 90) {
                            progressText.textContent = 'Processando vídeo...';
                        } else {
                            progressText.textContent = 'Finalizando...';
                        }
                    }, 500);
                }
            }
        });
    } else if (sidebar) {
        // Se não houver uploads, esconde a sidebar e limpa o localStorage
        sidebar.classList.remove('active');
        localStorage.removeItem('currentUploads');
    }
}

// Função para fechar o artigo
function fecharArtigo() {
    const sidebar = document.getElementById('articleSidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

// Inicialização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    verificarUploadsEmAndamento();
    
    // Adiciona listener para mudanças no localStorage
    window.addEventListener('storage', function(e) {
        if (e.key === 'currentUploads') {
            verificarUploadsEmAndamento();
        }
    });
}); 