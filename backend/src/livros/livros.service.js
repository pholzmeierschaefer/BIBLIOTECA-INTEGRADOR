// livros.service.js – Regras de negócio para o gerenciamento de Livros e Exemplares

const livrosRepository = require('./livros.repository');

// Converte os status aceitos na API para os valores salvos no banco
const STATUS_API_PARA_DB = {
  disponivel: 'disponivel',
  emprestado: 'emprestado',
  reservado: 'reservado',
  retido_reserva: 'reservado',
  inativo: 'inativo_extraviado',
  inativo_extraviado: 'inativo_extraviado',
};

// Converte o status do banco para o nome amigável exibido na API
const STATUS_DB_PARA_API = {
  disponivel: 'disponivel',
  emprestado: 'emprestado',
  reservado: 'retido_reserva',
  inativo: 'inativo',
  inativo_extraviado: 'inativo',
};

const STATUS_VALIDOS_API = ['disponivel', 'emprestado', 'inativo', 'retido_reserva', 'reservado'];

// Cria um erro padronizado com código HTTP (400, 404, 409)
function criarErroHttp(statusCode, mensagem, codigo) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  if (codigo) err.codigo = codigo;
  return err;
}

// Formata os dados de um exemplar físico para resposta JSON
function formatarExemplar(exemplar) {
  return {
    id: exemplar.id,
    codigo_tombo: exemplar.codigo_exemplar,
    codigo_exemplar: exemplar.codigo_exemplar,
    livro_id: exemplar.livro_id,
    status: STATUS_DB_PARA_API[exemplar.status] || exemplar.status,
    ...(exemplar.livro && {
      livro: {
        id: exemplar.livro.id,
        codigo: exemplar.livro.codigo_livro,
        titulo: exemplar.livro.titulo,
        autor: exemplar.livro.autor,
        editora: exemplar.livro.editora,
      },
    }),
    created_at: exemplar.created_at,
    updated_at: exemplar.updated_at,
  };
}

// Formata os dados do livro e calcula o resumo de disponibilidade dos exemplares em tempo real
function formatarLivro(livro, { incluirExemplares = false } = {}) {
  const exemplares = Array.isArray(livro.exemplares) ? livro.exemplares : [];

  const disponiveis = exemplares.filter((ex) => ex.status === 'disponivel').length;
  const emprestados = exemplares.filter((ex) => ex.status === 'emprestado').length;
  const reservados = exemplares.filter((ex) => ex.status === 'reservado').length;
  const inativos = exemplares.filter((ex) => ex.status.startsWith('inativo')).length;

  const resultado = {
    id: livro.id,
    codigo: livro.codigo_livro,
    codigo_livro: livro.codigo_livro,
    titulo: livro.titulo,
    autor: livro.autor,
    editora: livro.editora,
    ano_publicacao: livro.ano_publicacao,
    tipo: livro.tipo || null,
    categoria: livro.categoria || null,
    total_exemplares_ativos: disponiveis + emprestados + reservados,
    exemplares_disponiveis: disponiveis,
    disponivel_para_emprestimo: disponiveis > 0,
    resumo_exemplares: {
      disponiveis,
      emprestados,
      retidos_reserva: reservados,
      inativos,
    },
    created_at: livro.created_at,
    updated_at: livro.updated_at,
  };

  if (incluirExemplares) {
    resultado.exemplares = exemplares.map(formatarExemplar);
  }

  return resultado;
}

// Localiza um livro aceitando tanto o código do livro (ex: LIV-001) quanto o ID numérico
async function localizarLivroPorCodigoOuId(identificador) {
  const valor = String(identificador).trim();
  let livro = await livrosRepository.buscarLivroPorCodigo(valor);

  if (!livro && /^\d+$/.test(valor)) {
    livro = await livrosRepository.buscarLivroPorId(Number(valor));
  }
  return livro;
}

// --- Serviços de Livros ---

// Lista todos os livros aplicando filtros opcionais
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

// Busca um livro específico por ID ou código junto com sua lista de exemplares
async function buscarLivroPorId(idOuCodigo) {
  const livro = await localizarLivroPorCodigoOuId(idOuCodigo);
  if (!livro) {
    throw criarErroHttp(404, 'Livro não encontrado.', 'LIVRO_NAO_ENCONTRADO');
  }

  return formatarLivro(livro, { incluirExemplares: true });
}

