const { requireAuth, requireRole } = require('../Config/auth');
module.exports = require('./resourceRoutes')(
  require('../Controllers/clientesController'),
  { requireAuth, requireRole }
);
