// relatorios.service.js – Regras de negócio e cálculos dos Relatórios Gerenciais (Livros mais lidos, Turmas e Atrasos)

const relatoriosRepository = require('./relatorios.repository');

const MS_POR_DIA = 1000 * 60 * 60 * 24;
const LIMITE_CRITICO_DIAS = 10;

// Cria um erro padronizado com statusCode HTTP (400)
function criarErroHttp(statusCode, mensagem) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  return err;
}

// Valida e normaliza os filtros opcionais de mês (1 a 12) e ano
function validarPeriodo({ mes, ano } = {}) {
  const mesNum = mes ? Number(mes) : null;
  let anoNum = ano ? Number(ano) : null;

  if (mesNum && (mesNum < 1 || mesNum > 12)) {
    throw criarErroHttp(400, 'O mês informado deve ser entre 1 e 12.');
  }
  if (anoNum && (anoNum < 2000 || anoNum > 2100)) {
    throw criarErroHttp(400, 'O ano informado é inválido.');
  }
  if (mesNum && !anoNum) anoNum = new Date().getFullYear();

  return { mes: mesNum, ano: anoNum };
}

// Converte uma matriz de cabeçalhos e linhas em texto CSV separado por ';' (compatível com Excel em PT-BR)
function gerarCsv(cabecalhos, linhas) {
  const formatarLinha = (cols) =>
    cols.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
  return `\uFEFF${[formatarLinha(cabecalhos), ...linhas.map(formatarLinha)].join('\r\n')}\r\n`;
}

// 1. Relatório de Livros Mais Lidos no período
async function gerarRelatorioLivrosMaisLidos({ mes, ano, limite } = {}) {
  const periodo = validarPeriodo({ mes, ano });
  const limiteNum = limite ? Number(limite) : 20;

  const emprestimos = await relatoriosRepository.listarEmprestimosParaRelatorio(periodo);
  const contagemPorLivro = new Map();

  for (const emp of emprestimos) {
    const livro = emp.exemplar?.livro;
    if (!livro) continue;

    if (!contagemPorLivro.has(livro.id)) {
      contagemPorLivro.set(livro.id, {
        livro_id: livro.id,
        codigo: livro.codigo_livro,
        titulo: livro.titulo,
        autor: livro.autor,
        editora: livro.editora || '',
        tipo: livro.tipoLivro?.descricao || livro.tipo || 'Não informado',
        categoria: livro.categoriaRel?.nome || livro.categoria || 'Não informada',
        total_emprestimos: 0,
      });
    }
    contagemPorLivro.get(livro.id).total_emprestimos += 1;
  }

  // Ordena do livro mais emprestado para o menos emprestado
  const ranking = Array.from(contagemPorLivro.values())
    .sort((a, b) => b.total_emprestimos - a.total_emprestimos)
    .slice(0, limiteNum)
    .map((item, idx) => ({ posicao: idx + 1, ...item }));

  return {
    relatorio: 'livros_mais_lidos',
    periodo,
    total_emprestimos_periodo: emprestimos.length,
    dados: ranking,
  };
}

// Formata o relatório de livros mais lidos para download em CSV
function formatarLivrosMaisLidosCsv(relatorio) {
  const cabecalhos = ['Posicao', 'Codigo Livro', 'Titulo', 'Autor', 'Editora', 'Tipo', 'Categoria', 'Total Emprestimos'];
  const linhas = relatorio.dados.map((i) => [
    i.posicao,
    i.codigo,
    i.titulo,
    i.autor,
    i.editora,
    i.tipo,
    i.categoria,
    i.total_emprestimos,
  ]);
  return gerarCsv(cabecalhos, linhas);
}

// 2. Relatório de Frequência de Leitura por Turma
async function gerarRelatorioFrequenciaTurmas({ mes, ano } = {}) {
  const periodo = validarPeriodo({ mes, ano });
  const [emprestimos, estudantes] = await Promise.all([
    relatoriosRepository.listarEmprestimosParaRelatorio(periodo),
    relatoriosRepository.listarEstudantesPorTurma(),
  ]);

  const mapaTurmas = new Map();

  // Inicializa todas as turmas cadastradas
  for (const est of estudantes) {
    const turma = est.turma || 'Sem Turma';
    if (!mapaTurmas.has(turma)) {
      mapaTurmas.set(turma, { turma, total_estudantes_turma: 0, total_emprestimos: 0, leitores: new Set() });
    }
    mapaTurmas.get(turma).total_estudantes_turma += 1;
  }

  // Soma os empréstimos e leitores únicos de cada turma
  for (const emp of emprestimos) {
    const turma = emp.estudante?.turma || 'Sem Turma';
    if (!mapaTurmas.has(turma)) {
      mapaTurmas.set(turma, { turma, total_estudantes_turma: 0, total_emprestimos: 0, leitores: new Set() });
    }
    const grupo = mapaTurmas.get(turma);
    grupo.total_emprestimos += 1;
    grupo.leitores.add(emp.estudante_id);
  }

  const dados = Array.from(mapaTurmas.values())
    .map((item) => ({
      turma: item.turma,
      total_estudantes_turma: item.total_estudantes_turma,
      estudantes_leitores: item.leitores.size,
      total_emprestimos: item.total_emprestimos,
      media_emprestimos_por_estudante:
        item.total_estudantes_turma > 0
          ? Number((item.total_emprestimos / item.total_estudantes_turma).toFixed(2))
          : 0,
    }))
    .sort((a, b) => b.total_emprestimos - a.total_emprestimos);

  return {
    relatorio: 'frequencia_por_turma',
    periodo,
    total_emprestimos_periodo: emprestimos.length,
    dados,
  };
}