// Cadastra um novo livro no acervo validando duplicidade de código
async function criarLivro(dados) {
  const codigoLimpo = String(dados.codigo || dados.codigo_livro).trim();
  const existente = await livrosRepository.buscarLivroPorCodigo(codigoLimpo);

  if (existente) {
    throw criarErroHttp(
      409,
      `Já existe um livro cadastrado com o código "${codigoLimpo}".`,
      'CODIGO_LIVRO_DUPLICADO'
    );
  }

  const novoLivro = await livrosRepository.criarLivro({
    codigo_livro: codigoLimpo,
    titulo: String(dados.titulo).trim(),
    autor: String(dados.autor).trim(),
    editora: dados.editora ? String(dados.editora).trim() : null,
    ano_publicacao: dados.ano_publicacao ? Number(dados.ano_publicacao) : null,
    tipo: dados.tipo ? String(dados.tipo).trim() : null,
    categoria: dados.categoria ? String(dados.categoria).trim() : null,
  });

  const livroCompleto = await livrosRepository.buscarLivroPorId(novoLivro.id);
  return formatarLivro(livroCompleto, { incluirExemplares: true });
}

// Atualiza os dados de um livro existente
async function editarLivro(idOuCodigo, dados) {
  const livro = await localizarLivroPorCodigoOuId(idOuCodigo);
  if (!livro) {
    throw criarErroHttp(404, 'Livro não encontrado.', 'LIVRO_NAO_ENCONTRADO');
  }

  const camposAtualizados = {};
  const novoCodigo = dados.codigo ?? dados.codigo_livro;

  // Se o código do livro mudou, verifica se já não está em uso por outro livro
  if (novoCodigo !== undefined) {
    const codigoLimpo = String(novoCodigo).trim();
    if (codigoLimpo.toLowerCase() !== livro.codigo_livro.toLowerCase()) {
      const duplicado = await livrosRepository.buscarLivroPorCodigo(codigoLimpo);
      if (duplicado && duplicado.id !== livro.id) {
        throw criarErroHttp(
          409,
          `Já existe outro livro cadastrado com o código "${codigoLimpo}".`,
          'CODIGO_LIVRO_DUPLICADO'
        );
      }
      camposAtualizados.codigo_livro = codigoLimpo;
    }
  }

  if (dados.titulo !== undefined) camposAtualizados.titulo = String(dados.titulo).trim();
  if (dados.autor !== undefined) camposAtualizados.autor = String(dados.autor).trim();
  if (dados.editora !== undefined) {
    camposAtualizados.editora = dados.editora ? String(dados.editora).trim() : null;
  }
  if (dados.ano_publicacao !== undefined) {
    camposAtualizados.ano_publicacao = dados.ano_publicacao ? Number(dados.ano_publicacao) : null;
  }
  if (dados.tipo !== undefined) {
    camposAtualizados.tipo = dados.tipo ? String(dados.tipo).trim() : null;
  }
  if (dados.categoria !== undefined) {
    camposAtualizados.categoria = dados.categoria ? String(dados.categoria).trim() : null;
  }

  await livrosRepository.atualizarLivro(livro, camposAtualizados);
  const livroAtualizado = await livrosRepository.buscarLivroPorId(livro.id);
  return formatarLivro(livroAtualizado, { incluirExemplares: true });
}

// Exclui um livro caso não possua exemplares emprestados ou reservados
async function excluirLivro(idOuCodigo) {
  const livro = await localizarLivroPorCodigoOuId(idOuCodigo);
  if (!livro) {
    throw criarErroHttp(404, 'Livro não encontrado.', 'LIVRO_NAO_ENCONTRADO');
  }

  const exemplares = livro.exemplares || [];
  if (exemplares.some((ex) => ex.status === 'emprestado')) {
    throw criarErroHttp(409, 'Não é possível excluir o livro pois há exemplares emprestados.');
  }
  if (exemplares.some((ex) => ex.status === 'reservado')) {
    throw criarErroHttp(409, 'Não é possível excluir o livro pois há exemplares reservados.');
  }

  await livrosRepository.excluirLivro(livro.id);
}

// --- Serviços de Exemplares Físicos ---

// Lista todos os exemplares físicos de um livro específico
async function listarExemplaresDoLivro(codigoOuId, filtroStatus) {
  const livro = await localizarLivroPorCodigoOuId(codigoOuId);
  if (!livro) {
    throw criarErroHttp(404, 'Livro não encontrado.', 'LIVRO_NAO_ENCONTRADO');
  }

  let statusDb = null;
  if (filtroStatus) {
    statusDb = STATUS_API_PARA_DB[String(filtroStatus).trim().toLowerCase()];
    if (!statusDb) {
      throw criarErroHttp(400, `Status inválido. Permitidos: ${STATUS_VALIDOS_API.join(', ')}.`);
    }
  }

  const exemplares = await livrosRepository.listarExemplaresPorLivro(livro.id, statusDb);

  return {
    livro: {
      id: livro.id,
      codigo: livro.codigo_livro,
      titulo: livro.titulo,
      autor: livro.autor,
    },
    total: exemplares.length,
    exemplares: exemplares.map(formatarExemplar),
  };
}

