// main.js – Ponto de entrada do servidor Express (inicializa middlewares, rotas e conexão com o banco)
// [RESUMO 1 - Arquitetura | RELATÓRIO 2.1 - Camadas do Backend]
// Toda requisição que sai do Frontend (React) chega primeiro aqui antes de ir para o módulo certo.

const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const db = require('../models');

const authRoutes = require('./auth/auth.routes');
const estudantesRoutes = require('./estudantes/estudantes.routes');
const livrosRoutes = require('./livros/livros.routes');
const emprestimosRoutes = require('./emprestimos/emprestimos.routes');
const reservasRoutes = require('./reservas/reservas.routes');
const relatoriosRoutes = require('./relatorios/relatorios.routes');
const errorHandler = require('./middlewares/erroHandler');

const app = express();

// Middlewares globais (executados em TODAS as requisições antes de chegar nas rotas)
app.use(cors()); // Libera requisições vindas do front-end (ex: React na porta 5173 acessando a API na porta 3000)
app.use(express.json({ limit: '10mb' })); // Converte o corpo (body) JSON para req.body; limit '10mb' permite receber planilhas .xlsx em base64

// Rota simples para testar rapidamente se a API está no ar
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', ambiente: env.nodeEnv });
});

// Registro das rotas por domínio/módulo [RELATÓRIO 2.1]
// Aceita tanto /api/... (usado pelo frontend) quanto /... (facilita testes no Insomnia)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/estudantes', '/estudantes'], estudantesRoutes);
app.use(['/api/livros', '/livros'], livrosRoutes);
app.use(['/api/emprestimos', '/emprestimos'], emprestimosRoutes);
app.use(['/api/reservas', '/reservas'], reservasRoutes);
app.use(['/api/relatorios', '/relatorios'], relatoriosRoutes);

// Middleware global de tratamento de erros [RELATÓRIO 4.2.3]
// Fica SEMPRE por último no Express para capturar qualquer erro repassado via next(err) pelos controllers
app.use(errorHandler);

// Conecta ao PostgreSQL, sincroniza as tabelas e só então abre a porta HTTP para receber requisições
async function iniciarServidor() {
  try {
    await db.sequelize.authenticate(); // Testa se o banco PostgreSQL está online e as credenciais do .env estão certas
    await db.sequelize.sync({ alter: true }); // Cria tabelas novas ou ajusta colunas existentes automaticamente conforme os models/
    console.log(`Banco de dados "${env.db.name}" conectado com sucesso.`);

    app.listen(env.port, () => {
      console.log(`Servidor rodando em http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error('Erro ao conectar no banco de dados:', err.message);
    process.exit(1);
  }
}

iniciarServidor();
