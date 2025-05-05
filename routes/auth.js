const express = require('express');
const router = express.Router();

// Admin credentials - hardcoded as specified
const ADMIN_EMAIL = 'ovidon83@gmail.com';
const ADMIN_PASSWORD = 'Ovi1983.';

// Login route - GET
router.get('/login', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session.isAuthenticated) {
    return res.redirect('/admin/dashboard');
  }
  
  res.render('admin/login', { 
    title: 'Admin Login',
    error: req.session.error
  });
  
  // Clear any error messages
  req.session.error = null;
});

// Login route - POST
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // Validate credentials
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // Set session variables
    req.session.isAuthenticated = true;
    req.session.user = { email };
    
    // Redirect to admin dashboard
    return res.redirect('/admin/dashboard');
  }
  
  // Invalid credentials
  req.session.error = 'Invalid email or password';
  res.redirect('/auth/login');
});

// Logout route
router.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/auth/login');
  });
});

// Export the router
module.exports = router;

// Export middleware for protecting routes
module.exports.isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  
  // Store the original URL they were trying to access
  req.session.returnTo = req.originalUrl;
  req.session.error = 'Please log in to access this page';
  res.redirect('/auth/login');
}; 