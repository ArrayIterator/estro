'use strict';
const {
    Model,
    literal,
    DataTypes
} = require('sequelize');

/**
 * @param sequelize
 * @returns {admins}
 */
module.exports = (sequelize) => {
    class admins extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    admins
        .init(
            {
                id: {
                    field: 'id',
                    type: DataTypes.BIGINT,
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true
                },
                username: {
                    field: 'username',
                    type: DataTypes.STRING,
                    maxLength: 255,
                    allowNull: false,
                    uniqueKey: true
                },
                email: {
                    field: 'email',
                    type: DataTypes.STRING,
                    maxLength: 320,
                    allowNull: false,
                    uniqueKey: true
                },
                password: {
                    field: 'password',
                    type: DataTypes.STRING,
                    maxLength: 255,
                    allowNull: false
                },
                type: {
                    field: 'type',
                    type: DataTypes.STRING,
                    maxLength: 255,
                    allowNull: false
                },
                status: {
                    field: 'status',
                    type: DataTypes.STRING,
                    maxLength: 255,
                    allowNull: true
                },
                firstName: {
                    field: 'first_name',
                    type: DataTypes.STRING,
                    maxLength: 255,
                    allowNull: false
                },
                lastName: {
                    field: 'last_name',
                    type: DataTypes.STRING,
                    maxLength: 255,
                    allowNull: true
                },
                securityKey: {
                    field: 'security_key',
                    type: DataTypes.STRING,
                    maxLength: 255,
                    allowNull: false
                },
                createdAt: {
                    field: 'created_at',
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: literal('CURRENT_TIMESTAMP()'),
                },
                updatedAt: {
                    field: 'updated_at',
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: literal('CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()'),
                },
                deletedAt: {
                    field: 'deleted_at',
                    type: DataTypes.DATE,
                    allowNull: true,
                    default: null
                },
            },
            {
                sequelize,
                modelName: 'admins',
            }
        );

    return admins;
};
