const express = require('express');
const router = express.Router();
const customerService = require('../utils/customerService');

// POST /api/customers - Add new customer
router.post('/', async (req, res) => {
  try {
    const { name, email, company, phone, useCase, teamSize, plan, source } = req.body;
    
    // Validate required fields
    if (!email || !plan) {
      return res.status(400).json({
        success: false,
        error: 'Email and plan are required'
      });
    }

    // Check if customer already exists
    const existingCustomer = await customerService.getCustomer(email);
    if (existingCustomer) {
      // Update existing customer with new information
      const updatedCustomer = await customerService.updateCustomer(email, {
        name: name || existingCustomer.name,
        company: company || existingCustomer.company,
        phone: phone || existingCustomer.phone,
        useCase: useCase || existingCustomer.useCase,
        teamSize: teamSize || existingCustomer.teamSize,
        plan: plan,
        source: source,
        lastActivity: new Date().toISOString()
      });
      
      return res.json({
        success: true,
        message: 'Customer information updated',
        customer: updatedCustomer
      });
    }

    // Add new customer
    const customer = await customerService.addCustomer({
      name,
      email,
      company,
      phone,
      useCase,
      teamSize,
      plan,
      source
    });

    res.json({
      success: true,
      message: 'Customer added successfully',
      customer
    });

  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add customer'
    });
  }
});

// GET /api/customers - Get all customers (admin only)
router.get('/', async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers();
    res.json(customers);
  } catch (error) {
    console.error('Error getting customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customers'
    });
  }
});

// GET /api/customers/stats - Get customer statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await customerService.getCustomerStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting customer stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer stats'
    });
  }
});

// GET /api/customers/:email - Get specific customer
router.get('/:email', async (req, res) => {
  try {
    const customer = await customerService.getCustomer(req.params.email);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    res.json(customer);
  } catch (error) {
    console.error('Error getting customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer'
    });
  }
});

module.exports = router;
