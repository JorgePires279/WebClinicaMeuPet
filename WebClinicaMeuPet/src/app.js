const express = require('express');
const path = require('path');

class Erro extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const TIPOS = ['NORMAL', 'EMERGENCIA'];

const obrig = (o, campos) => {
  const f = campos.filter(c => o[c] === undefined || o[c] === null || String(o[c]).trim() === '');
  if (f.length) throw new Erro(400, 'Campos obrigatórios ausentes: ' + f.join(', '));
};
const soDigitos = v => String(v || '').replace(/\D/g, '');
const calcIdade = d => {
  if (!d) return null;
  const n = new Date(d), h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) i--;
  return i;
};
const handler = fn => (req, res, next) => { try { fn(req, res); } catch (e) { next(e); } };
const perfil = (...ok) => (req, res, next) =>
  ok.includes(req.get('x-perfil')) ? next() : next(new Erro(403, 'Perfil sem permissão para esta ação (RN07)'));

function criarApp(db) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  const r = express.Router();
  const um = (sql, ...p) => db.prepare(sql).get(...p);
  const todos = (sql, ...p) => db.prepare(sql).all(...p);
  const agora = () => new Date().toISOString();

  // ---------- Responsáveis (HU01) ----------
  r.get('/responsaveis', handler((req, res) => {
    const cpf = soDigitos(req.query.cpf);
    res.json(cpf ? todos('SELECT * FROM responsavel WHERE cpf=?', cpf) : todos('SELECT * FROM responsavel ORDER BY nome'));
  }));
  r.post('/responsaveis', perfil('ATENDENTE'), handler((req, res) => {
    const b = req.body; obrig(b, ['nome', 'cpf', 'fone']);
    const cpf = soDigitos(b.cpf);
    if (cpf.length !== 11) throw new Erro(400, 'CPF deve ter 11 dígitos');
    const ex = um('SELECT * FROM responsavel WHERE cpf=?', cpf);
    if (ex) return res.status(409).json({ erro: 'CPF já cadastrado', existente: ex });
    const i = db.prepare('INSERT INTO responsavel(nome,cpf,fone,email,endereco,observacoes) VALUES (?,?,?,?,?,?)')
      .run(b.nome, cpf, b.fone, b.email || null, b.endereco || null, b.observacoes || null);
    res.status(201).json(um('SELECT * FROM responsavel WHERE id=?', i.lastInsertRowid));
  }));

  // ---------- Pets (HU01, RN01) ----------
  const petOut = p => p && { ...p, idade: calcIdade(p.dt_nascimento) };
  r.get('/pets', handler((req, res) => {
    const l = req.query.responsavel_id
      ? todos('SELECT * FROM pet WHERE responsavel_id=? ORDER BY nome', req.query.responsavel_id)
      : todos('SELECT p.*, r.nome AS responsavel_nome FROM pet p JOIN responsavel r ON r.id=p.responsavel_id ORDER BY p.nome');
    res.json(l.map(petOut));
  }));
  r.post('/pets', perfil('ATENDENTE'), handler((req, res) => {
    const b = req.body; obrig(b, ['responsavel_id', 'nome']);
    if (!um('SELECT 1 FROM responsavel WHERE id=?', b.responsavel_id)) throw new Erro(404, 'Responsável não encontrado');
    if (b.peso !== undefined && b.peso !== '' && !(Number(b.peso) > 0)) throw new Erro(400, 'Peso deve ser maior que zero');
    const i = db.prepare('INSERT INTO pet(responsavel_id,nome,raca,dt_nascimento,cor_pelagem,peso,numero_microchip) VALUES (?,?,?,?,?,?,?)')
      .run(b.responsavel_id, b.nome, b.raca || null, b.dt_nascimento || null, b.cor_pelagem || null,
        b.peso ? Number(b.peso) : null, b.numero_microchip || null);
    res.status(201).json(petOut(um('SELECT * FROM pet WHERE id=?', i.lastInsertRowid)));
  }));
  r.get('/pets/:id/historico', perfil('VETERINARIO'), handler((req, res) => {
    const pet = um('SELECT * FROM pet WHERE id=?', req.params.id);
    if (!pet) throw new Erro(404, 'Pet não encontrado');
    const consultas = todos('SELECT c.*, v.nome AS veterinario_nome FROM consulta c JOIN veterinario v ON v.id=c.veterinario_id WHERE pet_id=? ORDER BY data_hora DESC', pet.id)
      .map(c => ({ ...c, receitas: todos('SELECT * FROM receita WHERE consulta_id=?', c.id),
                   exames: todos('SELECT * FROM solicitacao_exame WHERE consulta_id=?', c.id) }));
    res.json({ pet: petOut(pet), consultas });
  }));

  // ---------- Veterinários ----------
  r.get('/veterinarios', handler((req, res) => res.json(todos('SELECT * FROM veterinario ORDER BY nome'))));

  // ---------- Consultas (HU02, HU03, RN02, RN03) ----------
  r.get('/consultas', handler((req, res) => {
    const st = req.query.status;
    const sql = `SELECT c.*, p.nome AS pet_nome, r.nome AS responsavel_nome, v.nome AS veterinario_nome
      FROM consulta c JOIN pet p ON p.id=c.pet_id JOIN responsavel r ON r.id=c.responsavel_id
      JOIN veterinario v ON v.id=c.veterinario_id ${st ? 'WHERE c.status=?' : ''}
      ORDER BY (c.tipo='EMERGENCIA') DESC, c.data_hora ASC`;
    res.json(st ? todos(sql, st) : todos(sql));
  }));
  r.get('/consultas/:id', handler((req, res) => {
    const c = um(`SELECT c.*, p.nome AS pet_nome, r.nome AS responsavel_nome FROM consulta c
      JOIN pet p ON p.id=c.pet_id JOIN responsavel r ON r.id=c.responsavel_id WHERE c.id=?`, req.params.id);
    if (!c) throw new Erro(404, 'Consulta não encontrada');
    res.json({ ...c, receitas: todos('SELECT * FROM receita WHERE consulta_id=?', c.id),
               exames: todos('SELECT * FROM solicitacao_exame WHERE consulta_id=?', c.id) });
  }));
  r.post('/consultas', perfil('ATENDENTE'), handler((req, res) => {
    const b = req.body; obrig(b, ['tipo', 'pet_id', 'veterinario_id', 'data_hora']);
    if (!TIPOS.includes(b.tipo)) throw new Erro(400, 'Tipo deve ser NORMAL ou EMERGENCIA (RN03)');
    if (isNaN(Date.parse(b.data_hora))) throw new Erro(400, 'data_hora inválida');
    const pet = um('SELECT * FROM pet WHERE id=?', b.pet_id);
    if (!pet) throw new Erro(404, 'Pet não encontrado');
    if (!um('SELECT 1 FROM veterinario WHERE id=?', b.veterinario_id)) throw new Erro(404, 'Veterinário não encontrado');
    if (b.responsavel_id && Number(b.responsavel_id) !== pet.responsavel_id)
      throw new Erro(422, 'O responsável informado não é o responsável do pet (RN02)');
    const i = db.prepare('INSERT INTO consulta(tipo,data_hora,pet_id,responsavel_id,veterinario_id,atendente_id) VALUES (?,?,?,?,?,?)')
      .run(b.tipo, b.data_hora, pet.id, pet.responsavel_id, b.veterinario_id, b.atendente_id || 1);
    res.status(201).json(um('SELECT * FROM consulta WHERE id=?', i.lastInsertRowid));
  }));

  // RN08: consulta finalizada não aceita novos registros clínicos
  const consultaAberta = id => {
    const c = um('SELECT * FROM consulta WHERE id=?', id);
    if (!c) throw new Erro(404, 'Consulta não encontrada');
    if (c.status === 'FINALIZADA') throw new Erro(409, 'Consulta finalizada não aceita novos registros (RN08)');
    return c;
  };
  r.patch('/consultas/:id/anotacoes', perfil('VETERINARIO'), handler((req, res) => {
    consultaAberta(req.params.id); obrig(req.body, ['anotacoes']);
    db.prepare("UPDATE consulta SET anotacoes=?, status='EM_ATENDIMENTO' WHERE id=?").run(req.body.anotacoes, req.params.id);
    res.json(um('SELECT * FROM consulta WHERE id=?', req.params.id));
  }));
  r.post('/consultas/:id/receitas', perfil('VETERINARIO'), handler((req, res) => {
    const c = consultaAberta(req.params.id); obrig(req.body, ['prescricao']);
    const i = db.prepare('INSERT INTO receita(consulta_id,veterinario_id,data_emissao,prescricao) VALUES (?,?,?,?)')
      .run(c.id, c.veterinario_id, agora(), req.body.prescricao);
    res.status(201).json(um('SELECT * FROM receita WHERE id=?', i.lastInsertRowid));
  }));
  r.post('/consultas/:id/exames', perfil('VETERINARIO'), handler((req, res) => {
    const c = consultaAberta(req.params.id); obrig(req.body, ['descricao']);
    const i = db.prepare('INSERT INTO solicitacao_exame(consulta_id,descricao,data_solicitacao) VALUES (?,?,?)')
      .run(c.id, req.body.descricao, agora());
    res.status(201).json(um('SELECT * FROM solicitacao_exame WHERE id=?', i.lastInsertRowid));
  }));
  r.post('/consultas/:id/finalizar', perfil('VETERINARIO'), handler((req, res) => {
    consultaAberta(req.params.id);
    db.prepare("UPDATE consulta SET status='FINALIZADA' WHERE id=?").run(req.params.id);
    res.json(um('SELECT * FROM consulta WHERE id=?', req.params.id));
  }));

  // ---------- Cobranças (HU07, RN06) ----------
  r.get('/cobrancas', handler((req, res) => res.json(todos(
    'SELECT c.*, r.nome AS responsavel_nome FROM cobranca c JOIN responsavel r ON r.id=c.responsavel_id ORDER BY pago ASC, data DESC'))));
  r.post('/cobrancas', perfil('ATENDENTE'), handler((req, res) => {
    const b = req.body; obrig(b, ['responsavel_id', 'descricao', 'valor']);
    const valor = Number(b.valor);
    if (!Number.isFinite(valor) || valor < 0) throw new Erro(400, 'Valor não pode ser negativo (RN06)');
    if (!um('SELECT 1 FROM responsavel WHERE id=?', b.responsavel_id)) throw new Erro(404, 'Responsável não encontrado');
    const i = db.prepare('INSERT INTO cobranca(responsavel_id,consulta_id,descricao,data,valor) VALUES (?,?,?,?,?)')
      .run(b.responsavel_id, b.consulta_id || null, b.descricao, agora(), valor);
    res.status(201).json(um('SELECT * FROM cobranca WHERE id=?', i.lastInsertRowid));
  }));
  r.patch('/cobrancas/:id/pagar', perfil('ATENDENTE'), handler((req, res) => {
    const c = um('SELECT * FROM cobranca WHERE id=?', req.params.id);
    if (!c) throw new Erro(404, 'Cobrança não encontrada');
    db.prepare('UPDATE cobranca SET pago=1 WHERE id=?').run(c.id);
    res.json(um('SELECT * FROM cobranca WHERE id=?', c.id));
  }));

  app.use('/api', r);
  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
  app.use((e, req, res, next) => {
    if (e instanceof Erro) return res.status(e.status).json({ erro: e.message });
    if (String(e.code).startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ erro: 'Violação de integridade: ' + e.message });
    console.error(e); res.status(500).json({ erro: 'Erro interno' });
  });
  return app;
}
module.exports = { criarApp };
