/**
 * GitHub webhook routes for FirstQA
 * Handles incoming GitHub events
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const githubService = require('../utils/githubService');

// Middleware to verify GitHub webhook signatures
const verifyGitHubWebhook = (req, res, next) => {
  // Skip verification in development mode if explicitly disabled
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify the signature
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const payload = JSON.stringify(req.body);
  const computedSignature = `sha256=${hmac.update(payload).digest('hex')}`;

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
    return next();
  } else {
    console.error('Invalid signature');
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// GitHub webhook handler
router.post('/webhook', express.json({ limit: '10mb' }), verifyGitHubWebhook, async (req, res) => {
  try {
    const eventType = req.headers['x-github-event'];
    console.log(`Received ${eventType} webhook`);

    // Create an event object with headers and body that matches processWebhookEvent expectations
    const event = {
      headers: req.headers,
      body: req.body
    };

    // Process the event asynchronously
    // We don't await here to respond to GitHub quickly
    githubService.processWebhookEvent(event).catch(err => {
      console.error('Error processing webhook event:', err);
    });

    // Return success to GitHub
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router; 