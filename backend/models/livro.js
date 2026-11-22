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
      tipo_livro_id: {
        type: DataTypes.INTEGER, // Chave estrangeira ligada à tabela 'tipos_livro'
        allowNull: true,
      },
      categoria: {
        type: DataTypes.STRING(100), // Ex: "Romance", "História"
        allowNull: true,
      },
      categoria_id: {
        type: DataTypes.INTEGER, // Chave estrangeira ligada à tabela 'categorias'
        allowNull: true,
      },
    },
    {
      tableName: 'livros', // Nome real da tabela no PostgreSQL
    }
  );

  // Relacionamentos: 1 Livro pertence a 1 TipoLivro, 1 Categoria e possui vários Exemplares físicos (1:N)
  Livro.associate = (models) => {
    if (models.TipoLivro) {
      Livro.belongsTo(models.TipoLivro, { foreignKey: 'tipo_livro_id', as: 'tipoLivro' });
    }
    if (models.Categoria) {
      Livro.belongsTo(models.Categoria, { foreignKey: 'categoria_id', as: 'categoriaRel' });
    }
    if (models.Exemplar) {
      Livro.hasMany(models.Exemplar, { foreignKey: 'livro_id', as: 'exemplares' });
    }
    if (models.Reserva) {
      Livro.hasMany(models.Reserva, { foreignKey: 'livro_id', as: 'reservas' });
    }
  };

  return Livro;
};
