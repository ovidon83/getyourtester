// QA Copilot Chrome Extension - Content Script

(function() {
  'use strict';
  
  // Global state
  let qaPanel = null;
  let currentTicketData = null;
  let isCollapsed = false;
  let isLoading = false;
  
  // Debounced function to check for ticket changes
  const debouncedTicketCheck = debounce(checkForTicketChanges, 1000);
  
  /**
   * Initialize the extension
   */
  function init() {
    // Check if we're on a ticket page
    checkAndSetupPanel();
    
    // Set up observers for dynamic content changes
    setupPageObservers();
    
    // Listen for navigation changes (SPA routing)
    setupNavigationListeners();
  }
  
  /**
   * Check if current page has a ticket and setup panel accordingly
   */
  function checkAndSetupPanel() {
    const ticketInfo = detectTicket();
    
    if (ticketInfo) {
      if (!qaPanel) {
        createPanel();
      }
      
      // Check if ticket data has changed
      if (!currentTicketData || 
          currentTicketData.title !== ticketInfo.ticketData.title ||
          currentTicketData.description !== ticketInfo.ticketData.description) {
        
        currentTicketData = ticketInfo.ticketData;
        loadQAInsights(ticketInfo.ticketData);
      }
    } else {
      if (qaPanel) {
        showNoTicketState();
      }
    }
  }
  
  /**
   * Setup observers for dynamic content changes
   */
  function setupPageObservers() {
    // Observer for DOM changes
    const observer = new MutationObserver(() => {
      debouncedTicketCheck();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }
  
  /**
   * Setup navigation listeners for SPA routing
   */
  function setupNavigationListeners() {
    // Listen for browser navigation
    window.addEventListener('popstate', () => {
      setTimeout(checkAndSetupPanel, 500);
    });
    
    // Listen for programmatic navigation (pushState/replaceState)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      setTimeout(checkAndSetupPanel, 500);
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(history, arguments);
      setTimeout(checkAndSetupPanel, 500);
    };
  }
  
  /**
   * Check for ticket changes (called by debounced function)
   */
  function checkForTicketChanges() {
    if (qaPanel) {
      checkAndSetupPanel();
    }
  }
  
  /**
   * Create the floating panel UI
   */
  function createPanel() {
    if (qaPanel) {
      return; // Panel already exists
    }
    
    qaPanel = document.createElement('div');
    qaPanel.id = 'qa-copilot-sidebar';
    qaPanel.innerHTML = getPanelHTML();
    
    document.body.appendChild(qaPanel);
    
    // Setup event listeners
    setupPanelEventListeners();
  }
  
  /**
   * Get the HTML structure for the panel
   */
  function getPanelHTML() {
    return `
      <div class="qa-header">
        <h3 class="qa-title">
          🤖 QA Copilot
        </h3>
        <button class="qa-toggle" title="Toggle panel">
          ${isCollapsed ? '▲' : '▼'}
        </button>
      </div>
      <div class="qa-content">
        <div class="qa-loading">
          <div class="qa-spinner"></div>
          <div>Analyzing ticket...</div>
        </div>
      </div>
    `;
  }
  
  /**
   * Setup event listeners for the panel
   */
  function setupPanelEventListeners() {
    const header = qaPanel.querySelector('.qa-header');
    const toggle = qaPanel.querySelector('.qa-toggle');
    
    // Toggle panel collapse/expand
    header.addEventListener('click', togglePanel);
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
  }
  
  /**
   * Toggle panel collapsed state
   */
  function togglePanel() {
    isCollapsed = !isCollapsed;
    
    if (isCollapsed) {
      qaPanel.classList.add('collapsed');
    } else {
      qaPanel.classList.remove('collapsed');
    }
    
    const toggle = qaPanel.querySelector('.qa-toggle');
    toggle.textContent = isCollapsed ? '▲' : '▼';
  }
  
  /**
   * Load QA insights from the API
   */
  async function loadQAInsights(ticketData) {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingState();
    
    try {
      const insights = await getQAInsights(ticketData);
      displayInsights(insights);
    } catch (error) {
      console.error('Failed to load QA insights:', error);
      showErrorState(error.message);
    } finally {
      isLoading = false;
    }
  }
  
  /**
   * Show loading state
   */
  function showLoadingState() {
    const content = qaPanel.querySelector('.qa-content');
    content.innerHTML = `
      <div class="qa-loading">
        <div class="qa-spinner"></div>
        <div>Analyzing ticket...</div>
      </div>
    `;
  }
  
  /**
   * Show error state
   */
  function showErrorState(errorMessage) {
    const content = qaPanel.querySelector('.qa-content');
    content.innerHTML = `
      <div class="qa-error">
        <strong>Failed to load insights:</strong><br>
        ${errorMessage}
      </div>
      <div class="qa-no-ticket">
        <p>Please try refreshing the page or check your connection.</p>
      </div>
    `;
  }
  
  /**
   * Show no ticket detected state
   */
  function showNoTicketState() {
    const content = qaPanel.querySelector('.qa-content');
    content.innerHTML = `
      <div class="qa-no-ticket">
        <h3>No ticket detected</h3>
        <p>Navigate to a Linear or Jira ticket to get AI-powered QA insights.</p>
      </div>
    `;
  }
  
  /**
   * Display the QA insights in the panel
   */
  function displayInsights(insights) {
    const content = qaPanel.querySelector('.qa-content');
    
    let html = '';
    
    // Smart Questions section
    if (insights.smartQuestions && insights.smartQuestions.length > 0) {
      html += `
        <div class="qa-section questions">
          <h4 class="qa-section-title">🤔 Smart Questions</h4>
          <ul class="qa-list">
            ${insights.smartQuestions.map(question => 
              `<li class="qa-list-item">${escapeHtml(question)}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
    // Test Cases section
    if (insights.testCases && insights.testCases.length > 0) {
      html += `
        <div class="qa-section tests">
          <h4 class="qa-section-title">🧪 Suggested Test Cases</h4>
          <ul class="qa-list">
            ${insights.testCases.map(testCase => 
              `<li class="qa-list-item">${escapeHtml(testCase)}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
    // Risks section
    if (insights.risks && insights.risks.length > 0) {
      html += `
        <div class="qa-section risks">
          <h4 class="qa-section-title">⚠️ Risks</h4>
          <ul class="qa-list">
            ${insights.risks.map(risk => 
              `<li class="qa-list-item">${escapeHtml(risk)}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
    // Copy button
    html += `
      <button class="qa-copy-button" id="qa-copy-btn">
        📋 Copy to Clipboard
      </button>
    `;
    
    content.innerHTML = html;
    
    // Setup copy button
    const copyBtn = content.querySelector('#qa-copy-btn');
    copyBtn.addEventListener('click', () => copyInsightsToClipboard(insights));
  }
  
  /**
   * Copy insights to clipboard as markdown
   */
  async function copyInsightsToClipboard(insights) {
    const copyBtn = qaPanel.querySelector('#qa-copy-btn');
    const originalText = copyBtn.textContent;
    
    try {
      const markdown = formatAsMarkdown(insights);
      const success = await copyToClipboard(markdown);
      
      if (success) {
        copyBtn.textContent = '✅ Copied!';
        copyBtn.classList.add('copied');
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.remove('copied');
        }, 2000);
      } else {
        throw new Error('Copy failed');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      copyBtn.textContent = '❌ Copy failed';
      
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    }
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Remove the panel (cleanup)
   */
  function removePanel() {
    if (qaPanel) {
      qaPanel.remove();
      qaPanel = null;
      currentTicketData = null;
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', removePanel);
  
})(); 