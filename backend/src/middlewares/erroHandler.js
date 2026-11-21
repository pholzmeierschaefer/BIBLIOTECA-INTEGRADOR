// erroHandler.js – Middleware global de tratamento de erros do Express (deve ser o último no main.js)

function errorHandler(err, req, res, _next) {
  // Exibe o erro completo no terminal do servidor para facilitar a depuração
  console.error(err.stack || err.message);

  // Erro de validação nos campos do Model Sequelize -> 400 Bad Request
  if (err.name === 'SequelizeValidationError') {
    const detalhes = (err.errors || []).map((e) => ({ campo: e.path, mensagem: e.message }));
    return res.status(400).json({ erro: 'Dados inválidos.', detalhes });
  }

  // Violação de campo único no banco (ex: matrícula ou e-mail já cadastrado) -> 409 Conflict
  if (err.name === 'SequelizeUniqueConstraintError') {
    const detalhes = (err.errors || []).map((e) => ({ campo: e.path, mensagem: e.message }));
    return res.status(409).json({ erro: 'Conflito: registro já cadastrado.', detalhes });
  }

  // Violação de chave estrangeira (tentativa de apagar/vincular registro dependente) -> 409 Conflict
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ erro: 'Operação bloqueada: existem registros vinculados.' });
  }

  // JSON inválido enviado no corpo (body) da requisição -> 400 Bad Request
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON malformado no corpo da requisição.' });
  }

  // Erros lançados pelos Services (com err.statusCode) ou erro inesperado (500)
  const status = err.statusCode || err.status || 500;
  const mensagem = status < 500 ? err.message : 'Erro interno no servidor.';

  return res.status(status).json({
    erro: mensagem,
    ...(err.codigo && { codigo: err.codigo }), // Inclui o código do erro caso tenha sido definido no Service
  });
}

module.exports = errorHandler;
