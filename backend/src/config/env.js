// env.js – Carrega as variáveis de ambiente e exporta as configurações da aplicação

const path = require('path');
const dotenv = require('dotenv');

// Carrega o arquivo .env localizado em backend/src/.env (ou backend/.env caso exista na raiz)
dotenv.config({
  path: [
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ],
});

module.exports = {
  // Ambiente de execução da aplicação (development, production, etc.)
  nodeEnv: process.env.NODE_ENV || 'development',

  // Porta onde o servidor HTTP irá rodar (converte para número ou usa 3000 como padrão)
  port: Number(process.env.PORT) || 3000,

  // Chave secreta usada para assinar e validar os tokens JWT
  jwtSecret: process.env.JWT_SECRET || 'segredo_jwt_biblioteca_hm_dev_2026',

  // Tempo de expiração do token JWT (padrão: 15 minutos)
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',

  // Configurações de conexão com o banco de dados PostgreSQL
  db: {
    host: process.env.DB_HOST || '127.0.0.1', // Endereço do servidor do banco
    port: Number(process.env.DB_PORT) || 5432, // Porta do PostgreSQL (padrão: 5432)
    name: process.env.DB_NAME || 'biblioteca_hm', // Nome do banco de dados
    user: process.env.DB_USER || 'postgres', // Usuário do banco de dados
    pass: process.env.DB_PASS || 'postgres', // Senha do banco de dados
  },
};
