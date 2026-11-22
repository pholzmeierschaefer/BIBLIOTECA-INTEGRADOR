// estudantes.service.js – Regras de negócio para o gerenciamento e importação de Estudantes (incluindo planilha SISGESC .xlsx e .csv)

const zlib = require('zlib');
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
    throw criarErroHttp(400, `Status inválido. Valores permitidos: ${STATUS_VALIDOS.join(', ')}.`);
  }
  return statusLimpo;
}

// Localiza um estudante aceitando tanto a matrícula quanto o ID numérico na URL
async function localizarPorMatriculaOuId(identificador) {
  const valor = String(identificador).trim();
  let estudante = await estudantesRepository.buscarEstudantePorMatricula(valor);

  if (!estudante && /^\d+$/.test(valor)) {
    estudante = await estudantesRepository.buscarEstudantePorId(Number(valor));
  }
  return estudante;
}

// --- Leitura e Filtro de Planilhas SISGESC (.xlsx e .csv) ---

// Remove acentos, símbolos e espaços do nome da coluna para comparar com facilidade
function normalizarTexto(texto) {
  return String(texto || '')
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

// Identifica em quais colunas estão Matrícula, Estudante (Nome), Turma e Telefone/Celular, ignorando todas as outras colunas do SISGESC
function extrairMapaColunas(celulas) {
  const norm = celulas.map(normalizarTexto);

  const idxMatricula = norm.findIndex((c) => ['matricula', 'matr', 'ra', 'codigo'].includes(c));
  const idxNome = norm.findIndex((c) => ['estudante', 'nome', 'nome_completo', 'aluno'].includes(c));
  const idxTurma = norm.findIndex((c) => ['turma', 'serie', 'classe', 'ano'].includes(c));

  if (idxMatricula === -1 || idxNome === -1 || idxTurma === -1) return null;

  // Coleta todas as colunas de telefone disponíveis (Celular do aluno, Residencial, Celular/Res. 1ª Filiação)
  const colunasTelefone = ['celular', 'telefone', 'contato', 'fone', 'residencial', 'res_1a_fil', 'res_1afil', 'com_1a_fil'];
  const indicesTelefone = [];
  norm.forEach((col, idx) => {
    if (colunasTelefone.includes(col)) indicesTelefone.push(idx);
  });

  return { idxMatricula, idxNome, idxTurma, indicesTelefone };
}

// Pega o primeiro telefone preenchido entre as colunas de contato da linha
function extrairPrimeiroTelefone(valores, indicesTelefone) {
  for (const idx of indicesTelefone) {
    const tel = String(valores[idx] || '').trim();
    if (tel && tel !== '-' && tel !== '0') return tel.slice(0, 30);
  }
  return null;
}

// Percorre as linhas da planilha (pulando o cabeçalho institucional "ESTADO DE SANTA CATARINA / SISGESC")
// e extrai somente Matrícula, Nome (Estudante), Turma e Telefone
function extrairEstudantesDasLinhas(todasLinhas) {
  let mapa = null;
  let turmaBanner = '';
  const registros = [];

  for (let i = 0; i < todasLinhas.length; i += 1) {
    const valores = todasLinhas[i];
    if (!valores || !valores.some((v) => String(v || '').trim() !== '')) continue;

    // Verifica se esta linha é a linha de cabeçalho da tabela ("Nº | Turma | Matrícula | Estudante...")
    const possivelMapa = extrairMapaColunas(valores);
    if (possivelMapa) {
      mapa = possivelMapa;
      continue;
    }

    // Se ainda está no cabeçalho superior da escola, captura o número da turma no banner (ex: "71") caso exista
    if (!mapa) {
      const idxTurmaBanner = valores.findIndex((c) => normalizarTexto(c) === 'turma');
      if (idxTurmaBanner !== -1 && todasLinhas[i + 1]) {
        const valorTurma = String(todasLinhas[i + 1][idxTurmaBanner] || '').trim();
        if (valorTurma) turmaBanner = valorTurma;
      }
      continue;
    }

    const matricula = String(valores[mapa.idxMatricula] || '').trim();
    const nome = String(valores[mapa.idxNome] || '').trim();
    const turma = String(valores[mapa.idxTurma] || '').trim() || turmaBanner;

    // Ignora linhas em branco, rodapés ou sub-cabeçalhos sem matrícula
    if (!matricula || !nome) continue;

    registros.push({
      linha: i + 1,
      matricula,
      nome,
      turma: turma || 'Sem Turma',
      telefone: extrairPrimeiroTelefone(valores, mapa.indicesTelefone),
    });
  }

  if (!mapa) {
    throw criarErroHttp(
      400,
      'Cabeçalho não encontrado. A planilha deve conter as colunas Matrícula, Estudante (ou Nome) e Turma.'
    );
  }

  return registros;
}

// Faz o parse de um texto CSV/TSV (respeitando quebras de linha dentro de aspas como "Bolsa\nfamília")
function parsearCsvEstudantes(conteudoCsv) {
  const texto = String(conteudoCsv || '').replace(/^\uFEFF/, '').trim();
  if (!texto) throw criarErroHttp(400, 'O conteúdo da planilha está vazio.');

  const amostra = texto.split(/\r?\n/).slice(0, 30).join('\n');
  const delimitador = amostra.includes('\t') ? '\t' : amostra.includes(';') ? ';' : ',';

  const linhas = [];
  let linhaAtual = [];
  let celula = '';
  let entreAspas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto[i];
    if (ch === '"') {
      if (entreAspas && texto[i + 1] === '"') {
        celula += '"';
        i += 1;
      } else {
        entreAspas = !entreAspas;
      }
    } else if (ch === delimitador && !entreAspas) {
      linhaAtual.push(celula.trim());
      celula = '';
    } else if ((ch === '\n' || ch === '\r') && !entreAspas) {
      if (ch === '\r' && texto[i + 1] === '\n') i += 1;
      linhaAtual.push(celula.trim());
      linhas.push(linhaAtual);
      linhaAtual = [];
      celula = '';
    } else {
      celula += ch;
    }
  }
  if (celula.length > 0 || linhaAtual.length > 0) {
    linhaAtual.push(celula.trim());
    linhas.push(linhaAtual);
  }

  return extrairEstudantesDasLinhas(linhas);
}

