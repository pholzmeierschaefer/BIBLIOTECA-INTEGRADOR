// relatorios.controller.js – Recebe as requisições HTTP dos Relatórios Gerenciais e retorna JSON ou arquivo CSV

const relatoriosService = require('./relatorios.service');

// Função auxiliar: se o usuário pedir ?formato=csv na URL, envia o arquivo CSV para download; caso contrário, retorna JSON
function responderRelatorio(req, res, relatorio, nomeArquivoCsv, formatadorCsv) {
  if (String(req.query.formato || '').trim().toLowerCase() === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivoCsv}"`);
    return res.status(200).send(formatadorCsv(relatorio));
  }
  return res.status(200).json(relatorio);
}

// GET /api/relatorios/livros-mais-lidos – Ranking dos livros mais emprestados no período
async function livrosMaisLidos(req, res, next) {
  try {
    const relatorio = await relatoriosService.gerarRelatorioLivrosMaisLidos(req.query);
    return responderRelatorio(
      req,
      res,
      relatorio,
      'livros-mais-lidos.csv',
      relatoriosService.formatarLivrosMaisLidosCsv
    );
  } catch (err) {
    return next(err);
  }
}

// GET /api/relatorios/frequencia-turmas – Quantidade e média de empréstimos agrupados por turma
async function frequenciaTurmas(req, res, next) {
  try {
    const relatorio = await relatoriosService.gerarRelatorioFrequenciaTurmas(req.query);
    return responderRelatorio(
      req,
      res,
      relatorio,
      'frequencia-por-turma.csv',
      relatoriosService.formatarFrequenciaTurmasCsv
    );
  } catch (err) {
    return next(err);
  }
}

// GET /api/relatorios/taxas-atraso – Percentual de empréstimos no prazo e em atraso por turma
async function taxasAtraso(req, res, next) {
  try {
    const relatorio = await relatoriosService.gerarRelatorioTaxasAtraso(req.query);
    return responderRelatorio(
      req,
      res,
      relatorio,
      'taxas-de-atraso.csv',
      relatoriosService.formatarTaxasAtrasoCsv
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  livrosMaisLidos,
  frequenciaTurmas,
  taxasAtraso,
};
