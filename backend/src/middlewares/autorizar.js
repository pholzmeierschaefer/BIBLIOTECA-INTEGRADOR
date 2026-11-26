// autorizar.js – Middleware de Autorização por Perfil (RBAC: 'bibliotecario' ou 'aluno')
// [RESUMO 1 - Routes & Middlewares | RELATÓRIO 3.2 - Autenticação e Autorização]
// Por que está aqui: mesmo que um aluno tente chamar uma rota administrativa direto pela URL ou pelo Insomnia,
// este middleware barra o acesso no servidor (403 Forbidden). Deve ser usado SEMPRE depois de autenticar.js.

function autorizar(...papeisPermitidos) { // Recebe os perfis aceitos na rota (ex: autorizar('bibliotecario'))
  return (req, res, next) => {
    // Confere se o middleware autenticar.js já preencheu req.usuario
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    // Verifica se o perfil (role) do usuário logado está dentro dos perfis permitidos nesta rota
    if (!papeisPermitidos.includes(req.usuario.role)) {
      return res.status(403).json({ erro: 'Permissão insuficiente para acessar este recurso.' });
    }

    return next(); // Permissão confirmada: libera o acesso para o controller
  };
}

module.exports = autorizar;
