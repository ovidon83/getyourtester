/**
 * Admin routes for GetYourTester
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const githubService = require('../utils/githubService');
const emailService = require('../utils/emailService');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

// Helper function to get test requests
const getTestRequests = () => {
  try {
    const testRequestsPath = path.join(__dirname, '../data/test-requests.json');
    if (!fs.existsSync(testRequestsPath)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(testRequestsPath, 'utf8'));
  } catch (err) {
    console.error('Error reading test requests:', err);
    return [];
  }
};

// Helper function to update a test request
const updateTestRequest = (requestId, updates) => {
  try {
    const testRequestsPath = path.join(__dirname, '../data/test-requests.json');
    if (!fs.existsSync(testRequestsPath)) {
      return false;
    }
    
    const testRequests = JSON.parse(fs.readFileSync(testRequestsPath, 'utf8'));
    const requestIndex = testRequests.findIndex(req => req.id === requestId);
    
    if (requestIndex === -1) {
      return false;
    }
    
    // Update the request
    testRequests[requestIndex] = {
      ...testRequests[requestIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Save the updated requests
    fs.writeFileSync(testRequestsPath, JSON.stringify(testRequests, null, 2));
    
    return testRequests[requestIndex];
  } catch (err) {
    console.error('Error updating test request:', err);
    return false;
  }
};

// Admin login page
router.get('/login', (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login',
    error: req.query.error ? 'Invalid credentials' : null
  });
});

// Admin login handling
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password';
  
  if (email === adminEmail && password === adminPassword) {
    req.session.isAuthenticated = true;
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login?error=1');
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  req.session.isAuthenticated = false;
  res.redirect('/admin/login');
});

// Admin dashboard
router.get('/dashboard', isAuthenticated, (req, res) => {
  const testRequests = getTestRequests();
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    testRequests
  });
});

// Test request details
router.get('/request/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const testRequests = getTestRequests();
  const testRequest = testRequests.find(request => request.id === id);
  
  if (!testRequest) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'Test request not found',
      error: { status: 404 }
    });
  }
  
  res.render('admin/test-request-details', {
    title: `Test Request #${testRequest.prNumber}`,
    testRequest
  });
});

// Update test request status
router.post('/request/:id/update', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { status, report } = req.body;
  
  try {
    const testRequests = getTestRequests();
    const testRequest = testRequests.find(request => request.id === id);
    
    if (!testRequest) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Test request not found',
        error: { status: 404 }
      });
    }
    
    // Update request in storage
    const updatedRequest = updateTestRequest(id, { 
      status, 
      report: report || testRequest.report
    });
    
    if (!updatedRequest) {
      throw new Error('Failed to update test request');
    }
    
    // Update PR status label on GitHub
    if (status && status !== testRequest.status) {
      await githubService.updatePrLabel(
        testRequest.owner,
        testRequest.repo,
        testRequest.prNumber,
        status
      );
    }
    
    // Post report to GitHub if provided
    if (report && (!testRequest.report || report !== testRequest.report)) {
      await githubService.postTestReport(
        testRequest.owner,
        testRequest.repo,
        testRequest.prNumber,
        report
      );
    }
    
    // Send email notification about update
    await emailService.sendTestUpdateEmail(updatedRequest);
    
    res.redirect(`/admin/request/${id}`);
  } catch (err) {
    console.error('Error updating test request:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to update test request',
      error: { status: 500, details: err.message }
    });
  }
});

module.exports = router; 