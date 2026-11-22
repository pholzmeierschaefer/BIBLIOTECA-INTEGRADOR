// emprestimo.js – Model Sequelize para a tabela 'emprestimos' (empréstimos, devoluções e renovações)

module.exports = (sequelize, DataTypes) => {
  const Emprestimo = sequelize.define(
    'Emprestimo',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      exemplar_id: {
        type: DataTypes.INTEGER, // ID do exemplar físico emprestado
        allowNull: false,
      },
      estudante_id: {
        type: DataTypes.INTEGER, // ID do estudante que retirou o livro
        allowNull: false,
      },
      data_emprestimo: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW, // Registra a data/hora atual automaticamente
      },
      data_devolucao_prevista: {
        type: DataTypes.DATE, // Prazo limite para devolução (padrão: +7 dias corridos)
        allowNull: false,
      },
      data_devolucao_realizada: {
        type: DataTypes.DATE, // Fica null enquanto o livro está com o aluno; preenchida na devolução
        allowNull: true,
      },
      renovacoes: {
        type: DataTypes.INTEGER, // Quantidade de vezes que o empréstimo foi renovado (+7 dias cada)
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM('ativo', 'devolvido', 'atrasado'),
        allowNull: false,
        defaultValue: 'ativo',
      },
    },
    {
      tableName: 'emprestimos',
    }
  );

  // Relacionamentos: o Empréstimo liga 1 Estudante a 1 Exemplar físico
  Emprestimo.associate = (models) => {
    if (models.Exemplar) {
      Emprestimo.belongsTo(models.Exemplar, { foreignKey: 'exemplar_id', as: 'exemplar' });
    }
    if (models.Estudante) {
      Emprestimo.belongsTo(models.Estudante, { foreignKey: 'estudante_id', as: 'estudante' });
    }
    if (models.Justificativa) {
      Emprestimo.hasMany(models.Justificativa, { foreignKey: 'emprestimo_id', as: 'justificativas' });
    }
  };

  return Emprestimo;
};
