# Etapa 7 — Testes e qualidade · MeuPet

## 1. Plano de testes
Os casos estão em `tests/regras.test.js` (Node `node:test`, banco SQLite em memória, API real via HTTP). Executar com `npm test`.

| Caso | Critério de aceitação verificado | História / regra | Nível |
|---|---|---|---|
| CT01 | Cadastra responsável e pet vinculado, idade calculada | HU01 · RN01 | Unidade/integração |
| CT02 | CPF já cadastrado informa o registro existente (409) | HU01 | Integração |
| CT03 | Pet sem responsável ou com responsável inexistente é rejeitado | RN01 | Unidade |
| CT04 | Tipo só aceita NORMAL ou EMERGENCIA; consulta nasce AGUARDANDO | HU02 · RN03 | Unidade |
| CT05 | Sem pet, veterinário ou data/hora, a mensagem cita o campo ausente | HU03 | Unidade |
| CT06 | Responsável da consulta diferente do responsável do pet é rejeitado | RN02 | Unidade |
| CT07 | Perfil errado recebe 403 | RN07 | Integração |
| CT08 | Anotação, receita e exame ficam ligados à consulta correta | HU05 · HU06 | Integração |
| CT09 | Cobrança negativa rejeitada; nasce em aberto; pagamento registrado | HU07 · RN06 | Unidade/integração |
| CT10 | Histórico do pet traz consultas, receitas e exames | HU04 | Integração |
| CT11 | Consulta finalizada bloqueia novos registros | RN08 | Unidade |
| CT12 | Fila: emergência antes da normal | HU02 | Sistema (fluxo crítico) |

O fluxo crítico de ponta a ponta (cadastro → triagem → consulta → receita/exame → cobrança → pagamento) é percorrido por CT01, CT04, CT08, CT09 e CT11 em sequência.

## 2. Relatório de execução
Execução em 16/11/2026, Node 22, `npm test`:

| Resultado | Quantidade |
|---|---|
| Casos executados | 12 |
| Aprovados | 12 |
| Reprovados | 0 |

## 3. Defeitos encontrados e correções
| ID | Descrição | Correção | Reteste |
|---|---|---|---|
| DEF-01 | Na primeira execução, `npm test` falhou com "Cannot find module tests": o script apontava para a pasta e não para o arquivo. | `package.json` passou a apontar para `tests/regras.test.js`. | 12/12 aprovados |

Nenhum defeito de regra de negócio apareceu nesta rodada. Isso não significa ausência de defeitos: o front-end **não** tem teste automatizado e foi verificado só com carregamento da página e uma chamada à API.

## 4. Teste de aceitação com o stakeholder — PENDENTE
Deve ser feito com a atendente e o veterinário usando as histórias HU01–HU07 e seus critérios de aceitação (Etapa 2). Roteiro sugerido: executar o fluxo completo na tela e preencher a tabela abaixo. **Não registrar como aprovado antes de acontecer.**

| História | Critério verificado na tela | Resultado | Observação do stakeholder |
|---|---|---|---|
| HU01–HU07 | (preencher) | | |

## 5. Métricas
| Métrica | Valor | Como foi calculada |
|---|---|---|
| Cobertura de requisitos por testes | 7 de 7 histórias (100%) | HU01 a HU07 aparecem em pelo menos um caso |
| Taxa de aprovação | 12/12 (100%) | casos aprovados ÷ executados |
| Defeitos por iteração | 1 (de configuração) na iteração atual | tabela de defeitos |
| Tempo de ciclo | **a medir** | usar as datas do quadro Kanban |

## 6. Limitações e próximos testes
Não há teste de carga, de segurança (autenticação) nem de interface. Recomenda-se adicionar teste de interface (Playwright) e medir cobertura de código (`node --test --experimental-test-coverage`).
