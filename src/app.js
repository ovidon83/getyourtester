/**
 * GetYourTester - A simplified MVP for requesting manual testing on PRs
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const fs = require('fs');

// Import routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const githubRoutes = require('./routes/github');
const docsRoutes = require('./routes/docs');
const statusRoutes = require('./routes/status');
const privacyRoutes = require('./routes/privacy');
const termsRoutes = require('./routes/terms');

// Initialize services
const emailService = require('./utils/emailService');
const webhookProxy = require('./utils/webhookProxy');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(morgan('dev'));
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
  res.locals.isAuthenticated = !!req.session.isAuthenticated;
  res.locals.user = req.session.user || null;
  res.locals.title = 'GetYourTester';
  next();
});

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure test requests file exists
const testRequestsPath = path.join(dataDir, 'test-requests.json');
if (!fs.existsSync(testRequestsPath)) {
  fs.writeFileSync(testRequestsPath, JSON.stringify([
    {
      "id": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      "owner": "example-org",
      "repo": "shopping-cart",
      "prNumber": 42,
      "prTitle": "Add mobile responsive checkout flow",
      "prUrl": "https://github.com/example-org/shopping-cart/pull/42",
      "requestedAt": "2023-10-15T14:30:00Z",
      "status": "Pending"
    },
    {
      "id": "2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q",
      "owner": "example-org",
      "repo": "user-authentication",
      "prNumber": 37,
      "prTitle": "Implement OAuth login with Google",
      "prUrl": "https://github.com/example-org/user-authentication/pull/37",
      "requestedAt": "2023-10-14T09:15:00Z",
      "status": "In Progress"
    },
    {
      "id": "3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r",
      "owner": "example-org",
      "repo": "payment-gateway",
      "prNumber": 28,
      "prTitle": "Add Apple Pay integration",
      "prUrl": "https://github.com/example-org/payment-gateway/pull/28",
      "requestedAt": "2023-10-10T11:45:00Z",
      "status": "Complete-PASS"
    },
    {
      "id": "4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s",
      "owner": "example-org",
      "repo": "product-catalog",
      "prNumber": 15,
      "prTitle": "Fix product filtering on category page",
      "prUrl": "https://github.com/example-org/product-catalog/pull/15",
      "requestedAt": "2023-10-05T13:20:00Z",
      "status": "Complete-FAIL"
    }
  ], null, 2));
}

// Mount routes
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);
app.use('/github', githubRoutes);
app.use('/docs', docsRoutes);
app.use('/status', statusRoutes);
app.use('/privacy', privacyRoutes);
app.use('/terms', termsRoutes);

// Success page route for post-payment onboarding
app.get('/success', (req, res) => {
  res.render('success', { 
    title: 'Welcome to GetYourTester! 🎉',
    plan: req.query.plan || 'Starter',
    customerEmail: req.query.email || ''
  });
});

// 404 handler
app.use((req, res) => {
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

// Initialize services
emailService.initialize();

// Start webhook proxy in development
if (process.env.NODE_ENV !== 'production' && process.env.WEBHOOK_PROXY_URL) {
  webhookProxy.initializeWebhookProxy();
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see the application`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  // Stop webhook proxy
  if (process.env.NODE_ENV !== 'production' && process.env.WEBHOOK_PROXY_URL) {
    webhookProxy.stopWebhookProxy();
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}); 