// estudantes.controller.js – Recebe as requisições HTTP, valida dados básicos e chama o Service

const estudantesService = require('./estudantes.service');

// GET /api/estudantes – Lista estudantes com filtros opcionais via query params (?nome=..., ?turma=..., ?q=...)
async function listarEstudantes(req, res, next) {
  try {
    const estudantes = await estudantesService.listarEstudantes(req.query);
    return res.status(200).json(estudantes);
  } catch (err) {
    return next(err); // Repassa qualquer erro para o middleware global de tratamento de erros
  }
}

// GET /api/estudantes/:matricula – Busca um único estudante pela matrícula (ou ID)
async function buscarPorMatricula(req, res, next) {
  try {
    const estudante = await estudantesService.buscarPorMatricula(req.params.matricula);
    return res.status(200).json(estudante);
  } catch (err) {
    return next(err);
  }
}

// POST /api/estudantes – Cadastra um novo estudante validando os campos obrigatórios
async function cadastrarEstudante(req, res, next) {
  try {
    const { matricula, nome, nome_completo, turma } = req.body;
    const nomeInformado = nome ?? nome_completo;

    if (!matricula?.trim() || !nomeInformado?.trim() || !turma?.trim()) {
      return res.status(400).json({
        erro: 'Os campos matrícula, nome e turma são obrigatórios.',
      });
    }

    const estudanteCriado = await estudantesService.cadastrarEstudante(req.body);
    return res.status(201).json(estudanteCriado);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/estudantes/:matricula – Atualiza os dados cadastrais do estudante
async function editarEstudante(req, res, next) {
  try {
    const estudanteAtualizado = await estudantesService.editarEstudante(
      req.params.matricula,
      req.body
    );
    return res.status(200).json(estudanteAtualizado);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/estudantes/:matricula/status – Altera apenas o status ('ativo', 'bloqueado' ou 'inativo')
async function alterarStatusEstudante(req, res, next) {
  try {
    const { status } = req.body;
    if (!status?.trim()) {
      return res.status(400).json({
        erro: 'Informe o novo status do estudante (ativo, bloqueado ou inativo).',
      });
    }

    const estudanteAtualizado = await estudantesService.alterarStatusEstudante(
      req.params.matricula,
      status
    );
    return res.status(200).json(estudanteAtualizado);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/estudantes/:matricula – Inativa o estudante (retorna 204 No Content)
async function inativarEstudante(req, res, next) {
  try {
    await estudantesService.inativarEstudante(req.params.matricula);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

// POST /api/estudantes/importar – Importa estudantes em lote via texto CSV ou array JSON
async function importarEstudantes(req, res, next) {
  try {
    const atualizarExistentes =
      req.query.atualizar_existentes === 'true' || Boolean(req.body?.atualizar_existentes);

    // Aceita CSV puro no body, ou JSON { csv: "..." }, ou array JSON direto / { estudantes: [...] }
    const csv = typeof req.body === 'string' ? req.body : req.body?.csv;
    const estudantes = Array.isArray(req.body)
      ? req.body
      : req.body?.estudantes || req.body?.alunos;

    if (!csv && !estudantes) {
      return res.status(400).json({
        erro: 'Formato inválido. Envie um texto CSV ou uma lista JSON em { estudantes: [...] }.',
      });
    }

    const resultado = await estudantesService.importarEstudantes({
      csv,
      estudantes,
      atualizarExistentes,
    });

    return res.status(resultado.criados > 0 ? 201 : 200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listarEstudantes,
  buscarPorMatricula,
  cadastrarEstudante,
  editarEstudante,
  alterarStatusEstudante,
  inativarEstudante,
  importarEstudantes,
};
