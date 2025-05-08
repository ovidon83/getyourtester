/**
 * Main public routes for GetYourTester
 */
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Email configuration
let transporter;
try {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_FROM,
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_APP_PASSWORD
    }
  });
} catch (error) {
  console.error('Error initializing email transporter for contact form:', error.message);
}

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
    title: 'Contact GetYourTester',
    success: req.query.success
  });
});

// Contact form submission handling
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message, service, subscribe } = req.body;
    
    // Create email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@getyourtester.com',
      to: 'ovidon83@gmail.com',
      subject: `[GetYourTester Contact] ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Service Interest:</strong> ${service || 'Not specified'}</p>
        <p><strong>Newsletter:</strong> ${subscribe ? 'Yes' : 'No'}</p>
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
      text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}
Service Interest: ${service || 'Not specified'}
Newsletter: ${subscribe ? 'Yes' : 'No'}

Message:
${message}
      `
    };

    // If email service is available, send email
    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Contact form email sent from ${email}`);
    } else {
      console.log(`⚠️ Email service not available, would have sent email from ${email}`);
    }

    // Send success response
    res.render('contact-success', { 
      title: 'Message Received',
      name: name 
    });
  } catch (error) {
    console.error('Error sending contact form email:', error);
    res.status(500).render('error', { 
      title: 'Error', 
      message: 'There was a problem sending your message. Please try again later.' 
    });
  }
});

// About page
router.get('/about', (req, res) => {
  res.render('about', { 
    title: 'About GetYourTester' 
  });
});

module.exports = router; 