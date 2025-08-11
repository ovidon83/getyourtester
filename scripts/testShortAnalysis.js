/**
 * Test script for the new /generate-short-analysis endpoint
 * Tests the short analysis functionality with sample PR data
 */

const axios = require('axios');

// Test data for short analysis
const testPRData = {
  repo: 'test-owner/test-repo',
  pr_number: 123,
  title: 'Add user authentication feature',
  body: 'This PR adds user authentication with JWT tokens and password hashing. Includes login, logout, and registration endpoints.',
  diff: `diff --git a/src/auth.js b/src/auth.js
index 1234567..abcdefg 100644
--- a/src/auth.js
+++ b/src/auth.js
@@ -1,3 +1,45 @@
+const jwt = require('jsonwebtoken');
+const bcrypt = require('bcrypt');
+
+class AuthService {
+  constructor() {
+    this.secretKey = process.env.JWT_SECRET || 'default-secret';
+  }
+
+  async hashPassword(password) {
+    return await bcrypt.hash(password, 10);
+  }
+
+  async verifyPassword(password, hash) {
+    return await bcrypt.compare(password, hash);
+  }
+
+  generateToken(userId) {
+    return jwt.sign({ userId }, this.secretKey, { expiresIn: '24h' });
+  }
+
+  verifyToken(token) {
+    try {
+      return jwt.verify(token, this.secretKey);
+    } catch (error) {
+      return null;
+    }
+  }
+}
+
+module.exports = AuthService;
diff --git a/src/routes/auth.js b/src/routes/auth.js
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/routes/auth.js
@@ -0,0 +1,35 @@
+const express = require('express');
+const AuthService = require('../auth');
+
+const router = express.Router();
+const authService = new AuthService();
+
+router.post('/register', async (req, res) => {
+  try {
+    const { username, password } = req.body;
+    const hashedPassword = await authService.hashPassword(password);
+    // Save user to database
+    res.json({ success: true, message: 'User registered successfully' });
+  } catch (error) {
+    res.status(500).json({ success: false, error: error.message });
+  }
+});
+
+router.post('/login', async (req, res) => {
+  try {
+    const { username, password } = req.body;
+    // Verify user credentials
+    const token = authService.generateToken(userId);
+    res.json({ success: true, token });
+  } catch (error) {
+    res.status(401).json({ success: false, error: 'Invalid credentials' });
+  }
+});
+
+module.exports = router;`
};

async function testShortAnalysis() {
  try {
    console.log('🧪 Testing /generate-short-analysis endpoint...');
    console.log('📋 Test PR Data:');
    console.log(`   Repo: ${testPRData.repo}`);
    console.log(`   PR #: ${testPRData.pr_number}`);
    console.log(`   Title: ${testPRData.title}`);
    console.log(`   Body length: ${testPRData.body.length} characters`);
    console.log(`   Diff length: ${testPRData.diff.length} characters`);
    console.log('');

    // Determine the base URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    console.log(`📡 Making request to ${baseUrl}/generate-short-analysis`);

    // Make the request
    const response = await axios.post(`${baseUrl}/generate-short-analysis`, testPRData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout
    });

    console.log('✅ Response received successfully!');
    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Validate the response structure
    if (response.data && response.data.success) {
      console.log('\n🎯 Short Analysis Content:');
      console.log('---');
      console.log(response.data.data);
      console.log('---');
      
      // Check if it contains the expected sections
      const content = response.data.data;
      const hasReleaseConfidence = content.includes('📊 Release Confidence Score');
      const hasRisks = content.includes('⚠️ Risks');
      const hasTestRecipe = content.includes('🧪 Test Recipe');
      const hasHappyPath = content.includes('🟢 Happy Path Scenarios');
      const hasCriticalPath = content.includes('🔴 Critical Path Scenarios');
      
      console.log('\n✅ Format Validation:');
      console.log(`   Release Confidence Score: ${hasReleaseConfidence ? '✅' : '❌'}`);
      console.log(`   Risks: ${hasRisks ? '✅' : '❌'}`);
      console.log(`   Test Recipe: ${hasTestRecipe ? '✅' : '❌'}`);
      console.log(`   Happy Path Scenarios: ${hasHappyPath ? '✅' : '❌'}`);
      console.log(`   Critical Path Scenarios: ${hasCriticalPath ? '✅' : '❌'}`);
      
      if (hasReleaseConfidence && hasRisks && hasTestRecipe && hasHappyPath && hasCriticalPath) {
        console.log('\n🎉 All validation checks passed! The short analysis endpoint is working correctly.');
      } else {
        console.log('\n⚠️ Some validation checks failed. Check the response format.');
      }
    } else {
      console.log('❌ Response indicates failure:', response.data?.error);
    }

  } catch (error) {
    console.error('❌ Error testing short analysis endpoint:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testShortAnalysis();
