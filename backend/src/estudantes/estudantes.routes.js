// estudantes.routes.js – Definição das rotas HTTP protegidas para o módulo de Estudantes

const express = require('express');
const estudantesController = require('./estudantes.controller');
const autenticar = require('../middlewares/autenticar'); // Exige token JWT válido
const autorizar = require('../middlewares/autorizar'); // Restringe acesso por perfil (role)

const router = express.Router();

// Middleware nativo do Express que lê o corpo da requisição como texto puro (upload de CSV)
const parseCsvBody = express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' });

// Aplica a exigência do token JWT (autenticar) em TODAS as rotas de estudantes abaixo
router.use(autenticar);

// Importação de estudantes em lote via CSV (apenas bibliotecario)
router.post('/importar', autorizar('bibliotecario'), parseCsvBody, estudantesController.importarEstudantes);

// Lista todos os estudantes com filtros opcionais (apenas bibliotecario)
router.get('/', autorizar('bibliotecario'), estudantesController.listarEstudantes);

// Cadastra um novo estudante (apenas bibliotecario)
router.post('/', autorizar('bibliotecario'), estudantesController.cadastrarEstudante);

// Busca um estudante pela matrícula (qualquer usuário autenticado com token)
router.get('/:matricula', estudantesController.buscarPorMatricula);

// Atualiza os dados cadastrais do estudante (apenas bibliotecario)
router.put('/:matricula', autorizar('bibliotecario'), estudantesController.editarEstudante);

// Altera apenas o status ('ativo', 'bloqueado' ou 'inativo') do estudante (apenas bibliotecario)
router.put('/:matricula/status', autorizar('bibliotecario'), estudantesController.alterarStatusEstudante);

// Inativa o estudante mantendo o histórico (apenas bibliotecario)
router.delete('/:matricula', autorizar('bibliotecario'), estudantesController.inativarEstudante);

module.exports = router;
