// livros.routes.js – Definição das rotas HTTP protegidas para o módulo de Livros e Exemplares

const express = require('express');
const livrosController = require('./livros.controller');
const autenticar = require('../middlewares/autenticar'); // Exige token JWT válido
const autorizar = require('../middlewares/autorizar'); // Restringe acesso por perfil (role)

const router = express.Router();

// Exige autenticação via token JWT em todas as rotas de livros abaixo
router.use(autenticar);

// --- Rotas de Exemplares por Tombo (registradas antes de /:id para não conflitar na URL) ---
router.get('/exemplares/:tombo', livrosController.buscarExemplarPorTombo); // Busca exemplar pelo tombo
router.put('/exemplares/:tombo', autorizar('bibliotecario'), livrosController.editarExemplar); // Atualiza exemplar
router.delete('/exemplares/:tombo', autorizar('bibliotecario'), livrosController.excluirExemplar); // Exclui exemplar

// --- Rotas de Exemplares vinculados a um Livro (/api/livros/:codigo/exemplares) ---
router.get('/:codigo/exemplares', livrosController.listarExemplaresDoLivro); // Lista exemplares do livro
router.post('/:codigo/exemplares', autorizar('bibliotecario'), livrosController.cadastrarExemplar); // Cria exemplar no livro

// --- Rotas de Livros (/api/livros) ---
router.get('/', livrosController.listarLivros); // Lista livros do acervo com filtros (?titulo=..., ?autor=..., ?q=...)
router.get('/:id', livrosController.buscarLivroPorId); // Busca livro detalhado por ID ou código
router.post('/', autorizar('bibliotecario'), livrosController.criarLivro); // Cadastra novo livro
router.put('/:id', autorizar('bibliotecario'), livrosController.editarLivro); // Atualiza dados do livro
router.delete('/:id', autorizar('bibliotecario'), livrosController.excluirLivro); // Exclui livro do acervo

module.exports = router;
