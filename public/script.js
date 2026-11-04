const API_URL = 'http://localhost:3000/api';
let salasCache = [];
let reservasCache = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarSalas();
    carregarReservas();
});

// Navegação por Abas
function mudarTab(aba) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    if (aba === 'salas') {
        document.getElementById('tab-salas').classList.remove('hidden');
        event.target.classList.add('active');
        carregarSalas();
    } else {
        document.getElementById('tab-reservas').classList.remove('hidden');
        event.target.classList.add('active');
        carregarReservas();
    }
}

// Mensagens na Tela
function mostrarMensagem(texto, tipo = 'sucesso') {
    const alerta = document.getElementById('mensagem-alerta');
    alerta.textContent = texto;
    alerta.className = `alerta ${tipo}`;
    setTimeout(() => {
        alerta.className = 'alerta hidden';
    }, 5000);
}

// Salas
async function carregarSalas() {
    try {
        const res = await fetch(`${API_URL}/salas`);
        salasCache = await res.json();
        
        const tbody = document.querySelector('#tabela-salas tbody');
        tbody.innerHTML = '';

        const selectSalaReserva = document.getElementById('reserva-salaId');
        const filtroSala = document.getElementById('filtro-sala');
        
        selectSalaReserva.innerHTML = '<option value="">Selecione uma sala</option>';
        filtroSala.innerHTML = '<option value="">Todas as salas</option>';

        salasCache.forEach(sala => {
            // Preenche tabela
            tbody.innerHTML += `
                <tr>
                    <td><strong>${sala.nome}</strong></td>
                    <td>${sala.localizacao}</td>
                    <td>${sala.capacidade} pessoas</td>
                    <td>${sala.recursos}</td>
                    <td><span class="badge badge-${sala.situacao.toLowerCase()}">${sala.situacao}</span></td>
                    <td>
                        <button class="btn btn-warning" onclick="editarSala('${sala.id}')">Editar</button>
                        <button class="btn btn-danger" onclick="excluirSala('${sala.id}')">Excluir</button>
                    </td>
                </tr>
            `;

            // Preenche selects de reservas
            if (sala.situacao === 'Disponível') {
                selectSalaReserva.innerHTML += `<option value="${sala.id}">${sala.nome} (Cap: ${sala.capacidade})</option>`;
            }
            filtroSala.innerHTML += `<option value="${sala.id}">${sala.nome}</option>`;
        });
    } catch (error) {
        mostrarMensagem('Erro ao carregar salas do servidor.', 'erro');
    }
}

function abrirModalSala(sala = null) {
    document.getElementById('modal-sala').classList.remove('hidden');
    document.getElementById('form-sala').reset();
    if (sala) {
        document.getElementById('modal-sala-titulo').textContent = 'Editar Sala';
        document.getElementById('sala-id').value = sala.id;
        document.getElementById('sala-nome').value = sala.nome;
        document.getElementById('sala-localizacao').value = sala.localizacao;
        document.getElementById('sala-capacidade').value = sala.capacidade;
        document.getElementById('sala-recursos').value = sala.recursos;
        document.getElementById('sala-situacao').value = sala.situacao;
    } else {
        document.getElementById('modal-sala-titulo').textContent = 'Cadastrar Nova Sala';
        document.getElementById('sala-id').value = '';
    }
}

function fecharModalSala() {
    document.getElementById('modal-sala').classList.add('hidden');
}

