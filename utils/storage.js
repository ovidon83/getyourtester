const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Path to the data directory and file
const DATA_DIR = path.join(__dirname, '..', 'data');
const TEST_REQUESTS_FILE = path.join(DATA_DIR, 'test-requests.json');

/**
 * Initialize the data directory and file if they don't exist
 */
async function initialize() {
  try {
    // Check if data directory exists, create if not
    try {
      await fs.access(DATA_DIR);
    } catch (err) {
      // Directory doesn't exist, create it
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log(`Created data directory at ${DATA_DIR}`);
    }

    // Check if test requests file exists, create if not
    try {
      await fs.access(TEST_REQUESTS_FILE);
    } catch (err) {
      // File doesn't exist, create it with empty array
      await fs.writeFile(TEST_REQUESTS_FILE, JSON.stringify([], null, 2));
      console.log(`Created test requests file at ${TEST_REQUESTS_FILE}`);
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
}

/**
 * Read all test requests from the JSON file
 * @returns {Promise<Array>} Array of test request objects
 */
async function getAllTestRequests() {
  try {
    await initialize();
    const data = await fs.readFile(TEST_REQUESTS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading test requests:', error);
    return [];
  }
}

/**
 * Get a single test request by ID
 * @param {string} id - The ID of the test request to retrieve
 * @returns {Promise<Object|null>} The test request object or null if not found
 */
async function getTestRequestById(id) {
  try {
    const testRequests = await getAllTestRequests();
    return testRequests.find(request => request.id === id) || null;
  } catch (error) {
    console.error(`Error getting test request with ID ${id}:`, error);
    return null;
  }
}

/**
 * Create a new test request
 * @param {Object} testRequestData - The test request data to save
 * @returns {Promise<Object>} The created test request object with ID
 */
async function createTestRequest(testRequestData) {
  try {
    const testRequests = await getAllTestRequests();
    
    // Create new test request with ID and timestamps
    const newTestRequest = {
      id: uuidv4(),
      ...testRequestData,
      status: testRequestData.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to array and save
    testRequests.push(newTestRequest);
    await fs.writeFile(TEST_REQUESTS_FILE, JSON.stringify(testRequests, null, 2));
    
    return newTestRequest;
  } catch (error) {
    console.error('Error creating test request:', error);
    throw error;
  }
}

/**
 * Update an existing test request
 * @param {string} id - The ID of the test request to update
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object|null>} The updated test request or null if not found
 */
async function updateTestRequest(id, updateData) {
  try {
    const testRequests = await getAllTestRequests();
    const index = testRequests.findIndex(request => request.id === id);
    
    if (index === -1) {
      return null; // Test request not found
    }
    
    // Update the test request
    const updatedTestRequest = {
      ...testRequests[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    testRequests[index] = updatedTestRequest;
    await fs.writeFile(TEST_REQUESTS_FILE, JSON.stringify(testRequests, null, 2));
    
    return updatedTestRequest;
  } catch (error) {
    console.error(`Error updating test request with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a test request by ID
 * @param {string} id - The ID of the test request to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteTestRequest(id) {
  try {
    const testRequests = await getAllTestRequests();
    const initialLength = testRequests.length;
    
    const filteredRequests = testRequests.filter(request => request.id !== id);
    
    if (filteredRequests.length === initialLength) {
      return false; // No test request was removed
    }
    
    await fs.writeFile(TEST_REQUESTS_FILE, JSON.stringify(filteredRequests, null, 2));
    return true;
  } catch (error) {
    console.error(`Error deleting test request with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Get test requests by repository
 * @param {string} repositoryName - The name of the repository to filter by
 * @returns {Promise<Array>} Array of matching test request objects
 */
async function getTestRequestsByRepository(repositoryName) {
  try {
    const testRequests = await getAllTestRequests();
    return testRequests.filter(request => request.repositoryName === repositoryName);
  } catch (error) {
    console.error(`Error getting test requests for repository ${repositoryName}:`, error);
    return [];
  }
}

/**
 * Get test requests by status
 * @param {string} status - The status to filter by
 * @returns {Promise<Array>} Array of matching test request objects
 */
async function getTestRequestsByStatus(status) {
  try {
    const testRequests = await getAllTestRequests();
    return testRequests.filter(request => request.status === status);
  } catch (error) {
    console.error(`Error getting test requests with status ${status}:`, error);
    return [];
  }
}

/**
 * Get test requests by tester
 * @param {string} testerId - The ID of the tester to filter by
 * @returns {Promise<Array>} Array of matching test request objects
 */
async function getTestRequestsByTester(testerId) {
  try {
    const testRequests = await getAllTestRequests();
    return testRequests.filter(request => request.assignedTo === testerId);
  } catch (error) {
    console.error(`Error getting test requests for tester ${testerId}:`, error);
    return [];
  }
}

module.exports = {
  initialize,
  getAllTestRequests,
  getTestRequestById,
  createTestRequest,
  updateTestRequest,
  deleteTestRequest,
  getTestRequestsByRepository,
  getTestRequestsByStatus,
  getTestRequestsByTester
}; 