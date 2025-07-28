/**
 * GitHub Service for webhook processing
 * Implements actual functionality for handling /test commands
 */
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const githubAppAuth = require('./githubAppAuth');

// Initialize GitHub client with token (for backward compatibility)
let octokit;
let simulatedMode = false;

try {
  if (process.env.GITHUB_TOKEN) {
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    console.log('✅ GitHub API client initialized with token (PAT)');
  } else {
    console.warn('⚠️ No GITHUB_TOKEN found, will use GitHub App authentication');
  }
} catch (error) {
  console.error('⚠️ Error initializing GitHub client:', error.message);
  console.warn('⚠️ Will use GitHub App authentication');
}

// Configure email transporter
let emailTransporter;
try {
  // Use nodemailer to send emails
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_FROM,
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_APP_PASSWORD
    }
  });
  console.log('✅ Email transporter initialized');
} catch (error) {
  console.error('⚠️ Error initializing email transporter:', error.message);
}

// Ensure data directory exists
const homeDir = process.env.HOME || process.env.USERPROFILE;
let dataDir = process.env.DATA_DIR || path.join(homeDir, '.getyourtester', 'data');

if (!fs.existsSync(dataDir)) {
  // Create the directory structure recursively
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory at ${dataDir}`);
  } catch (error) {
    console.error(`Failed to create data directory at ${dataDir}:`, error.message);
    // Fallback to the local data directory
    dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
      console.log(`Created fallback data directory at ${dataDir}`);
    }
  }
}

// Path to test requests storage
const TEST_REQUESTS_PATH = path.join(dataDir, 'test-requests.json');
const ARCHIVE_PATH = path.join(dataDir, 'archived-requests.json');
// Keep requests for 14 days by default
const DATA_RETENTION_DAYS = process.env.DATA_RETENTION_DAYS ? parseInt(process.env.DATA_RETENTION_DAYS) : 14;

console.log(`Test requests will be stored at: ${TEST_REQUESTS_PATH}`);
console.log(`Data retention period: ${DATA_RETENTION_DAYS} days`);

// Define status labels with emojis
const STATUS_LABELS = {
  'pending': '⏳ GYT-Pending',
  'in-progress': '🔄 GYT-In Progress',
  'delayed': '⏰ GYT-Delayed',
  'blocked': '🚫 GYT-Blocked',
  'complete-pass': '✅ GYT-Complete: PASS',
  'complete-fail': '❌ GYT-Complete: FAIL'
};

// Get all status label patterns (without emoji) for removal
const STATUS_LABEL_PATTERNS = Object.values(STATUS_LABELS).map(label => 
  label.substring(label.indexOf('GYT-'))
);

/**
 * Get confidence score emoji
 * @param {string} confidenceScore - The confidence score (High, Medium, Low)
 * @returns {string} Appropriate emoji for the confidence level
 */
function getConfidenceEmoji(confidenceScore) {
  switch (confidenceScore?.toLowerCase()) {
    case 'high':
      return '✅';
    case 'medium':
      return '⚠️';
    case 'low':
      return '❌';
    default:
      return '❓';
  }
}

/**
 * Call the /generate-test-recipe endpoint for AI insights
 */
async function callTestRecipeEndpoint(data) {
  try {
    const axios = require('axios');
    
    // Determine the base URL for the API call
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.BASE_URL || 'https://getyourtester.onrender.com'
      : 'http://localhost:3000';
    
    const response = await axios.post(`${baseUrl}/generate-test-recipe`, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    return {
      success: true,
      data: response.data.data,
      metadata: response.data.metadata
    };
    
  } catch (error) {
    console.error('❌ Error calling test recipe endpoint:', error.message);
    
    if (error.response) {
      // Server responded with error status
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      return {
        success: false,
        error: error.response.data?.error || 'API endpoint error',
        details: error.response.data?.details || error.message
      };
    } else if (error.request) {
      // Request timeout or network error
      return {
        success: false,
        error: 'Network error',
        details: 'Could not reach test recipe endpoint'
      };
    } else {
      // Other error
      return {
        success: false,
        error: 'Request setup error',
        details: error.message
      };
    }
  }
}

/**
 * Load test requests from storage
 */
function loadTestRequests() {
  try {
    if (!fs.existsSync(TEST_REQUESTS_PATH)) {
      // Try to restore from backup if available
      restoreFromBackup();
      
      // If still doesn't exist, create empty file
      if (!fs.existsSync(TEST_REQUESTS_PATH)) {
        console.log(`Creating empty test requests file at ${TEST_REQUESTS_PATH}`);
        fs.writeFileSync(TEST_REQUESTS_PATH, JSON.stringify([]));
        return [];
      }
    }
    const data = fs.readFileSync(TEST_REQUESTS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading test requests:', error);
    return [];
  }
}

/**
 * Save test requests to storage
 */
function saveTestRequests(requests) {
  try {
    console.log(`Saving ${requests.length} test requests to ${TEST_REQUESTS_PATH}`);
    fs.writeFileSync(TEST_REQUESTS_PATH, JSON.stringify(requests, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving test requests:', error);
    return false;
  }
}

/**
 * Archive older test requests to prevent data loss
 * This keeps the main file smaller while preserving historical data
 */
function archiveOldRequests() {
  try {
    const currentRequests = loadTestRequests();
    if (currentRequests.length === 0) return true;
    
    // Current date minus retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
    
    // Split requests into current and archived
    const toKeep = [];
    const toArchive = [];
    
    currentRequests.forEach(request => {
      const requestDate = new Date(request.requestedAt);
      if (requestDate < cutoffDate && request.status.startsWith('complete')) {
        // Archive completed requests older than the retention period
        toArchive.push(request);
      } else {
        // Keep recent requests and any non-completed ones
        toKeep.push(request);
      }
    });
    
    if (toArchive.length === 0) return true;
    
    // Load existing archive
    let archivedRequests = [];
    if (fs.existsSync(ARCHIVE_PATH)) {
      const archiveData = fs.readFileSync(ARCHIVE_PATH, 'utf8');
      archivedRequests = JSON.parse(archiveData);
    }
    
    // Add newly archived requests
    archivedRequests = [...archivedRequests, ...toArchive];
    
    // Save updated files
    fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archivedRequests, null, 2));
    fs.writeFileSync(TEST_REQUESTS_PATH, JSON.stringify(toKeep, null, 2));
    
    console.log(`Archived ${toArchive.length} old requests. Active requests: ${toKeep.length}`);
    return true;
  } catch (error) {
    console.error('Error archiving old requests:', error);
    return false;
  }
}

/**
 * Load both current and archived test requests
 * This can be used for the dashboard to show complete history
 */
function loadAllTestRequests() {
  const currentRequests = loadTestRequests();
  
  try {
    if (fs.existsSync(ARCHIVE_PATH)) {
      const archiveData = fs.readFileSync(ARCHIVE_PATH, 'utf8');
      const archivedRequests = JSON.parse(archiveData);
      
      // Return combined results with current requests first
      return [...currentRequests, ...archivedRequests];
    }
  } catch (error) {
    console.error('Error loading archived requests:', error);
  }
  
  return currentRequests;
}

/**
 * Parse a /test comment to extract test request details
 */
function parseTestRequestComment(comment) {
  // Skip the "/test" part
  const content = comment.replace(/^\/test\s+/, '').trim();
  
  const parsedDetails = {
    // Include the full content as the first field
    fullContent: content
  };
  
  // Parse common patterns
  // Look for environment details
  const envMatch = content.match(/(?:environment|env):\s*([^\n]+)/i);
  if (envMatch) {
    parsedDetails.environment = envMatch[1].trim();
  }
  
  // Look for browser details
  const browserMatch = content.match(/(?:browser|browsers):\s*([^\n]+)/i);
  if (browserMatch) {
    parsedDetails.browsers = browserMatch[1].trim();
  }
  
  // Look for device details
  const deviceMatch = content.match(/(?:device|devices):\s*([^\n]+)/i);
  if (deviceMatch) {
    parsedDetails.devices = deviceMatch[1].trim();
  }
  
  // Look for test scope/focus area
  const scopeMatch = content.match(/(?:scope|focus area|test area):\s*([^\n]+)/i);
  if (scopeMatch) {
    parsedDetails.scope = scopeMatch[1].trim();
  }
  
  // Look for priority
  const priorityMatch = content.match(/(?:priority):\s*([^\n]+)/i);
  if (priorityMatch) {
    parsedDetails.priority = priorityMatch[1].trim();
  }
  
  // Look for any special instructions
  const instructionsMatch = content.match(/(?:instructions|notes):\s*([^\n]+(?:\n[^\n]+)*)/i);
  if (instructionsMatch) {
    parsedDetails.instructions = instructionsMatch[1].trim();
  }
  
  // If we couldn't parse structured information, ensure we at least have the full content
  if (Object.keys(parsedDetails).length === 1 && content) {
    parsedDetails.description = content;
  }
  
  return parsedDetails;
}

/**
 * Send email notification about a new test request
 */
async function sendEmailNotification(testRequest) {
  if (!emailTransporter) {
    console.log('[SIMULATED] Email notification would be sent but transporter not available');
    return { success: false, simulated: true };
  }

  try {
    const toEmail = process.env.NOTIFICATION_EMAIL || process.env.EMAIL_TO || 'ovidon83@gmail.com';
    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@getyourtester.com';

    // Extract repository owner and name
    const [owner, repo] = testRequest.repository ? testRequest.repository.split('/') : ['unknown', 'unknown'];

    const mailOptions = {
      from: `"GetYourTester" <${fromEmail}>`,
      to: toEmail,
      subject: `New Test Request for PR #${testRequest.prNumber}`,
      html: `
        <h2>🧪 New Test Request Received</h2>
        <p>A new test request has been submitted and requires your attention.</p>
        
        <h3>Request Details:</h3>
        <ul>
          <li><strong>Request ID:</strong> ${testRequest.id}</li>
          <li><strong>Repository:</strong> ${testRequest.repository}</li>
          <li><strong>PR Number:</strong> <a href="${testRequest.prUrl}">#${testRequest.prNumber}</a></li>
          <li><strong>Requested by:</strong> ${testRequest.requestedBy}</li>
          <li><strong>Date:</strong> ${new Date(testRequest.requestedAt).toLocaleString()}</li>
          <li><strong>Status:</strong> ${testRequest.status}</li>
        </ul>
        
        <h3>PR Description:</h3>
        <div style="background-color: #f6f8fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <pre style="white-space: pre-wrap; font-family: monospace;">${testRequest.prDescription || 'No description provided'}</pre>
        </div>
        
        <h3>Test Request Content:</h3>
        <div style="background-color: #f6f8fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <pre style="white-space: pre-wrap; font-family: monospace;">${testRequest.comment ? testRequest.comment.replace(/^\/test\s+/, '').trim() : 'No content available'}</pre>
        </div>
        
        <p>Please login to the <a href="http://localhost:3000/dashboard" style="background-color: #0366d6; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">dashboard</a> to manage this request.</p>
        
        <p>Thank you,<br/>GetYourTester Bot</p>
      `,
      text: `
🧪 New Test Request Received

A new test request has been submitted and requires your attention.

Request Details:
- Request ID: ${testRequest.id}
- Repository: ${testRequest.repository}
- PR Number: #${testRequest.prNumber}
- Requested by: ${testRequest.requestedBy}
- Date: ${new Date(testRequest.requestedAt).toLocaleString()}
- Status: ${testRequest.status}

PR Description:
${testRequest.prDescription || 'No description provided'}

Test Request Content:
${testRequest.comment ? testRequest.comment.replace(/^\/test\s+/, '').trim() : 'No content available'}

Please login to the dashboard to manage this request: http://localhost:3000/dashboard

Thank you,
GetYourTester Bot
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email notification sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email notification:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch PR description from GitHub
 */
async function fetchPRDescription(repository, prNumber) {
  try {
    if (simulatedMode || !octokit) {
      console.log(`[SIMULATED] Would fetch PR description for ${repository}#${prNumber}`);
      return 'This is a simulated PR description';
    }
    
    const [owner, repoName] = repository.split('/');
    if (!owner || !repoName) {
      console.error(`Invalid repository format: ${repository}. Should be in format 'owner/repo'`);
      return null;
    }
    
    const response = await octokit.pulls.get({
      owner,
      repo: repoName,
      pull_number: prNumber
    });
    
    return response.data.body || 'No description provided';
  } catch (error) {
    console.error(`Failed to fetch PR description for ${repository}#${prNumber}:`, error.message);
    return null;
  }
}

