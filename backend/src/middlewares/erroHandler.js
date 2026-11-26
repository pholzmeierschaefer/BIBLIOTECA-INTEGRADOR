// erroHandler.js – Middleware global de tratamento de erros do Express
// [RELATÓRIO 4.2.3 - Padronização de erros no backend]
// Por que está aqui: evita repetir blocos de formatação de erro em cada controller e impede
// que detalhes técnicos internos (como stack trace do banco) vazem para o usuário final.

function errorHandler(err, req, res, _next) {
  // Exibe o erro completo apenas no terminal do servidor para o desenvolvedor depurar
  console.error(err.stack || err.message);

  // Erro de validação nos campos do Model Sequelize (ex: campo obrigatório vazio) -> 400 Bad Request
  if (err.name === 'SequelizeValidationError') {
    const detalhes = (err.errors || []).map((e) => ({ campo: e.path, mensagem: e.message }));
    return res.status(400).json({ erro: 'Dados inválidos.', detalhes });
  }

  // Violação de campo único no banco (ex: matrícula, tombo ou e-mail duplicado) -> 409 Conflict
  if (err.name === 'SequelizeUniqueConstraintError') {
    const detalhes = (err.errors || []).map((e) => ({ campo: e.path, mensagem: e.message }));
    return res.status(409).json({ erro: 'Conflito: registro já cadastrado.', detalhes });
  }

  // Violação de chave estrangeira (ex: tentar apagar registro que ainda tem vínculo em outra tabela) -> 409 Conflict
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ erro: 'Operação bloqueada: existem registros vinculados.' });
  }

  // JSON malformado enviado no corpo (body) da requisição -> 400 Bad Request
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON malformado no corpo da requisição.' });
  }

  // Erros de regra de negócio lançados pelos Services com criarErroHttp(status, msg) ou erro inesperado (500)
  const status = err.statusCode || err.status || 500;
  const mensagem = status < 500 ? err.message : 'Erro interno no servidor.';

  return res.status(status).json({
    erro: mensagem,
    ...(err.codigo && { codigo: err.codigo }), // Inclui código de erro caso tenha sido definido no Service
  });
}

module.exports = errorHandler;
