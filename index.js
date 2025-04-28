const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'GetYourTester - Home',
    user: null
  });
});

// Documentation route
app.get('/docs', (req, res) => {
  res.render('docs', {
    title: 'Documentation - GetYourTester',
    user: null
  });
});

// Pricing route
app.get('/pricing', (req, res) => {
  res.render('pricing', {
    title: 'Pricing - GetYourTester',
    user: null
  });
});

// Apply as Tester route
app.get('/apply', (req, res) => {
  res.render('apply', {
    title: 'Apply as Tester - GetYourTester',
    user: null
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'GetYourTester API is running' });
});

// API routes
app.use('/api', require('./routes/api'));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 