/**
 * Fetch PR diff for AI analysis
 */
async function fetchPRDiff(repository, prNumber) {
  try {
    if (simulatedMode || !octokit) {
      console.log(`[SIMULATED] Would fetch PR diff for ${repository}#${prNumber}`);
      return `diff --git a/src/auth.js b/src/auth.js
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/src/auth.js
@@ -0,0 +1,25 @@
+const jwt = require('jsonwebtoken');
+const bcrypt = require('bcryptjs');
+
+function authenticateUser(email, password) {
+  // Find user in database
+  const user = findUserByEmail(email);
+  if (!user) {
+    throw new Error('User not found');
+  }
+
+  // Verify password
+  const isValid = bcrypt.compare(password, user.hashedPassword);
+  if (!isValid) {
+    throw new Error('Invalid password');
+  }
+
+  // Generate JWT token
+  const token = jwt.sign(
+    { userId: user.id, email: user.email },
+    process.env.JWT_SECRET,
+    { expiresIn: '24h' }
+  );
+
+  return { token, user };
+}`;
    }
    
    const [owner, repoName] = repository.split('/');
    if (!owner || !repoName) {
      console.error(`Invalid repository format: ${repository}. Should be in format 'owner/repo'`);
      return 'Error: Invalid repository format';
    }
    
    // Get PR files to construct diff
    const response = await octokit.pulls.listFiles({
      owner,
      repo: repoName,
      pull_number: prNumber
    });
    
    // Combine patches from all files
    let fullDiff = '';
    response.data.forEach(file => {
      if (file.patch) {
        fullDiff += `diff --git a/${file.filename} b/${file.filename}\n`;
        fullDiff += file.patch + '\n\n';
      }
    });
    
    return fullDiff || 'No code changes detected';
  } catch (error) {
    console.error(`Failed to fetch PR diff for ${repository}#${prNumber}:`, error.message);
    return 'Error fetching PR diff';
  }
}

