const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('DEBUG - Environment Variables:');
console.log(`ENABLE_GITHUB: "${process.env.ENABLE_GITHUB}" (type: ${typeof process.env.ENABLE_GITHUB})`);
console.log(`GITHUB_APP_ID: "${process.env.GITHUB_APP_ID}" (type: ${typeof process.env.GITHUB_APP_ID})`);
console.log(`Has GITHUB_PRIVATE_KEY: ${process.env.GITHUB_PRIVATE_KEY ? 'yes' : 'no'}`);
console.log(`Has GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? 'yes' : 'no'}`);

// Import routes
const indexRoutes = require('./routes/index');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Initialize storage
const storage = require('./utils/storage');
storage.initialize().catch(err => {
  console.error('Failed to initialize storage:', err);
});

// Initialize express app
const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Make user available to templates
app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.session.user;
  res.locals.user = req.session.user || null;
  res.locals.title = 'GetYourTester';
  next();
});

// Mount routes
app.use('/', indexRoutes);
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// GitHub integration
// Only load GitHub routes if we're explicitly requiring it
// This is a workaround for development mode where Probot
// keeps crashing the app if credentials aren't set
const githubEnabled = process.env.ENABLE_GITHUB === 'true' || process.env.ENABLE_GITHUB === '1';
console.log(`DEBUG - GitHub integration enabled check: ${githubEnabled}`);
console.log(`DEBUG - ENABLE_GITHUB value: ${process.env.ENABLE_GITHUB} (type: ${typeof process.env.ENABLE_GITHUB})`);

if (githubEnabled) {
  try {
    console.log(`DEBUG - Loading GitHub routes...`);
    const githubRoutes = require('./routes/github');
    console.log(`DEBUG - GitHub routes loaded successfully.`);
    app.use('/github', githubRoutes);
    
    console.log('✅ GitHub integration is enabled');
  } catch (error) {
    console.error('❌ Failed to load GitHub integration:', error.message);
    
    // Add a placeholder route for GitHub if it failed to load
    app.use('/github', (req, res) => {
      res.json({
        status: 'error',
        message: 'GitHub integration failed to initialize',
        error: error.message
      });
    });
  }
} else {
  console.log('ℹ️ GitHub integration is disabled');
  console.log('ℹ️ Set ENABLE_GITHUB=true in .env to enable');
  
  // Add a placeholder route for GitHub
  app.use('/github', (req, res) => {
    res.json({
      status: 'disabled',
      message: 'GitHub integration is disabled in this instance',
      note: 'Set ENABLE_GITHUB=true in .env to enable'
    });
  });
}

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you requested was not found.',
    error: { status: 404 }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).render('error', {
    title: 'Error',
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app; 