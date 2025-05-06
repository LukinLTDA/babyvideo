// Função para mostrar notificação
function mostrarNotificacao(mensagem, tipo = 'success') {
    const toast = document.getElementById('toastNotificacao');
    const header = toast.querySelector('.toast-header');
    const icon = header.querySelector('i');
    
    // Atualiza o estilo e ícone baseado no tipo
    header.className = `toast-header ${tipo === 'success' ? 'bg-success' : 'bg-danger'} text-white`;
    icon.className = `fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2`;
    
    // Atualiza a mensagem
    toast.querySelector('.toast-body').textContent = mensagem;
    
    // Mostra o toast
    toast.style.display = 'block';
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();
}

// Função para abrir o modal de edição
function editarPaciente(id) {
    // Converte o ID para número
    const pacienteId = parseInt(id);
    
    // Busca os dados do paciente
    fetch(`/paciente/${pacienteId}`)
        .then(response => response.json())
        .then(data => {
            // Preenche o formulário com os dados
            document.getElementById('edit_paciente_id').value = data.id;
            document.getElementById('edit_nome').value = data.nome;
            document.getElementById('edit_telefone').value = data.telefone;
            document.getElementById('edit_cpf').value = data.cpf;
            document.getElementById('edit_nascimento').value = data.nascimento;
            
            // Abre o modal
            new bootstrap.Modal(document.getElementById('modalEditarPaciente')).show();
        })
        .catch(error => {
            console.error('Erro ao buscar dados do paciente:', error);
            mostrarNotificacao('Erro ao carregar dados do paciente', 'error');
        });
}

// Função para salvar a edição
function salvarEdicaoPaciente() {
    // Abre o modal de confirmação
    const modalConfirmacao = new bootstrap.Modal(document.getElementById('modalConfirmacao'));
    modalConfirmacao.show();
}

// Função para confirmar exclusão
function confirmarExclusao(id, nome) {
    // Armazena o ID do paciente para uso posterior
    document.getElementById('btnConfirmarExclusao').dataset.pacienteId = id;
    // Atualiza o nome do paciente no modal
    document.getElementById('nomePacienteExclusao').textContent = nome;
    // Abre o modal
    new bootstrap.Modal(document.getElementById('modalConfirmacaoExclusao')).show();
}

// Função para lidar com o envio do formulário de novo paciente
function handleNovoPaciente(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    fetch('/novo_paciente', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoPaciente'));
            modal.hide();
            
            // Mostra notificação de sucesso
            mostrarNotificacao('Paciente cadastrado com sucesso!', 'success');

            // Cria o novo card do paciente
            const pacientesContainer = document.querySelector('.row-cols-1');
            const novoCard = criarCardPaciente(data);
            pacientesContainer.insertBefore(novoCard, pacientesContainer.firstChild);
            
            // Atualiza os contadores
            const totalPacientes = document.querySelector('.card.bg-primary h2');
            const pacientesMes = document.querySelector('.card.bg-success h2');
            if (totalPacientes) totalPacientes.textContent = parseInt(totalPacientes.textContent) + 1;
            if (pacientesMes) pacientesMes.textContent = parseInt(pacientesMes.textContent) + 1;

            // Limpa o formulário
            form.reset();
        } else {
            mostrarNotificacao(data.message || 'Erro ao cadastrar paciente', 'error');
        }
    })
    .catch(error => {
        console.error('Erro ao cadastrar paciente:', error);
        mostrarNotificacao('Erro ao cadastrar paciente', 'error');
    });
    
    return false;
}

