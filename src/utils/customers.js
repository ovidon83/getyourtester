const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Simple customers file path
const customersFile = path.join(__dirname, '../../data/customers.json');

// Ensure data directory exists
const dataDir = path.dirname(customersFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize customers file if it doesn't exist
if (!fs.existsSync(customersFile)) {
  const initialData = {
    customers: [],
    lastUpdated: new Date().toISOString(),
    totalCustomers: 0,
    paidCustomers: 0,
    freeTrialCustomers: 0
  };
  fs.writeFileSync(customersFile, JSON.stringify(initialData, null, 2));
}

// Simple function to add customer
function addCustomer(customerData) {
  try {
    console.log(`📝 Adding customer: ${customerData.email} (${customerData.plan})`);
    
    // Read existing data
    const data = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
    
    // Generate ID
    const customerId = 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create customer
    const customer = {
      id: customerId,
      ...customerData,
      createdAt: new Date().toISOString(),
      status: 'paid', // Always paid since they reached success page
      lastActivity: new Date().toISOString()
    };
    
    // Add to array
    data.customers.push(customer);
    
    // Update stats
    data.totalCustomers = data.customers.length;
    data.paidCustomers = data.customers.filter(c => c.status === 'paid').length;
    data.freeTrialCustomers = data.customers.filter(c => c.status === 'free_trial').length;
    data.lastUpdated = new Date().toISOString();
    
    // Save to file
    fs.writeFileSync(customersFile, JSON.stringify(data, null, 2));
    console.log(`✅ Customer saved to: ${customersFile}`);
    
    // Send email notification
    sendCustomerEmail(customer);
    
    return customer;
  } catch (error) {
    console.error('❌ Error adding customer:', error);
    throw error;
  }
}

// Simple function to get all customers
function getAllCustomers() {
  try {
    const data = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
    return data.customers;
  } catch (error) {
    console.error('❌ Error reading customers:', error);
    return [];
  }
}

// Simple function to get customer stats
function getCustomerStats() {
  try {
    const data = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
    return {
      totalCustomers: data.totalCustomers,
      paidCustomers: data.paidCustomers,
      freeTrialCustomers: data.freeTrialCustomers,
      lastUpdated: data.lastUpdated
    };
  } catch (error) {
    console.error('❌ Error reading customer stats:', error);
    return {
      totalCustomers: 0,
      paidCustomers: 0,
      freeTrialCustomers: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Simple function to send email
function sendCustomerEmail(customer) {
  try {
    console.log(`📧 Sending email notification for: ${customer.email}`);
    
    // Check SMTP credentials
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.log('⚠️ SMTP credentials missing, skipping email');
      return;
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    // Send email
    transporter.sendMail({
      from: process.env.SMTP_USER,
      to: 'hello@firstqa.dev',
      subject: `🎉 New Customer: ${customer.email} - ${customer.plan}`,
      html: `
        <h2>🎉 New Customer Added!</h2>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Plan:</strong> ${customer.plan}</p>
        <p><strong>Status:</strong> ${customer.status}</p>
        <p><strong>Signup Date:</strong> ${new Date(customer.createdAt).toLocaleString()}</p>
        <hr>
        <p><em>Customer automatically added when they reached the success page.</em></p>
      `
    });
    
    console.log(`✅ Email sent to hello@firstqa.dev`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

module.exports = {
  addCustomer,
  getAllCustomers,
  getCustomerStats
};
