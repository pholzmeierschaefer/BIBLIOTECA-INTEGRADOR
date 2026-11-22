// reserva.js – Model Sequelize para a tabela 'reservas' (fila de espera de livros por ordem de chegada)

module.exports = (sequelize, DataTypes) => {
  const Reserva = sequelize.define(
    'Reserva',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      estudante_id: {
        type: DataTypes.INTEGER, // ID do estudante que entrou na fila de reserva
        allowNull: false,
      },
      livro_id: {
        type: DataTypes.INTEGER, // ID do livro reservado
        allowNull: true,
      },
      exemplar_id: {
        type: DataTypes.INTEGER, // Preenchido quando um exemplar físico é devolvido e separado para este aluno
        allowNull: true,
      },
      data_reserva: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM('pendente', 'aguardando_retirada', 'atendida', 'cancelada'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      alerta_enviado: {
        type: DataTypes.BOOLEAN, // Indica se o aluno já foi avisado de que o livro está disponível
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'reservas',
    }
  );

  // Relacionamentos: cada Reserva pertence a 1 Estudante, 1 Livro e (opcionalmente) 1 Exemplar físico
  Reserva.associate = (models) => {
    if (models.Estudante) {
      Reserva.belongsTo(models.Estudante, { foreignKey: 'estudante_id', as: 'estudante' });
    }
    if (models.Livro) {
      Reserva.belongsTo(models.Livro, { foreignKey: 'livro_id', as: 'livro' });
    }
    if (models.Exemplar) {
      Reserva.belongsTo(models.Exemplar, { foreignKey: 'exemplar_id', as: 'exemplar' });
    }
  };

  return Reserva;
};
