// exemplar.js – Model Sequelize para a tabela 'exemplares' (cópias físicas de cada livro na estante)

module.exports = (sequelize, DataTypes) => {
  const Exemplar = sequelize.define(
    'Exemplar',
    {
      // Identificador único do exemplar (chave primária auto-incrementada)
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Código de tombo único do exemplar físico (ex: TOMBO-001)
      codigo_exemplar: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: { msg: 'Este código de exemplar (tombo) já está cadastrado.' },
      },

      // Chave estrangeira que indica a qual Livro do catálogo este exemplar pertence
      livro_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Situação atual do exemplar físico na biblioteca
      status: {
        type: DataTypes.ENUM(
          'disponivel',
          'emprestado',
          'reservado',
          'inativo',
          'inativo_extraviado'
        ),
        allowNull: false,
        defaultValue: 'disponivel',
      },
    },
    {
      tableName: 'exemplares',
    }
  );

  // Relacionamentos do Exemplar (só associa com os models que já existirem)
  Exemplar.associate = (models) => {
    if (models.Livro) {
      Exemplar.belongsTo(models.Livro, { foreignKey: 'livro_id', as: 'livro' });
    }
    if (models.Emprestimo) {
      Exemplar.hasMany(models.Emprestimo, { foreignKey: 'exemplar_id', as: 'emprestimos' });
    }
    if (models.Reserva) {
      Exemplar.hasMany(models.Reserva, { foreignKey: 'exemplar_id', as: 'reservas' });
    }
  };

  return Exemplar;
};
