const express = require('express');
const router = express.Router();

// Basic API endpoints
router.get('/status', (req, res) => {
  res.json({ status: 'ok', message: 'API is working' });
});

// Test endpoint to return some dummy data
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint',
    data: {
      name: 'GetYourTester API',
      version: '0.1.0',
      endpoints: ['/api/status', '/api/test']
    }
  });
});

module.exports = router; 