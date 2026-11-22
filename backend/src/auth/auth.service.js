// auth.service.js – Regras de negócio de Autenticação (registro, login, JWT e troca de senha)

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const authRepository = require('./auth.repository');

const SALT_ROUNDS = 12; // Fator de custo do bcrypt para criptografar senhas

// Cria um erro padronizado com status HTTP (400, 401, 403, 404, 409)
function criarErroHttp(statusCode, mensagem, codigo) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  if (codigo) err.codigo = codigo;
  return err;
}

// Converte o perfil vindo do front-end ('administrador' ou 'estudante') para o role do banco ('bibliotecario' ou 'aluno')
function mapearPerfilParaRole(perfil) {
  if (!perfil) return null;
  const valor = String(perfil).trim().toLowerCase();
  if (['administrador', 'admin', 'bibliotecario'].includes(valor)) return 'bibliotecario';
  if (['estudante', 'aluno'].includes(valor)) return 'aluno';
  return null;
}

// Formata os dados públicos do usuário (sem expor a senha)
function formatarUsuario(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    matricula: usuario.matricula || usuario.estudante?.matricula || null,
    email: usuario.email,
    role: usuario.role,
    estudante_id: usuario.estudante_id ?? null,
  };
}

// Gera e assina o token JWT com os dados essenciais de identificação do usuário
function gerarToken(usuario) {
  if (!env.jwtSecret) {
    throw criarErroHttp(500, 'JWT_SECRET não configurado nas variáveis de ambiente.');
  }

  return jwt.sign(
    {
      id: usuario.id,
      role: usuario.role,
      estudante_id: usuario.estudante_id ?? null,
      matricula: usuario.matricula || usuario.estudante?.matricula || null,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

// Cadastra um novo usuário com senha criptografada (e vincula/cria o Estudante se for aluno)
async function registrar({ nome, email, senha, role, perfil, matricula, turma, telefone }) {
  const emailNormalizado = String(email).trim().toLowerCase();

  // Verifica se o e-mail ou a matrícula já estão em uso
  if (await authRepository.buscarUsuarioPorEmail(emailNormalizado)) {
    throw criarErroHttp(409, 'E-mail já cadastrado.', 'EMAIL_DUPLICADO');
  }

  const matriculaLimpa = matricula ? String(matricula).trim() : null;
  if (matriculaLimpa && (await authRepository.buscarUsuarioPorMatricula(matriculaLimpa))) {
    throw criarErroHttp(409, 'Matrícula já cadastrada.', 'MATRICULA_DUPLICADA');
  }

  // Define o perfil do usuário ('bibliotecario' ou 'aluno') conforme enviado no body (aceita 'role' ou 'perfil')
  const papelFinal = mapearPerfilParaRole(role ?? perfil) || 'aluno';

  const senhaHash = await bcrypt.hash(String(senha), SALT_ROUNDS);

  // Salva o Estudante (se necessário) e o Usuário dentro de uma mesma transação
  const usuarioCriado = await authRepository.executarTransacao(async (transaction) => {
    let estudanteId = null;

    if (papelFinal === 'aluno' && matriculaLimpa) {
      let estudante = await authRepository.buscarEstudantePorMatricula(matriculaLimpa, transaction);

      if (!estudante && turma) {
        estudante = await authRepository.criarEstudante(
          {
            matricula: matriculaLimpa,
            nome_completo: String(nome).trim(),
            turma: String(turma).trim(),
            telefone: telefone ? String(telefone).trim() : null,
            status: 'ativo',
          },
          transaction
        );
      }
      if (estudante) estudanteId = estudante.id;
    }

    return authRepository.criarUsuario(
      {
        nome: String(nome).trim(),
        matricula: matriculaLimpa,
        email: emailNormalizado,
        senha: senhaHash,
        role: papelFinal,
        estudante_id: estudanteId,
      },
      transaction
    );
  });

  return formatarUsuario(usuarioCriado);
}

// Valida as credenciais (matrícula/e-mail e senha), confere o perfil e devolve o token JWT
async function login({ matricula, email, senha, perfil }) {
  const identificador = String(matricula || email || '').trim();
  const roleEsperada = mapearPerfilParaRole(perfil);

  if (perfil && !roleEsperada) {
    throw criarErroHttp(400, 'Perfil inválido. Escolha "administrador" ou "estudante".', 'PERFIL_INVALIDO');
  }

  const usuario = await authRepository.buscarUsuarioPorMatricula(identificador);
  const senhaValida = usuario ? await bcrypt.compare(String(senha), usuario.senha) : false;

  if (!usuario || !senhaValida) {
    throw criarErroHttp(401, 'Matrícula ou senha inválidos.', 'CREDENCIAIS_INVALIDAS');
  }

  // Se o usuário tentar logar como Administrador mas a conta dele estava como 'aluno' no banco, promove para 'bibliotecario' caso seja conta admin ou não tenha estudante vinculado
  if (roleEsperada === 'bibliotecario' && usuario.role !== 'bibliotecario' && !usuario.estudante_id) {
    await usuario.update({ role: 'bibliotecario' });
    usuario.role = 'bibliotecario';
  }

  // Garante que um aluno não faça login na aba de Administrador (e vice-versa)
  if (roleEsperada && usuario.role !== roleEsperada) {
    const labelPerfil = roleEsperada === 'bibliotecario' ? 'Administrador' : 'Estudante';
    throw criarErroHttp(403, `Esta matrícula não pertence ao perfil ${labelPerfil}.`, 'PERFIL_INCOMPATIVEL');
  }

  return {
    token: gerarToken(usuario),
    usuario: formatarUsuario(usuario),
  };
}

// Busca os dados do usuário logado pelo ID (sem a senha)
async function obterPerfil(usuarioId) {
  const usuario = await authRepository.buscarUsuarioPorIdSemSenha(usuarioId);
  if (!usuario) {
    throw criarErroHttp(404, 'Usuário não encontrado.', 'USUARIO_NAO_ENCONTRADO');
  }
  return usuario;
}

// Valida a senha atual do usuário e salva a nova senha criptografada
async function alterarSenha(usuarioId, { senhaAtual, novaSenha }) {
  const usuario = await authRepository.buscarUsuarioPorId(usuarioId);
  if (!usuario) {
    throw criarErroHttp(404, 'Usuário não encontrado.', 'USUARIO_NAO_ENCONTRADO');
  }

  const senhaAtualValida = await bcrypt.compare(String(senhaAtual), usuario.senha);
  if (!senhaAtualValida) {
    throw criarErroHttp(401, 'Senha atual incorreta.', 'SENHA_ATUAL_INVALIDA');
  }

  const novaHash = await bcrypt.hash(String(novaSenha), SALT_ROUNDS);
  await authRepository.atualizarSenhaUsuario(usuario, novaHash);

  return { mensagem: 'Senha alterada com sucesso.' };
}

module.exports = {
  registrar,
  login,
  obterPerfil,
  alterarSenha,
};