// Cadastra um novo exemplar físico (código de tombo único) vinculado a um livro
async function cadastrarExemplar(codigoOuId, dados) {
  const livro = await localizarLivroPorCodigoOuId(codigoOuId);
  if (!livro) {
    throw criarErroHttp(404, 'Livro não encontrado.', 'LIVRO_NAO_ENCONTRADO');
  }

  const codigoTombo = String(dados.codigo_tombo || dados.codigo_exemplar).trim();
  const existente = await livrosRepository.buscarExemplarPorTombo(codigoTombo);

  if (existente) {
    throw criarErroHttp(
      409,
      `Já existe um exemplar cadastrado com o código de tombo "${codigoTombo}".`,
      'TOMBO_DUPLICADO'
    );
  }

  let statusDb = 'disponivel';
  if (dados.status) {
    statusDb = STATUS_API_PARA_DB[String(dados.status).trim().toLowerCase()];
    if (!statusDb) {
      throw criarErroHttp(400, `Status inválido. Permitidos: ${STATUS_VALIDOS_API.join(', ')}.`);
    }
  }

  const exemplarCriado = await livrosRepository.criarExemplar({
    codigo_exemplar: codigoTombo,
    livro_id: livro.id,
    status: statusDb,
  });

  const exemplarCompleto = await livrosRepository.buscarExemplarPorTombo(
    exemplarCriado.codigo_exemplar
  );
  return formatarExemplar(exemplarCompleto);
}

// Busca um exemplar físico específico pelo código de tombo
async function buscarExemplarPorTombo(tombo) {
  const exemplar = await livrosRepository.buscarExemplarPorTombo(tombo);
  if (!exemplar) {
    throw criarErroHttp(404, 'Exemplar não encontrado.', 'EXEMPLAR_NAO_ENCONTRADO');
  }
  return formatarExemplar(exemplar);
}

// Atualiza o código de tombo ou o status de um exemplar físico
async function editarExemplar(tombo, dados) {
  const exemplar = await livrosRepository.buscarExemplarPorTombo(tombo);
  if (!exemplar) {
    throw criarErroHttp(404, 'Exemplar não encontrado.', 'EXEMPLAR_NAO_ENCONTRADO');
  }

  const camposAtualizados = {};
  const novoTombo = dados.codigo_tombo ?? dados.codigo_exemplar;

  // Valida se o novo código de tombo já não pertence a outro exemplar
  if (novoTombo !== undefined) {
    const tomboLimpo = String(novoTombo).trim();
    if (!tomboLimpo) {
      throw criarErroHttp(400, 'O código de tombo não pode ficar vazio.');
    }
    if (tomboLimpo.toLowerCase() !== exemplar.codigo_exemplar.toLowerCase()) {
      const duplicado = await livrosRepository.buscarExemplarPorTombo(tomboLimpo);
      if (duplicado && duplicado.id !== exemplar.id) {
        throw criarErroHttp(409, `Já existe outro exemplar com o código de tombo "${tomboLimpo}".`);
      }
      camposAtualizados.codigo_exemplar = tomboLimpo;
    }
  }

  if (dados.status !== undefined) {
    const novoStatusDb = STATUS_API_PARA_DB[String(dados.status).trim().toLowerCase()];
    if (!novoStatusDb) {
      throw criarErroHttp(400, `Status inválido. Permitidos: ${STATUS_VALIDOS_API.join(', ')}.`);
    }
    camposAtualizados.status = novoStatusDb;
  }

  await livrosRepository.atualizarExemplar(exemplar, camposAtualizados);
  const atualizado = await livrosRepository.buscarExemplarPorTombo(
    camposAtualizados.codigo_exemplar || exemplar.codigo_exemplar
  );
  return formatarExemplar(atualizado);
}

// Exclui um exemplar físico caso não esteja emprestado nem reservado
async function excluirExemplar(tombo) {
  const exemplar = await livrosRepository.buscarExemplarPorTombo(tombo);
  if (!exemplar) {
    throw criarErroHttp(404, 'Exemplar não encontrado.', 'EXEMPLAR_NAO_ENCONTRADO');
  }

  if (exemplar.status === 'emprestado' || exemplar.status === 'reservado') {
    throw criarErroHttp(409, 'Não é possível excluir um exemplar que está emprestado ou reservado.');
  }

  await livrosRepository.excluirExemplar(exemplar);
}

module.exports = {
  STATUS_VALIDOS_API,
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
