// auth.controller.js – Recebe as requisições HTTP de autenticação (login, registro, perfil e troca de senha)

const authService = require('./auth.service');

// POST /api/auth/registrar – Cria um novo usuário no sistema
async function registrar(req, res) {
  const { nome, email, senha } = req.body;

  if (!nome?.trim() || !email?.includes('@') || !senha || String(senha).length < 6) {
    return res.status(400).json({
      erro: 'Informe um nome válido, um e-mail válido e uma senha com no mínimo 6 caracteres.',
    });
  }

  const usuario = await authService.registrar(req.body);
  return res.status(201).json(usuario);
}

// POST /api/auth/login – Autentica o usuário (por matrícula ou e-mail) e retorna o token JWT
async function login(req, res) {
  const { matricula, email, senha } = req.body;
  const identificador = matricula ?? email;

  if (!identificador || !senha) {
    return res.status(400).json({ erro: 'Matrícula (ou e-mail) e senha são obrigatórios.' });
  }

  const resultado = await authService.login(req.body);
  return res.status(200).json(resultado);
}

// GET /api/auth/perfil – Retorna os dados do usuário logado a partir do ID que está no token JWT (req.usuario)
async function perfil(req, res) {
  const usuario = await authService.obterPerfil(req.usuario.id);
  return res.status(200).json(usuario);
}

// PUT /api/auth/senha – Atualiza a senha do usuário logado validando a senha atual
async function alterarSenha(req, res) {
  const senhaAtual = req.body.senha_atual ?? req.body.senhaAtual;
  const novaSenha = req.body.nova_senha ?? req.body.novaSenha;

  if (!senhaAtual || !novaSenha || String(novaSenha).length < 4) {
    return res.status(400).json({
      erro: 'Informe a senha atual e uma nova senha com no mínimo 4 caracteres.',
    });
  }

  const resultado = await authService.alterarSenha(req.usuario.id, { senhaAtual, novaSenha });
  return res.status(200).json(resultado);
}

module.exports = {
  registrar,
  login,
  perfil,
  alterarSenha,
};
