// livros.repository.js – Camada de acesso ao banco de dados (Sequelize) para Livros e Exemplares

const { Livro, Exemplar, Sequelize, sequelize } = require('../../models');
const { Op } = Sequelize; // Operadores SQL do Sequelize (iLike, or, etc.)

// JOIN padrão: sempre que buscarmos um Livro, já trazemos a lista de exemplares físicos dele
const INCLUDE_EXEMPLARES = [{ model: Exemplar, as: 'exemplares' }];

// Lista livros do acervo com filtros opcionais de busca
async function listarLivros({ titulo, autor, tipo, categoria, codigo, q } = {}) {
  const where = {};

  if (titulo) where.titulo = { [Op.iLike]: `%${titulo.trim()}%` }; // Op.iLike: busca parcial ignorando maiúsculas/minúsculas
  if (autor) where.autor = { [Op.iLike]: `%${autor.trim()}%` };
  if (codigo) where.codigo_livro = { [Op.iLike]: `%${codigo.trim()}%` };
  if (tipo) where.tipo = { [Op.iLike]: `%${tipo.trim()}%` };
  if (categoria) where.categoria = { [Op.iLike]: `%${categoria.trim()}%` };

  if (q) {
    const termo = `%${q.trim()}%`;
    where[Op.or] = [ // Op.or: procura o texto digitado no título, no autor OU no código
      { titulo: { [Op.iLike]: termo } },
      { autor: { [Op.iLike]: termo } },
      { codigo_livro: { [Op.iLike]: termo } },
    ];
  }

  return Livro.findAll({
    where,
    include: INCLUDE_EXEMPLARES,
    order: [['titulo', 'ASC']], // Ordena os livros em ordem alfabética pelo título
  });
}

// Busca um livro pelo ID numérico (chave primária)
async function buscarLivroPorId(id) {
  return Livro.findByPk(id, { include: INCLUDE_EXEMPLARES });
}

// Busca um livro pelo código único (ex: "LIV-001")
async function buscarLivroPorCodigo(codigoLivro) {
  return Livro.findOne({
    where: { codigo_livro: { [Op.iLike]: String(codigoLivro).trim() } },
    include: INCLUDE_EXEMPLARES,
  });
}

// Insere um novo livro na tabela 'livros'
async function criarLivro(dados) {
  return Livro.create(dados);
}

// Atualiza os dados de um livro já carregado do banco
async function atualizarLivro(livro, dados) {
  return livro.update(dados);
}

// Exclui os exemplares do livro e em seguida exclui o livro dentro de uma transação
async function excluirLivro(livroId) {
  return sequelize.transaction(async (transaction) => { // transaction: garante que só apaga o livro se apagar os exemplares com sucesso
    await Exemplar.destroy({ where: { livro_id: livroId }, transaction });
    return Livro.destroy({ where: { id: livroId }, transaction });
  });
}

// --- Consultas de Exemplares Físicos ---

// Lista todos os exemplares físicos vinculados a um livro (com filtro opcional por status)
async function listarExemplaresPorLivro(livroId, status) {
  const where = { livro_id: livroId };
  if (status) where.status = status;

  return Exemplar.findAll({ where, order: [['codigo_exemplar', 'ASC']] });
}

// Busca um exemplar físico específico pelo seu código de tombo, trazendo junto os dados do Livro
async function buscarExemplarPorTombo(codigoTombo) {
  return Exemplar.findOne({
    where: { codigo_exemplar: { [Op.iLike]: String(codigoTombo).trim() } },
    include: [{ model: Livro, as: 'livro' }],
  });
}

// Insere um novo exemplar físico na tabela 'exemplares'
async function criarExemplar(dados) {
  return Exemplar.create(dados);
}

// Atualiza os dados (tombo ou status) de um exemplar físico
async function atualizarExemplar(exemplar, dados) {
  return exemplar.update(dados);
}

// Remove um exemplar físico do banco
async function excluirExemplar(exemplar) {
  return exemplar.destroy();
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
