// justificativa.js – Model Sequelize para a tabela 'justificativas' (avisos de atraso enviados pelos estudantes)

module.exports = (sequelize, DataTypes) => {
  const Justificativa = sequelize.define(
    'Justificativa',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      emprestimo_id: {
        type: DataTypes.INTEGER, // ID do empréstimo em atraso ao qual a justificativa se refere
        allowNull: false,
      },
      estudante_id: {
        type: DataTypes.INTEGER, // ID do estudante que enviou a justificativa
        allowNull: false,
      },
      texto_descritivo: {
        type: DataTypes.TEXT, // Mensagem explicando o motivo do atraso
        allowNull: false,
      },
      data_envio: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW, // Preenche com a data/hora atual no momento do envio
      },
      status: {
        type: DataTypes.ENUM('pendente', 'analisada'),
        allowNull: false,
        defaultValue: 'pendente',
      },
    },
    {
      tableName: 'justificativas',
    }
  );

  // Relacionamentos: cada Justificativa pertence a 1 Empréstimo e a 1 Estudante
  Justificativa.associate = (models) => {
    if (models.Emprestimo) {
      Justificativa.belongsTo(models.Emprestimo, { foreignKey: 'emprestimo_id', as: 'emprestimo' });
    }
    if (models.Estudante) {
      Justificativa.belongsTo(models.Estudante, { foreignKey: 'estudante_id', as: 'estudante' });
    }
  };

  return Justificativa;
};
