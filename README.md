# WebClinicaMeuPet
# MeuPet — Sistema de Gestão da Clínica Veterinária

Sistema web para registrar o atendimento presencial de uma clínica veterinária: da chegada do animal até receitas, exames e cobranças. Projeto acadêmico (ABP), com escopo pequeno e funcionando.

## Funcionalidades

- Cadastro de responsáveis e pets (aviso quando o CPF já existe)
- Triagem: normal ou emergência
- Abertura de consulta com o veterinário
- Fila de atendimento (emergências aparecem antes das normais, depois por horário)
- Anotações, receitas e solicitação de exames na consulta
- Histórico do pet
- Finalização da consulta (depois disso, não aceita novos registros)
- Lançamento de cobrança e registro de pagamento

## Perfis

| Perfil | Pode fazer |
|---|---|
| Atendente | Cadastros, triagem, abertura de consulta e cobrança |
| Veterinário | Histórico, anotações, receitas, exames e finalização da consulta |

O perfil é escolhido no topo da tela e enviado no cabeçalho `x-perfil` (`ATENDENTE` ou `VETERINARIO`).

## Tecnologias

- Front-end: HTML, CSS e JavaScript (`public/index.html`)
- API: Node.js + Express (`src/app.js`)
- Banco: SQLite (`db/schema.sql`, `src/db.js`)

## Como executar

Requisito: Node.js 18 ou superior.

```bash
cd meupet
npm install
npm start          # http://localhost:3000
npm test           # 12 testes automatizados
```

O banco `meupet.db` é criado no primeiro uso, com 2 veterinários e 1 atendente de exemplo.

## Estrutura

```
meupet/
├─ server.js            ponto de entrada
├─ src/db.js            abre o banco, aplica schema e dados iniciais
├─ src/app.js           rotas REST + regras de negócio
├─ db/schema.sql        modelo de dados
├─ public/index.html    interface
├─ tests/regras.test.js testes
└─ docs/                documentos das etapas 4 a 7
```

## API

| Método e rota | Perfil | História |
|---|---|---|
| `GET/POST /api/responsaveis` | Atendente | HU01 |
| `GET/POST /api/pets` | Atendente | HU01 |
| `GET /api/pets/:id/historico` | Veterinário | HU04 |
| `GET/POST /api/consultas` e `GET /api/consultas/:id` | Atendente | HU02, HU03 |
| `PATCH /api/consultas/:id/anotacoes` | Veterinário | HU05 |
| `POST /api/consultas/:id/receitas` | Veterinário | HU05 |
| `POST /api/consultas/:id/exames` | Veterinário | HU06 |
| `POST /api/consultas/:id/finalizar` | Veterinário | RN08 |
| `GET/POST /api/cobrancas` e `PATCH /api/cobrancas/:id/pagar` | Atendente | HU07 |

## Regras de negócio

- **RN01** Todo pet pertence a exatamente um responsável.
- **RN02** A consulta referencia pet, responsável e veterinário válidos; o responsável deve ser o do pet.
- **RN03** O tipo da consulta é NORMAL ou EMERGENCIA, definido na triagem.
- **RN04** A receita identifica consulta, veterinário, data e prescrição.
- **RN05** A solicitação de exame é vinculada à consulta e tem descrição.
- **RN06** A cobrança tem responsável, data, descrição, valor ≥ 0 e situação (paga ou em aberto).
- **RN07** Atendente e veterinário têm permissões separadas.
- **RN08** Consulta FINALIZADA não aceita novas anotações, receitas ou exames.

## Testes

Os 12 casos estão em `tests/regras.test.js` (`node:test`, banco SQLite em memória, API real via HTTP). Última execução registrada: 16/11/2026, Node 22, 12 aprovados e 0 reprovados.

## Limitações

- **Sem autenticação real:** o perfil é escolhido na tela. Em produção, seria necessário login com senha e sessão/token.
- O front-end não tem teste automatizado.
- Não há filtros além do filtro por status na fila.
- O teste de aceitação com atendente e veterinário ainda está pendente.

## Documentação

Os documentos das etapas 4 a 7 (modelagem, arquitetura, implementação e testes) ficam na pasta `docs/`.