async function salvarSala(e) {
    e.preventDefault();
    const id = document.getElementById('sala-id').value;
    const dados = {
        nome: document.getElementById('sala-nome').value,
        localizacao: document.getElementById('sala-localizacao').value,
        capacidade: Number(document.getElementById('sala-capacidade').value),
        recursos: document.getElementById('sala-recursos').value,
        situacao: document.getElementById('sala-situacao').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/salas/${id}` : `${API_URL}/salas`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const respostaJson = await res.json();

        if (!res.ok) throw new Error(respostaJson.error || 'Erro ao salvar sala');

        mostrarMensagem('Sala salva com sucesso!');
        fecharModalSala();
        carregarSalas();
    } catch (error) {
        mostrarMensagem(error.message, 'erro');
    }
}

async function editarSala(id) {
    const sala = salasCache.find(s => s.id === id);
    if (sala) abrirModalSala(sala);
}

async function excluirSala(id) {
    if (!confirm('Deseja realmente excluir esta sala?')) return;
    try {
        const res = await fetch(`${API_URL}/salas/${id}`, { method: 'DELETE' });
        const respostaJson = await res.json();
        if (!res.ok) throw new Error(respostaJson.error || 'Erro ao excluir sala');

        mostrarMensagem('Sala excluída com sucesso!');
        carregarSalas();
    } catch (error) {
        mostrarMensagem(error.message, 'erro');
    }
}

// Reservas
async function carregarReservas() {
    try {
        const res = await fetch(`${API_URL}/reservas`);
        reservasCache = await res.json();
        renderizarReservas(reservasCache);
    } catch (error) {
        mostrarMensagem('Erro ao carregar reservas do servidor.', 'erro');
    }
}

function renderizarReservas(lista) {
    const tbody = document.querySelector('#tabela-reservas tbody');
    tbody.innerHTML = '';

    lista.forEach(reserva => {
        const salaObj = salasCache.find(s => s.id === reserva.salaId);
        const nomeSala = salaObj ? salaObj.nome : 'Sala Removida/Desconhecida';

        tbody.innerHTML += `
            <tr>
                <td><strong>${reserva.aluno}</strong><br><small>${reserva.email}</small></td>
                <td>${reserva.email}</td>
                <td>${nomeSala}</td>
                <td>${reserva.data}</td>
                <td>${reserva.horarioInicial} - ${reserva.horarioFinal}</td>
                <td>${reserva.participantes}</td>
                <td>${reserva.finalidade}</td>
                <td><span class="badge badge-${reserva.status.toLowerCase()}">${reserva.status}</span></td>
                <td>
                    <button class="btn btn-warning" onclick="editarReserva('${reserva.id}')">Editar</button>
                    <button class="btn btn-danger" onclick="excluirReserva('${reserva.id}')">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function abrirModalReserva(reserva = null) {
    document.getElementById('modal-reserva').classList.remove('hidden');
    document.getElementById('form-reserva').reset();
    document.getElementById('aviso-feriado').classList.add('hidden');
    
    if (reserva) {
        document.getElementById('modal-reserva-titulo').textContent = 'Editar Reserva';
        document.getElementById('reserva-id').value = reserva.id;
        document.getElementById('reserva-aluno').value = reserva.aluno;
        document.getElementById('reserva-email').value = reserva.email;
        document.getElementById('reserva-salaId').value = reserva.salaId;
        document.getElementById('reserva-data').value = reserva.data;
        document.getElementById('reserva-horarioInicial').value = reserva.horarioInicial;
        document.getElementById('reserva-horarioFinal').value = reserva.horarioFinal;
        document.getElementById('reserva-participantes').value = reserva.participantes;
        document.getElementById('reserva-finalidade').value = reserva.finalidade;
        
        document.getElementById('div-status-reserva').style.display = 'block';
        document.getElementById('reserva-status').value = reserva.status;
        checarFeriadoBrasilAPI(reserva.data);
    } else {
        document.getElementById('modal-reserva-titulo').textContent = 'Cadastrar Nova Reserva';
        document.getElementById('reserva-id').value = '';
        document.getElementById('div-status-reserva').style.display = 'none';
    }
}

function fecharModalReserva() {
    document.getElementById('modal-reserva').classList.add('hidden');
}

// Integração com a BrasilAPI (Requisito 4)
async function checarFeriadoBrasilAPI(dataStr) {
    const avisoEl = document.getElementById('aviso-feriado');
    avisoEl.classList.add('hidden');
    if (!dataStr) return;

    const ano = dataStr.split('-')[0];
    try {
        const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
        if (!response.ok) throw new Error('Falha ao consultar BrasilAPI');

        const feriados = await response.json();
        const feriado = feriados.find(f => f.date === dataStr);

        if (feriado) {
            avisoEl.textContent = `⚠️ Atenção: A data selecionada é feriado nacional (${feriado.name}). A reserva é permitida, mas verifique o funcionamento da instituição.`;
            avisoEl.classList.remove('hidden');
        }
    } catch (error) {
        console.warn('BrasilAPI indisponível no momento:', error);
    }
}

async function salvarReserva(e) {
    e.preventDefault();
    const id = document.getElementById('reserva-id').value;
    const dados = {
        aluno: document.getElementById('reserva-aluno').value,
        email: document.getElementById('reserva-email').value,
        salaId: document.getElementById('reserva-salaId').value,
        data: document.getElementById('reserva-data').value,
        horarioInicial: document.getElementById('reserva-horarioInicial').value,
        horarioFinal: document.getElementById('reserva-horarioFinal').value,
        participantes: Number(document.getElementById('reserva-participantes').value),
        finalidade: document.getElementById('reserva-finalidade').value
    };

    if (id) {
        dados.status = document.getElementById('reserva-status').value;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/reservas/${id}` : `${API_URL}/reservas`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const respostaJson = await res.json();

        if (!res.ok) throw new Error(respostaJson.error || 'Erro ao salvar reserva');

        mostrarMensagem('Reserva realizada com sucesso!');
        fecharModalReserva();
        carregarReservas();
    } catch (error) {
        mostrarMensagem(error.message, 'erro');
    }
}

async function editarReserva(id) {
    const reserva = reservasCache.find(r => r.id === id);
    if (reserva) abrirModalReserva(reserva);
}

async function excluirReserva(id) {
    if (!confirm('Deseja realmente remover esta reserva?')) return;
    try {
        const res = await fetch(`${API_URL}/reservas/${id}`, { method: 'DELETE' });
        const respostaJson = await res.json();
        if (!res.ok) throw new Error(respostaJson.error || 'Erro ao excluir reserva');

        mostrarMensagem('Reserva excluída com sucesso!');
        carregarReservas();
    } catch (error) {
        mostrarMensagem(error.message, 'erro');
    }
}

// Filtros de Pesquisa
function filtrarReservas() {
    const dataFiltro = document.getElementById('filtro-data').value;
    const salaFiltro = document.getElementById('filtro-sala').value;
    const statusFiltro = document.getElementById('filtro-status').value;

    const filtradas = reservasCache.filter(r => {
        let match = true;
        if (dataFiltro && r.data !== dataFiltro) match = false;
        if (salaFiltro && r.salaId !== salaFiltro) match = false;
        if (statusFiltro && r.status !== statusFiltro) match = false;
        return match;
    });

    renderizarReservas(filtradas);
}

function limparFiltros() {
    document.getElementById('filtro-data').value = '';
    document.getElementById('filtro-sala').value = '';
    document.getElementById('filtro-status').value = '';
    renderizarReservas(reservasCache);
}