// livros.repository.js – Camada de acesso ao banco de dados (Sequelize) para Livros, Categorias e Exemplares

const { Livro, TipoLivro, Categoria, Exemplar, Sequelize, sequelize } = require('../../models');
const { Op } = Sequelize; // Operadores SQL do Sequelize (iLike, or, etc.)

// JOIN padrão: traz os exemplares físicos, o tipo do livro e a categoria vinculada ao Livro
const INCLUDE_PADRAO = [
  { model: Exemplar, as: 'exemplares' },
  { model: TipoLivro, as: 'tipoLivro' },
  { model: Categoria, as: 'categoriaRel' },
];

// Busca um TipoLivro existente (por ID, código ou descrição) ou cria um novo automaticamente
async function buscarOuCriarTipoLivro(valor) {
  if (!valor || String(valor).trim() === '') return null;

  if (typeof valor === 'number' || /^\d+$/.test(String(valor).trim())) {
    return TipoLivro.findByPk(Number(valor));
  }

  const descricao = String(valor).trim();
  const existente = await TipoLivro.findOne({
    where: {
      [Op.or]: [
        { descricao: { [Op.iLike]: descricao } },
        { codigo: { [Op.iLike]: descricao } },
      ],
    },
  });

  if (existente) return existente;

  const codigo =
    descricao
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .slice(0, 16) || 'GERAL';

  return TipoLivro.create({ codigo, descricao });
}

// Busca uma Categoria existente (por ID, código ou nome) ou cria uma nova automaticamente
async function buscarOuCriarCategoria(valor) {
  if (!valor || String(valor).trim() === '') return null;

  // Se foi enviado um ID numérico (ex: categoria_id: 1), busca pela chave primária
  if (typeof valor === 'number' || /^\d+$/.test(String(valor).trim())) {
    return Categoria.findByPk(Number(valor));
  }

  const nome = String(valor).trim();
  const existente = await Categoria.findOne({
    where: {
      [Op.or]: [
        { nome: { [Op.iLike]: nome } },
        { codigo: { [Op.iLike]: nome } },
      ],
    },
  });

  if (existente) return existente;

  // Gera um código curto sem acentos (ex: "Ficção Científica" -> "FICCAO_CIENTIFIC")
  const codigo =
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .slice(0, 16) || 'GERAL';

  return Categoria.create({ codigo, nome });
}

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
    include: INCLUDE_PADRAO,
    order: [['titulo', 'ASC']], // Ordena os livros em ordem alfabética pelo título
  });
}

// Busca um livro pelo ID numérico (chave primária)
async function buscarLivroPorId(id) {
  return Livro.findByPk(id, { include: INCLUDE_PADRAO });
}

// Busca um livro pelo código único (ex: "LIV-001")
async function buscarLivroPorCodigo(codigoLivro) {
  return Livro.findOne({
    where: { codigo_livro: { [Op.iLike]: String(codigoLivro).trim() } },
    include: INCLUDE_PADRAO,
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
  buscarOuCriarTipoLivro,
  buscarOuCriarCategoria,
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
