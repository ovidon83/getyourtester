const express = require('express');
const router = express.Router();

// Import API route modules
const apiIndexRouter = require('./api/index');

// Use route modules
router.use('/', apiIndexRouter);

module.exports = router; 