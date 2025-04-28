const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin, isTester, isDeveloper } = require('../middleware/auth');

// Main dashboard route
router.get('/', isAuthenticated, (req, res) => {
  // Dummy data for demo purposes
  const dummyRequests = [
    {
      id: '12345678-1234-1234-1234-123456789012',
      title: 'Web App Testing',
      status: 'pending',
      testerName: null,
      updatedAt: new Date().toISOString()
    },
    {
      id: '87654321-4321-4321-4321-210987654321',
      title: 'Mobile App Testing',
      status: 'in_progress',
      testerName: 'Jane Smith',
      updatedAt: new Date().toISOString()
    },
    {
      id: '11111111-2222-3333-4444-555555555555',
      title: 'API Testing',
      status: 'completed',
      testerName: 'John Doe',
      updatedAt: new Date().toISOString()
    }
  ];
  
  const pendingRequests = dummyRequests.filter(r => r.status === 'pending');
  const inProgressRequests = dummyRequests.filter(r => r.status === 'in_progress');
  const completedRequests = dummyRequests.filter(r => ['completed', 'pass', 'fail'].includes(r.status));
  
  res.render('dashboard', {
    title: 'Dashboard - GetYourTester',
    user: req.user,
    requests: dummyRequests,
    pendingRequests,
    inProgressRequests,
    completedRequests
  });
});

// Admin dashboard
router.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  res.render('dashboard/admin', {
    title: 'Admin Dashboard - GetYourTester',
    user: req.user
  });
});

// Tester dashboard
router.get('/tester', isAuthenticated, isTester, (req, res) => {
  res.render('dashboard/tester', {
    title: 'Tester Dashboard - GetYourTester',
    user: req.user
  });
});

// Developer dashboard
router.get('/developer', isAuthenticated, isDeveloper, (req, res) => {
  res.render('dashboard/developer', {
    title: 'Developer Dashboard - GetYourTester',
    user: req.user
  });
});

// Admin applications
router.get('/admin/applications', isAdmin, (req, res) => {
  res.render('dashboard/admin/applications', { 
    user: req.user, 
    title: 'Tester Applications',
    error: req.query.error || null,
    success: req.query.success || null
  });
});

// Add route for the requests page
router.get('/requests', isAuthenticated, (req, res) => {
  res.render('dashboard/requests', { 
    user: req.user, 
    title: 'Test Requests',
    error: req.query.error || null,
    success: req.query.success || null
  });
});

module.exports = router; 