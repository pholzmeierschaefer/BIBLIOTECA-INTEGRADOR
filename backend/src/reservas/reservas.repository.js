// reservas.repository.js – Consultas e operações de banco de dados para Reservas (fila de espera)

const { Reserva, Livro, Exemplar, Estudante, Emprestimo, Sequelize, sequelize } = require('../../models');
const { Op } = Sequelize;

// JOIN padrão: traz o Estudante, o Livro e o Exemplar físico vinculado à reserva
const INCLUDE_RESERVA = [
  { model: Estudante, as: 'estudante' },
  { model: Livro, as: 'livro' },
  { model: Exemplar, as: 'exemplar' },
];

// Busca estudante pelo ID
async function buscarEstudantePorId(id) {
  return Estudante.findByPk(id);
}

// Busca estudante pela matrícula escolar
async function buscarEstudantePorMatricula(matricula) {
  return Estudante.findOne({
    where: { matricula: { [Op.iLike]: String(matricula).trim() } },
  });
}

// Busca um livro pelo código (codigo_livro) ou pelo ID numérico
async function buscarLivroPorCodigoOuId(identificador) {
  const valor = String(identificador).trim();
  let livro = await Livro.findOne({
    where: { codigo_livro: { [Op.iLike]: valor } },
    include: [{ model: Exemplar, as: 'exemplares' }],
  });

  if (!livro && /^\d+$/.test(valor)) {
    livro = await Livro.findByPk(Number(valor), {
      include: [{ model: Exemplar, as: 'exemplares' }],
    });
  }
  return livro;
}

// Conta quantos empréstimos vencidos o estudante possui no momento
async function contarEmprestimosAtrasadosDoEstudante(estudanteId, referencia = new Date()) {
  return Emprestimo.count({
    where: {
      estudante_id: estudanteId,
      data_devolucao_realizada: null,
      data_devolucao_prevista: { [Op.lt]: referencia },
    },
  });
}

// Verifica se o estudante já está com um exemplar deste livro emprestado
async function buscarEmprestimoAtivoDoLivroPeloEstudante(estudanteId, livroId) {
  return Emprestimo.findOne({
    where: { estudante_id: estudanteId, data_devolucao_realizada: null },
    include: [{ model: Exemplar, as: 'exemplar', where: { livro_id: livroId } }],
  });
}

// Verifica se o estudante já possui uma reserva ativa ('pendente' ou 'aguardando_retirada') para este livro
async function buscarReservaAtivaDoEstudanteNoLivro(estudanteId, livroId, transaction) {
  return Reserva.findOne({
    where: {
      estudante_id: estudanteId,
      livro_id: livroId,
      status: { [Op.in]: ['pendente', 'aguardando_retirada'] },
    },
    transaction,
  });
}

// Cria uma nova reserva na fila
async function criarReserva(dados, transaction) {
  return Reserva.create(dados, { transaction });
}

// Busca uma reserva específica pelo ID
async function buscarReservaPorId(id, transaction) {
  return Reserva.findByPk(id, { include: INCLUDE_RESERVA, transaction });
}

// Lista a fila de reservas ordenada por ordem de chegada (FIFO: mais antigas primeiro)
async function listarReservas({ status, estudanteId, estudanteMatricula, livroCodigo } = {}) {
  const where = {};
  if (status) where.status = String(status).trim().toLowerCase();
  if (estudanteId) where.estudante_id = estudanteId;

  const includeEstudante = { model: Estudante, as: 'estudante' };
  if (estudanteMatricula) {
    includeEstudante.where = { matricula: { [Op.iLike]: String(estudanteMatricula).trim() } };
    includeEstudante.required = true;
  }

  const includeLivro = { model: Livro, as: 'livro' };
  if (livroCodigo) {
    includeLivro.where = { codigo_livro: { [Op.iLike]: String(livroCodigo).trim() } };
    includeLivro.required = true;
  }

  return Reserva.findAll({
    where,
    include: [includeEstudante, includeLivro, { model: Exemplar, as: 'exemplar' }],
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
  });
}

// Busca a primeira reserva pendente na fila (FIFO) de um livro
async function buscarProximaReservaPendente(livroId, transaction) {
  return Reserva.findOne({
    where: { livro_id: livroId, status: 'pendente' },
    include: INCLUDE_RESERVA,
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
  });
}

// Conta quantas reservas pendentes existem na fila de um livro
async function contarReservasPendentesDoLivro(livroId, transaction) {
  return Reserva.count({
    where: { livro_id: livroId, status: 'pendente' },
    transaction,
  });
}

// Atualiza os dados de uma reserva existente
async function atualizarReserva(reserva, dados, transaction) {
  return reserva.update(dados, { transaction });
}

// Remove uma reserva do banco
async function excluirReserva(reserva, transaction) {
  return reserva.destroy({ transaction });
}

// Busca um exemplar físico pelo ID
async function buscarExemplarPorId(exemplarId, transaction) {
  return Exemplar.findByPk(exemplarId, { transaction });
}

// Atualiza o status de um exemplar físico
async function atualizarExemplar(exemplar, dados, transaction) {
  return exemplar.update(dados, { transaction });
}

// Abre uma transação no banco (rollback automático se der erro)
async function executarTransacao(callback) {
  return sequelize.transaction(callback);
}

module.exports = {
  buscarEstudantePorId,
  buscarEstudantePorMatricula,
  buscarLivroPorCodigoOuId,
  contarEmprestimosAtrasadosDoEstudante,
  buscarEmprestimoAtivoDoLivroPeloEstudante,
  buscarReservaAtivaDoEstudanteNoLivro,
  criarReserva,
  buscarReservaPorId,
  listarReservas,
  buscarProximaReservaPendente,
  contarReservasPendentesDoLivro,
  atualizarReserva,
  excluirReserva,
  buscarExemplarPorId,
  atualizarExemplar,
  executarTransacao,
};
