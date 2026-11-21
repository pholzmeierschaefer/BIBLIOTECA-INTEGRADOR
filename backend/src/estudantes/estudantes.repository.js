// estudantes.repository.js – Consultas e operações de banco de dados para Estudantes

const { Estudante, Sequelize } = require('../../models');
const { Op } = Sequelize; // Operadores de consulta SQL do Sequelize (iLike, or, etc.)

// Lista estudantes aplicando filtros opcionais
async function listarEstudantes({ nome, matricula, turma, status, q } = {}) {
  const where = {};

  if (nome) where.nome_completo = { [Op.iLike]: `%${nome.trim()}%` }; // Op.iLike: busca parcial sem diferenciar maiúsculas/minúsculas
  if (matricula) where.matricula = { [Op.iLike]: `%${matricula.trim()}%` };
  if (turma) where.turma = { [Op.iLike]: `%${turma.trim()}%` };
  if (status) where.status = status.trim().toLowerCase();

  if (q) {
    const termo = `%${q.trim()}%`;
    where[Op.or] = [ // Op.or: busca o mesmo termo no nome, matrícula OU turma
      { nome_completo: { [Op.iLike]: termo } },
      { matricula: { [Op.iLike]: termo } },
      { turma: { [Op.iLike]: termo } },
    ];
  }

  return Estudante.findAll({
    where,
    order: [['nome_completo', 'ASC']],
  });
}

// Busca estudante pela chave primária (ID)
async function buscarEstudantePorId(id) {
  return Estudante.findByPk(id);
}

// Busca estudante pela matrícula exata (usado para validar duplicidade)
async function buscarEstudantePorMatricula(matricula) {
  return Estudante.findOne({
    where: { matricula: { [Op.iLike]: String(matricula).trim() } },
  });
}

// Insere um novo estudante no banco
async function criarEstudante(dados) {
  return Estudante.create(dados);
}

// Atualiza um registro de estudante já carregado
async function atualizarEstudante(estudante, dados) {
  return estudante.update(dados);
}

module.exports = {
  listarEstudantes,
  buscarEstudantePorId,
  buscarEstudantePorMatricula,
  criarEstudante,
  atualizarEstudante,
};
