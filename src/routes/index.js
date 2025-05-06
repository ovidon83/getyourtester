/**
 * Main public routes for GetYourTester
 */
const express = require('express');
const router = express.Router();

// Home/landing page route
router.get('/', (req, res) => {
  res.render('landing', { 
    title: 'GetYourTester - Expert Manual Testing for GitHub PRs' 
  });
});

// How it works page
router.get('/how-it-works', (req, res) => {
  res.render('how-it-works', { 
    title: 'How GetYourTester Works' 
  });
});

// Pricing page
router.get('/pricing', (req, res) => {
  res.render('pricing', { 
    title: 'GetYourTester Pricing' 
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('contact', { 
    title: 'Contact GetYourTester' 
  });
});

// Contact success page
router.post('/contact', (req, res) => {
  // In a real app, we would send an email here
  res.render('contact-success', { 
    title: 'Message Received' 
  });
});

// About page
router.get('/about', (req, res) => {
  res.render('about', { 
    title: 'About GetYourTester' 
  });
});

module.exports = router; 