/**
 * Post a comment on a GitHub PR
 */
async function postComment(repo, issueNumber, body) {
  try {
    const [owner, repoName] = repo.split('/');
    // Handle case where repo might not have correct format
    if (!owner || !repoName) {
      console.error(`Invalid repository format: ${repo}. Should be in format 'owner/repo'`);
      return { success: false, error: 'Invalid repository format' };
    }
    
    // Get an Octokit instance for this repository
    const repoOctokit = await githubAppAuth.getOctokitForRepo(owner, repoName);
    
    if (!repoOctokit) {
      console.log(`[SIMULATED] Would post comment to ${repo}#${issueNumber}:`);
      console.log('--- Start of simulated comment ---');
      console.log(body);
      console.log('--- End of simulated comment ---');
      return { success: true, simulated: true };
    }
    
    const response = await repoOctokit.issues.createComment({
      owner,
      repo: repoName,
      issue_number: issueNumber,
      body
    });
    
    console.log(`Comment posted to ${repo}#${issueNumber}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Failed to post comment to ${repo}#${issueNumber}:`, error.message);
    
    // Check if the error is due to invalid credentials or permissions
    if (error.status === 401 || error.status === 403) {
      console.warn('Authentication error: Invalid GitHub token or insufficient permissions');
    } else if (error.status === 404) {
      console.warn(`Repository or issue not found: ${repo}#${issueNumber}`);
    }
    
    console.log(`[SIMULATED] Would post comment to ${repo}#${issueNumber}:`);
    console.log('--- Start of simulated comment ---');
    console.log(body);
    console.log('--- End of simulated comment ---');
    return { success: true, simulated: true, error: error.message };
  }
}

