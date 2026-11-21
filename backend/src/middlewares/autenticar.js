// autenticar.js – Middleware que valida o token JWT enviado nas requisições protegidas

const jwt = require('jsonwebtoken');
const env = require('../config/env');

function autenticar(req, res, next) {
  // Extrai o cabeçalho "Authorization: Bearer <token>" e separa apenas o token
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token de autenticação ausente.' });
  }

  try {
    // Verifica se o token foi assinado com o nosso segredo (JWT_SECRET) e se ainda não expirou
    req.usuario = jwt.verify(token, env.jwtSecret); // Salva os dados do usuário logado (id, role, etc.) na requisição
    return next(); // Libera a requisição para seguir até a próxima etapa (autorizar ou controller)
  } catch (err) {
    // Diferencia quando o token apenas venceu de quando ele é inválido/adulterado
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado.', expirado: true });
    }
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

module.exports = autenticar;
