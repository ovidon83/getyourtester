const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Email configuration
let emailTransporter;
try {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_FROM || 'ovidon83@gmail.com',
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_APP_PASSWORD
    }
  });
  console.log('✅ Email transporter initialized for mass email feature');
} catch (error) {
  console.error('⚠️ Error initializing email transporter for mass email feature:', error.message);
}

// GET /email - Render email form
router.get('/', (req, res) => {
  res.render('email-form', { 
    title: 'Send Mass Email',
    success: req.query.success,
    error: req.query.error
  });
});

// POST /email - Send email
router.post('/', async (req, res) => {
  const { recipients, subject, message } = req.body;
  
  if (!recipients || !subject || !message) {
    return res.redirect('/email?error=All fields are required');
  }
  
  try {
    // Split recipients by commas, semicolons, or newlines and trim whitespace
    const recipientList = recipients
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    if (recipientList.length === 0) {
      return res.redirect('/email?error=No valid recipients found');
    }
    
    // Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipientList.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      return res.redirect(`/email?error=Invalid email formats: ${invalidEmails.join(', ')}`);
    }

    // Convert plain text to HTML with proper line breaks
    const htmlContent = message
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '')
      .replace(/<br><br>/g, '</p><p>')
      .replace(/^(.+)(?!<br>)/, '<p>$1</p>')
      .replace(/<br>$/, '');
    
    // Send email
    const mailOptions = {
      from: 'ovidon83@gmail.com',
      to: recipientList.join(','),
      subject: subject,
      replyTo: 'ovidon83@gmail.com',
      html: htmlContent,
      text: message // Keep original plain text version
    };
    
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Mass email sent with message ID: ${info.messageId}`);
    
    res.redirect('/email?success=Email sent successfully to ' + recipientList.length + ' recipients');
  } catch (error) {
    console.error('Failed to send mass email:', error);
    res.redirect(`/email?error=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router; 