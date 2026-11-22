// models/index.js – Carrega todos os models da pasta, configura os relacionamentos e exporta o banco

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/localConnection');

const db = {};
const arquivoAtual = path.basename(__filename);

// Lê todos os arquivos .js desta pasta (exceto o próprio index.js e arquivos vazios) e inicializa cada Model
fs.readdirSync(__dirname)
  .filter((file) => file.endsWith('.js') && file !== arquivoAtual)
  .forEach((file) => {
    const caminhoModel = path.join(__dirname, file);
    if (fs.statSync(caminhoModel).size > 0) {
      const definirModel = require(caminhoModel);
      if (typeof definirModel === 'function') {
        const model = definirModel(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
      }
    }
  });

// Executa o método associate() de cada model para criar os relacionamentos (belongsTo, hasMany, etc.)
Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
