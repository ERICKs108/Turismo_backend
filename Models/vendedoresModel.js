const BaseModel = require('./baseModel');
const repository = require('../Repository/vendedoresRepository');

module.exports = new BaseModel(repository);
