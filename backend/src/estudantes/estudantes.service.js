// estudantes.service.js – Regras de negócio para o gerenciamento de Estudantes

const estudantesRepository = require('./estudantes.repository');

const STATUS_VALIDOS = ['ativo', 'bloqueado', 'inativo'];

// Cria um erro padronizado com código de status HTTP (ex: 400, 404, 409)
function criarErroHttp(statusCode, mensagem, codigo) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  if (codigo) err.codigo = codigo;
  return err;
}

// Formata os dados do estudante que serão devolvidos pela API
function formatarEstudante(estudante) {
  return {
    id: estudante.id,
    matricula: estudante.matricula,
    nome: estudante.nome_completo,
    nome_completo: estudante.nome_completo,
    turma: estudante.turma,
    telefone: estudante.telefone,
    status: estudante.status,
    created_at: estudante.created_at,
    updated_at: estudante.updated_at,
  };
}

// Valida se o status informado está entre os permitidos ('ativo', 'bloqueado', 'inativo')
function validarStatus(status) {
  const statusLimpo = String(status).trim().toLowerCase();
  if (!STATUS_VALIDOS.includes(statusLimpo)) {
    throw criarErroHttp(
      400,
      `Status inválido. Valores permitidos: ${STATUS_VALIDOS.join(', ')}.`,
      'STATUS_INVALIDO'
    );
  }
  return statusLimpo;
}

// Localiza um estudante aceitando tanto a matrícula quanto o ID numérico na URL
async function localizarPorMatriculaOuId(identificador) {
  const valor = String(identificador).trim();
  let estudante = await estudantesRepository.buscarEstudantePorMatricula(valor);

  if (!estudante && /^\d+$/.test(valor)) { // Se não achou pela matrícula e o valor só tem números, tenta pelo ID
    estudante = await estudantesRepository.buscarEstudantePorId(Number(valor));
  }
  return estudante;
}

