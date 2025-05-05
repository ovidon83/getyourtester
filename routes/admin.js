const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');

// Apply authentication middleware to all admin routes
router.use(isAuthenticated);

// Admin dashboard
router.get('/dashboard', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    layout: false,
    activePage: 'dashboard'
  });
});

// Testers management
router.get('/testers', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Testers Management',
    layout: false,
    activePage: 'testers'
  });
});

// Pull Requests management
router.get('/prs', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Pull Requests Management',
    layout: false,
    activePage: 'prs'
  });
});

// Applications management
router.get('/applications', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Tester Applications',
    layout: false,
    activePage: 'applications'
  });
});

module.exports = router; 