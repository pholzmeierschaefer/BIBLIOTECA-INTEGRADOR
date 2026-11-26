// emprestimos.repository.js – Camada Repository (Acesso direto ao PostgreSQL via Sequelize)
// [RESUMO 1 - Repository | RELATÓRIO 2.1d & 3.4]
// Por que está aqui: isola todos os comandos de banco de dados (SELECT, INSERT, UPDATE, DELETE) do resto do código
// usando o ORM Sequelize, que gera queries parametrizadas protegendo contra SQL Injection.

const { Emprestimo, Exemplar, Livro, Estudante, Justificativa, Sequelize, sequelize } = require('../../models');
const { Op } = Sequelize; // Operadores SQL do Sequelize: iLike (busca sem case), lt (menor que), in (lista), ne (diferente)

// JOIN padrão de Empréstimo: sempre traz junto o Estudante, o Exemplar (com o Livro pai) e as Justificativas
const INCLUDE_EMPRESTIMO = [
  { model: Estudante, as: 'estudante' },
  {
    model: Exemplar,
    as: 'exemplar',
    include: [{ model: Livro, as: 'livro' }],
  },
  { model: Justificativa, as: 'justificativas' },
];

// Busca estudante pela chave primária (ID)
async function buscarEstudantePorId(id, transaction) {
  return Estudante.findByPk(id, { transaction });
}

// Busca estudante pela matrícula escolar ignorando maiúsculas/minúsculas (Op.iLike)
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

// Busca um empréstimo que ainda não foi devolvido (data_devolucao_realizada: null) pelo tombo do exemplar
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
    includeEstudante.required = true; // required: true transforma em INNER JOIN quando há filtro
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
    order: [['data_emprestimo', 'DESC']], // Ordena dos empréstimos mais recentes para os mais antigos
  });
}

// [RESUMO 3] Conta quantos livros o estudante ainda NÃO devolveu (data_devolucao_realizada === null)
// Usado para validar o limite máximo de 2 empréstimos simultâneos
async function contarEmprestimosAtivosDoEstudante(estudanteId, transaction) {
  return Emprestimo.count({
    where: { estudante_id: estudanteId, data_devolucao_realizada: null },
    transaction,
  });
}

// Conta quantos empréstimos vencidos (data prevista < referencia e ainda não devolvidos) o estudante possui
async function contarEmprestimosAtrasadosDoEstudante(
  estudanteId,
  referencia = new Date(),
  excluirEmprestimoId = null,
  transaction
) {
  const where = {
    estudante_id: estudanteId,
    data_devolucao_realizada: null,
    data_devolucao_prevista: { [Op.lt]: referencia }, // Op.lt = "less than" (menor que a data atual)
  };
  if (excluirEmprestimoId) where.id = { [Op.ne]: excluirEmprestimoId }; // Op.ne = ignora um empréstimo específico (usado na devolução)

  return Emprestimo.count({ where, transaction });
}

// Insere um novo empréstimo no PostgreSQL (recebe transaction para atomicidade)
async function criarEmprestimo(dados, transaction) {
  return Emprestimo.create(dados, { transaction });
}

// Atualiza um empréstimo já carregado do banco
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

// Remove primeiro as justificativas filhas e depois o empréstimo para não violar chave estrangeira
async function excluirEmprestimo(emprestimoId, transaction) {
  await Justificativa.destroy({ where: { emprestimo_id: emprestimoId }, transaction });
  return Emprestimo.destroy({ where: { id: emprestimoId }, transaction });
}

// --- Consultas de Justificativas de Atraso ---

// Cria uma nova justificativa de atraso para um empréstimo
async function criarJustificativa(dados, transaction) {
  return Justificativa.create(dados, { transaction });
}

// Lista todas as justificativas enviadas pelos estudantes, trazendo aluno, empréstimo, exemplar e livro
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

// [RESUMO 3 & RELATÓRIO 2.1c] Varre o banco procurando empréstimos vencidos (sem devolução e data_prevista < hoje),
// marca esses empréstimos como 'atrasado' e bloqueia automaticamente os estudantes ativos que estão em atraso
async function sincronizarAtrasos({ estudanteId = null, referencia = new Date() } = {}) {
  const whereVencidos = {
    data_devolucao_realizada: null,
    data_devolucao_prevista: { [Op.lt]: referencia },
    ...(estudanteId && { estudante_id: estudanteId }),
  };

  const vencidos = await Emprestimo.findAll({ where: whereVencidos });
  if (vencidos.length === 0) return { emprestimosMarcadosAtrasados: 0, estudantesBloqueados: 0 };

  const idsEmprestimos = vencidos.map((e) => e.id);
  const idsEstudantes = [...new Set(vencidos.map((e) => e.estudante_id))]; // Set remove IDs repetidos

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

// [RESUMO 2 & RELATÓRIO 3.4] Abre uma transação no banco via Sequelize:
// se tudo dentro do callback rodar sem erro, faz COMMIT; se qualquer linha lançar erro, faz ROLLBACK automático!
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
