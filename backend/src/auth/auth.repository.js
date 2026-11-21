// auth.repository.js – Consultas de banco de dados para Autenticação (Usuários e Estudantes)

const { Usuario, Estudante, Sequelize, sequelize } = require('../../models');
const { Op } = Sequelize;

// Busca usuário pelo e-mail
async function buscarUsuarioPorEmail(email) {
  return Usuario.findOne({ where: { email: String(email).trim().toLowerCase() } });
}

// Busca usuário para login: procura pela matrícula ou e-mail na tabela 'usuarios'
// ou pela matrícula na tabela 'estudantes' vinculada
async function buscarUsuarioPorMatricula(identificador) {
  const valor = String(identificador).trim();

  // 1. Procura direto em 'usuarios' (por matrícula ou e-mail) trazendo o estudante vinculado
  const usuario = await Usuario.findOne({
    where: {
      [Op.or]: [
        { matricula: { [Op.iLike]: valor } },
        { email: { [Op.iLike]: valor } },
      ],
    },
    include: [{ model: Estudante, as: 'estudante' }],
  });

  if (usuario) return usuario;

  // 2. Se não achou direto em 'usuarios', procura pelo registro na tabela 'estudantes'
  return Usuario.findOne({
    include: [
      {
        model: Estudante,
        as: 'estudante',
        where: { matricula: { [Op.iLike]: valor } },
        required: true, // required: true força um INNER JOIN (só traz se o estudante tiver essa matrícula)
      },
    ],
  });
}

// Busca usuário pelo ID (inclui a senha, usado na validação de troca de senha)
async function buscarUsuarioPorId(id) {
  return Usuario.findByPk(id);
}

// Busca usuário pelo ID ocultando a senha e trazendo os dados de estudante (usado na rota /perfil)
async function buscarUsuarioPorIdSemSenha(id) {
  return Usuario.findByPk(id, {
    attributes: { exclude: ['senha'] },
    include: [{ model: Estudante, as: 'estudante' }],
  });
}

// Atualiza o hash da senha do usuário
async function atualizarSenhaUsuario(usuario, senhaHash) {
  return usuario.update({ senha: senhaHash });
}

// Conta quantos usuários existem com determinado perfil ('bibliotecario' ou 'aluno')
async function contarUsuariosPorRole(role) {
  return Usuario.count({ where: { role } });
}

// Cria um novo usuário no banco
async function criarUsuario(dados, transaction) {
  return Usuario.create(dados, { transaction });
}

// Busca um estudante pela matrícula
async function buscarEstudantePorMatricula(matricula, transaction) {
  return Estudante.findOne({ where: { matricula }, transaction });
}

// Cria um novo estudante no banco (quando um aluno é registrado pelo auth)
async function criarEstudante(dados, transaction) {
  return Estudante.create(dados, { transaction });
}

// Abre uma transação para executar múltiplas gravações com segurança (commit/rollback)
function executarTransacao(callback) {
  return sequelize.transaction(callback);
}

module.exports = {
  buscarUsuarioPorEmail,
  buscarUsuarioPorMatricula,
  buscarUsuarioPorId,
  buscarUsuarioPorIdSemSenha,
  atualizarSenhaUsuario,
  contarUsuariosPorRole,
  criarUsuario,
  buscarEstudantePorMatricula,
  criarEstudante,
  executarTransacao,
};