/**
 * Update labels on a GitHub PR, removing old status labels and adding new ones
 */
async function updateLabels(repo, issueNumber, newLabels) {
  try {
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      console.error(`Invalid repository format: ${repo}. Should be in format 'owner/repo'`);
      return { success: false, error: 'Invalid repository format' };
    }
    
    // Get an Octokit instance for this repository
    const repoOctokit = await githubAppAuth.getOctokitForRepo(owner, repoName);
    
    if (!repoOctokit) {
      console.log(`[SIMULATED] Would update labels on ${repo}#${issueNumber} to: ${newLabels.join(', ')}`);
      return { success: true, simulated: true };
    }
    
    // Get current labels
    const currentLabelsResponse = await repoOctokit.issues.listLabelsOnIssue({
      owner,
      repo: repoName,
      issue_number: issueNumber
    });
    
    const currentLabels = currentLabelsResponse.data.map(label => label.name);
    
    // Remove existing status labels
    const labelsToKeep = currentLabels.filter(label => {
      return !STATUS_LABEL_PATTERNS.some(pattern => label.includes(pattern));
    });
    
    // Add new labels
    const updatedLabels = [...labelsToKeep, ...newLabels];
    
    // Set the new labels
    const response = await repoOctokit.issues.setLabels({
      owner,
      repo: repoName,
      issue_number: issueNumber,
      labels: updatedLabels
    });
    
    console.log(`Labels updated on ${repo}#${issueNumber}: ${updatedLabels.join(', ')}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Failed to update labels on ${repo}#${issueNumber}:`, error.message);
    
    // Check if the error is due to invalid credentials or permissions
    if (error.status === 401 || error.status === 403) {
      console.warn('Authentication error: Invalid GitHub token or insufficient permissions');
    } else if (error.status === 404) {
      console.warn(`Repository or issue not found: ${repo}#${issueNumber}`);
    }
    
    console.log(`[SIMULATED] Would update labels on ${repo}#${issueNumber} to: ${newLabels.join(', ')}`);
    return { success: true, simulated: true, error: error.message };
  }
}

/**
 * Add a label to a GitHub PR
 */
async function addLabel(repo, issueNumber, labels) {
  try {
    // Use the new updateLabels function to ensure only one status label exists
    const statusLabels = labels.filter(label => 
      STATUS_LABEL_PATTERNS.some(pattern => label.includes(pattern))
    );
    
    if (statusLabels.length > 0) {
      return await updateLabels(repo, issueNumber, labels);
    }
    
    const [owner, repoName] = repo.split('/');
    // Handle case where repo might not have correct format
    if (!owner || !repoName) {
      console.error(`Invalid repository format: ${repo}. Should be in format 'owner/repo'`);
      return { success: false, error: 'Invalid repository format' };
    }
    
    // Get an Octokit instance for this repository
    const repoOctokit = await githubAppAuth.getOctokitForRepo(owner, repoName);
    
    if (!repoOctokit) {
      console.log(`[SIMULATED] Would add labels to ${repo}#${issueNumber}: ${labels.join(', ')}`);
      return { success: true, simulated: true };
    }
    
    const response = await repoOctokit.issues.addLabels({
      owner,
      repo: repoName,
      issue_number: issueNumber,
      labels
    });
    
    console.log(`Labels added to ${repo}#${issueNumber}: ${labels.join(', ')}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Failed to add labels to ${repo}#${issueNumber}:`, error.message);
    
    // Check if the error is due to invalid credentials or permissions
    if (error.status === 401 || error.status === 403) {
      console.warn('Authentication error: Invalid GitHub token or insufficient permissions');
    } else if (error.status === 404) {
      console.warn(`Repository or issue not found: ${repo}#${issueNumber}`);
    }
    
    console.log(`[SIMULATED] Would add labels to ${repo}#${issueNumber}: ${labels.join(', ')}`);
    return { success: true, simulated: true, error: error.message };
  }
}

