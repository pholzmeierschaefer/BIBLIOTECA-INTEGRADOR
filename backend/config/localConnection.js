// localConnection.js – Cria e exporta a instância de conexão do Sequelize com o PostgreSQL

const { Sequelize } = require('sequelize');
const configs = require('./config');

// Seleciona a configuração do ambiente atual (padrão: 'development')
const ambiente = process.env.NODE_ENV || 'development';
const config = configs[ambiente];

// Inicializa o Sequelize passando todo o objeto de configuração (database, username, password, host, port, etc.)
const sequelize = new Sequelize(config);

// Exporta a conexão única para ser usada nos models e no restante da aplicação
module.exports = sequelize;
