const BaseModel = require('./baseModel');
const repository = require('../Repository/reservasRepository');

module.exports = new BaseModel(repository);
