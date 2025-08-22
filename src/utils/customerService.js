const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

class CustomerService {
  constructor() {
    // NUCLEAR OPTION: Multiple fallback strategies for data directory
    this.dataDir = this.findDataDirectory();
    this.customersFile = path.join(this.dataDir, 'customers.json');
    
    console.log(`🔧 CustomerService initialized with NUCLEAR approach:`);
    console.log(`   📁 Final data directory: ${this.dataDir}`);
    console.log(`   📄 Final customers file: ${this.customersFile}`);
    console.log(`   📁 Current working directory: ${process.cwd()}`);
    
    this.ensureDataDirectory();
    this.initializeCustomersFile();
  }

  findDataDirectory() {
    // Strategy 1: Try current directory
    let dataDir = path.join(process.cwd(), 'data');
    if (this.isWritable(dataDir)) {
      console.log(`✅ Strategy 1: Using current directory data: ${dataDir}`);
      return dataDir;
    }

    // Strategy 2: Try parent directory (if running from src/)
    if (process.cwd().includes('/src')) {
      dataDir = path.join(process.cwd(), '..', 'data');
      if (this.isWritable(dataDir)) {
        console.log(`✅ Strategy 2: Using parent directory data: ${dataDir}`);
        return dataDir;
      }
    }

    // Strategy 3: Try project root (look for package.json)
    let currentDir = process.cwd();
    for (let i = 0; i < 5; i++) { // Go up max 5 levels
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        dataDir = path.join(currentDir, 'data');
        if (this.isWritable(dataDir)) {
          console.log(`✅ Strategy 3: Using project root data: ${dataDir}`);
          return dataDir;
        }
      }
      currentDir = path.join(currentDir, '..');
    }

    // Strategy 4: Use absolute path in project root
    dataDir = '/opt/render/project/data';
    if (this.isWritable(dataDir)) {
      console.log(`✅ Strategy 4: Using absolute path: ${dataDir}`);
      return dataDir;
    }

    // Strategy 5: Create in current directory (last resort)
    dataDir = path.join(process.cwd(), 'data');
    console.log(`⚠️  All strategies failed, using current directory: ${dataDir}`);
    return dataDir;
  }

  isWritable(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const testFile = path.join(dirPath, '.test-write');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch (error) {
      console.log(`❌ Directory not writable: ${dirPath} - ${error.message}`);
      return false;
    }
  }

  ensureDataDirectory() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        console.log(`✅ Created data directory: ${this.dataDir}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create data directory: ${error.message}`);
      throw error;
    }
  }

  initializeCustomersFile() {
    try {
      if (!fs.existsSync(this.customersFile)) {
        const initialData = {
          customers: [],
          lastUpdated: new Date().toISOString(),
          totalCustomers: 0,
          paidCustomers: 0,
          freeTrialCustomers: 0
        };
        fs.writeFileSync(this.customersFile, JSON.stringify(initialData, null, 2));
        console.log(`✅ Created initial customers file: ${this.customersFile}`);
      } else {
        console.log(`✅ Customers file exists: ${this.customersFile}`);
      }
    } catch (error) {
      console.error(`❌ Failed to initialize customers file: ${error.message}`);
      throw error;
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
        console.log('⚠️ SMTP credentials missing, skipping email notification');
        console.log('⚠️ Set SMTP_USER and SMTP_PASSWORD environment variables');
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
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: 'ovi@qakarma.com',
        subject: `🎉 New Customer: ${customer.email} - ${customer.plan}`,
        html: `
          <h2>🎉 New Customer Added!</h2>
          <p><strong>Email:</strong> ${customer.email}</p>
          <p><strong>Plan:</strong> ${customer.plan}</p>
          <p><strong>Status:</strong> ${customer.status}</p>
          <p><strong>Source:</strong> ${customer.source || 'Unknown'}</p>
          <p><strong>Signup Date:</strong> ${new Date(customer.signupDate || customer.createdAt).toLocaleString()}</p>
          <p><strong>Payment Detected:</strong> ${customer.paymentDetected ? 'Yes' : 'No'}</p>
          <hr>
          <p><em>This notification was sent automatically when the customer reached the success page.</em></p>
        `
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Customer notification sent successfully: ${info.messageId}`);

    } catch (error) {
      console.error('❌ Error sending customer notification:', error);
      console.error('❌ SMTP Error details:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER ? 'Set' : 'Missing',
        error: error.message
      });
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

  async updateCustomer(email, updateData) {
    try {
      const data = JSON.parse(fs.readFileSync(this.customersFile, 'utf8'));
      const customerIndex = data.customers.findIndex(c => c.email === email);
      
      if (customerIndex !== -1) {
        data.customers[customerIndex] = { ...data.customers[customerIndex], ...updateData };
        data.lastUpdated = new Date().toISOString();
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
      return data.customers;
    } catch (error) {
      console.error('❌ Error getting all customers:', error);
      return [];
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
      return {
        totalCustomers: 0,
        paidCustomers: 0,
        freeTrialCustomers: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }
}

module.exports = new CustomerService();
