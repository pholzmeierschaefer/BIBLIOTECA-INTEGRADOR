// auth.service.js – Regras de negócio de Autenticação (Registro, Login, Token JWT e Troca de Senha)
// [RELATÓRIO 3.2 - Autenticação Stateless com JWT e Hash bcrypt | RELATÓRIO 3.3 - Senha Inicial do Estudante Igual à Matrícula]

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const authRepository = require('./auth.repository');

// Fator de custo 12 do bcrypt: deixa o cálculo do hash forte o suficiente contra ataques de força bruta,
// garantindo que nenhuma senha fique gravada em texto puro no banco de dados [RELATÓRIO 3.2]
const SALT_ROUNDS = 12;

// Cria um erro padronizado com status HTTP (400, 401, 403, 404, 409) para o erroHandler.js devolver à API
function criarErroHttp(statusCode, mensagem, codigo) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  if (codigo) err.codigo = codigo;
  return err;
}

// Converte os nomes vindos da interface ('administrador' ou 'estudante') para o ENUM salvo no banco ('bibliotecario' ou 'aluno')
function mapearPerfilParaRole(perfil) {
  if (!perfil) return null;
  const valor = String(perfil).trim().toLowerCase();
  if (['administrador', 'admin', 'bibliotecario'].includes(valor)) return 'bibliotecario';
  if (['estudante', 'aluno'].includes(valor)) return 'aluno';
  return null;
}

// Monta o objeto público do usuário que será devolvido para o Frontend (garante que o hash da senha NUNCA seja enviado)
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

// [RELATÓRIO 3.2] Gera e assina o token JWT usando a chave secreta do .env (env.jwtSecret).
// O token guarda id, role, estudante_id e matricula no payload — por isso é "Stateless" (o servidor não precisa guardar sessão na memória).
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

// Cadastra um novo usuário com senha criptografada em bcrypt; se for aluno, vincula ou cria o Estudante na mesma transação
async function registrar({ nome, email, senha, role, perfil, matricula, turma, telefone }) {
  const emailNormalizado = String(email).trim().toLowerCase();

  // Impede cadastro com e-mail ou matrícula repetida (retorna 409 Conflict)
  if (await authRepository.buscarUsuarioPorEmail(emailNormalizado)) {
    throw criarErroHttp(409, 'E-mail já cadastrado.', 'EMAIL_DUPLICADO');
  }

  const matriculaLimpa = matricula ? String(matricula).trim() : null;
  if (matriculaLimpa && (await authRepository.buscarUsuarioPorMatricula(matriculaLimpa))) {
    throw criarErroHttp(409, 'Matrícula já cadastrada.', 'MATRICULA_DUPLICADA');
  }

  // Define o perfil do usuário ('bibliotecario' ou 'aluno') conforme enviado no body (aceita 'role' ou 'perfil')
  const papelFinal = mapearPerfilParaRole(role ?? perfil) || 'aluno';

  // Criptografa a senha antes de enviar para o banco
  const senhaHash = await bcrypt.hash(String(senha), SALT_ROUNDS);

  // [RELATÓRIO 3.4] Transação garante que Estudante e Usuario sejam salvos juntos ou desfeitos (rollback) se algo falhar
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

// Valida as credenciais (matrícula/e-mail e senha), confere se o perfil escolhido na tela bate com o do banco e gera o token JWT
async function login({ matricula, email, senha, perfil }) {
  const identificador = String(matricula || email || '').trim();
  const roleEsperada = mapearPerfilParaRole(perfil);

  if (perfil && !roleEsperada) {
    throw criarErroHttp(400, 'Perfil inválido. Escolha "administrador" ou "estudante".', 'PERFIL_INVALIDO');
  }

  let usuario = await authRepository.buscarUsuarioPorMatricula(identificador);

  // [RELATÓRIO 3.3] Se o aluno foi importado ou cadastrado na tabela 'estudantes' mas ainda não tinha registro em 'usuarios',
  // cria automaticamente a conta dele com a senha inicial igual à própria matrícula para permitir acesso imediato ao Portal do Aluno.
  if (!usuario) {
    const estudante = await authRepository.buscarEstudantePorMatricula(identificador);
    if (estudante) {
      const senhaHash = await bcrypt.hash(estudante.matricula, SALT_ROUNDS);
      usuario = await authRepository.criarUsuario({
        nome: estudante.nome_completo,
        matricula: estudante.matricula,
        email: `${estudante.matricula.toLowerCase()}@aluno.biblioteca.com`,
        senha: senhaHash,
        role: 'aluno',
        estudante_id: estudante.id,
      });
    }
  }

  // Compara a senha digitada com o hash salvo no banco usando bcrypt.compare
  const senhaValida = usuario ? await bcrypt.compare(String(senha), usuario.senha) : false;

  if (!usuario || !senhaValida) {
    throw criarErroHttp(401, 'Matrícula ou senha inválidos.', 'CREDENCIAIS_INVALIDAS');
  }

  // Se uma conta administrativa (sem estudante vinculado) estava como 'aluno', promove para 'bibliotecario' ao logar como admin
  if (roleEsperada === 'bibliotecario' && usuario.role !== 'bibliotecario' && !usuario.estudante_id) {
    await usuario.update({ role: 'bibliotecario' });
    usuario.role = 'bibliotecario';
  }

  // Impede que um estudante tente entrar na aba de Bibliotecário ou um bibliotecário na aba de Estudante (403 Forbidden)
  if (roleEsperada && usuario.role !== roleEsperada) {
    const labelPerfil = roleEsperada === 'bibliotecario' ? 'Administrador' : 'Estudante';
    throw criarErroHttp(403, `Esta matrícula não pertence ao perfil ${labelPerfil}.`, 'PERFIL_INCOMPATIVEL');
  }

  return {
    token: gerarToken(usuario),
    usuario: formatarUsuario(usuario),
  };
}

// Busca os dados do usuário logado pelo ID (usado pelo App.jsx ao recarregar a página para manter a sessão ativa)
async function obterPerfil(usuarioId) {
  const usuario = await authRepository.buscarUsuarioPorIdSemSenha(usuarioId);
  if (!usuario) {
    throw criarErroHttp(404, 'Usuário não encontrado.', 'USUARIO_NAO_ENCONTRADO');
  }
  return usuario;
}

// Valida a senha atual com bcrypt e grava o novo hash da nova senha (acionado pelo modal MudarSenha.jsx)
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
