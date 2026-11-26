// emprestimos.routes.js – Camada de Rotas de Empréstimos e Justificativas
// [RESUMO 1 - Routes & Middlewares | RELATÓRIO 2.1a]
// Mapeia as URLs HTTP para as funções do Controller e aplica autenticação + controle de acesso por perfil.

const express = require('express');
const emprestimosController = require('./emprestimos.controller');
const autenticar = require('../middlewares/autenticar'); // Valida o token JWT em todas as rotas abaixo
const autorizar = require('../middlewares/autorizar'); // Restringe rotas administrativas apenas ao 'bibliotecario'

const router = express.Router();

// Middleware aplicado em bloco: ninguém acessa nenhuma rota de empréstimo sem estar logado
router.use(autenticar);

// --- Rotas Fixas ---
// IMPORTANTE: registradas ANTES de '/:id' para o Express não achar que "dashboard", "meus" ou "devolver" são um ID numérico!
router.get('/dashboard', autorizar('bibliotecario'), emprestimosController.obterDashboard); // Indicadores gerenciais e atrasos
router.get('/meus', emprestimosController.listarMeusEmprestimos); // Portal do Aluno: empréstimos do aluno logado
router.get('/justificativas', autorizar('bibliotecario'), emprestimosController.listarJustificativas); // Caixa de justificativas
router.put('/justificativas/:id/analisar', autorizar('bibliotecario'), emprestimosController.marcarJustificativaAnalisada); // Marca justificativa como lida
router.put('/devolver', autorizar('bibliotecario'), emprestimosController.registrarDevolucao); // Devolução rápida informando tombo no body

// --- CRUD e Operações de Balcão (/api/emprestimos) ---
router.get('/', autorizar('bibliotecario'), emprestimosController.listarEmprestimos); // Lista todos os empréstimos
router.get('/:id', emprestimosController.buscarEmprestimoPorId); // Busca um empréstimo pelo ID
router.post('/', autorizar('bibliotecario'), emprestimosController.registrarEmprestimo); // [RESUMO 1] Rota de criação de empréstimo (só bibliotecário)
router.put('/:id', autorizar('bibliotecario'), emprestimosController.editarEmprestimo); // Edita dados administrativos
router.delete('/:id', autorizar('bibliotecario'), emprestimosController.excluirEmprestimo); // Exclui empréstimo
router.put('/:id/devolver', autorizar('bibliotecario'), emprestimosController.registrarDevolucao); // Devolve livro pelo ID ou tombo
router.put('/:id/renovar', autorizar('bibliotecario'), emprestimosController.registrarRenovacao); // Renova prazo por +7 dias
router.put('/:id/justificativa', emprestimosController.enviarJustificativaAtraso); // Aluno ou admin envia justificativa de atraso

module.exports = router;
