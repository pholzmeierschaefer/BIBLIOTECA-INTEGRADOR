// estudantes.routes.js – Definição das rotas HTTP para o módulo de Estudantes

const express = require('express');
const estudantesController = require('./estudantes.controller');

const router = express.Router(); // Cria o agrupador de rotas do Express

// Middleware nativo do Express que lê o corpo da requisição como texto puro (usado para upload de arquivo CSV)
const parseCsvBody = express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' });

// Importação de estudantes em lote via CSV (vem antes de /:matricula para o Express não confundir "importar" com uma matrícula)
router.post('/importar', parseCsvBody, estudantesController.importarEstudantes);

// Lista todos os estudantes (aceita filtros via query params: ?nome=..., ?turma=..., ?q=...)
router.get('/', estudantesController.listarEstudantes);

// Cadastra um novo estudante individualmente
router.post('/', estudantesController.cadastrarEstudante);

// Busca os dados de um estudante específico pela matrícula na URL
router.get('/:matricula', estudantesController.buscarPorMatricula);

// Atualiza os dados cadastrais do estudante (nome, turma, telefone, etc.)
router.put('/:matricula', estudantesController.editarEstudante);

// Altera apenas a situação do estudante ('ativo', 'bloqueado' ou 'inativo')
router.put('/:matricula/status', estudantesController.alterarStatusEstudante);

// Inativa o estudante (exclusão lógica para não perder o histórico na biblioteca)
router.delete('/:matricula', estudantesController.inativarEstudante);

module.exports = router;
