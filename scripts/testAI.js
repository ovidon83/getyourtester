#!/usr/bin/env node

/**
 * Test script for OpenAI integration
 * Tests the generateQAInsights function with dummy PR data
 */

const { generateQAInsights, testConnection } = require('../ai/openaiClient');

// Sample PR data for testing
const dummyPR = {
  repo: "example/repo",
  pr_number: 12,
  title: "Add login endpoint",
  body: "Implements /login route with token support. This PR adds JWT authentication to the login endpoint and includes rate limiting to prevent brute force attacks.",
  diff: `diff --git a/routes/login.js b/routes/login.js
new file mode 100644
index 0000000..123456
--- /dev/null
+++ b/routes/login.js
@@ -0,0 +1,45 @@
+const express = require('express');
+const jwt = require('jsonwebtoken');
+const bcrypt = require('bcryptjs');
+const rateLimit = require('express-rate-limit');
+const User = require('../models/User');
+
+const router = express.Router();
+
+// Rate limiting for login attempts
+const loginLimiter = rateLimit({
+  windowMs: 15 * 60 * 1000, // 15 minutes
+  max: 5, // limit each IP to 5 requests per windowMs
+  message: 'Too many login attempts, please try again later.'
+});
+
+// Login endpoint
+router.post('/login', loginLimiter, async (req, res) => {
+  try {
+    const { email, password } = req.body;
+    
+    // Validate input
+    if (!email || !password) {
+      return res.status(400).json({ error: 'Email and password required' });
+    }
+    
+    // Find user
+    const user = await User.findOne({ email });
+    if (!user) {
+      return res.status(401).json({ error: 'Invalid credentials' });
+    }
+    
+    // Check password
+    const isValidPassword = await bcrypt.compare(password, user.password);
+    if (!isValidPassword) {
+      return res.status(401).json({ error: 'Invalid credentials' });
+    }
+    
+    // Generate JWT token
+    const token = jwt.sign(
+      { userId: user._id, email: user.email },
+      process.env.JWT_SECRET,
+      { expiresIn: '24h' }
+    );
+    
+    res.json({ token, user: { id: user._id, email: user.email } });
+  } catch (error) {
+    console.error('Login error:', error);
+    res.status(500).json({ error: 'Internal server error' });
+  }
+});
+
+module.exports = router;`
};

async function runTest() {
  console.log('🧪 Testing OpenAI Integration for GetYourTester');
  console.log('================================================\n');

  // Test 1: Connection test
  console.log('🔌 Testing OpenAI connection...');
  const connectionOk = await testConnection();
  
  if (!connectionOk) {
    console.error('❌ Connection test failed. Exiting.');
    process.exit(1);
  }
  
  console.log('✅ Connection test passed\n');

  // Test 2: Generate QA insights
  console.log('🤖 Testing QA insights generation...');
  console.log('📝 Using dummy PR data:');
  console.log(`   Repo: ${dummyPR.repo}`);
  console.log(`   PR #: ${dummyPR.pr_number}`);
  console.log(`   Title: ${dummyPR.title}`);
  console.log('');

  const startTime = Date.now();
  const result = await generateQAInsights(dummyPR);
  const duration = Date.now() - startTime;

  console.log(`⏱️  Generation took ${duration}ms\n`);

  // Display results
  if (result.success) {
    console.log('✅ QA insights generated successfully!');
    console.log('\n📊 Results:');
    console.log('===========\n');
    
    const { data } = result;
    
    console.log('🤔 Smart Questions:');
    data.smartQuestions.forEach((question, index) => {
      console.log(`   ${index + 1}. ${question}`);
    });
    
    console.log('\n🧪 Test Cases:');
    data.testCases.forEach((testCase, index) => {
      console.log(`   ${index + 1}. ${testCase}`);
    });
    
    console.log('\n⚠️  Risks:');
    data.risks.forEach((risk, index) => {
      console.log(`   ${index + 1}. ${risk}`);
    });
    
    console.log('\n📋 Metadata:');
    console.log(`   Model: ${result.metadata.model}`);
    console.log(`   Attempts: ${result.metadata.attempt}`);
    console.log(`   Timestamp: ${result.metadata.timestamp}`);
    
  } else {
    console.error('❌ Failed to generate QA insights');
    console.error('Error:', result.error);
    console.error('Details:', result.details);
    
    if (result.metadata) {
      console.error('Metadata:', result.metadata);
    }
  }

  console.log('\n🎯 Test completed!');
}

// Handle script errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  runTest().catch(error => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
}

module.exports = { runTest, dummyPR }; 