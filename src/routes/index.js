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

// Request services page
router.get('/request', (req, res) => {
  res.render('request', {
    title: 'Request Services - GetYourTester',
    success: req.query.success
  });
});

// Request services form submission handling
router.post('/request', async (req, res) => {
  try {
    // Extract all form fields
    const formData = req.body;
    
    // Create email content with dynamic form fields
    let emailContent = `<h2>New Service Request Submission</h2>`;
    
    // Contact information
    emailContent += `<h3>Contact Information</h3>`;
    emailContent += `<p><strong>Name:</strong> ${formData.name || 'Not provided'}</p>`;
    emailContent += `<p><strong>Company:</strong> ${formData.company || 'Not provided'}</p>`;
    emailContent += `<p><strong>Email:</strong> ${formData.email || 'Not provided'}</p>`;
    emailContent += `<p><strong>Phone:</strong> ${formData.phone || 'Not provided'}</p>`;
    
    // Services requested
    const services = Array.isArray(formData.services) ? formData.services : [formData.services];
    emailContent += `<h3>Requested Services</h3>`;
    emailContent += `<ul>`;
    services.forEach(service => {
      emailContent += `<li>${service}</li>`;
    });
    emailContent += `</ul>`;
    
    // Service specific details
    if (services.includes('PR Testing')) {
      emailContent += `<h3>PR Testing Details</h3>`;
      emailContent += `<p><strong>GitHub Repository URL:</strong> ${formData.github_repo || 'Not provided'}</p>`;
      emailContent += `<p><strong>Estimated PRs per Month:</strong> ${formData.pr_count || 'Not provided'}</p>`;
      emailContent += `<p><strong>Testing Needs:</strong> ${formData.pr_testing_needs || 'Not provided'}</p>`;
    }
    
    if (services.includes('QA Strategy')) {
      emailContent += `<h3>QA Strategy Details</h3>`;
      emailContent += `<p><strong>Current QA Process:</strong> ${formData.current_process || 'Not provided'}</p>`;
      emailContent += `<p><strong>Strategy Goals:</strong> ${formData.strategy_goals || 'Not provided'}</p>`;
      emailContent += `<p><strong>Team Size:</strong> ${formData.team_size || 'Not provided'}</p>`;
      emailContent += `<p><strong>Product Stage:</strong> ${formData.product_stage || 'Not provided'}</p>`;
    }
    
    if (services.includes('Test Automation')) {
      emailContent += `<h3>Test Automation Details</h3>`;
      emailContent += `<p><strong>Tech Stack:</strong> ${formData.tech_stack || 'Not provided'}</p>`;
      emailContent += `<p><strong>Automation Needs:</strong> ${formData.automation_needs || 'Not provided'}</p>`;
      emailContent += `<p><strong>Existing Automation:</strong> ${formData.existing_automation || 'Not provided'}</p>`;
    }
    
    if (services.includes('Manual QA')) {
      emailContent += `<h3>Manual Testing Details</h3>`;
      const testingTypes = Array.isArray(formData.testing_types) ? formData.testing_types : [formData.testing_types];
      emailContent += `<p><strong>Testing Types:</strong> ${testingTypes.join(', ') || 'Not provided'}</p>`;
      emailContent += `<p><strong>Testing Frequency:</strong> ${formData.testing_frequency || 'Not provided'}</p>`;
      emailContent += `<p><strong>Testing Details:</strong> ${formData.testing_details || 'Not provided'}</p>`;
    }
    
    if (services.includes('QA Team Building')) {
      emailContent += `<h3>QA Team Building Details</h3>`;
      emailContent += `<p><strong>Team Goals:</strong> ${formData.team_goals || 'Not provided'}</p>`;
      emailContent += `<p><strong>Hiring Timeline:</strong> ${formData.hiring_timeline || 'Not provided'}</p>`;
      emailContent += `<p><strong>Team Structure:</strong> ${formData.team_structure || 'Not provided'}</p>`;
    }
    
    // Additional information
    emailContent += `<h3>Additional Information</h3>`;
    emailContent += `<p><strong>Project Details:</strong> ${formData.message || 'Not provided'}</p>`;
    emailContent += `<p><strong>Budget Range:</strong> ${formData.budget || 'Not provided'}</p>`;
    emailContent += `<p><strong>Timeline:</strong> ${formData.timeline || 'Not provided'}</p>`;
    emailContent += `<p><strong>Referral Source:</strong> ${formData.referral || 'Not provided'}</p>`;
    
    // Create plain text version
    const textContent = emailContent.replace(/<[^>]*>/g, '');
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@getyourtester.com',
      to: 'ovidon83@gmail.com',
      subject: `[GetYourTester Service Request] from ${formData.name}`,
      html: emailContent,
      text: textContent
    };

    // If email service is available, send email
    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Service request email sent from ${formData.email}`);
    } else {
      console.log(`⚠️ Email service not available, would have sent service request from ${formData.email}`);
    }

    // Redirect with success parameter
    res.redirect('/request?success=true');
  } catch (error) {
    console.error('Error sending service request email:', error);
    res.status(500).render('error', { 
      title: 'Error', 
      message: 'There was a problem submitting your request. Please try again later.' 
    });
  }
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