const createResourceController = require('./resourceController');
module.exports = createResourceController(require('../Models/reservasModel'));
