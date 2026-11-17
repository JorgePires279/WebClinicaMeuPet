PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS atendente (
  id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, cpf TEXT NOT NULL UNIQUE,
  telefone TEXT, endereco TEXT);
CREATE TABLE IF NOT EXISTS veterinario (
  id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, crmv TEXT NOT NULL UNIQUE,
  telefone TEXT, email TEXT, especialidade TEXT);
CREATE TABLE IF NOT EXISTS responsavel (
  id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, cpf TEXT NOT NULL UNIQUE,
  fone TEXT NOT NULL, email TEXT, endereco TEXT, observacoes TEXT);
CREATE TABLE IF NOT EXISTS pet (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  responsavel_id INTEGER NOT NULL REFERENCES responsavel(id),
  nome TEXT NOT NULL, raca TEXT, dt_nascimento TEXT, cor_pelagem TEXT,
  peso REAL CHECK (peso IS NULL OR peso > 0), numero_microchip TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS consulta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('NORMAL','EMERGENCIA')),
  data_hora TEXT NOT NULL,
  pet_id INTEGER NOT NULL REFERENCES pet(id),
  responsavel_id INTEGER NOT NULL REFERENCES responsavel(id),
  veterinario_id INTEGER NOT NULL REFERENCES veterinario(id),
  atendente_id INTEGER REFERENCES atendente(id),
  status TEXT NOT NULL DEFAULT 'AGUARDANDO' CHECK (status IN ('AGUARDANDO','EM_ATENDIMENTO','FINALIZADA')),
  anotacoes TEXT);
CREATE TABLE IF NOT EXISTS receita (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consulta_id INTEGER NOT NULL REFERENCES consulta(id),
  veterinario_id INTEGER NOT NULL REFERENCES veterinario(id),
  data_emissao TEXT NOT NULL, prescricao TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS solicitacao_exame (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consulta_id INTEGER NOT NULL REFERENCES consulta(id),
  descricao TEXT NOT NULL, data_solicitacao TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cobranca (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  responsavel_id INTEGER NOT NULL REFERENCES responsavel(id),
  consulta_id INTEGER REFERENCES consulta(id),
  descricao TEXT NOT NULL, data TEXT NOT NULL,
  valor REAL NOT NULL CHECK (valor >= 0),
  pago INTEGER NOT NULL DEFAULT 0 CHECK (pago IN (0,1)));
CREATE INDEX IF NOT EXISTS ix_pet_resp ON pet(responsavel_id);
CREATE INDEX IF NOT EXISTS ix_consulta_pet ON consulta(pet_id);
