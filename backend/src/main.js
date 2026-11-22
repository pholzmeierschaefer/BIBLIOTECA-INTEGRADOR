// main.js – Ponto de entrada do servidor Express (inicializa middlewares, rotas e conexão com o banco)

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

// Middlewares globais
app.use(cors()); // Libera requisições vindas do front-end
app.use(express.json({ limit: '10mb' })); // Permite ler JSONs maiores (como upload de planilhas .xlsx em base64)

// Rota de verificação de saúde da API
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', ambiente: env.nodeEnv });
});

// Registro das rotas dos módulos (aceita tanto /api/... quanto /... direto no Insomnia)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/estudantes', '/estudantes'], estudantesRoutes);
app.use(['/api/livros', '/livros'], livrosRoutes);
app.use(['/api/emprestimos', '/emprestimos'], emprestimosRoutes);
app.use(['/api/reservas', '/reservas'], reservasRoutes);
app.use(['/api/relatorios', '/relatorios'], relatoriosRoutes);

// Middleware global de tratamento de erros (sempre por último)
app.use(errorHandler);

// Conecta ao PostgreSQL, sincroniza as tabelas e inicia o servidor HTTP
async function iniciarServidor() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync({ alter: true }); // Cria ou atualiza as colunas das tabelas 'estudantes' e 'usuarios'
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
