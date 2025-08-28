# QA Copilot Chrome Extension

AI-powered QA insights for Linear and Jira tickets. Get smart questions, test cases, and risk analysis directly in your browser.

## Features

- 🎯 **Auto-detection**: Automatically detects Linear and Jira tickets
- 🤔 **Smart Questions**: AI-generated clarifying questions
- 🧪 **Test Cases**: Suggested test scenarios based on ticket content  
- ⚠️ **Risk Analysis**: Potential risks and edge cases to consider
- 📋 **Copy to Clipboard**: Export insights as markdown
- 🎨 **Clean UI**: Collapsible floating sidebar with modern design

## Supported Platforms

- **Linear**: `https://*.linear.app/*`
- **Jira**: `https://*.atlassian.net/*`

## Installation

1. **Download the extension files** to a local folder
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Navigate to any Linear or Jira ticket** to see the QA Copilot panel

## Usage

1. Open any Linear or Jira ticket in your browser
2. The QA Copilot sidebar will automatically appear on the right side
3. Wait for AI analysis to complete (shows loading spinner)
4. Review the generated insights:
   - 🤔 Smart Questions
   - 🧪 Suggested Test Cases  
   - ⚠️ Risks
5. Click "Copy to Clipboard" to export as markdown
6. Click the header to collapse/expand the panel

## File Structure

```
├── manifest.json    # Extension configuration
├── content.js       # Main content script
├── utils.js         # Utility functions
├── ui.css          # Styling
└── README.md       # This file
```

## API Integration

The extension calls the GetYourTester Copilot API:
- **Endpoint**: `POST https://www.getyourtester.com/generate-test-recipe`
- **Request**: `{ title: string, description: string }`
- **Response**: `{ smartQuestions: string[], testCases: string[], risks: string[] }`

## Development

- Built with Manifest v3
- Pure JavaScript (no frameworks)
- Works with Single Page Applications (SPA routing)
- Responsive design with mobile support
- Accessibility features included

## Browser Support

- Chrome 88+ (Manifest v3 required)
- Other Chromium-based browsers with Manifest v3 support

## Troubleshooting

**Panel not appearing?**
- Ensure you're on a Linear or Jira ticket page
- Check if the URL matches the supported patterns
- Try refreshing the page

**API errors?**
- Check browser console for error messages
- Verify internet connection
- Ensure the GetYourTester API is accessible

**Styling issues?**
- The extension uses high z-index (10000) to appear above page content
- Check for CSS conflicts with the host site

## Privacy & Security

- Only activates on Linear and Jira domains
- Sends ticket title and description to GetYourTester API
- No data is stored locally
- Uses Content Security Policy for XSS protection 