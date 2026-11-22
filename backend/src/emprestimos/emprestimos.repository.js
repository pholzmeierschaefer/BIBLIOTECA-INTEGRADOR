// emprestimos.repository.js – Consultas e operações de banco de dados para Empréstimos e Justificativas

const { Emprestimo, Exemplar, Livro, Estudante, Justificativa, Sequelize, sequelize } = require('../../models');
const { Op } = Sequelize;

// JOIN padrão de Empréstimo: traz o Estudante, o Exemplar com o Livro e as Justificativas
const INCLUDE_EMPRESTIMO = [
  { model: Estudante, as: 'estudante' },
  {
    model: Exemplar,
    as: 'exemplar',
    include: [{ model: Livro, as: 'livro' }],
  },
  { model: Justificativa, as: 'justificativas' },
];

// Busca estudante pelo ID
async function buscarEstudantePorId(id, transaction) {
  return Estudante.findByPk(id, { transaction });
}

// Busca estudante pela matrícula escolar
async function buscarEstudantePorMatricula(matricula, transaction) {
  return Estudante.findOne({
    where: { matricula: { [Op.iLike]: String(matricula).trim() } },
    transaction,
  });
}

// Busca um exemplar físico pelo código de tombo trazendo os dados do Livro
async function buscarExemplarPorTombo(tombo, transaction) {
  return Exemplar.findOne({
    where: { codigo_exemplar: { [Op.iLike]: String(tombo).trim() } },
    include: [{ model: Livro, as: 'livro' }],
    transaction,
  });
}

// Busca um empréstimo pelo ID trazendo Estudante, Exemplar, Livro e Justificativas
async function buscarEmprestimoPorId(id, transaction) {
  return Emprestimo.findByPk(id, {
    include: INCLUDE_EMPRESTIMO,
    transaction,
  });
}

// Busca um empréstimo que ainda não foi devolvido a partir do código de tombo do exemplar
async function buscarEmprestimoAtivoPorTombo(tombo, transaction) {
  return Emprestimo.findOne({
    where: { data_devolucao_realizada: null },
    include: [
      { model: Estudante, as: 'estudante' },
      {
        model: Exemplar,
        as: 'exemplar',
        where: { codigo_exemplar: { [Op.iLike]: String(tombo).trim() } },
        include: [{ model: Livro, as: 'livro' }],
      },
      { model: Justificativa, as: 'justificativas' },
    ],
    transaction,
  });
}

// Lista empréstimos aplicando filtros opcionais (por status, estudante, matrícula, tombo ou apenas ativos)
async function listarEmprestimos({
  status,
  estudanteId,
  estudanteMatricula,
  exemplarTombo,
  apenasAtivos,
} = {}) {
  const where = {};
  if (status) where.status = String(status).trim().toLowerCase();
  if (estudanteId) where.estudante_id = estudanteId;
  if (apenasAtivos) where.data_devolucao_realizada = null;

  const includeEstudante = { model: Estudante, as: 'estudante' };
  if (estudanteMatricula) {
    includeEstudante.where = { matricula: { [Op.iLike]: String(estudanteMatricula).trim() } };
    includeEstudante.required = true;
  }

  const includeExemplar = {
    model: Exemplar,
    as: 'exemplar',
    include: [{ model: Livro, as: 'livro' }],
  };
  if (exemplarTombo) {
    includeExemplar.where = { codigo_exemplar: { [Op.iLike]: String(exemplarTombo).trim() } };
    includeExemplar.required = true;
  }

  return Emprestimo.findAll({
    where,
    include: [
      includeEstudante,
      includeExemplar,
      { model: Justificativa, as: 'justificativas' },
    ],
    order: [['data_emprestimo', 'DESC']],
  });
}

// Conta quantos livros o estudante está em posse no momento (ainda não devolvidos)
async function contarEmprestimosAtivosDoEstudante(estudanteId, transaction) {
  return Emprestimo.count({
    where: { estudante_id: estudanteId, data_devolucao_realizada: null },
    transaction,
  });
}