// Formata o relatório de frequência por turma para download em CSV
function formatarFrequenciaTurmasCsv(relatorio) {
  const cabecalhos = ['Turma', 'Total Estudantes', 'Estudantes Leitores', 'Total Emprestimos', 'Media por Estudante'];
  const linhas = relatorio.dados.map((i) => [
    i.turma,
    i.total_estudantes_turma,
    i.estudantes_leitores,
    i.total_emprestimos,
    i.media_emprestimos_por_estudante,
  ]);
  return gerarCsv(cabecalhos, linhas);
}

// 3. Relatório de Taxas de Atraso (geral e agrupado por turma)
async function gerarRelatorioTaxasAtraso({ mes, ano, turma } = {}) {
  const periodo = validarPeriodo({ mes, ano });
  const agora = new Date();
  const emprestimos = await relatoriosRepository.listarEmprestimosParaRelatorio({ ...periodo, turma });

  let totalComAtraso = 0;
  let totalAtrasosCriticos = 0;
  const mapaTurmas = new Map();

  for (const emp of emprestimos) {
    const turmaNome = emp.estudante?.turma || 'Sem Turma';
    if (!mapaTurmas.has(turmaNome)) {
      mapaTurmas.set(turmaNome, {
        turma: turmaNome,
        total_emprestimos: 0,
        total_no_prazo: 0,
        total_com_atraso: 0,
        total_atrasos_criticos: 0,
      });
    }

    const grupo = mapaTurmas.get(turmaNome);
    grupo.total_emprestimos += 1;

    // Compara a data em que foi devolvido (ou a data atual, se ainda não devolveu) com a data prevista
    const dataReferencia = emp.data_devolucao_realizada ? new Date(emp.data_devolucao_realizada) : agora;
    const diffMs = dataReferencia.getTime() - new Date(emp.data_devolucao_prevista).getTime();

    if (diffMs > 0) {
      totalComAtraso += 1;
      grupo.total_com_atraso += 1;
      if (Math.floor(diffMs / MS_POR_DIA) > LIMITE_CRITICO_DIAS) {
        totalAtrasosCriticos += 1;
        grupo.total_atrasos_criticos += 1;
      }
    } else {
      grupo.total_no_prazo += 1;
    }
  }

  const totalEmprestimos = emprestimos.length;
  const porTurma = Array.from(mapaTurmas.values())
    .map((g) => ({
      ...g,
      taxa_atraso_percentual:
        g.total_emprestimos > 0 ? Number(((g.total_com_atraso / g.total_emprestimos) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.taxa_atraso_percentual - a.taxa_atraso_percentual);

  return {
    relatorio: 'taxas_atraso',
    periodo,
    resumo: {
      total_emprestimos: totalEmprestimos,
      total_no_prazo: totalEmprestimos - totalComAtraso,
      total_com_atraso: totalComAtraso,
      total_atrasos_criticos: totalAtrasosCriticos,
      taxa_atraso_percentual:
        totalEmprestimos > 0 ? Number(((totalComAtraso / totalEmprestimos) * 100).toFixed(2)) : 0,
    },
    por_turma: porTurma,
  };
}

// Formata o relatório de taxas de atraso para download em CSV
function formatarTaxasAtrasoCsv(relatorio) {
  const cabecalhos = ['Turma', 'Total Emprestimos', 'No Prazo', 'Com Atraso', 'Atrasos Criticos (>10d)', 'Taxa de Atraso (%)'];
  const linhas = relatorio.por_turma.map((i) => [
    i.turma,
    i.total_emprestimos,
    i.total_no_prazo,
    i.total_com_atraso,
    i.total_atrasos_criticos,
    i.taxa_atraso_percentual,
  ]);
  return gerarCsv(cabecalhos, linhas);
}

module.exports = {
  gerarRelatorioLivrosMaisLidos,
  formatarLivrosMaisLidosCsv,
  gerarRelatorioFrequenciaTurmas,
  formatarFrequenciaTurmasCsv,
  gerarRelatorioTaxasAtraso,
  formatarTaxasAtrasoCsv,
};
