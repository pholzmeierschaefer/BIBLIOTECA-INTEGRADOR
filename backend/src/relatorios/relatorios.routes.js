// relatorios.routes.js – Definição das rotas HTTP protegidas para os Relatórios Gerenciais (/api/relatorios)

const express = require('express');
const relatoriosController = require('./relatorios.controller');
const autenticar = require('../middlewares/autenticar'); // Exige token JWT válido
const autorizar = require('../middlewares/autorizar'); // Restringe acesso ao perfil 'bibliotecario'

const router = express.Router();

// Todas as rotas de relatórios exigem token JWT de um bibliotecário
router.use(autenticar, autorizar('bibliotecario'));

// Aceitam filtros opcionais na URL: ?mes=11&ano=2026&formato=csv
router.get('/livros-mais-lidos', relatoriosController.livrosMaisLidos); // Ranking de livros mais emprestados
router.get('/frequencia-turmas', relatoriosController.frequenciaTurmas); // Empréstimos e média de leitura por turma
router.get('/taxas-atraso', relatoriosController.taxasAtraso); // Índice de atrasos gerais e por turma

module.exports = router;
