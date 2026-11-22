// reservas.routes.js – Definição das rotas HTTP protegidas para o módulo de Reservas

const express = require('express');
const reservasController = require('./reservas.controller');
const autenticar = require('../middlewares/autenticar'); // Exige token JWT válido
const autorizar = require('../middlewares/autorizar'); // Restringe acesso por perfil (role)

const router = express.Router();

// Exige autenticação via token JWT em todas as rotas de reservas
router.use(autenticar);

// --- CRUD de Reservas (/api/reservas) ---
router.get('/', reservasController.listarReservas); // Lista fila de reservas por ordem de chegada (FIFO)
router.get('/:id', reservasController.buscarReservaPorId); // Busca reserva pelo ID
router.post('/', reservasController.criarReserva); // Cria reserva na fila de espera
router.put('/:id', autorizar('bibliotecario'), reservasController.editarReserva); // Edita status/alerta
router.put('/:id/cancelar', reservasController.cancelarReserva); // Cancela reserva ativa
router.delete('/:id', reservasController.excluirReserva); // Exclui reserva pelo ID

module.exports = router;
