const BaseModel = require('./baseModel');
const repository = require('../Repository/viajesRepository');

module.exports = new BaseModel(repository);