/**
 * Post a comment to a PR from a test request
 */
async function postCommentToPR(requestId, commentBody, newStatus = null) {
  const testRequests = loadTestRequests();
  const testRequest = testRequests.find(r => r.id === requestId);
  
  if (!testRequest) {
    throw new Error(`Test request with ID ${requestId} not found`);
  }
  
  if (!testRequest.repository || !testRequest.prNumber) {
    throw new Error('Test request does not have valid repository or PR information');
  }
  
  // Format the comment
  let formattedComment = '';
  
  if (newStatus) {
    // Merge status update with the tester comment
    formattedComment = `
## 💬 Tester Comment

${commentBody}

**Status update:** ${newStatus}
`;
    
    // Update the test request status
    await updateTestRequestStatus(requestId, newStatus, false); // Don't post a separate status comment
  } else {
    // Standard comment without status update
    formattedComment = `
## 💬 Tester Comment

${commentBody}
    `;
  }
  
  // Post the comment
  const result = await postComment(testRequest.repository, testRequest.prNumber, formattedComment);
  
  return result;
}

/**
 * Update a test request status
 */
async function updateTestRequestStatus(requestId, newStatus, postCommentUpdate = true) {
  const testRequests = loadTestRequests();
  const testRequest = testRequests.find(r => r.id === requestId);
  
  if (!testRequest) {
    throw new Error(`Test request with ID ${requestId} not found`);
  }
  
  // Update the status
  const oldStatus = testRequest.status;
  testRequest.status = newStatus;
  saveTestRequests(testRequests);
  
  // Update the PR label
  if (testRequest.repository && testRequest.prNumber) {
    // Add the appropriate status label with emoji
    const statusLabel = STATUS_LABELS[newStatus];
    await updateLabels(testRequest.repository, testRequest.prNumber, [statusLabel]);
    
    // Post a comment about the status change if requested
    if (postCommentUpdate) {
      const statusComment = `
## 🔄 Test Status Update

The test request status has been updated to ${newStatus}.
      `;
      
      await postComment(testRequest.repository, testRequest.prNumber, statusComment);
    }
  }
  
  return { success: true, testRequest };
}

/**
 * Submit a test report and update PR status
 */
async function submitTestReport(requestId, reportContent, testResult) {
  console.log(`📝 Submitting test report for request ${requestId} with result ${testResult}`);
  
  // Find the test request
  const testRequests = loadTestRequests();
  const testRequest = testRequests.find(r => r.id === requestId);
  
  if (!testRequest) {
    throw new Error(`Test request ${requestId} not found`);
  }
  
  if (!testRequest.repository || !testRequest.prNumber) {
    throw new Error('Test request does not have valid repository or PR information');
  }
  
  // Save the report to the test request
  testRequest.report = {
    reportContent,
    testResult,
    submittedAt: new Date().toISOString()
  };
  
  // Update status based on test result
  testRequest.status = testResult;
  
  // Save the updated test request
  saveTestRequests(testRequests);
  
  // Format the report as a comment
  const reportComment = `
## 📋 Manual Test Report

${reportContent}

### Status
**Test result:** ${testResult === 'complete-pass' ? '✅ PASS' : '❌ FAIL'}

---

☕ If this helped you ship better, you can support the project: [BuyMeACoffee.com/getyourtester](https://buymeacoffee.com/getyourtester)
  `;
  
  // Post the report as a comment
  const commentResult = await postComment(testRequest.repository, testRequest.prNumber, reportComment);
  
  // Update the PR label with the status
  const statusLabel = STATUS_LABELS[testResult];
  await updateLabels(testRequest.repository, testRequest.prNumber, [statusLabel]);
  
  return { success: true, testRequest, commentResult };
}

/**
 * Post a welcome comment on a newly created PR
 */
