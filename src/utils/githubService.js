/**
 * GitHub Service for webhook processing
 * Implements actual functionality for handling /test commands
 */
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Initialize GitHub client with token
let octokit;
let simulatedMode = false;

try {
  if (process.env.GITHUB_TOKEN) {
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    console.log('✅ GitHub API client initialized with token');
  } else {
    console.warn('⚠️ No GITHUB_TOKEN found, GitHub API interactions will be simulated');
    simulatedMode = true;
  }
} catch (error) {
  console.error('⚠️ Error initializing GitHub client:', error.message);
  console.warn('⚠️ GitHub API interactions will be simulated');
  simulatedMode = true;
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
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
  console.log(`Created data directory at ${dataDir}`);
}

// Path to test requests storage
const TEST_REQUESTS_PATH = path.join(dataDir, 'test-requests.json');
console.log(`Test requests will be stored at: ${TEST_REQUESTS_PATH}`);

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
 * Load test requests from storage
 */
function loadTestRequests() {
  try {
    if (!fs.existsSync(TEST_REQUESTS_PATH)) {
      console.log(`Creating empty test requests file at ${TEST_REQUESTS_PATH}`);
      fs.writeFileSync(TEST_REQUESTS_PATH, JSON.stringify([]));
      return [];
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
 * Parse a test request comment to extract structured information
 */
function parseTestRequestComment(comment) {
  // Skip the "/test" part
  const content = comment.replace(/^\/test\s+/, '').trim();
  
  const parsedDetails = {};
  
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
  
  // If we couldn't parse structured information, use the whole comment as description
  if (Object.keys(parsedDetails).length === 0 && content) {
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
          <li><strong>PR:</strong> <a href="${testRequest.prUrl}">#${testRequest.prNumber}</a></li>
          <li><strong>Requested by:</strong> ${testRequest.requestedBy}</li>
          <li><strong>Date:</strong> ${new Date(testRequest.requestedAt).toLocaleString()}</li>
          <li><strong>Status:</strong> ${testRequest.status}</li>
        </ul>
        
        <p>Please login to the <a href="http://localhost:3000/dashboard">dashboard</a> to manage this request.</p>
        
        <p>Thank you,<br/>GetYourTester Bot</p>
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
 * Post a comment on a GitHub PR
 */
async function postComment(repo, issueNumber, body) {
  try {
    if (simulatedMode || !octokit) {
      console.log(`[SIMULATED] Would post comment to ${repo}#${issueNumber}:`);
      console.log('--- Start of simulated comment ---');
      console.log(body);
      console.log('--- End of simulated comment ---');
      return { success: true, simulated: true };
    }
    
    const [owner, repoName] = repo.split('/');
    // Handle case where repo might not have correct format
    if (!owner || !repoName) {
      console.error(`Invalid repository format: ${repo}. Should be in format 'owner/repo'`);
      return { success: false, error: 'Invalid repository format' };
    }
    
    const response = await octokit.issues.createComment({
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
    if (error.status === 401) {
      console.warn('Authentication error: Invalid GitHub token or insufficient permissions');
      simulatedMode = true; // Switch to simulated mode
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
    if (simulatedMode || !octokit) {
      console.log(`[SIMULATED] Would update labels on ${repo}#${issueNumber} to: ${newLabels.join(', ')}`);
      return { success: true, simulated: true };
    }
    
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      console.error(`Invalid repository format: ${repo}. Should be in format 'owner/repo'`);
      return { success: false, error: 'Invalid repository format' };
    }
    
    // Get current labels
    const currentLabelsResponse = await octokit.issues.listLabelsOnIssue({
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
    const response = await octokit.issues.setLabels({
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
    if (error.status === 401) {
      console.warn('Authentication error: Invalid GitHub token or insufficient permissions');
      simulatedMode = true; // Switch to simulated mode
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
    
    // For non-status labels, just add them
    if (simulatedMode || !octokit) {
      console.log(`[SIMULATED] Would add labels to ${repo}#${issueNumber}: ${labels.join(', ')}`);
      return { success: true, simulated: true };
    }
    
    const [owner, repoName] = repo.split('/');
    // Handle case where repo might not have correct format
    if (!owner || !repoName) {
      console.error(`Invalid repository format: ${repo}. Should be in format 'owner/repo'`);
      return { success: false, error: 'Invalid repository format' };
    }
    
    const response = await octokit.issues.addLabels({
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
    if (error.status === 401) {
      console.warn('Authentication error: Invalid GitHub token or insufficient permissions');
      simulatedMode = true; // Switch to simulated mode
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

**Status update:** ${testRequest.status} → ${newStatus}

_This comment was posted from the [test request dashboard](http://localhost:3000/request/${requestId})._
    `;
    
    // Update the test request status
    await updateTestRequestStatus(requestId, newStatus, false); // Don't post a separate status comment
  } else {
    // Standard comment without status update
    formattedComment = `
## 💬 Tester Comment

${commentBody}

_This comment was posted from the [test request dashboard](http://localhost:3000/request/${requestId})._
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

The test request status has been updated:

**Previous status:** ${oldStatus}
**New status:** ${newStatus}

View the [test request details](http://localhost:3000/request/${requestId}) for more information.
      `;
      
      await postComment(testRequest.repository, testRequest.prNumber, statusComment);
    }
  }
  
  return { success: true, testRequest };
}

/**
 * Submit a test report for a PR
 */
async function submitTestReport(requestId, summary, details, testResult) {
  const testRequests = loadTestRequests();
  const testRequest = testRequests.find(r => r.id === requestId);
  
  if (!testRequest) {
    throw new Error(`Test request with ID ${requestId} not found`);
  }
  
  if (!testRequest.repository || !testRequest.prNumber) {
    throw new Error('Test request does not have valid repository or PR information');
  }
  
  // Save the report to the test request
  testRequest.report = {
    summary,
    details,
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

### Summary
${summary}

### Details & Bug Reports
${details}

### Status
**Test result:** ${testResult === 'complete-pass' ? '✅ PASS' : '❌ FAIL'}

_This report was submitted from the [test request dashboard](http://localhost:3000/request/${requestId})._
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
## 👋 Welcome to GetYourTester!

Thank you for opening this pull request. GetYourTester provides expert manual testing directly in your GitHub PRs.

### 🧪 How to Request Testing

To request manual testing for this PR, simply add a comment with the command \`/test\` followed by your testing requirements:

\`\`\`
/test
Environment: Production
Browsers: Chrome, Firefox, Safari
Devices: Desktop, Mobile
Scope: Verify the new login flow works as expected
Instructions: Pay special attention to error states and validation
\`\`\`

### 🔍 What Happens Next

1. Your test request will be processed immediately
2. A tester will be assigned to your PR
3. You'll receive updates and a detailed test report

If you have any questions, feel free to ask!
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
  
  // Get PR description
  const prDescription = await fetchPRDescription(repository.full_name, issue.number);
  
  // Generate test request object
  const testRequest = {
    id: requestId,
    repository: repository.full_name,
    prNumber: issue.number,
    requestedBy: sender.login,
    requestedAt: new Date().toISOString(),
    comment: comment.body,
    prDescription: prDescription,
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
  
  // Post acknowledgment comment
  const acknowledgmentComment = `
## 🧪 Test Request Received

Thank you for requesting manual testing! Your request has been received and is being processed.

* **Request ID:** \`${requestId}\`
* **Requested by:** @${sender.login}
* **Status:** Pending

${Object.keys(testRequest.parsedDetails).length > 0 ? '### Test Requirements\n' + 
  Object.entries(testRequest.parsedDetails).map(([key, value]) => `* **${key}:** ${value}`).join('\n') : ''}

A tester will be assigned to this PR soon. You'll receive a notification once testing begins.

View the [test request dashboard](http://localhost:3000/request/${requestId}) for more information.
  `;
  
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
  if (!octokit) return;
  
  try {
    const response = await octokit.users.getAuthenticated();
    console.log(`✅ GitHub token successfully verified! Authenticated as: ${response.data.login}`);
    simulatedMode = false;
  } catch (error) {
    console.error('❌ GitHub token verification failed:', error.message);
    console.warn('⚠️ Switching to simulated mode');
    simulatedMode = true;
  }
}

// Run the token test
testGitHubToken();

module.exports = {
  processWebhookEvent,
  postComment,
  addLabel,
  loadTestRequests,
  saveTestRequests,
  parseTestRequestComment,
  updateTestRequestStatus,
  postCommentToPR,
  submitTestReport
}; 