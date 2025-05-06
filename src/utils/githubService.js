/**
 * GitHub Service for PR interactions
 * Handles PR comments, labels, and status updates
 */
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./emailService');

// Initialize Octokit with the GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Post a welcome comment on a new PR
 */
async function postWelcomeComment(owner, repo, prNumber) {
  try {
    const welcomeMessage = `
## Welcome to GetYourTester! 👋

Thanks for opening this pull request. Need professional manual testing? I'm here to help!

### How to request testing:
1. Simply comment \`/test\` on this PR
2. Our team will be notified and start testing your changes
3. You'll receive a detailed test report as a comment here

Let me know if you have any questions!
`;

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: welcomeMessage,
    });

    console.log(`Welcome comment posted to ${owner}/${repo}#${prNumber}`);
    return true;
  } catch (error) {
    console.error('Error posting welcome comment:', error);
    return false;
  }
}

/**
 * Post an acknowledgment when testing is requested
 */
async function postAcknowledgmentComment(owner, repo, prNumber) {
  try {
    const acknowledgmentMessage = `
## Testing Requested ✅

Your test request has been received and our team has been notified.

- **Status**: Pending
- **Expected turnaround**: Within 24 hours

We'll update this PR when testing begins and post a detailed report when complete.
Thank you for using GetYourTester!
`;

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: acknowledgmentMessage,
    });

    console.log(`Acknowledgment comment posted to ${owner}/${repo}#${prNumber}`);
    return true;
  } catch (error) {
    console.error('Error posting acknowledgment comment:', error);
    return false;
  }
}

/**
 * Update the PR label based on test status
 */
async function updatePrLabel(owner, repo, prNumber, status) {
  try {
    // Define label configurations
    const labelConfigs = {
      'Pending': { name: 'GTY-Pending', color: 'fbca04', description: 'GetYourTester: Testing pending' },
      'In Progress': { name: 'GTY-In-Progress', color: '0075ca', description: 'GetYourTester: Testing in progress' },
      'Complete-PASS': { name: 'GTY-Complete-PASS', color: '0e8a16', description: 'GetYourTester: Testing passed' },
      'Complete-FAIL': { name: 'GTY-Complete-FAIL', color: 'd73a4a', description: 'GetYourTester: Testing failed' },
    };

    const labelConfig = labelConfigs[status];
    if (!labelConfig) {
      console.error(`Invalid status: ${status}`);
      return false;
    }

    // First, ensure the label exists in the repository
    try {
      await octokit.issues.getLabel({
        owner,
        repo,
        name: labelConfig.name,
      });
    } catch (error) {
      if (error.status === 404) {
        // Label doesn't exist, create it
        await octokit.issues.createLabel({
          owner,
          repo,
          name: labelConfig.name,
          color: labelConfig.color,
          description: labelConfig.description,
        });
      } else {
        throw error;
      }
    }

    // Remove any existing GetYourTester labels
    const currentLabels = await octokit.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number: prNumber,
    });

    const gtyLabels = currentLabels.data
      .filter(label => label.name.startsWith('GTY-'))
      .map(label => label.name);

    for (const label of gtyLabels) {
      await octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: prNumber,
        name: label,
      });
    }

    // Add the new label
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: [labelConfig.name],
    });

    console.log(`Updated label on ${owner}/${repo}#${prNumber} to ${labelConfig.name}`);
    return true;
  } catch (error) {
    console.error('Error updating PR label:', error);
    return false;
  }
}

/**
 * Post a test report comment on the PR
 */
async function postTestReport(owner, repo, prNumber, reportContent) {
  try {
    const reportHeader = `## GetYourTester Test Report\n\n`;
    const fullReport = reportHeader + reportContent;

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: fullReport,
    });

    console.log(`Test report posted to ${owner}/${repo}#${prNumber}`);
    return true;
  } catch (error) {
    console.error('Error posting test report:', error);
    return false;
  }
}

/**
 * Handler for the /test command in PR comments
 */
async function handleTestCommand(owner, repo, prNumber, sender) {
  try {
    // Get PR details
    const { data: prData } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Generate a unique ID for this test request
    const requestId = uuidv4();
    
    // Create the test request object
    const testRequest = {
      id: requestId,
      owner,
      repo,
      prNumber,
      prTitle: prData.title,
      prUrl: prData.html_url,
      requestedAt: new Date().toISOString(),
      requestedBy: sender,
      status: 'Pending'
    };

    // Save to JSON storage
    saveTestRequest(testRequest);

    // Post acknowledgment comment
    await postAcknowledgmentComment(owner, repo, prNumber);

    // Update PR label
    await updatePrLabel(owner, repo, prNumber, 'Pending');

    // Send email notification
    await emailService.sendTestRequestEmail(testRequest);

    return testRequest;
  } catch (error) {
    console.error('Error handling test command:', error);
    throw error;
  }
}

/**
 * Save a test request to JSON storage
 */
function saveTestRequest(testRequest) {
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const testRequestsPath = path.join(dataDir, 'test-requests.json');
    let testRequests = [];

    if (fs.existsSync(testRequestsPath)) {
      const fileContent = fs.readFileSync(testRequestsPath, 'utf8');
      testRequests = JSON.parse(fileContent);
    }

    testRequests.push(testRequest);
    fs.writeFileSync(testRequestsPath, JSON.stringify(testRequests, null, 2));
    
    console.log(`Test request ${testRequest.id} saved to storage`);
    return true;
  } catch (error) {
    console.error('Error saving test request:', error);
    return false;
  }
}

/**
 * Process a GitHub webhook event
 */
async function processWebhookEvent(event) {
  try {
    const eventType = event.headers['x-github-event'];
    const payload = event.body;

    // Handle PR opened event
    if (eventType === 'pull_request' && payload.action === 'opened') {
      const { repository, pull_request } = payload;
      await postWelcomeComment(
        repository.owner.login,
        repository.name,
        pull_request.number
      );
    }

    // Handle PR comment event
    if (eventType === 'issue_comment' && payload.action === 'created') {
      const { repository, issue, comment, sender } = payload;
      
      // Only process comments on PRs
      if (!issue.pull_request) {
        return;
      }

      // Check for /test command
      if (comment.body.trim().startsWith('/test')) {
        await handleTestCommand(
          repository.owner.login,
          repository.name,
          issue.number,
          sender.login
        );
      }
    }
  } catch (error) {
    console.error('Error processing webhook event:', error);
  }
}

module.exports = {
  postWelcomeComment,
  postAcknowledgmentComment,
  updatePrLabel,
  postTestReport,
  handleTestCommand,
  saveTestRequest,
  processWebhookEvent
}; 