async function postWelcomeComment(repository, prNumber) {
  const welcomeComment = `
**Welcome to GetYourTester!**

_Early-access mode: Your first test requests (up to 4 hours) are **FREE**!_

If you find value, you can support the project: [BuyMeACoffee.com/getyourtester](https://buymeacoffee.com/getyourtester)

Request a test by commenting: /test followed by details like: Title, Acceptance Criteria, Test Environment, Design, and so on.

**Example test request:**
\`\`\`
/test

Please run a full manual QA on this PR. Here's what I'd like you to focus on:
- Main goal: Verify the new user onboarding flow (sign up, email verification, and first login).
- Browsers: Chrome (latest), Firefox (latest), Safari (latest).
- Devices: Desktop and mobile (iPhone 13, Pixel 6).
- Test data: Use test email addresses (e.g., test+onboarding1@myapp.com).
- What to look for:
  - Any blockers or bugs in the onboarding steps
  - Usability issues or confusing UI
  - Broken links, typos, or missing error messages
  - Accessibility issues (keyboard navigation, screen reader basics)
  - Edge cases (weak passwords, invalid emails, slow network)
- Environment: https://staging.myapp.com
- Test user: testuser / password: Test1234!
\`\`\`

For more information and tips, check out our [Documentation Guide](/docs).

That's it! We'll handle the rest. 🚀
`;
  return await postComment(repository, prNumber, welcomeComment);
}

/**
 * Handle test request - core functionality
 */
