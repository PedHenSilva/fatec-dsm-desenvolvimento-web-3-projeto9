import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Inicializa e lê o arquivo de persistência JSON
function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ salas: [], reservas: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Grava as alterações no arquivo JSON
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Verifica se dois intervalos de horários se sobrepõem
function checarSobreposicao(h1Inicio, h1Fim, h2Inicio, h2Fim) {
    return h1Inicio < h2Fim && h2Inicio < h1Fim;
}

const server = http.createServer((req, res) => {
    // Configuração de Cabeçalhos CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // ROTAS DE SALAS (/api/salas)
    if (pathname.startsWith('/api/salas')) {
        const parts = pathname.split('/').filter(Boolean);
        const id = parts[2]; // parts[0] = 'api', parts[1] = 'salas', parts[2] = id

        // GET /api/salas - Listar todas as salas
        if (req.method === 'GET' && !id) {
            const db = readDB();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(db.salas));
        }

        // GET /api/salas/:id - Consultar uma sala específica
        if (req.method === 'GET' && id) {
            const db = readDB();
            const sala = db.salas.find(s => s.id === id);
            if (!sala) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ error: 'Sala não encontrada' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(sala));
        }

        // POST /api/salas - Cadastrar nova sala
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const nova = JSON.parse(body);
                    // Validação completa conforme Requisito 1
                    if (!nova.nome || !nova.localizacao || !nova.capacidade || !nova.recursos || !nova.situacao) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: 'Preencha todos os campos obrigatórios da sala (nome, localizacao, capacidade, recursos, situacao)' }));
                    }

                    const db = readDB();
                    nova.id = Date.now().toString();
                    nova.capacidade = Number(nova.capacidade);
                    db.salas.push(nova);
                    writeDB(db);

                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(nova));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'JSON inválido' }));
                }
            });
            return;
        }

        // PUT /api/salas/:id - Atualizar uma sala existente
        if (req.method === 'PUT' && id) {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const dados = JSON.parse(body);
                    const db = readDB();
                    const index = db.salas.findIndex(s => s.id === id);

                    if (index === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: 'Sala não encontrada' }));
                    }

                    db.salas[index] = {
                        ...db.salas[index],
                        ...dados,
                        id,
                        capacidade: dados.capacidade ? Number(dados.capacidade) : db.salas[index].capacidade
                    };
                    writeDB(db);

                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(db.salas[index]));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'JSON inválido' }));
                }
            });
            return;
        }

        // DELETE /api/salas/:id - Excluir uma sala (Regra: não excluir se houver reservas)
        if (req.method === 'DELETE' && id) {
            const db = readDB();
            const index = db.salas.findIndex(s => s.id === id);

            if (index === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ error: 'Sala não encontrada' }));
            }

            const possuiReservas = db.reservas.some(r => r.salaId === id);
            if (possuiReservas) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ error: 'Não é permitido excluir salas que possuam reservas vinculadas.' }));
            }

            const removida = db.salas.splice(index, 1)[0];
            writeDB(db);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(removida));
        }
    }

    // ROTAS DE RESERVAS (/api/reservas)
    if (pathname.startsWith('/api/reservas')) {
        const parts = pathname.split('/').filter(Boolean);
        const id = parts[2];

        // GET /api/reservas - Listar todas as reservas
        if (req.method === 'GET' && !id) {
            const db = readDB();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(db.reservas));
        }

        // GET /api/reservas/:id - Consultar uma reserva específica
        if (req.method === 'GET' && id) {
            const db = readDB();
            const reserva = db.reservas.find(r => r.id === id);
            if (!reserva) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ error: 'Reserva não encontrada' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(reserva));
        }

        // POST /api/reservas - Cadastrar nova reserva com validação de regras de negócio
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const nova = JSON.parse(body);
                    const db = readDB();

                    // Validação completa de campos obrigatórios conforme Requisito 2
                    if (!nova.aluno || !nova.email || !nova.salaId || !nova.data || !nova.horarioInicial || !nova.horarioFinal || !nova.participantes || !nova.finalidade) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: 'Preencha todos os campos obrigatórios da reserva' }));
                    }

                    // Regra: Horário final posterior ao inicial
                    if (nova.horarioFinal <= nova.horarioInicial) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: 'O horário final deve ser posterior ao horário inicial' }));
                    }

                    const sala = db.salas.find(s => s.id === nova.salaId);
                    if (!sala) {
                        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: 'A sala vinculada informada não existe' }));
                    }

                    // Regra: Salas inativas não recebem reservas
                    if (sala.situacao === 'Inativa') {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: 'Não é possível realizar reservas em salas inativas' }));
                    }

                    // Regra: Capacidade máxima da sala
                    if (Number(nova.participantes) > sala.capacidade) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: `Capacidade máxima excedida! A sala suporta apenas ${sala.capacidade} participantes.` }));
                    }

                    // Regra: Conflito de horários
                    const conflito = db.reservas.some(r =>
                        r.salaId === nova.salaId &&
                        r.data === nova.data &&
                        r.status === 'Ativa' &&
                        checarSobreposicao(nova.horarioInicial, nova.horarioFinal, r.horarioInicial, r.horarioFinal)
                    );
                    if (conflito) {
                        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: 'Conflito de horários! Já existe uma reserva ativa para esta sala neste mesmo período.' }));
                    }

                    nova.id = Date.now().toString();
                    nova.participantes = Number(nova.participantes);
                    nova.status = nova.status || 'Ativa';
                    db.reservas.push(nova);
                    writeDB(db);

                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(nova));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'JSON inválido' }));
                }
            });
            return;
        }

        // PUT /api/reservas/:id - Atualizar reserva existente
        if (req.method === 'PUT' && id) {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const dados = JSON.parse(body);
                    const db = readDB();
                    const index = db.reservas.findIndex(r => r.id === id);

                    if (index === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: 'Reserva não encontrada' }));
                    }

                    const resAtual = db.reservas[index];
                    const salaId = dados.salaId || resAtual.salaId;
                    const data = dados.data || resAtual.data;
                    const hInicial = dados.horarioInicial || resAtual.horarioInicial;
                    const hFinal = dados.horarioFinal || resAtual.horarioFinal;
                    const status = dados.status || resAtual.status;

                    if (hFinal <= hInicial) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: 'O horário final deve ser posterior ao horário inicial' }));
                    }

                    const sala = db.salas.find(s => s.id === salaId);
                    if (dados.participantes && sala && Number(dados.participantes) > sala.capacidade) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ error: `Capacidade excedida para a sala. Máximo suportado: ${sala.capacidade}` }));
                    }

                    if (status === 'Ativa') {
                        const conflito = db.reservas.some(r =>
                            r.id !== id &&
                            r.salaId === salaId &&
                            r.data === data &&
                            r.status === 'Ativa' &&
                            checarSobreposicao(hInicial, hFinal, r.horarioInicial, r.horarioFinal)
                        );
                        if (conflito) {
                            res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
                            return res.end(JSON.stringify({ error: 'Conflito de horários detectado para os novos dados informados.' }));
                        }
                    }

                    db.reservas[index] = { 
                        ...resAtual, 
                        ...dados, 
                        id, 
                        participantes: dados.participantes ? Number(dados.participantes) : resAtual.participantes 
                    };
                    writeDB(db);

                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(db.reservas[index]));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'JSON inválido' }));
                }
            });
            return;
        }

        // DELETE /api/reservas/:id - Remover reserva
        if (req.method === 'DELETE' && id) {
            const db = readDB();
            const index = db.reservas.findIndex(r => r.id === id);
            if (index === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ error: 'Reserva não localizada' }));
            }
            const removida = db.reservas.splice(index, 1)[0];
            writeDB(db);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(removida));
        }
    }

    // =========================================================================
    // SERVIR ARQUIVOS ESTÁTICOS DO FRONT-END (public/*)
    // =========================================================================
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
    };

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Recurso estático solicitado não existe' }));
        } else {
            res.writeHead(200, { 'Content-Type': mimeTypes[extname] || 'application/octet-stream' });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor de Reservas ativo em http://localhost:${PORT}`);
});