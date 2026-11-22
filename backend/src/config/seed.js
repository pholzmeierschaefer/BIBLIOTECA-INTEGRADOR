// seed.js – Script para popular o banco de dados com o usuário Administrador e registros iniciais

const bcrypt = require('bcrypt');
const db = require('../../models');

async function executarSeed() {
  try {
    const resetar = process.argv.includes('--reset');
    await db.sequelize.authenticate();
    await db.sequelize.sync({ force: resetar, alter: !resetar });

    const senhaBibliotecario = await bcrypt.hash('bibliotecario', 12);

    // 1. Garante o usuário Bibliotecário
    const [bibliotecario] = await db.Usuario.findOrCreate({
      where: { matricula: 'bibliotecario' },
      defaults: {
        nome: 'Bibliotecário',
        matricula: 'bibliotecario',
        email: 'bibliotecario@biblioteca.com',
        senha: senhaBibliotecario,
        role: 'bibliotecario',
      },
    });
    if (bibliotecario.role !== 'bibliotecario') {
      await bibliotecario.update({ role: 'bibliotecario' });
    }

    // 2. Garante um Estudante e sua conta de login para testes
    const [estudante] = await db.Estudante.findOrCreate({
      where: { matricula: '2026001' },
      defaults: {
        matricula: '2026001',
        nome_completo: 'Helena Martins',
        turma: '8º A',
        telefone: '(48) 99120-4402',
        status: 'ativo',
      },
    });

    const senhaAluno = await bcrypt.hash('2026001', 12);
    await db.Usuario.findOrCreate({
      where: { matricula: '2026001' },
      defaults: {
        nome: 'Helena Martins',
        matricula: '2026001',
        email: '2026001@aluno.biblioteca.com',
        senha: senhaAluno,
        role: 'aluno',
        estudante_id: estudante.id,
      },
    });

    // 3. Garante um Livro e um Exemplar inicial
    const [livro] = await db.Livro.findOrCreate({
      where: { codigo_livro: 'LIV-001' },
      defaults: {
        codigo_livro: 'LIV-001',
        titulo: 'Dom Casmurro',
        autor: 'Machado de Assis',
        editora: 'Ática',
        ano_publicacao: 1899,
        tipo: 'Literatura',
        categoria: 'Romance',
      },
    });

    await db.Exemplar.findOrCreate({
      where: { codigo_exemplar: 'TOMBO-001' },
      defaults: {
        codigo_exemplar: 'TOMBO-001',
        livro_id: livro.id,
        status: 'disponivel',
      },
    });

    console.log('Seed executado com sucesso!');
    console.log('Login Bibliotecário -> Matrícula: bibliotecario | Senha: bibliotecario');
    console.log('Login Aluno -> Matrícula: 2026001 | Senha: 2026001');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao executar seed:', err.message);
    process.exit(1);
  }
}

executarSeed();
