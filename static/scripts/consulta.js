let stream = null;

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

// Função para avançar para a seção da câmera
function avancarParaCamera() {
    const form = document.getElementById('formConsulta');
    const medicoSelect = document.getElementById('medico_id');
    const dataInput = document.getElementById('data_consulta');
    const horaInput = document.getElementById('hora_consulta');
    
    // Validação dos campos
    if (!medicoSelect.value) {
        mostrarNotificacao('Por favor, selecione um médico', 'error');
        return;
    }
    if (!dataInput.value) {
        mostrarNotificacao('Por favor, selecione a data da consulta', 'error');
        return;
    }
    if (!horaInput.value) {
        mostrarNotificacao('Por favor, selecione a hora da consulta', 'error');
        return;
    }
    
    // Atualiza os dados na seção da câmera
    const medicoSelecionado = medicoSelect.options[medicoSelect.selectedIndex].text;
    document.getElementById('nomeMedico').textContent = medicoSelecionado;
    document.getElementById('dataConsulta').textContent = dataInput.value;
    document.getElementById('horaConsulta').textContent = horaInput.value;
    
    // Esconde o formulário e mostra a seção da câmera
    form.parentElement.parentElement.style.display = 'none';
    document.getElementById('secaoCamera').style.display = 'flex';
}

// Função para iniciar a câmera
async function iniciarCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        const video = document.getElementById('camera');
        video.srcObject = stream;
        mostrarNotificacao('Câmera iniciada com sucesso!');
    } catch (error) {
        console.error('Erro ao acessar a câmera:', error);
        mostrarNotificacao('Erro ao acessar a câmera. Verifique as permissões.', 'error');
    }
}

// Função para capturar imagem
function capturarImagem() {
    if (!stream) {
        mostrarNotificacao('Inicie a câmera primeiro', 'error');
        return;
    }
    
    const video = document.getElementById('camera');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Cria um elemento de imagem para a galeria
    const imagem = canvas.toDataURL('image/jpeg');
    const galeria = document.getElementById('galeriaImagens');
    
    // Cria o container da imagem
    const div = document.createElement('div');
    div.className = 'position-relative';
    
    // Cria a imagem
    const img = document.createElement('img');
    img.src = imagem;
    img.className = 'img-fluid rounded w-100';
    img.style.height = '120px';
    img.style.objectFit = 'cover';
    
    // Adiciona a data e hora da captura
    const dataHora = document.createElement('small');
    dataHora.className = 'text-muted d-block mt-1 text-center';
    dataHora.textContent = new Date().toLocaleString();
    
    // Monta a estrutura
    div.appendChild(img);
    div.appendChild(dataHora);
    
    // Adiciona à galeria
    galeria.insertBefore(div, galeria.firstChild);
    
    mostrarNotificacao('Imagem capturada com sucesso!');
}

// Função para parar a câmera
function pararCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        const video = document.getElementById('camera');
        video.srcObject = null;
        mostrarNotificacao('Câmera parada com sucesso!');
    }
}

// Função para salvar a consulta
function salvarConsulta(event) {
    event.preventDefault();
    
    const form = document.getElementById('formConsulta');
    const formData = new FormData(form);
    
    fetch('/salvar_consulta', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarNotificacao('Consulta salva com sucesso!');
            form.reset();
        } else {
            mostrarNotificacao(data.message || 'Erro ao salvar consulta', 'error');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarNotificacao('Erro ao salvar consulta. Tente novamente.', 'error');
    });
}

// Inicialização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formConsulta');
    if (form) {
        form.addEventListener('submit', salvarConsulta);
    }

    // Configura a data mínima como hoje
    const dataInput = document.getElementById('data_consulta');
    const hoje = new Date().toISOString().split('T')[0];
    dataInput.min = hoje;
}); 