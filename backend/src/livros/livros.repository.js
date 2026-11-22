// livros.repository.js – Consultas e operações de banco de dados para Livros e Exemplares

const { Livro, Exemplar, Sequelize, sequelize } = require('../../models');
const { Op } = Sequelize;

// Lista livros do acervo com filtros opcionais e já traz os exemplares físicos de cada livro
async function listarLivros({ titulo, autor, tipo, categoria, codigo, q } = {}) {
  const where = {};

  if (titulo) where.titulo = { [Op.iLike]: `%${titulo.trim()}%` }; // Op.iLike: busca parcial sem diferenciar maiúsculas/minúsculas
  if (autor) where.autor = { [Op.iLike]: `%${autor.trim()}%` };
  if (codigo) where.codigo_livro = { [Op.iLike]: `%${codigo.trim()}%` };
  if (tipo) where.tipo = { [Op.iLike]: `%${tipo.trim()}%` };
  if (categoria) where.categoria = { [Op.iLike]: `%${categoria.trim()}%` };

  if (q) {
    const termo = `%${q.trim()}%`;
    where[Op.or] = [ // Op.or: procura o termo no título, autor OU código do livro
      { titulo: { [Op.iLike]: termo } },
      { autor: { [Op.iLike]: termo } },
      { codigo_livro: { [Op.iLike]: termo } },
    ];
  }

  return Livro.findAll({
    where,
    include: [{ model: Exemplar, as: 'exemplares' }],
    order: [
      ['titulo', 'ASC'],
      [{ model: Exemplar, as: 'exemplares' }, 'codigo_exemplar', 'ASC'],
    ],
  });
}

// Busca um livro pela chave primária (ID) trazendo seus exemplares
async function buscarLivroPorId(id, transaction) {
  return Livro.findByPk(id, {
    include: [{ model: Exemplar, as: 'exemplares' }],
    order: [[{ model: Exemplar, as: 'exemplares' }, 'codigo_exemplar', 'ASC']],
    transaction,
  });
}

// Busca um livro pelo código único (codigo_livro) trazendo seus exemplares
async function buscarLivroPorCodigo(codigoLivro, transaction) {
  return Livro.findOne({
    where: { codigo_livro: { [Op.iLike]: String(codigoLivro).trim() } },
    include: [{ model: Exemplar, as: 'exemplares' }],
    order: [[{ model: Exemplar, as: 'exemplares' }, 'codigo_exemplar', 'ASC']],
    transaction,
  });
}

// Insere um novo livro no banco
async function criarLivro(dados, transaction) {
  return Livro.create(dados, { transaction });
}

// Atualiza os dados de um livro existente
async function atualizarLivro(livro, dados, transaction) {
  return livro.update(dados, { transaction });
}

// Exclui um livro e todos os seus exemplares vinculados dentro de uma transação
async function excluirLivro(livroId) {
  return sequelize.transaction(async (transaction) => {
    await Exemplar.destroy({ where: { livro_id: livroId }, transaction });
    return Livro.destroy({ where: { id: livroId }, transaction });
  });
}

// --- Consultas de Exemplares Físicos ---

// Lista os exemplares de um livro específico (com filtro opcional por status)
async function listarExemplaresPorLivro(livroId, status) {
  const where = { livro_id: livroId };
  if (status) where.status = status;

  return Exemplar.findAll({
    where,
    order: [['codigo_exemplar', 'ASC']],
  });
}

// Busca um exemplar físico pelo código de tombo (codigo_exemplar) trazendo os dados do Livro
async function buscarExemplarPorTombo(codigoTombo, transaction) {
  return Exemplar.findOne({
    where: { codigo_exemplar: { [Op.iLike]: String(codigoTombo).trim() } },
    include: [{ model: Livro, as: 'livro' }],
    transaction,
  });
}

// Cria um novo exemplar físico vinculado a um livro
async function criarExemplar(dados, transaction) {
  return Exemplar.create(dados, { transaction });
}

// Atualiza o código de tombo ou status de um exemplar físico
async function atualizarExemplar(exemplar, dados, transaction) {
  return exemplar.update(dados, { transaction });
}

// Remove um exemplar físico do banco
async function excluirExemplar(exemplar, transaction) {
  return exemplar.destroy({ transaction });
}

module.exports = {
  listarLivros,
  buscarLivroPorId,
  buscarLivroPorCodigo,
  criarLivro,
  atualizarLivro,
  excluirLivro,
  listarExemplaresPorLivro,
  buscarExemplarPorTombo,
  criarExemplar,
  atualizarExemplar,
  excluirExemplar,
};
