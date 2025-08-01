#!/usr/bin/env node

/**
 * Test script for Ovi QA Agent functionality
 * Tests the enhanced AI analysis with comprehensive PR review
 */

require('dotenv').config();
const axios = require('axios');

// Test data for a sample PR
const testPRData = {
  repo: 'test-org/test-repo',
  pr_number: 123,
  title: 'Add user authentication with JWT tokens',
  body: `
## Description
This PR implements user authentication using JWT tokens.

### Changes
- Added JWT token generation and validation
- Implemented login/logout endpoints
- Added middleware for protected routes
- Updated user model with authentication fields

### Testing
- Unit tests for JWT functions
- Integration tests for auth endpoints
- Manual testing of login flow

### Related Issues
Closes #456
  `,
  diff: `
diff --git a/src/auth/jwt.js b/src/auth/jwt.js
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/src/auth/jwt.js
@@ -0,0 +1,45 @@
+const jwt = require('jsonwebtoken');
+
+const generateToken = (userId) => {
+  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
+};
+
+const verifyToken = (token) => {
+  try {
+    return jwt.verify(token, process.env.JWT_SECRET);
+  } catch (error) {
+    return null;
+  }
+};
+
+module.exports = { generateToken, verifyToken };
+
+diff --git a/src/routes/auth.js b/src/routes/auth.js
+new file mode 100644
index 0000000..d4e5f6g
--- /dev/null
+++ b/src/routes/auth.js
@@ -0,0 +1,30 @@
+const express = require('express');
+const { generateToken, verifyToken } = require('../auth/jwt');
+const User = require('../models/User');
+
+const router = express.Router();
+
+router.post('/login', async (req, res) => {
+  try {
+    const { email, password } = req.body;
+    const user = await User.findOne({ email });
    
+    if (!user || !user.comparePassword(password)) {
+      return res.status(401).json({ error: 'Invalid credentials' });
+    }
    
+    const token = generateToken(user._id);
+    res.json({ token, user: { id: user._id, email: user.email } });
+  } catch (error) {
+    res.status(500).json({ error: 'Login failed' });
+  }
+});
+
+module.exports = router;
  `
};

async function testOviQAAgent() {
  console.log('🧪 Testing Ovi QA Agent functionality...');
  console.log('=' .repeat(50));
  
  // Determine the base URL
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.BASE_URL || 'https://getyourtester.onrender.com'
    : 'http://localhost:3000';
  
  console.log(`📡 Making request to ${baseUrl}/generate-test-recipe`);
  console.log(`🔍 Testing PR: ${testPRData.title}`);
  
  try {
    const response = await axios.post(`${baseUrl}/generate-test-recipe`, testPRData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout for comprehensive analysis
    });
    
    console.log('✅ Ovi QA Agent response received successfully!');
    console.log('📊 Response Status:', response.status);
    
    if (response.data.success) {
      console.log('\n🤖 Ovi QA Agent Analysis Results:');
      console.log('=' .repeat(50));
      
      const data = response.data.data;
      
      // Display the new compressed markdown format
      if (typeof data === 'string') {
        // New markdown format
        console.log(data);
      } else if (data.analysis) {
        // New format with analysis property
        console.log(data.analysis);
      } else {
        // Fallback - display raw data
        console.log('Raw response:', JSON.stringify(data, null, 2));
      }
      
      console.log('\n✅ Ovi QA Agent test completed successfully!');
      
    } else {
      console.error('❌ Ovi QA Agent analysis failed:');
      console.error('Error:', response.data.error);
      console.error('Details:', response.data.details);
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('Network error - could not reach the endpoint');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testOviQAAgent().catch(console.error); 