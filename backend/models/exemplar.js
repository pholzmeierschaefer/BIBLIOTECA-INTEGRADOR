// exemplar.js – Model Sequelize para a tabela 'exemplares' (cada cópia física de um livro)

module.exports = (sequelize, DataTypes) => {
  const Exemplar = sequelize.define(
    'Exemplar',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      codigo_exemplar: {
        type: DataTypes.STRING(50), // Código de tombo único colado na etiqueta do livro físico
        allowNull: true,
        unique: { msg: 'Este código de exemplar (tombo) já está cadastrado.' },
      },
      livro_id: {
        type: DataTypes.INTEGER, // ID do Livro ao qual este exemplar físico pertence
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          'disponivel',
          'emprestado',
          'reservado',
          'inativo',
          'inativo_extraviado'
        ),
        allowNull: false,
        defaultValue: 'disponivel', // Todo novo exemplar entra como disponível por padrão
      },
    },
    {
      tableName: 'exemplares',
    }
  );

  // Relacionamento: cada Exemplar físico pertence a 1 Livro do catálogo
  Exemplar.associate = (models) => {
    if (models.Livro) {
      Exemplar.belongsTo(models.Livro, { foreignKey: 'livro_id', as: 'livro' });
    }
    if (models.Emprestimo) {
      Exemplar.hasMany(models.Emprestimo, { foreignKey: 'exemplar_id', as: 'emprestimos' });
    }
  };

  return Exemplar;
};
