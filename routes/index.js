const express = require('express');
const router = express.Router();

/* GET landing page */
router.get('/', (req, res) => {
  res.render('landing', { 
    title: 'Connect with Testers',
    layout: false // Disable layout for landing page 
  });
});

/* GET dashboard page (old home page) */
router.get('/dashboard', (req, res) => {
  res.render('index', { title: 'Dashboard' });
});

/* GET about page. */
router.get('/about', (req, res) => {
  res.render('about', { title: 'About Us' });
});

/* GET contact page. */
router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us' });
});

/* POST contact form. */
router.post('/contact', (req, res) => {
  // For now, just acknowledge the submission
  // In a real app, you would process the form data (send email, store in DB, etc.)
  const { name, email, subject, message } = req.body;
  
  // Add a success message to flash
  req.session.successMessage = 'Your message has been sent! We will get back to you soon.';
  
  // Redirect back to the contact page
  res.redirect('/contact-success');
});

/* GET contact success page */
router.get('/contact-success', (req, res) => {
  const successMessage = req.session.successMessage;
  // Clear the message after reading it
  req.session.successMessage = null;
  
  res.render('contact-success', {
    title: 'Message Sent',
    successMessage: successMessage || 'Your message has been sent.'
  });
});

module.exports = router; 