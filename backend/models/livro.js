// livro.js – Model Sequelize para a tabela 'livros' (catálogo de livros da biblioteca)

module.exports = (sequelize, DataTypes) => {
  const Livro = sequelize.define(
    'Livro',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, // Chave primária gerada automaticamente pelo banco
      },
      codigo_livro: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: { msg: 'Já existe um livro cadastrado com este código.' }, // Impede códigos repetidos
      },
      titulo: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      autor: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      editora: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      ano_publicacao: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      tipo: {
        type: DataTypes.STRING(100), // Ex: "Literatura", "Didático"
        allowNull: true,
      },
      categoria: {
        type: DataTypes.STRING(100), // Ex: "Romance", "História"
        allowNull: true,
      },
    },
    {
      tableName: 'livros', // Nome real da tabela no PostgreSQL
    }
  );

  // Relacionamentos: 1 Livro possui vários Exemplares físicos na estante (1:N)
  Livro.associate = (models) => {
    if (models.Exemplar) {
      Livro.hasMany(models.Exemplar, { foreignKey: 'livro_id', as: 'exemplares' });
    }
    if (models.Reserva) {
      Livro.hasMany(models.Reserva, { foreignKey: 'livro_id', as: 'reservas' });
    }
  };

  return Livro;
};
