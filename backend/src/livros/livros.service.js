// livros.service.js – Regras de negócio para Livros e Exemplares físicos

const livrosRepository = require('./livros.repository');

const STATUS_VALIDOS = ['disponivel', 'emprestado', 'reservado', 'inativo'];

// Cria um erro padronizado com statusCode HTTP (400, 404, 409) para o erroHandler capturar
function criarErroHttp(statusCode, mensagem) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  return err;
}

// Formata o objeto de um exemplar físico para devolver no JSON da API
function formatarExemplar(exemplar) {
  return {
    id: exemplar.id,
    codigo_tombo: exemplar.codigo_exemplar,
    livro_id: exemplar.livro_id,
    status: exemplar.status === 'inativo_extraviado' ? 'inativo' : exemplar.status,
    ...(exemplar.livro && { // Se a consulta trouxe os dados do livro pai, inclui um resumo dele
      livro: {
        id: exemplar.livro.id,
        codigo: exemplar.livro.codigo_livro,
        titulo: exemplar.livro.titulo,
        autor: exemplar.livro.autor,
      },
    }),
  };
}

// Formata os dados do livro e calcula automaticamente quantos exemplares estão disponíveis
function formatarLivro(livro, incluirExemplares = false) {
  const exemplares = livro.exemplares || [];
  const disponiveis = exemplares.filter((ex) => ex.status === 'disponivel').length;

  return {
    id: livro.id,
    codigo: livro.codigo_livro,
    titulo: livro.titulo,
    autor: livro.autor,
    editora: livro.editora,
    ano_publicacao: livro.ano_publicacao,
    tipo: livro.tipo,
    categoria: livro.categoria,
    total_exemplares: exemplares.length,
    exemplares_disponiveis: disponiveis,
    disponivel_para_emprestimo: disponiveis > 0, // true se houver ao menos 1 exemplar livre na estante
    ...(incluirExemplares && { exemplares: exemplares.map(formatarExemplar) }),
  };
}

// Busca um livro aceitando tanto o código (ex: "LIV-01") quanto o ID numérico na URL
async function localizarLivro(idOuCodigo) {
  const valor = String(idOuCodigo).trim();
  let livro = await livrosRepository.buscarLivroPorCodigo(valor);

  if (!livro && /^\d+$/.test(valor)) { // Se não achou pelo código e for apenas números, busca pelo ID
    livro = await livrosRepository.buscarLivroPorId(Number(valor));
  }
  if (!livro) throw criarErroHttp(404, 'Livro não encontrado.');
  return livro;
}

// --- Regras de Negócio: Livros ---

// Lista livros do acervo aplicando filtros de busca
async function listarLivros(filtros = {}) {
  const livros = await livrosRepository.listarLivros({
    titulo: filtros.titulo,
    autor: filtros.autor,
    tipo: filtros.tipo,
    categoria: filtros.categoria || filtros.genero,
    codigo: filtros.codigo,
    q: filtros.q || filtros.busca,
  });

  return livros.map((livro) => formatarLivro(livro));
}

// Busca um único livro pelo ID ou código, incluindo a lista dos seus exemplares
async function buscarLivroPorId(idOuCodigo) {
  const livro = await localizarLivro(idOuCodigo);
  return formatarLivro(livro, true);
}

// Cadastra um novo livro verificando antes se o código já existe
async function criarLivro(dados) {
  const codigo = String(dados.codigo || dados.codigo_livro).trim();

  if (await livrosRepository.buscarLivroPorCodigo(codigo)) {
    throw criarErroHttp(409, `Já existe um livro cadastrado com o código "${codigo}".`);
  }

  const novoLivro = await livrosRepository.criarLivro({
    codigo_livro: codigo,
    titulo: String(dados.titulo).trim(),
    autor: String(dados.autor).trim(),
    editora: dados.editora?.trim() || null,
    ano_publicacao: dados.ano_publicacao ? Number(dados.ano_publicacao) : null,
    tipo: dados.tipo?.trim() || null,
    categoria: dados.categoria?.trim() || null,
  });

  return formatarLivro(novoLivro, true);
}

