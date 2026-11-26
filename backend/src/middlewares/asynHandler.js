// asynHandler.js – Wrapper para rotas assíncronas (async/await)
// Por que está aqui: no Express, erros lançados dentro de funções async precisam ir para o next(err).
// Esse helper envolve o controller para capturar qualquer erro automaticamente e mandar para o erroHandler.js.

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
