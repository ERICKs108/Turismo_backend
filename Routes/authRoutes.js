const express = require('express');
const asyncHandler = require('../Config/asyncHandler');
const controller = require('../Controllers/authController');

const router = express.Router();
router.post('/login', asyncHandler(controller.login));

module.exports = router;
