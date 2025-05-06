document.addEventListener('DOMContentLoaded', function() {
    const btnClinica = document.getElementById('btn-clinica');
    const btnPaciente = document.getElementById('btn-paciente');
    const formClinica = document.getElementById('form-clinica');
    const formPaciente = document.getElementById('form-paciente');
    const cpfInput = document.getElementById('cpf');
    
    // Função para alternar entre os formulários
    function alternarFormulario(tipo) {
        if (tipo === 'clinica') {
            formClinica.style.display = 'block';
            formPaciente.style.display = 'none';
            btnClinica.classList.remove('btn-outline-primary');
            btnClinica.classList.add('btn-primary');
            btnPaciente.classList.remove('btn-primary');
            btnPaciente.classList.add('btn-outline-secondary');
        } else {
            formClinica.style.display = 'none';
            formPaciente.style.display = 'block';
            btnPaciente.classList.remove('btn-outline-secondary');
            btnPaciente.classList.add('btn-primary');
            btnClinica.classList.remove('btn-primary');
            btnClinica.classList.add('btn-outline-primary');
        }
    }
    
    // Event listeners para os botões
    btnClinica.addEventListener('click', function() {
        alternarFormulario('clinica');
        // Atualiza a URL
        const url = new URL(window.location.href);
        url.searchParams.set('tipo', 'clinica');
        window.history.pushState({}, '', url);
    });
    
    btnPaciente.addEventListener('click', function() {
        alternarFormulario('paciente');
        // Atualiza a URL
        const url = new URL(window.location.href);
        url.searchParams.set('tipo', 'paciente');
        window.history.pushState({}, '', url);
    });
    
    // Verifica o parâmetro na URL ao carregar a página
    const urlParams = new URLSearchParams(window.location.search);
    const tipo = urlParams.get('tipo');
    if (tipo === 'paciente') {
        alternarFormulario('paciente');
    } else {
        alternarFormulario('clinica');
    }

    // Função para formatar CPF
    function formatarCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
        cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        return cpf;
    }

    // Evento para formatar CPF enquanto digita
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value;
            e.target.value = formatarCPF(value);
        });
    }
});