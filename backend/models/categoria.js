// categoria.js – Model Sequelize para a tabela 'categorias' (gênero literário: Romance, Ficção, etc.)

module.exports = (sequelize, DataTypes) => {
  const Categoria = sequelize.define(
    'Categoria',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      codigo: {
        type: DataTypes.STRING(20), // Código curto da categoria (ex: "ROMANCE", "FICCAO")
        allowNull: false,
        unique: { msg: 'Já existe uma categoria com este código.' },
      },
      nome: {
        type: DataTypes.STRING(100), // Nome exibido da categoria (ex: "Romance", "Ficção Científica")
        allowNull: false,
      },
    },
    {
      tableName: 'categorias',
    }
  );

  // Relacionamento: 1 Categoria pode estar associada a vários Livros (1:N)
  Categoria.associate = (models) => {
    if (models.Livro) {
      Categoria.hasMany(models.Livro, { foreignKey: 'categoria_id', as: 'livros' });
    }
  };

  return Categoria;
};
