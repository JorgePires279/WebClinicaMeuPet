const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function abrirBanco(arquivo = process.env.DB_FILE || path.join(__dirname, '..', 'meupet.db')) {
  const db = new Database(arquivo);
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
  if (!db.prepare('SELECT COUNT(*) c FROM veterinario').get().c) {
    const v = db.prepare('INSERT INTO veterinario(nome,crmv,telefone,email,especialidade) VALUES (?,?,?,?,?)');
    v.run('Dra. Helena Souza', 'SC-12345', '48999990001', 'helena@meupet.com', 'Clínica geral');
    v.run('Dr. Marcos Lima', 'SC-23456', '48999990002', 'marcos@meupet.com', 'Emergência');
    db.prepare('INSERT INTO atendente(nome,cpf,telefone,endereco) VALUES (?,?,?,?)')
      .run('Maria Atendente', '11144477735', '48999990003', 'Criciúma/SC');
  }
  return db;
}
module.exports = { abrirBanco };
