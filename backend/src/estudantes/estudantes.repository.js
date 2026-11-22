// estudantes.repository.js – Consultas e operações de banco de dados para Estudantes

const db = require('../../models');
const { Estudante, Sequelize, sequelize } = db;
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

// Cria ou atualiza a conta de login (tabela 'usuarios') do estudante com senha inicial = matrícula
async function garantirUsuarioDoEstudante(estudante, senhaHash) {
  if (!db.Usuario) return;
  const existente = await db.Usuario.findOne({ where: { estudante_id: estudante.id } });
  if (existente) {
    return existente.update({ nome: estudante.nome_completo, matricula: estudante.matricula });
  }
  return db.Usuario.create({
    nome: estudante.nome_completo,
    matricula: estudante.matricula,
    email: `${estudante.matricula.toLowerCase()}@aluno.biblioteca.com`,
    senha: senhaHash,
    role: 'aluno',
    estudante_id: estudante.id,
  });
}

// Atualiza um registro de estudante já carregado
async function atualizarEstudante(estudante, dados) {
  return estudante.update(dados);
}

// Exclui definitivamente o estudante (e registros vinculados, como conta de usuário/reservas/justificativas) do banco
async function excluirEstudante(estudanteId) {
  return sequelize.transaction(async (transaction) => {
    if (db.Justificativa) {
      await db.Justificativa.destroy({ where: { estudante_id: estudanteId }, transaction });
    }
    if (db.Reserva) {
      await db.Reserva.destroy({ where: { estudante_id: estudanteId }, transaction });
    }
    if (db.Emprestimo) {
      await db.Emprestimo.destroy({ where: { estudante_id: estudanteId }, transaction });
    }
    if (db.Usuario) {
      await db.Usuario.destroy({ where: { estudante_id: estudanteId }, transaction });
    }
    return Estudante.destroy({ where: { id: estudanteId }, transaction });
  });
}

module.exports = {
  listarEstudantes,
  buscarEstudantePorId,
  buscarEstudantePorMatricula,
  criarEstudante,
  garantirUsuarioDoEstudante,
  atualizarEstudante,
  excluirEstudante,
};
