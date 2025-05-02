function getLoginTypeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('paciente')) return 'paciente';
    return 'clinica';
}
function setLoginType(type) {
    if (type === 'paciente') {
        formClinica.style.display = 'none';
        formPaciente.style.display = '';
        btnPaciente.classList.remove('btn-outline-secondary');
        btnPaciente.classList.add('btn-secondary');
        btnClinica.classList.remove('btn-primary');
        btnClinica.classList.add('btn-outline-primary');
    } else {
        formClinica.style.display = '';
        formPaciente.style.display = 'none';
        btnClinica.classList.remove('btn-outline-primary');
        btnClinica.classList.add('btn-primary');
        btnPaciente.classList.remove('btn-secondary');
        btnPaciente.classList.add('btn-outline-secondary');
    }
}
const btnClinica = document.getElementById('btn-clinica');
const btnPaciente = document.getElementById('btn-paciente');
const formClinica = document.getElementById('form-clinica');
const formPaciente = document.getElementById('form-paciente');

// Inicializa o formulário correto ao carregar a página
setLoginType(getLoginTypeFromUrl());

btnClinica.addEventListener('click', function() {
    setLoginType('clinica');
    const url = new URL(window.location);
    url.searchParams.delete('paciente');
    url.searchParams.set('clinica', '');
    window.history.replaceState({}, '', url);
});
btnPaciente.addEventListener('click', function() {
    setLoginType('paciente');
    const url = new URL(window.location);
    url.searchParams.delete('clinica');
    url.searchParams.set('paciente', '');
    window.history.replaceState({}, '', url);
});