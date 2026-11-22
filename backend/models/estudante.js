// estudante.js – Model Sequelize para a tabela 'estudantes' (leitores da biblioteca)

module.exports = (sequelize, DataTypes) => {
  const Estudante = sequelize.define(
    'Estudante',
    {
      // Identificador único do estudante (chave primária auto-incrementada)
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Matrícula escolar (obrigatória e única)
      matricula: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: { msg: 'Esta matrícula já está cadastrada.' },
        validate: {
          notEmpty: { msg: 'A matrícula do estudante é obrigatória.' },
        },
      },

      // Nome completo do estudante (entre 2 e 150 caracteres)
      nome_completo: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O nome completo é obrigatório.' },
          len: { args: [2, 150], msg: 'Nome deve ter entre 2 e 150 caracteres.' },
        },
      },

      // Turma ou série do estudante
      turma: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'A turma é obrigatória.' },
        },
      },

      // Telefone de contato (opcional)
      telefone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },

      // Situação do estudante na biblioteca ('ativo', 'bloqueado', 'inativo')
      status: {
        type: DataTypes.ENUM('ativo', 'bloqueado', 'inativo'),
        allowNull: false,
        defaultValue: 'ativo',
      },
    },
    {
      tableName: 'estudantes',
    }
  );

  // Relacionamento com a conta de acesso (Usuario)
  Estudante.associate = (models) => {
    if (models.Usuario) {
      Estudante.hasOne(models.Usuario, { foreignKey: 'estudante_id', as: 'usuario' });
    }
  };

  return Estudante;
};
