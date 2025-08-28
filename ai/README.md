# OpenAI Integration for FirstQA

This module adds AI-powered QA insights to FirstQA using OpenAI's GPT-4o model.

## Features

- **Smart Questions**: AI-generated questions that testers should ask before/during testing
- **Test Cases**: Specific, actionable test scenarios based on code changes
- **Risk Assessment**: Potential issues, edge cases, and areas of concern

## Setup

### 1. Install Dependencies

The OpenAI SDK is already installed via:
```bash
npm install openai
```

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o
```

### 3. Test the Integration

Run the test script to verify everything is working:

```bash
npm run test:ai
```

## Usage

### Basic Usage

```javascript
const { generateQAInsights } = require('./ai/openaiClient');

const result = await generateQAInsights({
  repo: "owner/repository-name",
  pr_number: 123,
  title: "Add user authentication",
  body: "This PR implements JWT-based authentication...",
  diff: "diff --git a/src/auth.js..."
});

if (result.success) {
  console.log('Smart Questions:', result.data.smartQuestions);
  console.log('Test Cases:', result.data.testCases);
  console.log('Risks:', result.data.risks);
} else {
  console.error('Error:', result.error);
}
```

### Response Format

The `generateQAInsights` function returns:

```javascript
{
  success: boolean,
  data?: {
    smartQuestions: string[],
    testCases: string[],
    risks: string[]
  },
  error?: string,
  details?: string,
  metadata: {
    repo: string,
    pr_number: number,
    model: string,
    attempt: number,
    timestamp: string
  }
}
```

## File Structure

```
ai/
├── README.md           # This documentation
├── openaiClient.js     # Main OpenAI client and logic
└── prompts/
    └── default.ejs     # EJS template for the AI prompt

scripts/
└── testAI.js          # Test script for the AI functionality
```

## Components

### `ai/openaiClient.js`

Main module containing:
- `generateQAInsights(options)`: Generate QA insights for a PR
- `testConnection()`: Test OpenAI API connection

Features:
- Automatic retry logic (2 attempts)
- Structured JSON response validation
- Comprehensive error handling
- EJS template rendering

### `ai/prompts/default.ejs`

EJS template that formats the prompt sent to OpenAI. It includes:
- Repository and PR context
- Code diff analysis
- Structured output format requirements
- QA-focused guidance

### `scripts/testAI.js`

Test script that:
- Tests OpenAI connection
- Generates insights for dummy PR data
- Displays formatted results
- Measures performance

## Customization

### Custom Prompts

To create custom prompts, add new EJS templates in `ai/prompts/` and modify the client to use them:

```javascript
// In openaiClient.js, change the template path:
const promptTemplatePath = path.join(__dirname, 'prompts', 'custom.ejs');
```

### Model Configuration

Change the OpenAI model by updating the environment variable:

```bash
OPENAI_MODEL=gpt-4-turbo  # or other supported models
```

## Error Handling

The system handles several error scenarios:

1. **Missing API Key**: Graceful degradation with clear error messages
2. **API Quota Exceeded**: Proper error reporting with billing information
3. **Invalid JSON Response**: Automatic retry with fallback
4. **Network Issues**: Retry logic with timeout handling
5. **Template Errors**: File existence validation

## Performance

- Typical response time: 2-5 seconds
- Automatic retry adds 1-2 seconds on failure
- Token usage: ~500-1500 tokens per request (depending on diff size)

## Integration with FirstQA

This AI module can be integrated into the main FirstQA workflow by:

1. Adding AI insights to GitHub PR comments
2. Including insights in test request dashboard
3. Email notifications with AI-generated test guidance
4. Webhook processing enhancement

Example integration in GitHub service:

```javascript
const { generateQAInsights } = require('../ai/openaiClient');

// In githubService.js
async function handleTestRequest(repository, issue, comment, sender) {
  // ... existing code ...
  
  // Generate AI insights
  const insights = await generateQAInsights({
    repo: `${repository.owner}/${repository.name}`,
    pr_number: issue.number,
    title: issue.title,
    body: issue.body,
    diff: await fetchPRDiff(repository, issue.number)
  });
  
  if (insights.success) {
    // Include insights in PR comment or test request
    await postAIInsights(repository, issue.number, insights.data);
  }
}
```

## Troubleshooting

### Common Issues

1. **"API Key not found"**: Ensure `OPENAI_API_KEY` is set in `.env`
2. **"Quota exceeded"**: Check OpenAI billing and usage limits
3. **"Template not found"**: Verify `ai/prompts/default.ejs` exists
4. **"Invalid JSON"**: Check OpenAI model response format

### Debugging

Enable debug logging by modifying the client to log the full prompt and response:

```javascript
console.log('Prompt sent to OpenAI:', prompt);
console.log('Raw response:', response);
```

## Contributing

When modifying the AI integration:

1. Test with `npm run test:ai`
2. Validate JSON response structure
3. Check token usage and costs
4. Update this documentation
5. Consider prompt engineering best practices 