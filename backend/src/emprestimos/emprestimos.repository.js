// emprestimos.repository.js – Consultas e operações de banco de dados para Empréstimos

const db = require('../../models');
const { Emprestimo, Exemplar, Livro, Estudante, Sequelize, sequelize } = db;
const { Op } = Sequelize;

// Monta o JOIN padrão de Empréstimo: traz o Estudante e o Exemplar com os dados do Livro
function montarIncludesEmprestimo() {
  const includes = [
    { model: Estudante, as: 'estudante' },
    {
      model: Exemplar,
      as: 'exemplar',
      include: [{ model: Livro, as: 'livro' }],
    },
  ];
  if (db.Justificativa) {
    includes.push({ model: db.Justificativa, as: 'justificativas', required: false });
  }
  return includes;
}

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

// Busca um empréstimo pelo ID trazendo Estudante, Exemplar e Livro
async function buscarEmprestimoPorId(id, transaction) {
  return Emprestimo.findByPk(id, {
    include: montarIncludesEmprestimo(),
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
    include: [includeEstudante, includeExemplar],
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

// Remove um empréstimo do banco
async function excluirEmprestimo(emprestimoId, transaction) {
  if (db.Justificativa) {
    await db.Justificativa.destroy({ where: { emprestimo_id: emprestimoId }, transaction });
  }
  return Emprestimo.destroy({ where: { id: emprestimoId }, transaction });
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
  sincronizarAtrasos,
  executarTransacao,
};
