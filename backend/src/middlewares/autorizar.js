// autorizar.js – Middleware de controle de acesso por perfil (RBAC: 'bibliotecario' ou 'aluno').
// Deve ser usado nas rotas sempre depois do middleware autenticar.

function autorizar(...papeisPermitidos) { // Recebe um ou mais perfis permitidos (ex: autorizar('bibliotecario'))
  return (req, res, next) => {
    // Confere se o usuário passou pela autenticação antes
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    // Verifica se o perfil (role) do usuário logado está na lista de perfis permitidos da rota
    if (!papeisPermitidos.includes(req.usuario.role)) {
      return res.status(403).json({ erro: 'Permissão insuficiente para acessar este recurso.' });
    }

    return next(); // Usuário tem permissão: segue para o controller
  };
}

module.exports = autorizar;
