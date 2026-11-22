// reservas.controller.js – Recebe as requisições HTTP de Reservas, valida dados básicos e chama o Service

const reservasService = require('./reservas.service');

// GET /api/reservas – Lista a fila de reservas com filtros opcionais via query params
async function listarReservas(req, res, next) {
  try {
    const reservas = await reservasService.listarReservas(req.query);
    return res.status(200).json(reservas);
  } catch (err) {
    return next(err);
  }
}

// GET /api/reservas/:id – Busca uma reserva específica pelo ID
async function buscarReservaPorId(req, res, next) {
  try {
    const reserva = await reservasService.buscarReservaPorId(Number(req.params.id));
    return res.status(200).json(reserva);
  } catch (err) {
    return next(err);
  }
}

// POST /api/reservas – Cria uma nova reserva na fila de espera de um livro
async function criarReserva(req, res, next) {
  try {
    const livro_codigo =
      req.body.livro_codigo ??
      req.body.codigo_livro ??
      req.body.livro_id ??
      req.body.obra_codigo ??
      req.body.obra_id;
    const estudante_matricula =
      req.body.estudante_matricula ?? req.body.matricula ?? req.usuario?.matricula;

    if (!livro_codigo || !estudante_matricula) {
      return res.status(400).json({
        erro: 'O código do livro e a matrícula do estudante são obrigatórios.',
      });
    }

    const reserva = await reservasService.criarReserva({ estudante_matricula, livro_codigo });
    return res.status(201).json(reserva);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/reservas/:id – Atualiza status ou alerta_enviado de uma reserva
async function editarReserva(req, res, next) {
  try {
    const reserva = await reservasService.editarReserva(Number(req.params.id), req.body);
    return res.status(200).json(reserva);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/reservas/:id/cancelar – Cancela uma reserva ativa
async function cancelarReserva(req, res, next) {
  try {
    const resultado = await reservasService.cancelarReserva(Number(req.params.id));
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/reservas/:id – Exclui uma reserva do banco
async function excluirReserva(req, res, next) {
  try {
    await reservasService.excluirReserva(Number(req.params.id));
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listarReservas,
  buscarReservaPorId,
  criarReserva,
  editarReserva,
  cancelarReserva,
  excluirReserva,
};