async function handleTestRequest(repository, issue, comment, sender) {
  console.log(`Processing test request from ${sender.login} on PR #${issue.number}`);
  console.log(`Repository: ${repository.full_name}`);
  console.log(`Comment: ${comment.body}`);

  // Create a unique ID for this test request
  const requestId = `${repository.full_name.replace('/', '-')}-${issue.number}-${Date.now()}`;
  
  // Get PR description and diff
  console.log(`📄 Fetching PR description for ${repository.full_name}#${issue.number}`);
  const prDescription = await fetchPRDescription(repository.full_name, issue.number);
  console.log(`📄 PR description: ${prDescription ? 'Success' : 'Failed'}`);
  
  console.log(`📝 Fetching PR diff for ${repository.full_name}#${issue.number}`);
  const prDiff = await fetchPRDiff(repository.full_name, issue.number);
  console.log(`📝 PR diff: ${prDiff ? `Success (${prDiff.length} chars)` : 'Failed'}`);
  
  // Debug what we're sending to AI
  console.log('🔍 AI Input Debug:');
  console.log(`   Repo: ${repository.full_name}`);
  console.log(`   PR #: ${issue.number}`);
  console.log(`   Title: ${issue.title}`);
  console.log(`   Body length: ${prDescription?.length || 0}`);
  console.log(`   Diff length: ${prDiff?.length || 0}`);
  
  // Generate AI insights for the PR via API endpoint
  console.log('🤖 Ovi QA Agent analyzing PR...');
  let aiInsights;
  try {
    aiInsights = await callTestRecipeEndpoint({
      repo: repository.full_name,
      pr_number: issue.number,
      title: issue.title,
      body: prDescription,
      diff: prDiff
    });
    
    if (aiInsights && aiInsights.success) {
      console.log('✅ Ovi QA Agent analysis completed successfully');
    } else {
      console.error('❌ Ovi QA Agent analysis failed:', aiInsights?.error, aiInsights?.details);
    }
  } catch (error) {
    console.error('❌ Ovi QA Agent analysis threw exception:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Create error result
    aiInsights = {
      success: false,
      error: 'Ovi QA Agent analysis failed',
      details: error.message
    };
  }
  
  // Generate test request object
  const testRequest = {
    id: requestId,
    repository: repository.full_name,
    prNumber: issue.number,
    requestedBy: sender.login,
    requestedAt: new Date().toISOString(),
    comment: comment.body,
    prDescription: prDescription,
    aiInsights: aiInsights, // Include AI insights in test request
    status: 'pending',
    prUrl: issue.html_url || `https://github.com/${repository.full_name}/pull/${issue.number}`,
    labels: []
  };

  // Parse request details from comment
  testRequest.parsedDetails = parseTestRequestComment(comment.body);
  
  console.log(`✅ Created test request object:`, testRequest);
  
  // Store in database
  const testRequests = loadTestRequests();
  console.log(`Loaded ${testRequests.length} existing test requests`);
  testRequests.push(testRequest);
  const saveResult = saveTestRequests(testRequests);
  console.log(`✅ Test request saved to database: ${saveResult ? 'success' : 'failed'}`);
  
  // Post acknowledgment comment with AI insights if available
  let acknowledgmentComment = `
## 🧪 Test Request Received

Thank you for the testing request! Your request has been received and is being processed.
* **Status:** Pending
A tester will be assigned to this PR soon and you'll receive status updates notifications.
  `;
  
  // Add AI insights to the comment if they were generated successfully
  if (aiInsights && aiInsights.success) {
    acknowledgmentComment += `

### 🤖 Ovi QA Assistant by GetYourTester

#### 🔍 Change Review
**Key Questions:**
${aiInsights.data.changeReview.smartQuestions.map(q => `- ${q}`).join('\n')}

**Risks:**
${aiInsights.data.changeReview.risks.map(r => `- ${r}`).join('\n')}

**Confidence Score:** ${getConfidenceEmoji(aiInsights.data.changeReview.confidenceScore)} ${aiInsights.data.changeReview.confidenceScore}
${aiInsights.data.changeReview.confidenceReason ? `*${aiInsights.data.changeReview.confidenceReason}*` : ''}

---

#### 🧪 Test Recipe
**Critical Path:**
${aiInsights.data.testRecipe.criticalPath.map(tc => `- [ ] ${tc}`).join('\n')}

**General Scenarios:**
${aiInsights.data.testRecipe.general.map(tc => `- [ ] ${tc}`).join('\n')}

**Edge Cases:**
${aiInsights.data.testRecipe.edgeCases.map(tc => `- [ ] ${tc}`).join('\n')}

**Automation Plan:**
- **Unit:** ${aiInsights.data.testRecipe.automationPlan.unit.map(tc => tc).join('; ')}
- **Integration:** ${aiInsights.data.testRecipe.automationPlan.integration.map(tc => tc).join('; ')}
- **E2E:** ${aiInsights.data.testRecipe.automationPlan.e2e.map(tc => tc).join('; ')}

---

#### 📊 Code Quality Assessment
**Affected Modules:**
${aiInsights.data.codeQuality.affectedModules.map(m => `- ${m}`).join('\n')}

**Test Coverage:**
- **Existing:** ${aiInsights.data.codeQuality.testCoverage.existing}
- **Gaps:** ${aiInsights.data.codeQuality.testCoverage.gaps}
- **Recommendations:** ${aiInsights.data.codeQuality.testCoverage.recommendations}

**Best Practices:**
${aiInsights.data.codeQuality.bestPractices.map(bp => `- ${bp}`).join('\n')}

---
*🤖 AI-powered analysis by Ovi QA Agent. A human tester will review and expand on these recommendations.*
    `;
  } else if (aiInsights && !aiInsights.success) {
    acknowledgmentComment += `

*Note: Ovi QA Agent insights could not be generated for this PR (${aiInsights.error}), but manual testing will proceed as normal.*
    `;
  }
  
  const commentResult = await postComment(repository.full_name, issue.number, acknowledgmentComment);
  console.log(`✅ Acknowledgment comment ${commentResult.simulated ? 'would be' : 'was'} posted`);
  
  // Add status label
  const statusLabel = STATUS_LABELS['pending'];
  const labelResult = await addLabel(repository.full_name, issue.number, [statusLabel]);
  console.log(`✅ Label ${labelResult.simulated ? 'would be' : 'was'} added`);
  
  // Send email notification
  const emailResult = await sendEmailNotification(testRequest);
  if (emailResult.success) {
    console.log(`✅ Email notification sent about PR #${issue.number}`);
  } else {
    console.log(`❌ Email notification failed: ${emailResult.error || 'Unknown error'}`);
  }
  
  return {
    success: true,
    requestId,
    simulated: simulatedMode
  };
}

/**
 * Process a GitHub webhook event
 */
async function processWebhookEvent(event) {
  try {
    const eventType = event.headers['x-github-event'];
    const payload = event.body;
    console.log('📣 Processing webhook event:', eventType);
    
    // Only log first 500 characters to avoid flooding the console
    const payloadString = JSON.stringify(payload, null, 2);
    console.log('Event payload:', payloadString.length > 500 
      ? payloadString.substring(0, 500) + '...(truncated)' 
      : payloadString);
    
    // Handle pull_request event (for PR creation)
    if (eventType === 'pull_request' && payload.action === 'opened') {
      console.log('🔄 New PR opened');
      const { repository, pull_request: pr } = payload;
      
      if (!repository || !pr) {
        console.error('Missing required properties in payload');
        return { success: false, message: 'Missing required properties in payload' };
      }
      
      console.log(`📝 Posting welcome comment to PR #${pr.number}`);
      await postWelcomeComment(repository.full_name, pr.number);
      return { success: true, message: 'Welcome comment posted' };
    }
    
    // Handle issue comment event (for /test commands)
    if (eventType === 'issue_comment' && payload.action === 'created') {
      console.log('💬 New comment detected');
      const { repository, issue, comment, sender } = payload;
      
      if (!repository || !issue || !comment || !sender) {
        console.error('Missing required properties in payload', { 
          hasRepository: !!repository, 
          hasIssue: !!issue, 
          hasComment: !!comment, 
          hasSender: !!sender 
        });
        return { success: false, message: 'Missing required properties in payload' };
      }
      
      // Only process comments on PRs
      if (!issue.pull_request) {
        console.log('Skipping non-PR comment');
        return { success: true, message: 'Skipped non-PR comment' };
      }

      console.log(`Comment body: ${comment.body}`);
      
      // Check for /test command
      if (comment.body.trim().startsWith('/test')) {
        console.log('🧪 /test command detected!');
        return await handleTestRequest(repository, issue, comment, sender);
      }
    }
    
    // For all other event types, just log and return success
    return { 
      success: true,
      message: `Event type ${eventType} received but not processed`
    };
  } catch (error) {
    // Log detailed error information
    console.error('❌ Error processing webhook event:', error.message);
    console.error('Error details:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Test the GitHub token immediately on startup
async function testGitHubToken() {
  try {
    // First try to verify the PAT if available
    if (octokit) {
      try {
        const response = await octokit.users.getAuthenticated();
        console.log(`✅ GitHub PAT successfully verified! Authenticated as: ${response.data.login}`);
        simulatedMode = false;
        return;
      } catch (error) {
        console.warn('❌ GitHub PAT verification failed:', error.message);
        console.log('⚠️ Will try GitHub App authentication instead');
      }
    }
    
    // Try to verify GitHub App authentication
    const jwt = githubAppAuth.getGitHubAppJWT();
    if (jwt) {
      const appOctokit = new Octokit({ auth: jwt });
      const { data: app } = await appOctokit.apps.getAuthenticated();
      console.log(`✅ GitHub App authentication successful! App: ${app.name}`);
      simulatedMode = false;
    } else {
      console.warn('❌ GitHub App authentication not available');
      console.warn('⚠️ Switching to simulated mode');
      simulatedMode = true;
    }
  } catch (error) {
    console.error('❌ GitHub authentication verification failed:', error.message);
    console.warn('⚠️ Switching to simulated mode');
    simulatedMode = true;
  }
}

// Run the token test
testGitHubToken();

// Run archiving operation when module is loaded
setTimeout(() => {
  console.log('Running scheduled archive operation...');
  archiveOldRequests();
  
  // Also create an initial backup
  console.log('Creating initial backup...');
  backupTestRequests();
  
  // Schedule regular backups (every 4 hours)
  setInterval(() => {
    console.log('Running scheduled backup...');
    backupTestRequests();
  }, 4 * 60 * 60 * 1000); // 4 hours in milliseconds
}, 5000); // Wait 5 seconds after startup

/**
 * Create a backup of test requests data
 * This helps prevent data loss during deployments
 */
function backupTestRequests() {
  try {
    // Create backup directory if it doesn't exist
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`Created backup directory at ${backupDir}`);
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `test-requests-${timestamp}.json`);
    
    // Copy current test requests to backup
    if (fs.existsSync(TEST_REQUESTS_PATH)) {
      fs.copyFileSync(TEST_REQUESTS_PATH, backupFile);
      console.log(`Created backup of test requests at ${backupFile}`);
    }
    
    // Copy archive to backup if it exists
    if (fs.existsSync(ARCHIVE_PATH)) {
      const archiveBackupFile = path.join(backupDir, `archived-requests-${timestamp}.json`);
      fs.copyFileSync(ARCHIVE_PATH, archiveBackupFile);
      console.log(`Created backup of archived requests at ${archiveBackupFile}`);
    }
    
    // Clean up old backups (keep only the last 10)
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('test-requests-'))
      .sort()
      .reverse();
    
    if (backupFiles.length > 10) {
      const filesToDelete = backupFiles.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`Deleted old backup file: ${file}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error creating backup:', error);
    return false;
  }
}

/**
 * Restore test requests from the most recent backup if needed
 * This is called automatically if the main data files are missing
 */
function restoreFromBackup() {
  try {
    // If both main files exist, no need to restore
    if (fs.existsSync(TEST_REQUESTS_PATH) && fs.existsSync(ARCHIVE_PATH)) {
      return false;
    }
    
    console.log('Main data files missing or corrupted, attempting to restore from backup...');
    
    // Check for backup directory
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      console.warn('No backup directory found, cannot restore data');
      return false;
    }
    
    // Find the most recent backups
    const testRequestBackups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('test-requests-'))
      .sort()
      .reverse();
      
    const archiveBackups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('archived-requests-'))
      .sort()
      .reverse();
    
    // Restore test requests if needed
    if (!fs.existsSync(TEST_REQUESTS_PATH) && testRequestBackups.length > 0) {
      const latestBackup = path.join(backupDir, testRequestBackups[0]);
      fs.copyFileSync(latestBackup, TEST_REQUESTS_PATH);
      console.log(`Restored test requests from backup: ${latestBackup}`);
    }
    
    // Restore archive if needed
    if (!fs.existsSync(ARCHIVE_PATH) && archiveBackups.length > 0) {
      const latestArchiveBackup = path.join(backupDir, archiveBackups[0]);
      fs.copyFileSync(latestArchiveBackup, ARCHIVE_PATH);
      console.log(`Restored archived requests from backup: ${latestArchiveBackup}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error restoring from backup:', error);
    return false;
  }
}

module.exports = {
  processWebhookEvent,
  postComment,
  addLabel,
  loadTestRequests,
  loadAllTestRequests,
  saveTestRequests,
  parseTestRequestComment,
  updateTestRequestStatus,
  postCommentToPR,
  submitTestReport,
  postWelcomeComment,
  backupTestRequests,
  restoreFromBackup
}; 