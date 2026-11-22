// tipoLivro.js – Model Sequelize para a tabela 'tipos_livro' (ex: Didático, Literatura, Periódico)

module.exports = (sequelize, DataTypes) => {
  const TipoLivro = sequelize.define(
    'TipoLivro',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      codigo: {
        type: DataTypes.STRING(20), // Código curto do tipo (ex: "DIDATICO", "LITERATURA")
        allowNull: false,
        unique: { msg: 'Já existe um tipo de livro com este código.' },
      },
      descricao: {
        type: DataTypes.STRING(100), // Descrição exibida do tipo (ex: "Livro Didático", "Literatura")
        allowNull: false,
      },
    },
    {
      tableName: 'tipos_livro',
    }
  );

  // Relacionamento: 1 TipoLivro pode estar associado a vários Livros (1:N)
  TipoLivro.associate = (models) => {
    if (models.Livro) {
      TipoLivro.hasMany(models.Livro, { foreignKey: 'tipo_livro_id', as: 'livros' });
    }
  };

  return TipoLivro;
};
