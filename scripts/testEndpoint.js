#!/usr/bin/env node

/**
 * Test script for the new /generate-test-recipe endpoint
 */

const axios = require('axios');

async function testTestRecipeEndpoint() {
  console.log('🧪 Testing /generate-test-recipe endpoint...');
  
  const testData = {
    repo: 'test/repo',
    pr_number: 1,
    title: 'Test Authentication System',
    body: 'This PR adds a new authentication system with JWT tokens',
    diff: `
diff --git a/auth.js b/auth.js
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/auth.js
@@ -0,0 +1,20 @@
+const jwt = require('jsonwebtoken');
+const bcrypt = require('bcrypt');
+
+async function authenticateUser(email, password) {
+  const user = await findUserByEmail(email);
+  if (!user) {
+    throw new Error('User not found');
+  }
+  
+  const isValid = await bcrypt.compare(password, user.hashedPassword);
+  if (!isValid) {
+    throw new Error('Invalid password');
+  }
+  
+  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
+  return token;
+}
+
+module.exports = { authenticateUser };
`
  };
  
  try {
    const baseUrl = 'https://www.getyourtester.com';
    
    console.log(`📡 Making request to ${baseUrl}/generate-test-recipe`);
    console.log('📦 Request data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(`${baseUrl}/generate-test-recipe`, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n🎉 Test Recipe Endpoint Working Successfully!');
      console.log('\n📋 Generated Insights:');
      console.log('Smart Questions:', response.data.data.smartQuestions?.length || 0);
      console.log('Test Cases:', response.data.data.testCases?.length || 0);
      console.log('Risks:', response.data.data.risks?.length || 0);
    } else {
      console.log('\n❌ Test Recipe Endpoint Failed');
      console.log('Error:', response.data.error);
      console.log('Details:', response.data.details);
    }
    
  } catch (error) {
    console.error('\n❌ Error testing endpoint:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else if (error.request) {
      console.error('No response received - check if server is running');
    } else {
      console.error('Request setup error:', error.message);
    }
  }
}

// Run the test
testTestRecipeEndpoint().catch(console.error); 