// Conta quantos empréstimos vencidos (data prevista menor que agora) o estudante possui
async function contarEmprestimosAtrasadosDoEstudante(
  estudanteId,
  referencia = new Date(),
  excluirEmprestimoId = null,
  transaction
) {
  const where = {
    estudante_id: estudanteId,
    data_devolucao_realizada: null,
    data_devolucao_prevista: { [Op.lt]: referencia }, // Op.lt: menor que (data prevista já passou)
  };
  if (excluirEmprestimoId) where.id = { [Op.ne]: excluirEmprestimoId };

  return Emprestimo.count({ where, transaction });
}

// Insere um novo empréstimo no banco
async function criarEmprestimo(dados, transaction) {
  return Emprestimo.create(dados, { transaction });
}

// Atualiza um empréstimo existente
async function atualizarEmprestimo(emprestimo, dados, transaction) {
  return emprestimo.update(dados, { transaction });
}

// Atualiza o status do exemplar físico ('emprestado' ou 'disponivel')
async function atualizarExemplar(exemplar, dados, transaction) {
  return exemplar.update(dados, { transaction });
}

// Atualiza o status do estudante ('ativo' ou 'bloqueado')
async function atualizarEstudante(estudante, dados, transaction) {
  return estudante.update(dados, { transaction });
}

// Remove um empréstimo e suas justificativas vinculadas
async function excluirEmprestimo(emprestimoId, transaction) {
  await Justificativa.destroy({ where: { emprestimo_id: emprestimoId }, transaction });
  return Emprestimo.destroy({ where: { id: emprestimoId }, transaction });
}

// --- Consultas de Justificativas de Atraso ---

// Cria uma nova justificativa de atraso para um empréstimo
async function criarJustificativa(dados, transaction) {
  return Justificativa.create(dados, { transaction });
}

// Lista todas as justificativas enviadas pelos estudantes, trazendo os dados do aluno e do livro
async function listarJustificativas() {
  return Justificativa.findAll({
    include: [
      { model: Estudante, as: 'estudante' },
      {
        model: Emprestimo,
        as: 'emprestimo',
        include: [
          {
            model: Exemplar,
            as: 'exemplar',
            include: [{ model: Livro, as: 'livro' }],
          },
        ],
      },
    ],
    order: [['data_envio', 'DESC']],
  });
}

// Busca uma justificativa pelo ID
async function buscarJustificativaPorId(id) {
  return Justificativa.findByPk(id);
}

// Atualiza o status de uma justificativa (ex: 'analisada')
async function atualizarJustificativa(justificativa, dados) {
  return justificativa.update(dados);
}

// Marca automaticamente empréstimos vencidos como 'atrasado' e bloqueia os estudantes em atraso
async function sincronizarAtrasos({ estudanteId = null, referencia = new Date() } = {}) {
  const whereVencidos = {
    data_devolucao_realizada: null,
    data_devolucao_prevista: { [Op.lt]: referencia },
    ...(estudanteId && { estudante_id: estudanteId }),
  };

  const vencidos = await Emprestimo.findAll({ where: whereVencidos });
  if (vencidos.length === 0) return { emprestimosMarcadosAtrasados: 0, estudantesBloqueados: 0 };

  const idsEmprestimos = vencidos.map((e) => e.id);
  const idsEstudantes = [...new Set(vencidos.map((e) => e.estudante_id))];

  await Emprestimo.update({ status: 'atrasado' }, { where: { id: { [Op.in]: idsEmprestimos } } });
  const [estudantesBloqueados] = await Estudante.update(
    { status: 'bloqueado' },
    { where: { id: { [Op.in]: idsEstudantes }, status: 'ativo' } }
  );

  return {
    emprestimosMarcadosAtrasados: idsEmprestimos.length,
    estudantesBloqueados,
  };
}

// Abre uma transação no banco (rollback automático se der erro)
async function executarTransacao(callback) {
  return sequelize.transaction(callback);
}

module.exports = {
  buscarEstudantePorId,
  buscarEstudantePorMatricula,
  buscarExemplarPorTombo,
  buscarEmprestimoPorId,
  buscarEmprestimoAtivoPorTombo,
  listarEmprestimos,
  contarEmprestimosAtivosDoEstudante,
  contarEmprestimosAtrasadosDoEstudante,
  criarEmprestimo,
  atualizarEmprestimo,
  atualizarExemplar,
  atualizarEstudante,
  excluirEmprestimo,
  criarJustificativa,
  listarJustificativas,
  buscarJustificativaPorId,
  atualizarJustificativa,
  sincronizarAtrasos,
  executarTransacao,
};
