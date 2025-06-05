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