// --- Leitor nativo de arquivo Excel (.xlsx) usando zlib ---

function decodificarXml(texto) {
  return String(texto || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function colunaParaIndice(ref) {
  const letras = String(ref || '').replace(/[^A-Z]/gi, '').toUpperCase();
  let idx = 0;
  for (let i = 0; i < letras.length; i += 1) idx = idx * 26 + (letras.charCodeAt(i) - 64);
  return idx - 1;
}

// Descompacta o arquivo .xlsx (que é um arquivo ZIP contendo XMLs das abas do Excel)
function parsearXlsxEstudantes(xlsxBase64) {
  const limpo = String(xlsxBase64 || '').replace(/^data:[^;]+;base64,/, '').trim();
  const buffer = Buffer.from(limpo, 'base64');

  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65558); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw criarErroHttp(400, 'Arquivo .xlsx inválido.');

  const totalEntradas = buffer.readUInt16LE(eocd + 10);
  let pos = buffer.readUInt32LE(eocd + 16);
  const arquivos = new Map();

  for (let i = 0; i < totalEntradas && pos < eocd; i += 1) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break;
    const metodo = buffer.readUInt16LE(pos + 10);
    const tamComp = buffer.readUInt32LE(pos + 20);
    const tamNome = buffer.readUInt16LE(pos + 28);
    const tamExtra = buffer.readUInt16LE(pos + 30);
    const tamCom = buffer.readUInt16LE(pos + 32);
    const offsetLocal = buffer.readUInt32LE(pos + 42);
    const nome = buffer.toString('utf8', pos + 46, pos + 46 + tamNome);

    if (nome === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/i.test(nome)) {
      const inicio = offsetLocal + 30 + buffer.readUInt16LE(offsetLocal + 26) + buffer.readUInt16LE(offsetLocal + 28);
      const bruto = buffer.subarray(inicio, inicio + tamComp);
      arquivos.set(nome, metodo === 8 ? zlib.inflateRawSync(bruto).toString('utf8') : bruto.toString('utf8'));
    }
    pos += 46 + tamNome + tamExtra + tamCom;
  }

  // Extrai a tabela de textos (sharedStrings.xml) do Excel
  const sharedStrings = [];
  const xmlShared = arquivos.get('xl/sharedStrings.xml') || '';
  for (const matchSi of xmlShared.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const partes = Array.from(matchSi[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g), (m) => decodificarXml(m[1]));
    sharedStrings.push(partes.join(''));
  }

  // Extrai todas as linhas e células das abas da planilha
  const todasLinhas = [];
  for (const [nome, xmlSheet] of arquivos.entries()) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/i.test(nome)) continue;

    for (const matchRow of xmlSheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const linha = [];
      for (const matchCell of matchRow[1].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = matchCell[1] || '';
        const corpo = matchCell[2] || '';
        const ref = /\br="([A-Z]+\d+)"/i.exec(attrs);
        const colIdx = ref ? colunaParaIndice(ref[1]) : linha.length;
        const tipo = /\bt="([^"]+)"/i.exec(attrs)?.[1] || '';

        let valor = '';
        if (tipo === 's') {
          const idx = Number(/<v[^>]*>([\s\S]*?)<\/v>/.exec(corpo)?.[1] || -1);
          valor = sharedStrings[idx] || '';
        } else if (tipo === 'inlineStr') {
          valor = Array.from(corpo.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g), (m) => decodificarXml(m[1])).join('');
        } else {
          valor = decodificarXml(/<v[^>]*>([\s\S]*?)<\/v>/.exec(corpo)?.[1] || '');
        }
        linha[colIdx] = String(valor).trim();
      }
      todasLinhas.push(linha);
    }
  }

  return extrairEstudantesDasLinhas(todasLinhas);
}

