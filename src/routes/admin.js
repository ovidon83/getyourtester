/**
 * Admin routes for GetYourTester
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const githubService = require('../utils/githubService');
const emailService = require('../utils/emailService');
const customerService = require('../utils/customerService');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

// Simple password protection middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required');
  }
  
  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
  const [username, password] = credentials.split(':');
  
  // Simple hardcoded credentials - in production use environment variables
  if (username === 'admin' && password === 'GetYourTester2025!') {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic');
    res.status(401).send('Invalid credentials');
  }
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

// Admin dashboard - requires authentication
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers();
    const stats = await customerService.getCustomerStats();
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard - GetYourTester',
      customers: customers.customers || [],
      stats: stats,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).render('error', {
      title: 'Admin Dashboard Error',
      message: 'Failed to load customer data',
      error: { status: 500 }
    });
  }
});

// Customer details view - requires authentication
router.get('/customers/:id', requireAuth, async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers();
    const customer = customers.customers.find(c => c.id === req.params.id);
    
    if (!customer) {
      return res.status(404).render('error', {
        title: 'Customer Not Found',
        message: 'The requested customer was not found',
        error: { status: 404 }
      });
    }
    
    res.render('admin/customer-details', {
      title: `Customer Details - ${customer.email}`,
      customer: customer,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Error loading customer details:', error);
    res.status(500).render('error', {
      title: 'Customer Details Error',
      message: 'Failed to load customer data',
      error: { status: 500 }
    });
  }
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

// API endpoint for customer data (JSON) - requires authentication
router.get('/api/customers', requireAuth, async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers();
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// API endpoint for customer statistics - requires authentication
router.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const stats = await customerService.getCustomerStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GitHub Authentication Status endpoint (protected)
router.get('/auth-status', isAuthenticated, async (req, res) => {
  try {
    const authStatus = await githubService.getAuthenticationStatus();
    res.json({
      success: true,
      ...authStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test repository access endpoint (protected)
router.post('/test-repo', isAuthenticated, async (req, res) => {
  try {
    const { repository } = req.body;
    if (!repository) {
      return res.status(400).json({
        success: false,
        error: 'Repository parameter is required (format: owner/repo)'
      });
    }

    const result = await githubService.testRepositoryAccess(repository);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Public endpoint for basic authentication status (for debugging)
router.get('/auth-status-public', async (req, res) => {
  try {
    const authStatus = await githubService.getAuthenticationStatus();
    // Return limited info for public access
    res.json({
      success: true,
      timestamp: authStatus.timestamp,
      simulatedMode: authStatus.simulatedMode,
      hasPatToken: authStatus.patToken,
      hasGitHubApp: authStatus.githubApp.appId && authStatus.githubApp.privateKey,
      authenticationMethods: authStatus.authenticationMethods.map(method => ({
        type: method.type,
        status: method.status
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 