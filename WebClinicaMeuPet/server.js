const { abrirBanco } = require('./src/db');
const { criarApp } = require('./src/app');
const porta = process.env.PORT || 3000;
criarApp(abrirBanco()).listen(porta, () => console.log(`MeuPet rodando em http://localhost:${porta}`));
