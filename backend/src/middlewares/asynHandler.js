// asynHandler.js – Captura erros de funções assíncronas (async/await) nos controllers
// e encaminha automaticamente para o middleware global de erros (next), evitando repetir try/catch.

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
