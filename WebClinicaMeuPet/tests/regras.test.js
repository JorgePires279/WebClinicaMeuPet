// Testes de unidade/integração/sistema das regras de negócio (Etapa 7)
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { abrirBanco } = require('../src/db');
const { criarApp } = require('../src/app');

let srv, base;
const A = { 'x-perfil': 'ATENDENTE' }, V = { 'x-perfil': 'VETERINARIO' };
const req = async (m, url, perfil, body) => {
  const r = await fetch(base + url, { method: m, headers: { 'content-type': 'application/json', ...perfil },
    body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, j: await r.json() };
};
before(async () => {
  srv = criarApp(abrirBanco(':memory:')).listen(0);
  base = 'http://localhost:' + srv.address().port;
});
after(() => srv.close());

const novoResp = (cpf = '52998224725') => req('POST', '/api/responsaveis', A, { nome: 'Ana Dona', cpf, fone: '4899' });
let respId, petId, consId;

test('CT01 HU01: cadastra responsável e pet vinculado (RN01)', async () => {
  const r = await novoResp(); assert.equal(r.s, 201); respId = r.j.id;
  const p = await req('POST', '/api/pets', A, { responsavel_id: respId, nome: 'Rex', dt_nascimento: '2020-01-01', peso: 8 });
  assert.equal(p.s, 201); assert.equal(p.j.responsavel_id, respId); assert.ok(p.j.idade >= 5); petId = p.j.id;
});
test('CT02 HU01: CPF duplicado informa registro existente', async () => {
  const r = await novoResp(); assert.equal(r.s, 409); assert.equal(r.j.existente.id, respId);
});
test('CT03 HU01: pet sem responsável é rejeitado (RN01)', async () => {
  assert.equal((await req('POST', '/api/pets', A, { nome: 'Solto' })).s, 400);
  assert.equal((await req('POST', '/api/pets', A, { nome: 'Solto', responsavel_id: 999 })).s, 404);
});
test('CT04 HU02: tipo aceita só NORMAL ou EMERGENCIA (RN03)', async () => {
  const b = { pet_id: petId, veterinario_id: 1, data_hora: '2026-11-16T10:00' };
  assert.equal((await req('POST', '/api/consultas', A, { ...b, tipo: 'URGENTE' })).s, 400);
  const ok = await req('POST', '/api/consultas', A, { ...b, tipo: 'NORMAL' });
  assert.equal(ok.s, 201); consId = ok.j.id; assert.equal(ok.j.status, 'AGUARDANDO');
});
test('CT05 HU03: campos obrigatórios da consulta, explicando o campo ausente', async () => {
  const r = await req('POST', '/api/consultas', A, { tipo: 'NORMAL', pet_id: petId });
  assert.equal(r.s, 400); assert.match(r.j.erro, /veterinario_id/); assert.match(r.j.erro, /data_hora/);
});
test('CT06 RN02: responsável da consulta deve ser o do pet', async () => {
  const outro = (await novoResp('39053344705')).j.id;
  const r = await req('POST', '/api/consultas', A, { tipo: 'NORMAL', pet_id: petId, responsavel_id: outro, veterinario_id: 1, data_hora: '2026-11-16T11:00' });
  assert.equal(r.s, 422);
});
test('CT07 RN07: perfis só executam suas ações', async () => {
  assert.equal((await req('POST', '/api/consultas/' + consId + '/receitas', A, { prescricao: 'x' })).s, 403);
  assert.equal((await req('POST', '/api/cobrancas', V, { responsavel_id: respId, descricao: 'x', valor: 1 })).s, 403);
});
test('CT08 HU05/HU06: veterinário registra anotação, receita e exame', async () => {
  assert.equal((await req('PATCH', `/api/consultas/${consId}/anotacoes`, V, { anotacoes: 'Febre' })).j.status, 'EM_ATENDIMENTO');
  const rc = await req('POST', `/api/consultas/${consId}/receitas`, V, { prescricao: 'Dipirona 1 gota/kg' });
  assert.equal(rc.s, 201); assert.equal(rc.j.veterinario_id, 1);
  assert.equal((await req('POST', `/api/consultas/${consId}/exames`, V, { descricao: '' })).s, 400);
  assert.equal((await req('POST', `/api/consultas/${consId}/exames`, V, { descricao: 'Hemograma' })).s, 201);
  const c = await req('GET', '/api/consultas/' + consId, V);
  assert.equal(c.j.receitas.length, 1); assert.equal(c.j.exames.length, 1);
});
test('CT09 HU07: cobrança negativa rejeitada; nasce em aberto; pagamento registrado (RN06)', async () => {
  assert.equal((await req('POST', '/api/cobrancas', A, { responsavel_id: respId, descricao: 'Consulta', valor: -5 })).s, 400);
  const c = await req('POST', '/api/cobrancas', A, { responsavel_id: respId, descricao: 'Consulta', valor: 150 });
  assert.equal(c.s, 201); assert.equal(c.j.pago, 0);
  assert.equal((await req('PATCH', `/api/cobrancas/${c.j.id}/pagar`, A)).j.pago, 1);
});
test('CT10 HU04: histórico do pet lista consultas, receitas e exames', async () => {
  const h = await req('GET', `/api/pets/${petId}/historico`, V);
  assert.equal(h.s, 200); assert.equal(h.j.consultas[0].receitas.length, 1);
});
test('CT11 RN08: consulta finalizada não aceita novos registros', async () => {
  assert.equal((await req('POST', `/api/consultas/${consId}/finalizar`, V)).j.status, 'FINALIZADA');
  assert.equal((await req('POST', `/api/consultas/${consId}/receitas`, V, { prescricao: 'y' })).s, 409);
});
test('CT12 fila: emergência aparece antes da consulta normal', async () => {
  await req('POST', '/api/consultas', A, { tipo: 'NORMAL', pet_id: petId, veterinario_id: 1, data_hora: '2026-11-16T08:00' });
  await req('POST', '/api/consultas', A, { tipo: 'EMERGENCIA', pet_id: petId, veterinario_id: 2, data_hora: '2026-11-16T09:00' });
  const f = await req('GET', '/api/consultas?status=AGUARDANDO', V);
  assert.equal(f.j[0].tipo, 'EMERGENCIA');
});
