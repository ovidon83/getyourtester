/**
 * Test script for the storage system
 * 
 * This script demonstrates the functionality of the storage system
 * for test requests. It creates, reads, updates, and deletes test requests.
 * 
 * Run with: node tests/storage-test.js
 */

const storage = require('../utils/storage');
const { TEST_REQUEST_STATUS, createTestRequestObject } = require('../models/TestRequest');

async function runTests() {
  console.log('🧪 Running storage system tests...');
  
  // Initialize storage
  await storage.initialize();
  console.log('✅ Storage initialized');
  
  // Create test data
  const testRequest = createTestRequestObject({
    repositoryName: 'test-repo',
    repositoryOwner: 'test-owner',
    prNumber: 123,
    prTitle: 'Test PR Title',
    prUrl: 'https://github.com/test-owner/test-repo/pull/123',
    requestedBy: 'developer@example.com',
    testInstructions: ['Check login functionality', 'Test the cart feature'],
    testEnvironment: {
      browser: 'Chrome',
      operatingSystem: 'macOS'
    },
    estimatedHours: 2
  });
  
  // Create a test request
  console.log('\n📝 Creating a test request...');
  const createdRequest = await storage.createTestRequest(testRequest);
  console.log(`✅ Test request created with ID: ${createdRequest.id}`);
  console.log(JSON.stringify(createdRequest, null, 2));
  
  // Get all test requests
  console.log('\n📋 Getting all test requests...');
  const allRequests = await storage.getAllTestRequests();
  console.log(`✅ Found ${allRequests.length} test requests`);
  
  // Get a test request by ID
  console.log(`\n🔍 Getting test request by ID: ${createdRequest.id}...`);
  const retrievedRequest = await storage.getTestRequestById(createdRequest.id);
  console.log('✅ Test request retrieved:');
  console.log(JSON.stringify(retrievedRequest, null, 2));
  
  // Update a test request
  console.log('\n✏️ Updating the test request...');
  const updateData = {
    status: TEST_REQUEST_STATUS.ASSIGNED,
    assignedTo: 'tester@example.com',
    estimatedHours: 3
  };
  const updatedRequest = await storage.updateTestRequest(createdRequest.id, updateData);
  console.log('✅ Test request updated:');
  console.log(JSON.stringify(updatedRequest, null, 2));
  
  // Get test requests by status
  console.log(`\n🔍 Getting test requests with status: ${TEST_REQUEST_STATUS.ASSIGNED}...`);
  const assignedRequests = await storage.getTestRequestsByStatus(TEST_REQUEST_STATUS.ASSIGNED);
  console.log(`✅ Found ${assignedRequests.length} assigned test requests`);
  
  // Get test requests by repository
  console.log('\n🔍 Getting test requests for repository: test-repo...');
  const repoRequests = await storage.getTestRequestsByRepository('test-repo');
  console.log(`✅ Found ${repoRequests.length} test requests for repository`);
  
  // Get test requests by tester
  console.log('\n🔍 Getting test requests for tester: tester@example.com...');
  const testerRequests = await storage.getTestRequestsByTester('tester@example.com');
  console.log(`✅ Found ${testerRequests.length} test requests for tester`);
  
  // Delete the test request
  console.log(`\n🗑️ Deleting test request with ID: ${createdRequest.id}...`);
  const deleted = await storage.deleteTestRequest(createdRequest.id);
  console.log(`✅ Test request deleted: ${deleted}`);
  
  // Verify deletion
  console.log('\n📋 Getting all test requests after deletion...');
  const remainingRequests = await storage.getAllTestRequests();
  console.log(`✅ Found ${remainingRequests.length} test requests remaining`);
  
  console.log('\n🎉 All tests completed successfully!');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Error running tests:', error);
}); 