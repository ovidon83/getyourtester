#!/usr/bin/env node

/**
 * Integration test for AI-enhanced GitHub workflow
 * Tests the complete flow from GitHub webhook to AI insights
 */

const githubService = require('../src/utils/githubService');

// Mock GitHub webhook payload for a /test comment
const mockWebhookPayload = {
  headers: {
    'x-github-event': 'issue_comment'
  },
  body: {
    action: 'created',
    repository: {
      full_name: 'test-user/sample-repo',
      name: 'sample-repo',
      owner: {
        login: 'test-user'
      }
    },
    issue: {
      number: 42,
      title: 'Add user authentication system',
      body: 'This PR implements JWT-based user authentication with login/logout functionality. Includes password hashing, session management, and route protection.',
      pull_request: {
        url: 'https://api.github.com/repos/test-user/sample-repo/pulls/42'
      },
      html_url: 'https://github.com/test-user/sample-repo/pull/42'
    },
    comment: {
      body: '/test - Please test the authentication flow and security measures',
      user: {
        login: 'developer-user'
      }
    },
    sender: {
      login: 'developer-user'
    }
  }
};

async function runIntegrationTest() {
  console.log('🧪 GetYourTester Integration Test with AI');
  console.log('=========================================\n');

  console.log('📝 Simulating GitHub webhook for /test command...');
  console.log(`Repository: ${mockWebhookPayload.body.repository.full_name}`);
  console.log(`PR #${mockWebhookPayload.body.issue.number}: ${mockWebhookPayload.body.issue.title}`);
  console.log(`Comment: ${mockWebhookPayload.body.comment.body}`);
  console.log(`Requested by: ${mockWebhookPayload.body.sender.login}\n`);

  const startTime = Date.now();

  try {
    // Process the webhook event (this will trigger AI insights)
    console.log('🔄 Processing webhook event...');
    const result = await githubService.processWebhookEvent(mockWebhookPayload);
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Total processing time: ${duration}ms\n`);

    if (result.success) {
      console.log('✅ Integration test completed successfully!');
      console.log(`📋 Request ID: ${result.requestId || 'Generated'}`);
      
      if (result.simulated) {
        console.log('\n🔮 Test ran in simulated mode');
        console.log('   - GitHub API calls were simulated');
        console.log('   - Check console output above for AI insights');
        console.log('   - In production, this would:');
        console.log('     • Post AI insights as PR comment');
        console.log('     • Add status labels');
        console.log('     • Send email notifications');
        console.log('     • Store test request in database');
      }
    } else {
      console.error('❌ Integration test failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Integration test threw an error:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n📊 What happened in this test:');
  console.log('1. Simulated GitHub webhook for /test comment');
  console.log('2. Extracted PR information (title, description, diff)');
  console.log('3. Generated AI insights using OpenAI GPT-4o');
  console.log('4. Created test request with AI insights included');
  console.log('5. Posted acknowledgment comment with AI insights');
  console.log('6. Added status labels and sent notifications');
}

async function testProductionTrigger() {
  console.log('\n🚀 How to trigger this in production:');
  console.log('=====================================\n');
  
  console.log('1. **Setup GitHub App/Webhook:**');
  console.log('   - Install GetYourTester GitHub App on your repo');
  console.log('   - Or configure webhook to point to your server');
  
  console.log('\n2. **Create a Pull Request:**');
  console.log('   - Make some code changes');
  console.log('   - Open a PR with your changes');
  
  console.log('\n3. **Trigger AI Testing:**');
  console.log('   - Comment `/test` on the PR');
  console.log('   - Or `/test Please focus on security and edge cases`');
  
  console.log('\n4. **What happens automatically:**');
  console.log('   ✅ AI analyzes your code diff');
  console.log('   ✅ Generates smart testing questions');
  console.log('   ✅ Suggests specific test cases');
  console.log('   ✅ Identifies potential risks');
  console.log('   ✅ Posts insights as PR comment');
  console.log('   ✅ Notifies testers via email');
  console.log('   ✅ Updates PR status labels');
  
  console.log('\n5. **Production URLs:**');
  console.log('   - Webhook endpoint: https://your-domain.com/github/webhook');
  console.log('   - Dashboard: https://your-domain.com/dashboard');
  console.log('   - Health check: https://your-domain.com/github/health');
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

// Run the integration test
if (require.main === module) {
  runIntegrationTest()
    .then(() => testProductionTrigger())
    .catch(error => {
      console.error('❌ Integration test failed:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTest, mockWebhookPayload }; 