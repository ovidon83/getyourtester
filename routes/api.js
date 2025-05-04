const express = require('express');
const router = express.Router();

/* GET API status */
router.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    version: '1.0.0'
  });
});

/* Sample API endpoints (placeholders) */
router.get('/testers', (req, res) => {
  // In the future, this would fetch from a database
  res.json({
    testers: [
      { id: 1, name: 'John Doe', skills: ['Web', 'Mobile'] },
      { id: 2, name: 'Jane Smith', skills: ['Desktop', 'Security'] },
      { id: 3, name: 'Bob Johnson', skills: ['API', 'Web'] }
    ]
  });
});

router.get('/products', (req, res) => {
  // In the future, this would fetch from a database
  res.json({
    products: [
      { id: 1, name: 'Web App', type: 'Web Application' },
      { id: 2, name: 'Mobile Game', type: 'Mobile Application' },
      { id: 3, name: 'API Service', type: 'API' }
    ]
  });
});

module.exports = router; 