// Converte um texto CSV simples (separado por ';' ou ',') em uma lista de objetos de estudantes
function parsearCsvEstudantes(conteudoCsv) {
  const texto = String(conteudoCsv || '').replace(/^\uFEFF/, '').trim(); // Remove BOM UTF-8 se existir
  if (!texto) throw criarErroHttp(400, 'O conteúdo CSV está vazio.', 'CSV_VAZIO');

  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  const delimitador = linhas[0].includes(';') ? ';' : ','; // Detecta se o CSV usa ponto e vírgula ou vírgula

  // Normaliza os nomes das colunas da primeira linha (remove acentos e deixa minúsculo)
  const cabecalho = linhas[0]
    .split(delimitador)
    .map((col) => col.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  const idxMatricula = cabecalho.findIndex((c) => ['matricula', 'matr', 'ra'].includes(c));
  const idxNome = cabecalho.findIndex((c) => ['nome', 'nome_completo', 'estudante', 'aluno'].includes(c));
  const idxTurma = cabecalho.findIndex((c) => ['turma', 'serie', 'classe'].includes(c));
  const idxTelefone = cabecalho.findIndex((c) => ['telefone', 'celular', 'contato'].includes(c));

  if (idxMatricula === -1 || idxNome === -1 || idxTurma === -1) {
    throw criarErroHttp(
      400,
      'Cabeçalho inválido. O CSV deve conter as colunas: matricula, nome e turma.',
      'CSV_CABECALHO_INVALIDO'
    );
  }

  // Transforma cada linha abaixo do cabeçalho em um objeto
  return linhas.slice(1).map((linha, index) => {
    const colunas = linha.split(delimitador).map((c) => c.trim().replace(/^"|"$/g, ''));
    return {
      linha: index + 2,
      matricula: colunas[idxMatricula] || '',
      nome: colunas[idxNome] || '',
      turma: colunas[idxTurma] || '',
      telefone: idxTelefone !== -1 ? colunas[idxTelefone] || null : null,
    };
  });
}

// Lista estudantes aplicando filtros de busca
async function listarEstudantes(filtros = {}) {
  if (filtros.status) validarStatus(filtros.status);

  const estudantes = await estudantesRepository.listarEstudantes({
    nome: filtros.nome,
    matricula: filtros.matricula,
    turma: filtros.turma,
    status: filtros.status,
    q: filtros.q || filtros.busca,
  });

  return estudantes.map(formatarEstudante);
}

// Busca um único estudante pela matrícula ou ID
async function buscarPorMatricula(matricula) {
  const estudante = await localizarPorMatriculaOuId(matricula);
  if (!estudante) {
    throw criarErroHttp(404, 'Estudante não encontrado.', 'ESTUDANTE_NAO_ENCONTRADO');
  }
  return formatarEstudante(estudante);
}

// Cadastra um novo estudante validando se a matrícula já existe
async function cadastrarEstudante(dados) {
  const matricula = String(dados.matricula || '').trim();
  const nome_completo = String(dados.nome || dados.nome_completo || '').trim();
  const turma = String(dados.turma || '').trim();
  const telefone = dados.telefone ? String(dados.telefone).trim() : null;
  const status = dados.status ? validarStatus(dados.status) : 'ativo';

  const existente = await estudantesRepository.buscarEstudantePorMatricula(matricula);
  if (existente) {
    throw criarErroHttp(
      409,
      `Já existe um estudante cadastrado com a matrícula "${matricula}".`,
      'MATRICULA_DUPLICADA'
    );
  }

  const novoEstudante = await estudantesRepository.criarEstudante({
    matricula,
    nome_completo,
    turma,
    telefone,
    status,
  });

  return formatarEstudante(novoEstudante);
}

// Atualiza os dados cadastrais de um estudante existente
async function editarEstudante(matriculaParam, dados) {
  const estudante = await localizarPorMatriculaOuId(matriculaParam);
  if (!estudante) {
    throw criarErroHttp(404, 'Estudante não encontrado.', 'ESTUDANTE_NAO_ENCONTRADO');
  }

  const camposParaAtualizar = {};

  // Se enviou uma nova matrícula, verifica se ela já não pertence a outro aluno
  if (dados.matricula !== undefined) {
    const novaMatricula = String(dados.matricula).trim();
    if (novaMatricula.toLowerCase() !== estudante.matricula.toLowerCase()) {
      const duplicado = await estudantesRepository.buscarEstudantePorMatricula(novaMatricula);
      if (duplicado && duplicado.id !== estudante.id) {
        throw criarErroHttp(
          409,
          `Já existe outro estudante com a matrícula "${novaMatricula}".`,
          'MATRICULA_DUPLICADA'
        );
      }
      camposParaAtualizar.matricula = novaMatricula;
    }
  }

  const novoNome = dados.nome ?? dados.nome_completo;
  if (novoNome !== undefined) camposParaAtualizar.nome_completo = String(novoNome).trim();
  if (dados.turma !== undefined) camposParaAtualizar.turma = String(dados.turma).trim();
  if (dados.telefone !== undefined) {
    camposParaAtualizar.telefone = dados.telefone ? String(dados.telefone).trim() : null;
  }
  if (dados.status !== undefined) {
    camposParaAtualizar.status = validarStatus(dados.status);
  }

  await estudantesRepository.atualizarEstudante(estudante, camposParaAtualizar);
  return formatarEstudante(estudante);
}

// Altera apenas o status do estudante ('ativo', 'bloqueado' ou 'inativo')
async function alterarStatusEstudante(matriculaParam, novoStatus) {
  return editarEstudante(matriculaParam, { status: novoStatus });
}

// Inativa o estudante (soft-delete para manter o histórico no banco)
async function inativarEstudante(matriculaParam) {
  return editarEstudante(matriculaParam, { status: 'inativo' });
}

// Importa uma lista de estudantes em lote via texto CSV ou array JSON
async function importarEstudantes({ csv, estudantes, atualizarExistentes = false }) {
  let listaBruta = [];

  if (typeof csv === 'string') {
    listaBruta = parsearCsvEstudantes(csv);
  } else if (Array.isArray(estudantes)) {
    listaBruta = estudantes.map((item, idx) => ({
      linha: idx + 1,
      matricula: item?.matricula ?? '',
      nome: item?.nome ?? item?.nome_completo ?? '',
      turma: item?.turma ?? '',
      telefone: item?.telefone ?? null,
    }));
  } else {
    throw criarErroHttp(400, 'Envie um texto CSV ou um array JSON de estudantes.', 'FORMATO_IMPORTACAO_INVALIDO');
  }

  let criados = 0;
  let jaExistiam = 0;
  let atualizados = 0;
  const erros = [];

  for (const item of listaBruta) {
    const matricula = String(item.matricula).trim();
    const nome_completo = String(item.nome).trim();
    const turma = String(item.turma).trim();
    const telefone = item.telefone ? String(item.telefone).trim() : null;

    if (!matricula || !nome_completo || !turma) {
      erros.push({ linha: item.linha, matricula: matricula || null, motivo: 'Matrícula, nome e turma são obrigatórios.' });
      continue;
    }

    const existente = await estudantesRepository.buscarEstudantePorMatricula(matricula);
    if (existente) {
      jaExistiam += 1;
      if (atualizarExistentes) {
        await estudantesRepository.atualizarEstudante(existente, { nome_completo, turma, telefone });
        atualizados += 1;
      }
      continue;
    }

    await estudantesRepository.criarEstudante({ matricula, nome_completo, turma, telefone, status: 'ativo' });
    criados += 1;
  }

  return {
    mensagem: 'Importação em lote processada.',
    total_processados: listaBruta.length,
    criados,
    ja_existiam: jaExistiam,
    atualizados,
    invalidos: erros.length,
    erros,
  };
}

module.exports = {
  STATUS_VALIDOS,
  listarEstudantes,
  buscarPorMatricula,
  cadastrarEstudante,
  editarEstudante,
  alterarStatusEstudante,
  inativarEstudante,
  importarEstudantes,
};
