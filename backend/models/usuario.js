// usuario.js – Model Sequelize para a tabela 'usuarios' (contas de acesso e login)

module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define(
    'Usuario',
    {
      // Identificador único do usuário (chave primária auto-incrementada)
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Nome do usuário
      nome: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O nome do usuário é obrigatório.' },
        },
      },

      // Matrícula de acesso (opcional para bibliotecário, única quando informada)
      matricula: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: { msg: 'Esta matrícula de acesso já está cadastrada.' },
      },

      // E-mail utilizado para login (obrigatório, único e com validação de formato)
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: { msg: 'Este e-mail já está cadastrado.' },
        validate: {
          isEmail: { msg: 'Informe um endereço de e-mail válido.' },
        },
      },

      // Senha criptografada (armazenada como hash bcrypt, nunca em texto puro)
      senha: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      // Perfil de permissão no sistema ('bibliotecario' ou 'aluno')
      role: {
        type: DataTypes.ENUM('bibliotecario', 'aluno'),
        allowNull: false,
        defaultValue: 'aluno',
      },

      // Chave estrangeira que liga a conta de login ao registro do Estudante (opcional)
      estudante_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
      },
    },
    {
      tableName: 'usuarios',
    }
  );

  // Relacionamento: um Usuário pertence a um Estudante (quando for conta de aluno)
  Usuario.associate = (models) => {
    if (models.Estudante) {
      Usuario.belongsTo(models.Estudante, { foreignKey: 'estudante_id', as: 'estudante' });
    }
  };

  return Usuario;
};
