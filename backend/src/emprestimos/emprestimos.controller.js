// emprestimos.controller.js – Recebe as requisições HTTP de Empréstimos e Justificativas, valida dados básicos e chama o Service

const emprestimosService = require('./emprestimos.service');

// GET /api/emprestimos – Lista todos os empréstimos com filtros opcionais via query params
async function listarEmprestimos(req, res, next) {
  try {
    const emprestimos = await emprestimosService.listarEmprestimos(req.query);
    return res.status(200).json(emprestimos);
  } catch (err) {
    return next(err);
  }
}

// GET /api/emprestimos/:id – Busca um empréstimo específico pelo ID
async function buscarEmprestimoPorId(req, res, next) {
  try {
    const emprestimo = await emprestimosService.buscarEmprestimoPorId(Number(req.params.id));
    return res.status(200).json(emprestimo);
  } catch (err) {
    return next(err);
  }
}

// POST /api/emprestimos – Registra um novo empréstimo informando a matrícula do aluno e o tombo do exemplar
async function registrarEmprestimo(req, res, next) {
  try {
    const estudante_matricula = req.body.estudante_matricula ?? req.body.matricula;
    const exemplar_tombo =
      req.body.exemplar_tombo ?? req.body.codigo_tombo ?? req.body.codigo_exemplar;

    if (!estudante_matricula?.trim() || !exemplar_tombo?.trim()) {
      return res.status(400).json({
        erro: 'A matrícula do estudante e o código de tombo do exemplar são obrigatórios.',
      });
    }

    const emprestimo = await emprestimosService.registrarEmprestimo({
      estudante_matricula,
      exemplar_tombo,
    });

    return res.status(201).json(emprestimo);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/emprestimos/:id/devolver (ou PUT /api/emprestimos/devolver) – Registra a devolução do livro
async function registrarDevolucao(req, res, next) {
  try {
    const paramId = req.params.id;
    const bodyTombo =
      req.body?.exemplar_tombo ?? req.body?.codigo_tombo ?? req.body?.codigo_exemplar;

    const emprestimoId =
      paramId && /^\d+$/.test(paramId) ? Number(paramId) : Number(req.body?.emprestimo_id) || null;
    const exemplarTombo =
      paramId && !/^\d+$/.test(paramId) ? paramId : bodyTombo?.trim() || null;

    if (!emprestimoId && !exemplarTombo) {
      return res.status(400).json({
        erro: 'Informe o ID do empréstimo ou o código de tombo do exemplar para devolução.',
      });
    }

    const resultado = await emprestimosService.registrarDevolucao({ emprestimoId, exemplarTombo });
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/emprestimos/:id/renovar – Prorroga o prazo de devolução do empréstimo por +7 dias
async function registrarRenovacao(req, res, next) {
  try {
    const emprestimo = await emprestimosService.registrarRenovacao(Number(req.params.id));
    return res.status(200).json(emprestimo);
  } catch (err) {
    return next(err);
  }
}

// GET /api/emprestimos/dashboard – Retorna indicadores consolidados de empréstimos ativos e atrasos
async function obterDashboard(req, res, next) {
  try {
    const dashboard = await emprestimosService.obterDashboard();
    return res.status(200).json(dashboard);
  } catch (err) {
    return next(err);
  }
}

// GET /api/emprestimos/meus – Lista os empréstimos em posse e o histórico de um estudante
async function listarMeusEmprestimos(req, res, next) {
  try {
    const resultado = await emprestimosService.listarMeusEmprestimos(
      req.usuario,
      req.query.matricula
    );
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/emprestimos/:id – Edita dados administrativos de um empréstimo
async function editarEmprestimo(req, res, next) {
  try {
    const emprestimo = await emprestimosService.editarEmprestimo(Number(req.params.id), req.body);
    return res.status(200).json(emprestimo);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/emprestimos/:id – Exclui um empréstimo e libera o exemplar físico
async function excluirEmprestimo(req, res, next) {
  try {
    await emprestimosService.excluirEmprestimo(Number(req.params.id));
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

// --- Justificativas de Atraso ---

// PUT /api/emprestimos/:id/justificativa – Envia uma justificativa de atraso para o empréstimo
async function enviarJustificativaAtraso(req, res, next) {
  try {
    const texto =
      req.body.justificativa_atraso ?? req.body.texto_descritivo ?? req.body.justificativa;

    if (!texto?.trim()) {
      return res.status(400).json({ erro: 'O texto da justificativa de atraso é obrigatório.' });
    }

    const resultado = await emprestimosService.enviarJustificativaAtraso(
      Number(req.params.id),
      texto
    );
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

// GET /api/emprestimos/justificativas – Lista todas as justificativas enviadas pelos alunos
async function listarJustificativas(req, res, next) {
  try {
    const lista = await emprestimosService.listarJustificativas();
    return res.status(200).json(lista);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/emprestimos/justificativas/:id/analisar – Marca uma justificativa como 'analisada'
async function marcarJustificativaAnalisada(req, res, next) {
  try {
    const resultado = await emprestimosService.marcarJustificativaAnalisada(Number(req.params.id));
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listarEmprestimos,
  buscarEmprestimoPorId,
  registrarEmprestimo,
  editarEmprestimo,
  excluirEmprestimo,
  registrarDevolucao,
  registrarRenovacao,
  obterDashboard,
  listarMeusEmprestimos,
  enviarJustificativaAtraso,
  listarJustificativas,
  marcarJustificativaAnalisada,
};
