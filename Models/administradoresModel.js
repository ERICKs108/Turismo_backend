const BaseModel = require('./baseModel');
const repository = require('../Repository/administradoresRepository');

module.exports = new BaseModel(repository);
