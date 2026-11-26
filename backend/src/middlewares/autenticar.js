// autenticar.js – Middleware de Autenticação JWT
// [RESUMO 1 - Routes & Middlewares | RELATÓRIO 3.2 - Autenticação Stateless com JWT]
// Por que está aqui: protege rotas privadas garantindo que apenas usuários logados (com token válido) consigam acessar a API.

const jwt = require('jsonwebtoken');
const env = require('../config/env');

function autenticar(req, res, next) {
  // O frontend (api.js) envia o token no cabeçalho HTTP: "Authorization: Bearer <token>"
  // Aqui separamos a palavra "Bearer" (tipo) do código do token em si
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token de autenticação ausente.' });
  }

  try {
    // Valida a assinatura usando a chave secreta JWT_SECRET (no .env) e confere se não expirou.
    // Como é Stateless (sem sessão salva no servidor), os dados do usuário vêm decodificados de dentro do próprio token!
    req.usuario = jwt.verify(token, env.jwtSecret); // Grava { id, role, estudante_id, matricula } em req.usuario
    return next(); // Passa a bola para o próximo middleware (autorizar.js) ou para o controller
  } catch (err) {
    // Se o token venceu pelo tempo limite, avisa claramente com status 401
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado.', expirado: true });
    }
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

module.exports = autenticar;
