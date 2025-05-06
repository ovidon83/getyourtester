/**
 * GetYourTester Application - No GitHub API Integration Version
 * 
 * This entry point loads the application without requiring GitHub API credentials,
 * allowing testing of webhook handlers and email notifications.
 */

// Load dependencies
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const githubRoutes = require('./routes/github');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configure middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Make some basic variables available to templates
app.use((req, res, next) => {
  res.locals.isAuthenticated = false; // Default to not authenticated
  res.locals.user = null;
  res.locals.title = 'GetYourTester';
  next();
});

// Add routes
app.get('/', (req, res) => {
  res.render('landing', { pageTitle: 'Welcome to GetYourTester' });
});

// Set up GitHub webhook routes without requiring API integration
app.use('/github', githubRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ GetYourTester server running on http://localhost:${PORT}`);
  console.log(`📂 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚠️ GitHub integration is disabled in this instance`);
});

// Export app for testing
module.exports = app; 