// Atualiza os dados de um livro existente
async function editarLivro(idOuCodigo, dados) {
  const livro = await localizarLivro(idOuCodigo);
  const novoCodigo = dados.codigo ?? dados.codigo_livro;

  // Se o usuário estiver trocando o código do livro, garante que o novo código não pertença a outro livro
  if (novoCodigo && String(novoCodigo).trim().toLowerCase() !== livro.codigo_livro.toLowerCase()) {
    const duplicado = await livrosRepository.buscarLivroPorCodigo(novoCodigo);
    if (duplicado && duplicado.id !== livro.id) {
      throw criarErroHttp(409, `Já existe outro livro com o código "${novoCodigo}".`);
    }
  }

  await livrosRepository.atualizarLivro(livro, {
    ...(novoCodigo !== undefined && { codigo_livro: String(novoCodigo).trim() }),
    ...(dados.titulo !== undefined && { titulo: String(dados.titulo).trim() }),
    ...(dados.autor !== undefined && { autor: String(dados.autor).trim() }),
    ...(dados.editora !== undefined && { editora: dados.editora?.trim() || null }),
    ...(dados.ano_publicacao !== undefined && {
      ano_publicacao: dados.ano_publicacao ? Number(dados.ano_publicacao) : null,
    }),
    ...(dados.tipo !== undefined && { tipo: dados.tipo?.trim() || null }),
    ...(dados.categoria !== undefined && { categoria: dados.categoria?.trim() || null }),
  });

  const atualizado = await livrosRepository.buscarLivroPorId(livro.id);
  return formatarLivro(atualizado, true);
}

// Exclui um livro do acervo (bloqueia a exclusão se houver algum exemplar emprestado no momento)
async function excluirLivro(idOuCodigo) {
  const livro = await localizarLivro(idOuCodigo);
  const possuiEmprestado = (livro.exemplares || []).some((ex) => ex.status === 'emprestado');

  if (possuiEmprestado) {
    throw criarErroHttp(409, 'Não é possível excluir o livro pois há exemplares emprestados.');
  }

  await livrosRepository.excluirLivro(livro.id);
}

// --- Regras de Negócio: Exemplares Físicos ---

// Lista todos os exemplares físicos que pertencem a um livro
async function listarExemplaresDoLivro(codigoOuId, status) {
  const livro = await localizarLivro(codigoOuId);
  const exemplares = await livrosRepository.listarExemplaresPorLivro(livro.id, status);

  return {
    livro: { id: livro.id, codigo: livro.codigo_livro, titulo: livro.titulo },
    total: exemplares.length,
    exemplares: exemplares.map(formatarExemplar),
  };
}

// Cadastra um novo exemplar físico (etiqueta de tombo) vinculado ao livro
async function cadastrarExemplar(codigoOuId, dados) {
  const livro = await localizarLivro(codigoOuId);
  const codigoTombo = String(dados.codigo_tombo || dados.codigo_exemplar).trim();

  if (await livrosRepository.buscarExemplarPorTombo(codigoTombo)) {
    throw criarErroHttp(409, `Já existe um exemplar com o código de tombo "${codigoTombo}".`);
  }

  const status = dados.status ? String(dados.status).trim().toLowerCase() : 'disponivel';
  if (!STATUS_VALIDOS.includes(status)) {
    throw criarErroHttp(400, `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.`);
  }

  const criado = await livrosRepository.criarExemplar({
    codigo_exemplar: codigoTombo,
    livro_id: livro.id,
    status,
  });

  const completo = await livrosRepository.buscarExemplarPorTombo(criado.codigo_exemplar);
  return formatarExemplar(completo);
}

// Busca os detalhes de um exemplar físico pelo código de tombo
async function buscarExemplarPorTombo(tombo) {
  const exemplar = await livrosRepository.buscarExemplarPorTombo(tombo);
  if (!exemplar) throw criarErroHttp(404, 'Exemplar não encontrado.');
  return formatarExemplar(exemplar);
}

// Edita o código de tombo ou o status de um exemplar físico
async function editarExemplar(tombo, dados) {
  const exemplar = await livrosRepository.buscarExemplarPorTombo(tombo);
  if (!exemplar) throw criarErroHttp(404, 'Exemplar não encontrado.');

  const novoTombo = dados.codigo_tombo ?? dados.codigo_exemplar;
  if (novoTombo && String(novoTombo).trim().toLowerCase() !== exemplar.codigo_exemplar.toLowerCase()) {
    const duplicado = await livrosRepository.buscarExemplarPorTombo(novoTombo);
    if (duplicado && duplicado.id !== exemplar.id) {
      throw criarErroHttp(409, `Já existe outro exemplar com o tombo "${novoTombo}".`);
    }
  }

  if (dados.status && !STATUS_VALIDOS.includes(String(dados.status).trim().toLowerCase())) {
    throw criarErroHttp(400, `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.`);
  }

  await livrosRepository.atualizarExemplar(exemplar, {
    ...(novoTombo !== undefined && { codigo_exemplar: String(novoTombo).trim() }),
    ...(dados.status !== undefined && { status: String(dados.status).trim().toLowerCase() }),
  });

  return formatarExemplar(exemplar);
}

// Exclui um exemplar físico caso ele não esteja emprestado
async function excluirExemplar(tombo) {
  const exemplar = await livrosRepository.buscarExemplarPorTombo(tombo);
  if (!exemplar) throw criarErroHttp(404, 'Exemplar não encontrado.');

  if (exemplar.status === 'emprestado') {
    throw criarErroHttp(409, 'Não é possível excluir um exemplar que está emprestado.');
  }

  await livrosRepository.excluirExemplar(exemplar);
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
