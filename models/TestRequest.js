/**
 * TestRequest Model
 * 
 * This file describes the structure of a test request in the system
 * and provides validation functions.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Test Request Status Types
 * @readonly
 * @enum {string}
 */
const TEST_REQUEST_STATUS = {
  PENDING: 'pending',      // Initial state when created
  ASSIGNED: 'assigned',    // Assigned to a tester
  IN_PROGRESS: 'in_progress', // Tester is working on it
  COMPLETED: 'completed',  // Testing is complete
  REJECTED: 'rejected'     // Request was rejected
};

/**
 * Test Result Types
 * @readonly
 * @enum {string}
 */
const TEST_RESULT = {
  PASS: 'pass',
  FAIL: 'fail',
  PARTIAL: 'partial'
};

/**
 * TestRequest Schema
 * 
 * Describes the structure of a test request object
 * @typedef {Object} TestRequest
 * @property {string} id - Unique identifier
 * @property {string} repositoryName - Name of the GitHub repository
 * @property {string} repositoryOwner - Owner of the GitHub repository
 * @property {number} prNumber - Pull request number
 * @property {string} prTitle - Title of the pull request
 * @property {string} prUrl - URL to the GitHub PR
 * @property {string} requestedBy - User who requested the test
 * @property {string} [assignedTo] - Tester assigned to the request
 * @property {string} status - Current status of the request
 * @property {Array<string>} [testInstructions] - Specific instructions for testing
 * @property {Object} [testEnvironment] - Environment details for testing
 * @property {string} [testResult] - Result of the test (pass/fail/partial)
 * @property {Array<Object>} [bugs] - List of bugs found during testing
 * @property {string} createdAt - Timestamp of creation
 * @property {string} updatedAt - Timestamp of last update
 * @property {string} [completedAt] - Timestamp of completion
 * @property {number} [estimatedHours] - Estimated hours for testing
 * @property {number} [actualHours] - Actual hours spent testing
 */

/**
 * Bug Schema
 * 
 * Describes the structure of a bug found during testing
 * @typedef {Object} Bug
 * @property {string} id - Unique identifier
 * @property {string} title - Short description of the bug
 * @property {string} description - Detailed description
 * @property {string} severity - Severity level (low/medium/high/critical)
 * @property {Array<string>} [steps] - Steps to reproduce
 * @property {string} [expectedBehavior] - What should happen
 * @property {string} [actualBehavior] - What actually happened
 * @property {Array<string>} [screenshots] - URLs to screenshots
 * @property {string} [environment] - Environment details
 * @property {string} createdAt - Timestamp of creation
 */

/**
 * Validate a test request object
 * @param {Object} testRequest - The test request to validate
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
function validateTestRequest(testRequest) {
  const errors = [];
  
  // Required fields
  if (!testRequest.repositoryName) errors.push('Repository name is required');
  if (!testRequest.repositoryOwner) errors.push('Repository owner is required');
  if (!testRequest.prNumber) errors.push('PR number is required');
  if (!testRequest.prTitle) errors.push('PR title is required');
  if (!testRequest.prUrl) errors.push('PR URL is required');
  if (!testRequest.requestedBy) errors.push('Requester is required');
  
  // Status validation
  if (testRequest.status && !Object.values(TEST_REQUEST_STATUS).includes(testRequest.status)) {
    errors.push(`Invalid status: ${testRequest.status}. Must be one of: ${Object.values(TEST_REQUEST_STATUS).join(', ')}`);
  }
  
  // Test result validation
  if (testRequest.testResult && !Object.values(TEST_RESULT).includes(testRequest.testResult)) {
    errors.push(`Invalid test result: ${testRequest.testResult}. Must be one of: ${Object.values(TEST_RESULT).join(', ')}`);
  }
  
  // Time estimates validation
  if (testRequest.estimatedHours && (isNaN(testRequest.estimatedHours) || testRequest.estimatedHours <= 0)) {
    errors.push('Estimated hours must be a positive number');
  }
  
  if (testRequest.actualHours && (isNaN(testRequest.actualHours) || testRequest.actualHours < 0)) {
    errors.push('Actual hours must be a non-negative number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a bug object
 * @param {Object} bug - The bug to validate
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
function validateBug(bug) {
  const errors = [];
  
  // Required fields
  if (!bug.title) errors.push('Bug title is required');
  if (!bug.description) errors.push('Bug description is required');
  
  // Severity validation
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (bug.severity && !validSeverities.includes(bug.severity)) {
    errors.push(`Invalid severity: ${bug.severity}. Must be one of: ${validSeverities.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a new bug object with default values
 * @param {Object} data - Initial bug data
 * @returns {Object} A new bug object with ID
 */
function createBugObject(data) {
  return {
    id: data.id || uuidv4(),
    title: data.title,
    description: data.description,
    severity: data.severity || 'medium',
    steps: data.steps || [],
    expectedBehavior: data.expectedBehavior || '',
    actualBehavior: data.actualBehavior || '',
    screenshots: data.screenshots || [],
    environment: data.environment || '',
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * Create a new test request object with default values
 * @param {Object} data - Initial data
 * @returns {Object} A new test request object with ID
 */
function createTestRequestObject(data) {
  return {
    id: data.id || uuidv4(),
    repositoryName: data.repositoryName,
    repositoryOwner: data.repositoryOwner,
    prNumber: data.prNumber,
    prTitle: data.prTitle,
    prUrl: data.prUrl,
    requestedBy: data.requestedBy,
    assignedTo: data.assignedTo || null,
    status: data.status || TEST_REQUEST_STATUS.PENDING,
    testInstructions: data.testInstructions || [],
    testEnvironment: data.testEnvironment || {},
    testResult: data.testResult || null,
    bugs: data.bugs || [],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    completedAt: data.completedAt || null,
    estimatedHours: data.estimatedHours || null,
    actualHours: data.actualHours || null
  };
}

module.exports = {
  TEST_REQUEST_STATUS,
  TEST_RESULT,
  validateTestRequest,
  validateBug,
  createTestRequestObject,
  createBugObject
}; 