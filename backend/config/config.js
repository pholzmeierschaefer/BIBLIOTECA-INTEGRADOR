// config.js – Configuração do banco de dados para o Sequelize e Sequelize CLI

const env = require('../src/config/env');

// Configuração base de conexão com o PostgreSQL
const dbConfig = {
  username: env.db.user, // Usuário do banco
  password: env.db.pass, // Senha do banco
  database: env.db.name, // Nome do banco de dados (ex: biblioteca_hm)
  host: env.db.host, // Endereço do servidor (ex: 127.0.0.1)
  port: env.db.port, // Porta do PostgreSQL (ex: 5432)
  dialect: 'postgres', // SGBD utilizado

  // Exibe os comandos SQL no terminal apenas em ambiente de desenvolvimento
  logging: env.nodeEnv === 'development' ? console.log : false,

  // Padrões globais para todas as tabelas/models do Sequelize
  define: {
    underscored: true, // Usa snake_case nas colunas geradas (ex: created_at)
    freezeTableName: true, // Impede o Sequelize de pluralizar os nomes das tabelas automaticamente
    timestamps: true, // Cria e gerencia automaticamente as colunas created_at e updated_at
  },
};

// Exporta a configuração para os ambientes que o Sequelize espera
module.exports = {
  development: dbConfig,
  test: dbConfig,
  production: dbConfig,
};
