const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

class CustomerService {
  constructor() {
    // Use production-accessible path instead of local home directory
    // Handle case where server runs from src/ directory
    const projectRoot = process.cwd().includes('/src') 
      ? path.join(process.cwd(), '..') 
      : process.cwd();
    
    this.dataDir = path.join(projectRoot, 'data');
    this.customersFile = path.join(this.dataDir, 'customers.json');
    
    console.log(`🔧 CustomerService initialized:`);
    console.log(`   📁 Project root: ${projectRoot}`);
    console.log(`   📁 Data directory: ${this.dataDir}`);
    console.log(`   📄 Customers file: ${this.customersFile}`);
    
    this.ensureDataDirectory();
    this.initializeCustomersFile();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  initializeCustomersFile() {
    if (!fs.existsSync(this.customersFile)) {
      const initialData = {
        customers: [],
        lastUpdated: new Date().toISOString(),
        totalCustomers: 0,
        paidCustomers: 0,
        freeTrialCustomers: 0
      };
      fs.writeFileSync(this.customersFile, JSON.stringify(initialData, null, 2));
    }
  }

  async addCustomer(customerData) {
    try {
      console.log(`📝 Adding new customer: ${customerData.email} (${customerData.plan})`);
      console.log(`📁 Data directory: ${this.dataDir}`);
      console.log(`📄 Customers file: ${this.customersFile}`);
      
      // Read existing customers
      const data = JSON.parse(fs.readFileSync(this.customersFile, 'utf8'));
      
      // Generate unique customer ID
      const customerId = this.generateCustomerId();
      
      // Create customer record
      const customer = {
        id: customerId,
        ...customerData,
        createdAt: new Date().toISOString(),
        status: customerData.plan === 'Free Trial' ? 'free_trial' : 'paid',
        lastActivity: new Date().toISOString()
      };

      // Add to customers array
      data.customers.push(customer);
      
      // Update statistics
      data.totalCustomers = data.customers.length;
      data.paidCustomers = data.customers.filter(c => c.status === 'paid').length;
      data.freeTrialCustomers = data.customers.filter(c => c.status === 'free_trial').length;
      data.lastUpdated = new Date().toISOString();

      // Save to file
      fs.writeFileSync(this.customersFile, JSON.stringify(data, null, 2));
      console.log(`✅ Customer data saved to: ${this.customersFile}`);

      // Send email notification
      await this.sendCustomerNotification(customer);

      console.log(`✅ New customer added: ${customer.email} (${customer.plan})`);
      return customer;

    } catch (error) {
      console.error('❌ Error adding customer:', error);
      console.error('❌ Error details:', {
        dataDir: this.dataDir,
        customersFile: this.customersFile,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  generateCustomerId() {
    return 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async sendCustomerNotification(customer) {
    try {
      console.log(`📧 Attempting to send customer notification for: ${customer.email}`);
      console.log(`📧 SMTP Config:`, {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        user: process.env.SMTP_USER ? '✅ Set' : '❌ Missing',
        pass: process.env.SMTP_PASSWORD ? '✅ Set' : '❌ Missing'
      });
      
      // Check if SMTP credentials are available
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('⚠️ SMTP credentials missing, skipping email notification');
        console.warn('⚠️ Set SMTP_USER and SMTP_PASSWORD environment variables');
        return;
      }

      // Create email transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      // Email content
      const subject = `🎉 New ${customer.plan} Customer: ${customer.email}`;
      const html = `
        <h2>🎉 New Customer Signup!</h2>
        
        <h3>Customer Details:</h3>
        <ul>
          <li><strong>Email:</strong> ${customer.email}</li>
          <li><strong>Plan:</strong> ${customer.plan}</li>
          <li><strong>Status:</strong> ${customer.status === 'paid' ? '💰 Paid' : '🆓 Free Trial'}</li>
          <li><strong>Signup Date:</strong> ${new Date(customer.createdAt).toLocaleDateString()}</li>
          <li><strong>Customer ID:</strong> ${customer.id}</li>
        </ul>

        ${customer.name ? `<p><strong>Name:</strong> ${customer.name}</p>` : ''}
        ${customer.company ? `<p><strong>Company:</strong> ${customer.company}</p>` : ''}
        ${customer.phone ? `<p><strong>Phone:</strong> ${customer.phone}</p>` : ''}

        <h3>Next Steps:</h3>
        <ul>
          <li>👋 Send welcome email</li>
          <li>📚 Share onboarding resources</li>
          <li>📅 Schedule demo call if needed</li>
          <li>🔍 Monitor GitHub App installation</li>
        </ul>

        <p><strong>Total Customers:</strong> ${customer.status === 'paid' ? 'Paid: ' + (customer.status === 'paid' ? 'Increased' : 'Same') : 'Free Trial: ' + (customer.status === 'free_trial' ? 'Increased' : 'Same')}</p>
        
        <hr>
        <p><em>This notification was sent automatically by GetYourTester customer tracking system.</em></p>
      `;

      // Send email
      await transporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@getyourtester.com',
        to: 'ovi@qakarma.com',
        subject: subject,
        html: html
      });

      console.log(`📧 Customer notification sent to ovi@qakarma.com for ${customer.email}`);

    } catch (error) {
      console.error('❌ Error sending customer notification:', error);
      console.error('❌ Email error details:', {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response
      });
      // Don't throw error - customer tracking should continue even if email fails
    }
  }

  async getCustomer(email) {
    try {
      const data = JSON.parse(fs.readFileSync(this.customersFile, 'utf8'));
      return data.customers.find(c => c.email === email);
    } catch (error) {
      console.error('❌ Error getting customer:', error);
      return null;
    }
  }

  async updateCustomer(email, updates) {
    try {
      const data = JSON.parse(fs.readFileSync(this.customersFile, 'utf8'));
      const customerIndex = data.customers.findIndex(c => c.email === email);
      
      if (customerIndex !== -1) {
        data.customers[customerIndex] = {
          ...data.customers[customerIndex],
          ...updates,
          lastActivity: new Date().toISOString()
        };
        
        fs.writeFileSync(this.customersFile, JSON.stringify(data, null, 2));
        console.log(`✅ Customer updated: ${email}`);
        return data.customers[customerIndex];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error updating customer:', error);
      return null;
    }
  }

  async getAllCustomers() {
    try {
      const data = JSON.parse(fs.readFileSync(this.customersFile, 'utf8'));
      return data;
    } catch (error) {
      console.error('❌ Error getting all customers:', error);
      return { customers: [], totalCustomers: 0, paidCustomers: 0, freeTrialCustomers: 0 };
    }
  }

  async getCustomerStats() {
    try {
      const data = JSON.parse(fs.readFileSync(this.customersFile, 'utf8'));
      return {
        totalCustomers: data.totalCustomers,
        paidCustomers: data.paidCustomers,
        freeTrialCustomers: data.freeTrialCustomers,
        lastUpdated: data.lastUpdated
      };
    } catch (error) {
      console.error('❌ Error getting customer stats:', error);
      return { totalCustomers: 0, paidCustomers: 0, freeTrialCustomers: 0, lastUpdated: null };
    }
  }
}

module.exports = new CustomerService();
