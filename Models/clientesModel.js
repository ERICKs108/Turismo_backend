const BaseModel = require('./baseModel');
const repository = require('../Repository/clientesRepository');

module.exports = new BaseModel(repository);
