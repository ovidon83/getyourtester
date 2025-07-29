#!/usr/bin/env node

/**
 * Test Script for Ovi QA Agent Short Summary Feature
 * Tests the new short summary functionality that runs on PR opening
 */

const { generateShortSummary } = require('../ai/openaiClient');

// Test data for a sample PR
const testPR = {
  repo: 'test-user/test-repo',
  pr_number: 123,
  title: 'Add user authentication with JWT tokens',
  body: `## Changes
  - Implemented JWT-based authentication
  - Added login/logout endpoints
  - Updated user session management
  - Added password hashing with bcrypt
  
  ## Testing
  - Tested login flow manually
  - Added unit tests for auth functions`,
  diff: `
  +++ b/src/auth/auth.js
  @@ -0,0 +1,45 @@
  +const jwt = require('jsonwebtoken');
  +const bcrypt = require('bcrypt');
  +const User = require('../models/User');
  +
  +async function login(email, password) {
  +  const user = await User.findByEmail(email);
  +  if (!user) {
  +    throw new Error('User not found');
  +  }
  +  
  +  const isValid = await bcrypt.compare(password, user.passwordHash);
  +  if (!isValid) {
  +    throw new Error('Invalid password');
  +  }
  +  
  +  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  +  return { token, user };
  +}
  +
  +function verifyToken(token) {
  +  return jwt.verify(token, process.env.JWT_SECRET);
  +}
  +
  +module.exports = { login, verifyToken };
  
  +++ b/src/routes/auth.js
  @@ -0,0 +1,25 @@
  +const express = require('express');
  +const { login } = require('../auth/auth');
  +const router = express.Router();
  +
  +router.post('/login', async (req, res) => {
  +  try {
  +    const { email, password } = req.body;
  +    const result = await login(email, password);
  +    res.json(result);
  +  } catch (error) {
  +    res.status(401).json({ error: error.message });
  +  }
  +});
  +
  +module.exports = router;`
};

async function testShortSummary() {
  console.log('🧪 Testing Ovi QA Agent Short Summary Feature\n');
  
  try {
    console.log('⚡ Generating short summary for test PR...');
    console.log(`📝 PR: ${testPR.title}`);
    console.log(`🔍 Repo: ${testPR.repo} #${testPR.pr_number}\n`);
    
    const startTime = Date.now();
    const result = await generateShortSummary(testPR);
    const endTime = Date.now();
    
    console.log(`⏱️ Analysis completed in ${endTime - startTime}ms\n`);
    
    if (result && result.success) {
      console.log('✅ Short summary generated successfully!\n');
      
      const data = result.data;
      console.log('📊 RESULTS:');
      console.log('=' .repeat(50));
      console.log(`🚨 Risk Level: ${data.riskLevel}`);
      console.log(`📊 Ship Score: ${data.shipScore}/10`);
      console.log(`✅ Can Ship: ${data.canShip ? 'YES' : 'NO'}`);
      console.log(`💭 Reasoning: ${data.reasoning}`);
      
      if (data.criticalIssues && data.criticalIssues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        data.criticalIssues.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue}`);
        });
      } else {
        console.log('\n✅ No critical issues detected');
      }
      
      console.log('\n' + '=' .repeat(50));
      console.log('🎉 Short summary test completed successfully!');
      
    } else {
      console.error('❌ Short summary generation failed:');
      console.error('Error:', result?.error);
      console.error('Details:', result?.details);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testShortSummary();
}

module.exports = { testShortSummary }; 