// Função auxiliar para criar o card do paciente
function criarCardPaciente(paciente) {
    const col = document.createElement('div');
    col.className = 'col';
    
    col.innerHTML = `
        <div class="card h-100 border-0 shadow-sm" data-paciente-id="${paciente.id}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5 class="card-title mb-0">${paciente.nome}</h5>
                    <span class="badge bg-light text-dark">
                        <i class="fas fa-user me-1"></i>Paciente
                    </span>
                </div>
                <div class="card-text">
                    <p class="mb-2">
                        <i class="fas fa-id-card me-2 text-primary"></i>
                        <span data-cpf>${paciente.cpf}</span>
                    </p>
                    <p class="mb-2">
                        <i class="fas fa-phone me-2 text-success"></i>
                        <span data-telefone>${paciente.telefone}</span>
                    </p>
                    <p class="mb-2">
                        <i class="fas fa-calendar me-2 text-info"></i>
                        <span data-nascimento>${paciente.nascimento}</span>
                    </p>
                </div>
            </div>
            <div class="card-footer bg-white border-top-0">
                <div class="d-flex flex-column">
                    <small class="text-muted mb-2">
                        <i class="fas fa-clock me-1"></i>
                        Cadastrado em ${new Date().toLocaleString()}
                    </small>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-grow-1" 
                                title="Editar Paciente"
                                onclick="editarPaciente('${paciente.id}')">
                            <i class="fas fa-edit me-1"></i>Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger flex-grow-1" 
                                title="Excluir Paciente"
                                onclick="confirmarExclusao('${paciente.id}', '${paciente.nome}')">
                            <i class="fas fa-trash me-1"></i>Excluir
                        </button>
                        <button class="btn btn-sm btn-outline-success flex-grow-1" title="Adicionar BabyVideo">
                            <i class="fas fa-video me-1"></i>BabyVideo
                        </button>
                        <button class="btn btn-sm btn-outline-info flex-grow-1" title="Nova Consulta">
                            <i class="fas fa-calendar-plus me-1"></i>Consulta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Inicialização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Configuração do toast
    const toast = document.getElementById('toastNotificacao');
    toast.addEventListener('hidden.bs.toast', function () {
        toast.style.display = 'none';
    });

    // Máscara de CPF
    const cpfInputs = document.querySelectorAll('input[name="cpf"]');
    cpfInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    });

    // Máscara de Telefone
    const telInputs = document.querySelectorAll('input[name="telefone"]');
    telInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            if (value.length > 10) {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else if (value.length > 6) {
                value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
            } else {
                value = value.replace(/(\d*)/, '($1');
            }
            e.target.value = value;
        });
    });

    // Configura o botão de confirmação de edição
    document.getElementById('btnConfirmarSalvar').addEventListener('click', function() {
        const form = document.getElementById('formEditarPaciente');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        fetch('/editar_paciente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Fecha os modais
                bootstrap.Modal.getInstance(document.getElementById('modalConfirmacao')).hide();
                bootstrap.Modal.getInstance(document.getElementById('modalEditarPaciente')).hide();
                
                // Atualiza o card do paciente na página
                const card = document.querySelector(`[data-paciente-id="${data.paciente.id}"]`);
                if (card) {
                    card.querySelector('.card-title').textContent = data.paciente.nome;
                    card.querySelector('[data-cpf]').textContent = data.paciente.cpf;
                    card.querySelector('[data-telefone]').textContent = data.paciente.telefone;
                    card.querySelector('[data-nascimento]').textContent = data.paciente.nascimento;
                }
                
                // Mostra notificação de sucesso
                mostrarNotificacao('Paciente atualizado com sucesso!', 'success');
            } else {
                // Atualiza e mostra notificação de erro
                mostrarNotificacao(data.message || 'Erro ao atualizar paciente', 'error');
            }
        })
        .catch(error => {
            console.error('Erro ao salvar edição:', error);
            // Atualiza e mostra notificação de erro
            mostrarNotificacao('Erro ao salvar alterações', 'error');
        });
    });

    // Configura o botão de confirmação de exclusão
    document.getElementById('btnConfirmarExclusao').addEventListener('click', function() {
        const pacienteId = this.dataset.pacienteId;
        
        fetch(`/excluir_paciente/${pacienteId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Fecha o modal
                bootstrap.Modal.getInstance(document.getElementById('modalConfirmacaoExclusao')).hide();
                
                // Remove o card do paciente da página
                const card = document.querySelector(`[data-paciente-id="${pacienteId}"]`).closest('.col');
                card.remove();
                
                // Mostra notificação de sucesso
                mostrarNotificacao('Paciente excluído com sucesso!', 'success');
            } else {
                // Atualiza e mostra notificação de erro
                mostrarNotificacao(data.message || 'Erro ao excluir paciente', 'error');
            }
        })
        .catch(error => {
            console.error('Erro ao excluir paciente:', error);
            // Atualiza e mostra notificação de erro
            mostrarNotificacao('Erro ao excluir paciente', 'error');
        });
    });
}); 