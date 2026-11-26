// =============================================================================
// [RELATÓRIO 2.1c & 3.1] SERVICE DE LIVROS E EXEMPLARES (SEPARAÇÃO CONCEITUAL)
// O QUE FAZ: Gerencia cadastro de títulos (tabela `livros`), categorias e
// exemplares físicos individuais (tabela `exemplares` com código de tombo).
// POR QUE ESTÁ AQUI: Decisão 3.1 do relatório — 1 obra (ex: Dom Casmurro) pode
// ter N exemplares físicos independentes (um emprestado, outro disponível).
// =============================================================================

const livrosRepository = require('./livros.repository');

const STATUS_VALIDOS = ['disponivel', 'emprestado', 'reservado', 'inativo'];

// Cria um erro padronizado com statusCode HTTP (400, 404, 409) para o erroHandler capturar
function criarErroHttp(statusCode, mensagem) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  return err;
}

// [RELATÓRIO 3.1] Formata um exemplar físico individual (tombo + status próprio na estante)
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

// [RELATÓRIO 3.1] Formata os dados da obra ("Livro") e calcula em tempo real quantos exemplares
// físicos estão com status 'disponivel' na estante versus o total de cópias cadastradas.
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
    tipo: livro.tipoLivro?.descricao || livro.tipo || null, // Prioriza a descrição vinda da tabela 'tipos_livro'
    tipo_livro_id: livro.tipo_livro_id || null,
    categoria: livro.categoriaRel?.nome || livro.categoria || null, // Prioriza o nome vindo da tabela 'categorias'
    categoria_id: livro.categoria_id || null,
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

// Cadastra um novo livro verificando antes se o código já existe e vinculando a Categoria
async function criarLivro(dados) {
  const codigo = String(dados.codigo || dados.codigo_livro).trim();

  if (await livrosRepository.buscarLivroPorCodigo(codigo)) {
    throw criarErroHttp(409, `Já existe um livro cadastrado com o código "${codigo}".`);
  }

  // Busca ou cria o tipo do livro e a categoria nas respectivas tabelas
  const tipoObj = await livrosRepository.buscarOuCriarTipoLivro(
    dados.tipo_livro_id ?? dados.tipo
  );
  const categoriaObj = await livrosRepository.buscarOuCriarCategoria(
    dados.categoria_id ?? dados.categoria
  );

  const novoLivro = await livrosRepository.criarLivro({
    codigo_livro: codigo,
    titulo: String(dados.titulo).trim(),
    autor: String(dados.autor).trim(),
    editora: dados.editora?.trim() || null,
    ano_publicacao: dados.ano_publicacao ? Number(dados.ano_publicacao) : null,
    tipo: tipoObj ? tipoObj.descricao : dados.tipo?.trim() || null,
    tipo_livro_id: tipoObj ? tipoObj.id : null,
    categoria: categoriaObj ? categoriaObj.nome : dados.categoria?.trim() || null,
    categoria_id: categoriaObj ? categoriaObj.id : null,
  });

  const livroCompleto = await livrosRepository.buscarLivroPorId(novoLivro.id);
  return formatarLivro(livroCompleto, true);
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

  const camposAtualizados = {
    ...(novoCodigo !== undefined && { codigo_livro: String(novoCodigo).trim() }),
    ...(dados.titulo !== undefined && { titulo: String(dados.titulo).trim() }),
    ...(dados.autor !== undefined && { autor: String(dados.autor).trim() }),
    ...(dados.editora !== undefined && { editora: dados.editora?.trim() || null }),
    ...(dados.ano_publicacao !== undefined && {
      ano_publicacao: dados.ano_publicacao ? Number(dados.ano_publicacao) : null,
    }),
  };

  // Se enviou um novo tipo de livro, busca ou cria na tabela 'tipos_livro' e atualiza o vínculo
  if (dados.tipo !== undefined || dados.tipo_livro_id !== undefined) {
    const tipoObj = await livrosRepository.buscarOuCriarTipoLivro(
      dados.tipo_livro_id ?? dados.tipo
    );
    camposAtualizados.tipo = tipoObj ? tipoObj.descricao : null;
    camposAtualizados.tipo_livro_id = tipoObj ? tipoObj.id : null;
  }

  // Se enviou uma nova categoria, busca ou cria na tabela 'categorias' e atualiza o vínculo
  if (dados.categoria !== undefined || dados.categoria_id !== undefined) {
    const categoriaObj = await livrosRepository.buscarOuCriarCategoria(
      dados.categoria_id ?? dados.categoria
    );
    camposAtualizados.categoria = categoriaObj ? categoriaObj.nome : null;
    camposAtualizados.categoria_id = categoriaObj ? categoriaObj.id : null;
  }

  await livrosRepository.atualizarLivro(livro, camposAtualizados);
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
