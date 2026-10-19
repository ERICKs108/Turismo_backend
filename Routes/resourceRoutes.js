const express = require('express');
const asyncHandler = require('../Config/asyncHandler');

function createResourceRoutes(controller, { protectWrites = false, requireAuth, requireRole } = {}) {
  const router = express.Router();
  const writeGuards = protectWrites ? [requireAuth, requireRole('admin')] : [];

  router.get('/', asyncHandler(controller.list));
  router.get('/:id', asyncHandler(controller.getById));
  router.post('/', ...writeGuards, asyncHandler(controller.create));
  router.put('/:id', ...writeGuards, asyncHandler(controller.update));
  router.delete('/:id', ...writeGuards, asyncHandler(controller.delete));
  return router;
}

module.exports = createResourceRoutes;
