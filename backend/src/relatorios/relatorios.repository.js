// relatorios.repository.js – Consultas de banco de dados para geração dos Relatórios Gerenciais

const { Emprestimo, Exemplar, Livro, TipoLivro, Categoria, Estudante, Sequelize } = require('../../models');
const { Op } = Sequelize;

// Monta o filtro de data (mês e/ou ano) sobre a coluna data_emprestimo
function montarFiltroPeriodo({ mes, ano } = {}) {
  const where = {};

  if (ano && mes) {
    const inicio = new Date(ano, mes - 1, 1, 0, 0, 0); // Primeiro dia do mês
    const fim = new Date(ano, mes, 0, 23, 59, 59, 999); // Último dia do mês
    where.data_emprestimo = { [Op.between]: [inicio, fim] };
  } else if (ano) {
    const inicio = new Date(ano, 0, 1, 0, 0, 0);
    const fim = new Date(ano, 11, 31, 23, 59, 59, 999);
    where.data_emprestimo = { [Op.between]: [inicio, fim] };
  }

  return where;
}

// Busca todos os empréstimos do período trazendo Estudante, Exemplar, Livro, TipoLivro e Categoria
async function listarEmprestimosParaRelatorio({ mes, ano, turma } = {}) {
  const whereEmprestimo = montarFiltroPeriodo({ mes, ano });

  const includeEstudante = {
    model: Estudante,
    as: 'estudante',
    required: true,
    ...(turma && { where: { turma: { [Op.iLike]: `%${String(turma).trim()}%` } } }),
  };

  return Emprestimo.findAll({
    where: whereEmprestimo,
    include: [
      includeEstudante,
      {
        model: Exemplar,
        as: 'exemplar',
        required: true,
        include: [
          {
            model: Livro,
            as: 'livro',
            required: true,
            include: [
              { model: TipoLivro, as: 'tipoLivro' },
              { model: Categoria, as: 'categoriaRel' },
            ],
          },
        ],
      },
    ],
    order: [['data_emprestimo', 'DESC']],
  });
}

// Lista todos os estudantes ativos ou bloqueados para contabilizar o total de alunos por turma
async function listarEstudantesPorTurma() {
  return Estudante.findAll({
    where: { status: { [Op.ne]: 'inativo' } },
    attributes: ['id', 'turma'],
  });
}

module.exports = {
  listarEmprestimosParaRelatorio,
  listarEstudantesPorTurma,
};
