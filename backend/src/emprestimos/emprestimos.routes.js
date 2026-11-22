// emprestimos.routes.js – Definição das rotas HTTP protegidas para Empréstimos e Justificativas

const express = require('express');
const emprestimosController = require('./emprestimos.controller');
const autenticar = require('../middlewares/autenticar'); // Exige token JWT válido
const autorizar = require('../middlewares/autorizar'); // Restringe acesso por perfil (role)

const router = express.Router();

// Exige autenticação via token JWT em todas as rotas de empréstimos
router.use(autenticar);

// --- Rotas Fixas (registradas antes de /:id para evitar conflito de parâmetros na URL) ---
router.get('/dashboard', autorizar('bibliotecario'), emprestimosController.obterDashboard); // Indicadores e atrasos
router.get('/meus', emprestimosController.listarMeusEmprestimos); // Empréstimos do aluno logado ou por ?matricula=
router.get('/justificativas', autorizar('bibliotecario'), emprestimosController.listarJustificativas); // Lista justificativas
router.put('/justificativas/:id/analisar', autorizar('bibliotecario'), emprestimosController.marcarJustificativaAnalisada); // Marca justificativa analisada
router.put('/devolver', autorizar('bibliotecario'), emprestimosController.registrarDevolucao); // Devolução rápida via body

// --- CRUD e Operações de Balcão (/api/emprestimos) ---
router.get('/', autorizar('bibliotecario'), emprestimosController.listarEmprestimos); // Lista todos os empréstimos
router.get('/:id', emprestimosController.buscarEmprestimoPorId); // Busca detalhes de um empréstimo pelo ID
router.post('/', autorizar('bibliotecario'), emprestimosController.registrarEmprestimo); // Registra novo empréstimo
router.put('/:id', autorizar('bibliotecario'), emprestimosController.editarEmprestimo); // Edita dados do empréstimo
router.delete('/:id', autorizar('bibliotecario'), emprestimosController.excluirEmprestimo); // Exclui empréstimo
router.put('/:id/devolver', autorizar('bibliotecario'), emprestimosController.registrarDevolucao); // Devolve pelo ID ou tombo
router.put('/:id/renovar', autorizar('bibliotecario'), emprestimosController.registrarRenovacao); // Renova por +7 dias
router.put('/:id/justificativa', emprestimosController.enviarJustificativaAtraso); // Envia justificativa de atraso

module.exports = router;
