#!/usr/bin/env node

/**
 * GetYourTester Webhook Server
 * Handles GitHub webhook events for test requests
 */
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const githubService = require('./src/utils/githubService');
const indexRoutes = require('./src/routes/index');
const docsRoutes = require('./src/routes/docs');
const statusRoutes = require('./src/routes/status');
const privacyRoutes = require('./src/routes/privacy');
const termsRoutes = require('./src/routes/terms');
const supportRoutes = require('./src/routes/support');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Middleware
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    // Store the raw request body for webhook verification
    req.rawBody = buf.toString();
  }
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));

// Add error handling middleware
app.use((err, req, res, next) => {
  if (err) {
    console.error('Error parsing JSON payload:', err);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next();
});

// Use the index routes
app.use('/', indexRoutes);
app.use('/docs', docsRoutes);
app.use('/status', statusRoutes);
app.use('/privacy', privacyRoutes);
app.use('/terms', termsRoutes);
app.use('/support', supportRoutes);

// Add dashboard page to view test requests
app.get('/dashboard', (req, res) => {
  const testRequests = githubService.loadAllTestRequests();
  res.render('admin/dashboard', { 
    title: 'Test Requests Dashboard',
    testRequests
  });
});

// Request details page
app.get('/request/:id', (req, res) => {
  const requestId = req.params.id;
  const testRequests = githubService.loadTestRequests();
  const testRequest = testRequests.find(r => r.id === requestId);

  if (!testRequest) {
    return res.status(404).render('error', { 
      title: 'Not Found',
      message: 'Test request not found' 
    });
  }

  // Parse test request comment to extract details
  if (!testRequest.parsedDetails && testRequest.comment) {
    testRequest.parsedDetails = githubService.parseTestRequestComment(testRequest.comment);
    // Save the parsed details
    githubService.saveTestRequests(testRequests);
  }

  res.render('admin/test-request-details', { 
    title: `Test Request #${requestId}`,
    testRequest
  });
});

// Update status
app.post('/request/:id/status', async (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body;
  
  try {
    await githubService.updateTestRequestStatus(requestId, status);
    res.redirect(`/request/${requestId}`);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// Post comment to PR
app.post('/request/:id/comment', async (req, res) => {
  const requestId = req.params.id;
  const { comment, updateStatus, commentStatus } = req.body;
  
  try {
    await githubService.postCommentToPR(requestId, comment, updateStatus === 'on' ? commentStatus : null);
    res.redirect(`/request/${requestId}`);
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to post comment',
      error: error.message
    });
  }
});

// Submit test report
app.post('/request/:id/report', async (req, res) => {
  const requestId = req.params.id;
  const { reportContent, testResult } = req.body;
  
  try {
    // Submit the test report and update the test request status
    await githubService.submitTestReport(requestId, reportContent, testResult);
    
    // Explicitly update the UI status to match the test result status
    const testRequests = githubService.loadTestRequests();
    const testRequest = testRequests.find(r => r.id === requestId);
    
    if (testRequest) {
      // Make sure the test request status is properly set
      testRequest.status = testResult;
      githubService.saveTestRequests(testRequests);
    }
    
    res.redirect(`/request/${requestId}`);
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to submit report',
      error: error.message
    });
  }
});

// GitHub webhook endpoint
app.post('/github/webhook', async (req, res) => {
  console.log('🎯 Webhook received!');
  
  const eventType = req.headers['x-github-event'] || 'unknown';
  console.log(`Event type: ${eventType}`);
  
  // Create an event object with headers and body
  const event = {
    headers: req.headers,
    body: req.body
  };

  // Send immediate response to GitHub
  res.status(200).json({ status: 'ok', message: 'Webhook received successfully' });

  // Process the event asynchronously
  try {
    const result = await githubService.processWebhookEvent(event);
    console.log('Webhook processed successfully:', result);
  } catch (err) {
    console.error('Error processing webhook:', err);
  }
});

// Health check endpoint
app.get('/github/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/github/health`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/github/webhook`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
}); 