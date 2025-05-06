#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Setup view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.WEBHOOK_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Ensure test requests file exists
const testRequestsPath = path.join(__dirname, 'data/test-requests.json');
if (!fs.existsSync(testRequestsPath)) {
  fs.writeFileSync(testRequestsPath, JSON.stringify([]));
}

// Routes
app.get('/', (req, res) => {
  res.render('pages/index', { 
    title: 'GetYourTester - Expert Manual Testing for GitHub PRs' 
  });
});

app.get('/how-it-works', (req, res) => {
  res.render('pages/how-it-works', { 
    title: 'How GetYourTester Works' 
  });
});

app.get('/pricing', (req, res) => {
  res.render('pages/pricing', { 
    title: 'GetYourTester Pricing' 
  });
});

app.get('/install', (req, res) => {
  res.redirect(`https://github.com/apps/getyourtester/installations/new`);
});

app.get('/apply', (req, res) => {
  res.redirect('https://tally.so/r/w5OVda');
});

// Admin routes
app.get('/admin/login', (req, res) => {
  res.render('pages/admin/login', {
    title: 'Admin Login',
    error: req.flash('error')
  });
});

app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.isAuthenticated = true;
    res.redirect('/admin/dashboard');
  } else {
    req.flash('error', 'Invalid credentials');
    res.redirect('/admin/login');
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.isAuthenticated = false;
  res.redirect('/admin/login');
});

// Auth middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

// Test requests data helper
const getTestRequests = () => {
  try {
    const testRequestsPath = path.join(__dirname, 'data/test-requests.json');
    if (!fs.existsSync(testRequestsPath)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(testRequestsPath, 'utf8'));
  } catch (err) {
    console.error('Error reading test requests:', err);
    return [];
  }
};

app.get('/admin/dashboard', isAuthenticated, (req, res) => {
  const testRequests = getTestRequests();
  res.render('pages/admin/dashboard', {
    title: 'Admin Dashboard',
    testRequests: testRequests || []
  });
});

app.get('/admin/request/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const testRequests = getTestRequests();
  const testRequest = testRequests.find(request => request.id === id);
  
  if (!testRequest) {
    return res.status(404).render('pages/error', {
      title: 'Not Found',
      message: 'Test request not found',
      error: {}
    });
  }
  
  res.render('pages/admin/request-detail', {
    title: `Test Request ${id}`,
    testRequest
  });
});

// Error handler
app.use((req, res) => {
  res.status(404).render('pages/error', { 
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: {}
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', { 
    title: 'Error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see the application`);
}); 