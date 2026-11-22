// livro.js – Model Sequelize para a tabela 'livros' (catálogo de livros do acervo)

module.exports = (sequelize, DataTypes) => {
  const Livro = sequelize.define(
    'Livro',
    {
      // Identificador único do livro (chave primária auto-incrementada)
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Código único do livro no acervo (ex: LIV-001)
      codigo_livro: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: { msg: 'Já existe um livro cadastrado com este código.' },
      },

      // Título do livro
      titulo: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O título do livro é obrigatório.' },
        },
      },

      // Nome do autor do livro
      autor: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O autor do livro é obrigatório.' },
        },
      },

      // Editora do livro (opcional)
      editora: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },

      // Ano de publicação (opcional)
      ano_publicacao: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Tipo do livro por texto ou ID (ex: "Livro Didático", "Literatura")
      tipo: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      // Categoria ou gênero do livro (ex: "Romance", "História")
      categoria: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      // Chaves estrangeiras opcionais caso use tabelas auxiliares de tipo e categoria
      tipo_livro_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      categoria_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'livros',
    }
  );

  // Relacionamentos do Livro com as demais tabelas (só associa se o model já existir)
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
