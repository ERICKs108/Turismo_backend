const { requireAuth, requireRole } = require('../Config/auth');
module.exports = require('./resourceRoutes')(
  require('../Controllers/administradoresController'),
  { protectWrites: true, requireAuth, requireRole }
);
