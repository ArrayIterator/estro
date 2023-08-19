'use strict';

const configuration = require('../src/configuration')();
const fs = require('fs');
const path = require('path');
const {Sequelize, DataTypes} = require('sequelize');
const basename = path.basename(__filename);
const env = configuration.application.environment;
const config = configuration.database[env];
const db = {
    /**
     * @type{{Model}}
     */
    models: {},
    get: function (name) {
        if (typeof name !== 'string') {
            return null;
        }
        return db.models[name.trim().toLowerCase()] || null;
    }
};
let sequelize;

sequelize = new Sequelize(config.database, config.username, config.password, config);
fs
    .readdirSync(__dirname)
    .filter(file => {
        return (
            file.indexOf('.') !== 0 &&
            file !== basename &&
            file.slice(-3) === '.js' &&
            file.indexOf('.test.js') === -1
        );
    })
    .forEach(file => {
        const model = require(path.join(__dirname, file))(sequelize, DataTypes);
        db.models[model.name.toLowerCase()] = model;
    });

Object.keys(db.models).forEach(modelName => {
    if (db.models[modelName]['associate']) {
        db.models[modelName]['associate'](db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