// --- Operações CRUD de Estudantes ---

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
  if (!estudante) throw criarErroHttp(404, 'Estudante não encontrado.');
  return formatarEstudante(estudante);
}

// Cadastra um novo estudante validando se a matrícula já existe
async function cadastrarEstudante(dados) {
  const matricula = String(dados.matricula || '').trim();
  const nome_completo = String(dados.nome || dados.nome_completo || '').trim();
  const turma = String(dados.turma || '').trim();
  const telefone = dados.telefone ? String(dados.telefone).trim() : null;
  const status = dados.status ? validarStatus(dados.status) : 'ativo';

  if (await estudantesRepository.buscarEstudantePorMatricula(matricula)) {
    throw criarErroHttp(409, `Já existe um estudante cadastrado com a matrícula "${matricula}".`);
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
  if (!estudante) throw criarErroHttp(404, 'Estudante não encontrado.');

  const camposParaAtualizar = {};

  if (dados.matricula !== undefined) {
    const novaMatricula = String(dados.matricula).trim();
    if (novaMatricula.toLowerCase() !== estudante.matricula.toLowerCase()) {
      const duplicado = await estudantesRepository.buscarEstudantePorMatricula(novaMatricula);
      if (duplicado && duplicado.id !== estudante.id) {
        throw criarErroHttp(409, `Já existe outro estudante com a matrícula "${novaMatricula}".`);
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

// Exclui definitivamente o estudante do banco de dados
async function inativarEstudante(matriculaParam) {
  const estudante = await localizarPorMatriculaOuId(matriculaParam);
  if (!estudante) throw criarErroHttp(404, 'Estudante não encontrado.');

  await estudantesRepository.excluirEstudante(estudante.id);
}

// Importa estudantes em lote via planilha .xlsx (SISGESC), texto CSV ou array JSON
async function importarEstudantes({ xlsxBase64, csv, estudantes, atualizarExistentes = false }) {
  let listaBruta = [];

  if (typeof xlsxBase64 === 'string' && xlsxBase64.trim() !== '') {
    listaBruta = parsearXlsxEstudantes(xlsxBase64);
  } else if (typeof csv === 'string') {
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
    throw criarErroHttp(400, 'Envie uma planilha .xlsx, um texto CSV ou um array JSON.');
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

    if (!matricula || !nome_completo || !turma) continue;

    const existente = await estudantesRepository.buscarEstudantePorMatricula(matricula);
    if (existente) {
      jaExistiam += 1;
      if (atualizarExistentes) {
        await estudantesRepository.atualizarEstudante(existente, { nome_completo, turma, telefone });
        atualizados += 1;
      }
      continue;
    }

    await estudantesRepository.criarEstudante({
      matricula,
      nome_completo,
      turma,
      telefone,
      status: 'ativo',
    });
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
