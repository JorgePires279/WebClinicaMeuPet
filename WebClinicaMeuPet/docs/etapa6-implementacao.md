# Etapa 6 — Implementação · MeuPet

## 1. Como executar
```bash
cd meupet
npm install
npm start          # http://localhost:3000
npm test           # 12 testes automatizados
```
Requisitos: Node.js 18 ou superior. O banco `meupet.db` é criado no primeiro uso, com 2 veterinários e 1 atendente de exemplo. Para o front, escolha o perfil (Atendente ou Veterinário) no topo da tela.

## 2. Estrutura
```
meupet/
├─ server.js            ponto de entrada
├─ src/db.js            abre o banco, aplica schema e dados iniciais
├─ src/app.js           rotas REST + regras de negócio
├─ db/schema.sql        modelo de dados
├─ public/index.html    interface
├─ tests/regras.test.js testes (Etapa 7)
└─ docs/                documentos das etapas 4 a 7
```

## 3. Fluxo implementado (segue o diagrama de atividades)
1. **Atendente · Recepção:** cadastra responsável e pet (o CPF existente é avisado), faz a triagem escolhendo Normal ou Emergência e abre a consulta com o veterinário.
2. **Atendente · Cobranças:** lança a cobrança em nome do responsável e depois marca como paga.
3. **Fila:** emergências aparecem antes das normais, depois por horário.
4. **Veterinário · Atendimento:** abre a consulta pela fila, vê o histórico do pet, grava anotações, registra receitas, solicita exames e finaliza.

## 3.1 API
| Método e rota | Perfil | História |
|---|---|---|
| `GET/POST /api/responsaveis` | A | HU01 |
| `GET/POST /api/pets` · `GET /api/pets/:id/historico` | A · V | HU01 · HU04 |
| `GET/POST /api/consultas` · `GET /api/consultas/:id` | A | HU02, HU03 |
| `PATCH /api/consultas/:id/anotacoes` | V | HU05 |
| `POST /api/consultas/:id/receitas` | V | HU05 |
| `POST /api/consultas/:id/exames` | V | HU06 |
| `POST /api/consultas/:id/finalizar` | V | RN08 |
| `GET/POST /api/cobrancas` · `PATCH /api/cobrancas/:id/pagar` | A | HU07 |

Perfil enviado no cabeçalho `x-perfil` (ATENDENTE ou VETERINARIO).

## 4. Correspondência com o planejamento (Kanban, Etapa 3)
Itens 2 a 7 do backlog (cadastros, triagem/consultas, receitas, cobrança, exames, histórico) estão implementados. O item "filtros" (Could) ficou de fora: só há filtro por status na fila.

## 5. Mudanças de escopo (comunicar ao professor, regra 7 do guia)
- Acrescentada a **RN08** (consulta finalizada fica bloqueada) e o status da consulta.
- A **fila prioriza emergências** (consequência direta da triagem).
- Autenticação real **não** foi implementada; o perfil é escolhido na tela.

## 6. Uso de IA (registrar no diário de projeto)
O guia permite IA na Etapa 6. Esta base foi gerada com apoio de IA a partir dos documentos das Etapas 1 a 4. Cada integrante precisa ser capaz de **explicar e alterar ao vivo** qualquer parte (defesa oral). Registre no diário a data, a ferramenta e o que foi pedido. Sugestão de treino: adicionar um campo ao Pet (banco, API, tela e teste).
