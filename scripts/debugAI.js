#!/usr/bin/env node

/**
 * Debug script for AI integration issues
 * Tests the exact flow that happens in the real GitHub webhook
 */

require('dotenv').config();
const { generateQAInsights } = require('../ai/openaiClient');

async function debugAIIntegration() {
  console.log('🔍 Debugging AI Integration');
  console.log('============================\n');

  // Test 1: Environment Variables
  console.log('1. Checking Environment Variables:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'gpt-4o (default)'}`);
  console.log('');

  // Test 2: Simple AI call (like our working test)
  console.log('2. Testing Simple AI Call:');
  try {
    const simpleResult = await generateQAInsights({
      repo: "test/repo",
      pr_number: 1,
      title: "Test PR",
      body: "Simple test description",
      diff: "diff --git a/test.js b/test.js\n+console.log('test');"
    });
    
    if (simpleResult.success) {
      console.log('   ✅ Simple AI call works');
    } else {
      console.log(`   ❌ Simple AI call failed: ${simpleResult.error}`);
      console.log(`   Details: ${simpleResult.details}`);
    }
  } catch (error) {
    console.log(`   ❌ Simple AI call threw error: ${error.message}`);
  }
  console.log('');

  // Test 3: Empty/null inputs (like real GitHub might send)
  console.log('3. Testing Edge Cases:');
  
  const testCases = [
    {
      name: "Empty diff",
      data: { repo: "test/repo", pr_number: 1, title: "Test", body: "Test", diff: "" }
    },
    {
      name: "Null body", 
      data: { repo: "test/repo", pr_number: 1, title: "Test", body: null, diff: "test diff" }
    },
    {
      name: "Large diff",
      data: { 
        repo: "test/repo", 
        pr_number: 1, 
        title: "Test", 
        body: "Test", 
        diff: "diff --git a/test.js b/test.js\n" + "+".repeat(10000) + "large content"
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`   Testing: ${testCase.name}`);
      const result = await generateQAInsights(testCase.data);
      
      if (result.success) {
        console.log(`   ✅ ${testCase.name} works`);
      } else {
        console.log(`   ❌ ${testCase.name} failed: ${result.error}`);
        if (result.details) {
          console.log(`      Details: ${result.details}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${testCase.name} threw error: ${error.message}`);
    }
  }
  console.log('');

  // Test 4: Real GitHub PR (if we can access it)
  console.log('4. Testing Real GitHub Integration:');
  console.log('   (This requires valid GitHub credentials)');
  
  try {
    // Try to simulate the exact call that would happen in the webhook
    const githubService = require('../src/utils/githubService');
    
    // Test if we can fetch a description (simulated)
    console.log('   Testing fetchPRDescription in simulated mode...');
    // This should work even in simulated mode
    
  } catch (error) {
    console.log(`   ❌ GitHub service error: ${error.message}`);
  }

  console.log('\n🔧 Potential Issues:');
  console.log('1. GitHub API authentication failing');
  console.log('2. PR diff too large for OpenAI context');
  console.log('3. Network timeout during AI call');
  console.log('4. Environment variables not loaded in webhook context');
  console.log('5. Error in fetchPRDiff function');

  console.log('\n💡 To debug further:');
  console.log('1. Check server logs when running webhook');
  console.log('2. Test with a smaller PR');
  console.log('3. Verify GitHub App permissions');
  console.log('4. Add more detailed error logging');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run debug
if (require.main === module) {
  debugAIIntegration().catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
}

module.exports = { debugAIIntegration }; 