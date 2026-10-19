const BaseModel = require('./baseModel');
const repository = require('../Repository/usuariosRepository');

module.exports = new BaseModel(repository);
