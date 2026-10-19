const { requireAuth, requireRole } = require('../Config/auth');
module.exports = require('./resourceRoutes')(
  require('../Controllers/usuariosController'),
  { protectWrites: true, requireAuth, requireRole }
);
