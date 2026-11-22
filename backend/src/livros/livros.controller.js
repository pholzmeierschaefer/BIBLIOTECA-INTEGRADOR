// livros.controller.js – Recebe as requisições HTTP de Livros e Exemplares, valida dados básicos e chama o Service

const livrosService = require('./livros.service');

// --- Livros ---

// GET /api/livros – Lista livros com filtros opcionais via query params (?titulo=..., ?autor=..., ?q=...)
async function listarLivros(req, res, next) {
  try {
    const livros = await livrosService.listarLivros(req.query);
    return res.status(200).json(livros);
  } catch (err) {
    return next(err);
  }
}

// GET /api/livros/:id – Busca um livro específico pelo ID ou código do livro
async function buscarLivroPorId(req, res, next) {
  try {
    const livro = await livrosService.buscarLivroPorId(req.params.id);
    return res.status(200).json(livro);
  } catch (err) {
    return next(err);
  }
}

// POST /api/livros – Cadastra um novo livro no acervo
async function criarLivro(req, res, next) {
  try {
    const { codigo, codigo_livro, titulo, autor } = req.body;
    const codigoInformado = codigo ?? codigo_livro;

    if (!codigoInformado?.trim() || !titulo?.trim() || !autor?.trim()) {
      return res.status(400).json({
        erro: 'Os campos código, título e autor do livro são obrigatórios.',
      });
    }

    const livroCriado = await livrosService.criarLivro(req.body);
    return res.status(201).json(livroCriado);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/livros/:id – Atualiza os dados de um livro existente
async function editarLivro(req, res, next) {
  try {
    const livroAtualizado = await livrosService.editarLivro(req.params.id, req.body);
    return res.status(200).json(livroAtualizado);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/livros/:id – Exclui um livro do acervo (retorna 204 No Content)
async function excluirLivro(req, res, next) {
  try {
    await livrosService.excluirLivro(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

// --- Exemplares Físicos ---

// GET /api/livros/:codigo/exemplares – Lista todos os exemplares físicos de um livro
async function listarExemplaresDoLivro(req, res, next) {
  try {
    const resultado = await livrosService.listarExemplaresDoLivro(
      req.params.codigo,
      req.query.status
    );
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

// POST /api/livros/:codigo/exemplares – Cadastra um novo exemplar físico vinculado ao livro
async function cadastrarExemplar(req, res, next) {
  try {
    const codigoTombo = req.body.codigo_tombo ?? req.body.codigo_exemplar;
    if (!codigoTombo?.trim()) {
      return res.status(400).json({ erro: 'O código de tombo do exemplar é obrigatório.' });
    }

    const exemplarCriado = await livrosService.cadastrarExemplar(req.params.codigo, req.body);
    return res.status(201).json(exemplarCriado);
  } catch (err) {
    return next(err);
  }
}

// GET /api/livros/exemplares/:tombo – Busca um exemplar físico específico pelo código de tombo
async function buscarExemplarPorTombo(req, res, next) {
  try {
    const exemplar = await livrosService.buscarExemplarPorTombo(req.params.tombo);
    return res.status(200).json(exemplar);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/livros/exemplares/:tombo – Atualiza o status ou código de tombo do exemplar
async function editarExemplar(req, res, next) {
  try {
    const exemplarAtualizado = await livrosService.editarExemplar(req.params.tombo, req.body);
    return res.status(200).json(exemplarAtualizado);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/livros/exemplares/:tombo – Exclui um exemplar físico
async function excluirExemplar(req, res, next) {
  try {
    await livrosService.excluirExemplar(req.params.tombo);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listarLivros,
  buscarLivroPorId,
  criarLivro,
  editarLivro,
  excluirLivro,
  listarExemplaresDoLivro,
  cadastrarExemplar,
  buscarExemplarPorTombo,
  editarExemplar,
  excluirExemplar,
};
