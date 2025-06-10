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

// Função para lidar com o novo médico
function handleNovoMedico(event) {
    event.preventDefault();
    
    const form = document.getElementById('formNovoMedico');
    const formData = new FormData(form);
    
    fetch('/novo_medico', {
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoMedico'));
            modal.hide();
            
            // Limpa o formulário
            form.reset();
            
            // Mostra notificação de sucesso
            mostrarNotificacao('Médico cadastrado com sucesso!');
            
            // Recarrega a página após 1 segundo
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            mostrarNotificacao(data.message || 'Erro ao cadastrar médico', 'error');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarNotificacao('Erro ao cadastrar médico. Tente novamente.', 'error');
    });
    
    return false;
}

// Função para editar médico
function editarMedico(id) {
    fetch(`/medico/${id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('edit_medico_id').value = data.id;
            document.getElementById('edit_nome').value = data.nome;
            document.getElementById('edit_crm').value = data.crm;
            document.getElementById('edit_especialidade').value = data.especialidade;
            
            const modal = new bootstrap.Modal(document.getElementById('modalEditarMedico'));
            modal.show();
        })
        .catch(error => {
            console.error('Erro:', error);
            mostrarNotificacao('Erro ao carregar dados do médico', 'error');
        });
}

// Função para lidar com a edição do médico
function handleEditarMedico(event) {
    event.preventDefault();
    
    const form = document.getElementById('formEditarMedico');
    const formData = new FormData(form);
    
    fetch('/editar_medico', {
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarMedico'));
            modal.hide();
            
            // Mostra notificação de sucesso
            mostrarNotificacao('Médico atualizado com sucesso!');
            
            // Recarrega a página após 1 segundo
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            mostrarNotificacao(data.message || 'Erro ao atualizar médico', 'error');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarNotificacao('Erro ao atualizar médico. Tente novamente.', 'error');
    });
    
    return false;
}

// Função para confirmar exclusão
function confirmarExclusao(id, nome) {
    document.getElementById('nomeMedicoExclusao').textContent = decodeURIComponent(nome);
    document.getElementById('btnConfirmarExclusao').onclick = () => excluirMedico(id);
    
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmacaoExclusao'));
    modal.show();
}

// Função para excluir médico
function excluirMedico(id) {
    fetch(`/excluir_medico/${id}`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmacaoExclusao'));
            modal.hide();
            
            // Mostra notificação de sucesso
            mostrarNotificacao('Médico excluído com sucesso!');
            
            // Recarrega a página após 1 segundo
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            mostrarNotificacao(data.message || 'Erro ao excluir médico', 'error');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarNotificacao('Erro ao excluir médico. Tente novamente.', 'error');
    });
}

let medicoIdAtual = null;

function mascaralaudo(id) {
    medicoIdAtual = id;
    // Abre o modal
    const modal = new bootstrap.Modal(document.getElementById('mascaralaudoModal'));
    modal.show();
}

function salvarMascaralaudo() {
    console.log('Iniciando salvamento do laudo...');
    
    if (!medicoIdAtual) {
        alert('Erro: ID do médico não encontrado');
        return;
    }
    
    const form = document.getElementById('formMascaralaudo');
    const titulo = document.getElementById('titulo').value;
    const conteudo = tinymce.get('conteudo').getContent();
    const csrfToken = form.querySelector('input[name="csrf_token"]').value;

    console.log('Dados coletados:', {
        titulo,
        conteudo: conteudo.substring(0, 100) + '...', // Mostra apenas o início do conteúdo
        medicoId: medicoIdAtual,
        csrfToken: csrfToken ? 'Presente' : 'Ausente'
    });

    if (!titulo || !conteudo) {
        alert('Por favor, preencha todos os campos');
        return;
    }

    console.log('Enviando requisição para /salvar_laudo...');
    
    fetch('/salvar_laudo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            titulo: titulo,
            conteudo: conteudo,
            medico_id: medicoIdAtual
        })
    })
    .then(response => {
        console.log('Resposta recebida:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Dados recebidos:', data);
        if (data.success) {
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('mascaralaudoModal'));
            modal.hide();
            
            // Limpa o formulário
            document.getElementById('titulo').value = '';
            tinymce.get('conteudo').setContent('');
            medicoIdAtual = null;
            
            // Mostra mensagem de sucesso
            alert('Laudo salvo com sucesso!');
        } else {
            alert('Erro ao salvar laudo: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro na requisição:', error);
        alert('Erro ao salvar laudo');
    });
}

function visualizarLaudo(laudoId) {
    fetch(`/laudo/${laudoId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const laudo = data.laudo;
                document.getElementById('visualizarLaudoModalLabel').textContent = laudo.titulo;
                document.getElementById('conteudoLaudo').innerHTML = laudo.conteudo;
                
                const modal = new bootstrap.Modal(document.getElementById('visualizarLaudoModal'));
                modal.show();
            } else {
                alert('Erro ao carregar laudo');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao carregar laudo');
        });
}

function visualizarLaudos(medicoId) {
    console.log('Buscando laudos do médico:', medicoId);
    
    fetch(`/laudos_medico/${medicoId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const listaLaudos = document.getElementById('listaLaudos');
                listaLaudos.innerHTML = ''; // Limpa a lista atual
                
                if (data.laudos.length === 0) {
                    listaLaudos.innerHTML = '<div class="alert alert-info">Nenhum laudo encontrado.</div>';
                    return;
                }
                
                data.laudos.forEach((laudo, index) => {
                    const accordionItem = document.createElement('div');
                    accordionItem.className = 'accordion-item';
                    accordionItem.innerHTML = `
                        <h2 class="accordion-header" id="heading${laudo.id}">
                            <button class="accordion-button collapsed" type="button" 
                                    data-bs-toggle="collapse" data-bs-target="#collapse${laudo.id}" 
                                    aria-expanded="false" aria-controls="collapse${laudo.id}">
                                <div class="d-flex justify-content-between align-items-center w-100">
                                    <span>${laudo.titulo}</span>
                                    <small class="text-muted ms-2">${laudo.data_criacao}</small>
                                </div>
                            </button>
                        </h2>
                        <div id="collapse${laudo.id}" class="accordion-collapse collapse" 
                             aria-labelledby="heading${laudo.id}" data-bs-parent="#listaLaudos">
                            <div class="accordion-body">
                                ${laudo.conteudo}
                            </div>
                        </div>
                    `;
                    listaLaudos.appendChild(accordionItem);
                });
                
                // Abre o modal
                const modal = new bootstrap.Modal(document.getElementById('listaLaudosModal'));
                modal.show();
            } else {
                alert('Erro ao carregar laudos: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao carregar laudos');
        });
}

// Função para verificar se o evento é de toque
function isTouchEvent(event) {
    return event.pointerType === 'touch';
}

// Atualiza os event listeners para usar a nova função
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Atualiza os event listeners de mouseover/mouseout para usar pointerenter/pointerleave
    const rows = document.querySelectorAll('tr[data-id]');
    rows.forEach(row => {
        row.addEventListener('pointerenter', function() {
            if (!isTouchEvent(event)) {
                this.classList.add('table-hover');
            }
        });
        
        row.addEventListener('pointerleave', function() {
            if (!isTouchEvent(event)) {
                this.classList.remove('table-hover');
            }
        });
    });
}); 