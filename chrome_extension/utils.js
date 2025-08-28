// Utility functions for QA Copilot Chrome Extension

/**
 * Detects if the current page is a Linear or Jira ticket
 * @returns {Object|null} { platform: 'linear'|'jira', ticketData: {title, description} }
 */
function detectTicket() {
  const url = window.location.href;
  
  if (url.includes('linear.app')) {
    return detectLinearTicket();
  } else if (url.includes('atlassian.net')) {
    return detectJiraTicket();
  }
  
  return null;
}

/**
 * Detects Linear ticket and extracts data
 * @returns {Object|null}
 */
function detectLinearTicket() {
  // Check if we're on an issue page (contains issue ID pattern)
  const issuePattern = /\/issue\/[A-Z]+-\d+/;
  if (!issuePattern.test(window.location.pathname)) {
    return null;
  }

  // Try multiple selectors for title
  const titleSelectors = [
    '[data-testid="issue-title"]',
    '.issue-title',
    'h1[contenteditable="true"]',
    '.title-input',
    '[aria-label*="title"]'
  ];
  
  // Try multiple selectors for description
  const descriptionSelectors = [
    '[data-testid="issue-description"]',
    '.issue-description',
    '.ProseMirror',
    '[data-testid="editor-content"]',
    '.description-content'
  ];

  const title = getElementText(titleSelectors);
  const description = getElementText(descriptionSelectors);

  if (title) {
    return {
      platform: 'linear',
      ticketData: {
        title: title.trim(),
        description: description ? description.trim() : ''
      }
    };
  }

  return null;
}

/**
 * Detects Jira ticket and extracts data
 * @returns {Object|null}
 */
function detectJiraTicket() {
  // Check if we're on an issue page
  const issuePattern = /\/browse\/[A-Z]+-\d+/;
  if (!issuePattern.test(window.location.pathname)) {
    return null;
  }

  // Try multiple selectors for title
  const titleSelectors = [
    '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
    '#summary-val',
    '.summary',
    'h1[data-test-id*="issue-title"]',
    '[aria-label*="Summary"]'
  ];
  
  // Try multiple selectors for description
  const descriptionSelectors = [
    '[data-testid="issue.views.field.rich-text.description"]',
    '#description-val',
    '.description',
    '.ak-renderer-document',
    '[data-testid*="description"]'
  ];

  const title = getElementText(titleSelectors);
  const description = getElementText(descriptionSelectors);

  if (title) {
    return {
      platform: 'jira',
      ticketData: {
        title: title.trim(),
        description: description ? description.trim() : ''
      }
    };
  }

  return null;
}

/**
 * Helper function to get text from multiple selectors
 * @param {Array} selectors - Array of CSS selectors to try
 * @returns {string|null}
 */
function getElementText(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.textContent || element.innerText || '';
    }
  }
  return null;
}

/**
 * Calls the external API to get QA insights
 * @param {Object} ticketData - {title, description}
 * @returns {Promise<Object>} API response
 */
async function getQAInsights(ticketData) {
  try {
    const response = await fetch('https://www.firstqa.dev/generate-test-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling QA API:', error);
    throw error;
  }
}

/**
 * Formats QA insights as markdown
 * @param {Object} insights - {smartQuestions, testCases, risks}
 * @returns {string} Markdown formatted text
 */
function formatAsMarkdown(insights) {
  let markdown = '# QA Copilot Insights\n\n';
  
  if (insights.smartQuestions && insights.smartQuestions.length > 0) {
    markdown += '## 🤔 Smart Questions\n\n';
    insights.smartQuestions.forEach(question => {
      markdown += `- ${question}\n`;
    });
    markdown += '\n';
  }
  
  if (insights.testCases && insights.testCases.length > 0) {
    markdown += '## 🧪 Suggested Test Cases\n\n';
    insights.testCases.forEach(testCase => {
      markdown += `- ${testCase}\n`;
    });
    markdown += '\n';
  }
  
  if (insights.risks && insights.risks.length > 0) {
    markdown += '## ⚠️ Risks\n\n';
    insights.risks.forEach(risk => {
      markdown += `- ${risk}\n`;
    });
    markdown += '\n';
  }
  
  return markdown;
}

/**
 * Copies text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Debounce function to limit API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
} 