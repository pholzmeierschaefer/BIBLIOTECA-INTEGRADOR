// auth.routes.js – Definição das rotas HTTP de Autenticação (/api/auth)

const express = require('express');
const authController = require('./auth.controller');
const autenticar = require('../middlewares/autenticar');
const asyncHandler = require('../middlewares/asynHandler'); // Captura erros assíncronos e envia ao erroHandler

const router = express.Router();

// Rotas públicas (não exigem token JWT)
router.post('/registrar', asyncHandler(authController.registrar)); // Cadastro de novo usuário
router.post('/login', asyncHandler(authController.login)); // Login e geração do token JWT

// Rotas protegidas (exigem o middleware 'autenticar' para validar o token JWT antes de acessar)
router.get('/perfil', autenticar, asyncHandler(authController.perfil)); // Retorna os dados do usuário logado
router.put('/senha', autenticar, asyncHandler(authController.alterarSenha)); // Altera a senha do usuário logado

module.exports = router;
