# GetYourTester

> Expert manual testing directly in your GitHub PRs.

GetYourTester is a GitHub app that allows developers to request manual testing on their pull requests. This implementation provides a webhook server that responds to GitHub events and processes test requests.

## Features

- ⚡ **Automatic Hybrid Analysis**: Comprehensive analysis triggered when PRs are opened
- 🤖 **Ovi QA Agent**: AI-powered hybrid analysis combining business requirements with technical implementation:
  - **🎯 Feature Testing**: Extracts user scenarios from PR description for business validation
  - **🔧 Technical Testing**: Code-level analysis for bugs, security, and implementation issues  
  - **🐛 Bugs Detection**: Real functional bugs found during code review with file references
- 🚀 **Manual Testing**: `/test` command provides the same comprehensive hybrid analysis format
- 📊 **Dashboard**: View and manage test requests 
- 🏷️ **Status Tracking**: Automatically label PRs with testing status
- 💬 **Detailed Reports**: Provide comprehensive test feedback

## Tech Stack

- Node.js/Express
- EJS templates
- Bootstrap 5
- JSON file storage (no database required)
- GitHub API via Octokit
- GitHub App authentication

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm
- A GitHub repository with a webhook configured
- A smee.io channel for webhook proxying (for local development)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/getyourtester.git
cd getyourtester
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
# Server configuration
PORT=3000
NODE_ENV=development

# Session management
SESSION_SECRET=your-session-secret-key

# GitHub App configuration (recommended)
GITHUB_APP_ID=your-app-id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# GitHub PAT (legacy, optional fallback)
GITHUB_TOKEN=your-github-token

# Webhook configuration
WEBHOOK_PROXY_URL=https://smee.io/your-smee-url
ENABLE_GITHUB=true

# Notification settings
NOTIFICATION_EMAIL=your-email@example.com
```

4. Start the webhook server:

```bash
npm run dev
```

5. In a separate terminal, start the smee client to forward GitHub webhooks:

```bash
npm run webhook
```

6. Visit http://localhost:3000 to see the application
7. Visit http://localhost:3000/dashboard to view test requests

### GitHub App Authentication

GetYourTester uses GitHub App authentication for secure, repository-specific access. This allows the app to:

1. Access repositories where it's installed
2. Use repository-specific permissions
3. Work across multiple GitHub accounts

#### Setting up GitHub App Authentication

1. Create a GitHub App in your GitHub account:
   - Go to Settings > Developer settings > GitHub Apps
   - Click "New GitHub App"
   - Set the app name, homepage URL, and webhook URL
   - Configure permissions:
     - Repository permissions: Contents (Read & write), Issues (Read & write), Pull requests (Read & write)
   - Generate a private key and download it

2. Add the GitHub App credentials to your `.env` file:
   ```
   GITHUB_APP_ID=your-app-id
   GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
   ```

3. Install the app on repositories where you want to use GetYourTester

#### Legacy PAT Authentication (Fallback)

For backward compatibility, GetYourTester can also use a Personal Access Token (PAT):

1. Create a PAT with repo, issues, and pull_request scopes
2. Add it to your `.env` file as `GITHUB_TOKEN`
3. The app will use the PAT as a fallback if GitHub App authentication fails

### Usage

1. Make sure your GitHub repository has a webhook configured to:
   - Send events to your smee.io URL
   - Send "Pull requests" and "Issue comments" events
   - Content type should be "application/json"

2. **Automatic Hybrid Analysis**: When you create a pull request, Ovi QA Agent automatically provides:
   - 📋 Summary with risk level, ship score, and reasoning
   - ❓ Critical questions about user workflows and technical implementation  
   - 🐛 Real bugs detected in the code with file references
   - 🎯 Feature testing scenarios extracted from PR description
   - 🔧 Technical testing for code implementation validation
   - ⚠️ Critical risks covering business, technical, and user experience

3. **Manual Testing**: Comment `/test` on any PR to trigger the same comprehensive hybrid analysis

5. View all requests in the dashboard at http://localhost:3000/dashboard

## Webhook Implementation

The webhook implementation consists of two main components:

1. **webhook-server.js**: The main Express server that receives webhook events and processes them
2. **fixed-webhook.js**: A client that connects to smee.io and forwards events to the local server

When a PR is opened or "/test" comment is received:

```
GitHub PR/Comment → GitHub Webhook → smee.io → fixed-webhook.js → webhook-server.js → githubService
```

The githubService then:
1. Creates a test request record
2. **🤖 Ovi QA Agent analyzes the PR** (code changes, risks, test coverage)
3. Posts an acknowledgment comment with comprehensive AI insights
4. Adds a label to the PR
5. Stores the test request for the dashboard

## 🤖 Ovi QA Agent

GetYourTester features **Ovi**, an AI-powered QA Agent that provides two levels of analysis for your pull requests.

### Two Analysis Modes

**1. ⚡ Quick Analysis (Automatic on PR opening)**
- Focuses only on critical issues and deal-breakers
- Provides ship/no-ship recommendation with reasoning
- Fast analysis optimized for speed and business impact

**2. 🔍 Detailed Analysis (On-demand via `/ovi-details`)**
- Comprehensive code review and test planning
- Complete risk assessment and recommendations
- Full test recipe with automation suggestions

### What Ovi Analyzes

**Quick Analysis** automatically checks for:
- Critical security vulnerabilities
- Breaking changes that could crash production
- Data integrity issues
- Performance problems
- Build and compilation errors

**Detailed Analysis** provides:

1. **🔍 Change Review**
   - Analyzes PR metadata (title, description, comments)
   - Identifies potential ambiguity or missing requirements
   - Generates smart questions a QA engineer would ask
   - Assesses risks and edge cases
   - Provides a **Production Readiness Score** (1-10) with business-focused assessment

2. **🧪 Test Recipe**
   - Creates comprehensive test scenarios (Critical Path, General, Edge Cases)
   - Suggests automation plans (Unit, Integration, E2E tests)
   - Provides specific test cases with actionable steps

3. **📊 Code Quality Assessment**
   - Identifies affected modules and dependencies
   - Analyzes existing test coverage and gaps
   - Recommends best practices and improvements

### Production Readiness Scoring

Ovi uses a business-focused scoring system (1-10) to assess release readiness:

- **🚀 9-10: Ship It!** - No critical issues, ready for production
- **✅ 7-8: Ship with Monitoring** - Minor issues, can be monitored and fixed quickly
- **⚠️ 5-6: Needs More Testing** - Potential issues affecting some users
- **❌ 3-4: Block Release** - Issues that could significantly impact customer experience
- **🚨 1-2: Critical Block** - Critical bugs that will definitely affect customers

The scoring considers business impact, customer happiness, and technical quality from a Founder/PM/QA perspective.

### Example Output

```
### 🤖 Ovi QA Assistant by GetYourTester

#### 🔍 Change Review
**Key Questions:**
- How does this authentication change affect existing user sessions?
- Are there proper error handling mechanisms for invalid tokens?

**Risks:**
- Potential security vulnerability in token validation
- Missing rate limiting on login endpoints

**Production Readiness Score:** ✅ **8/10 - Ship with Monitoring**

*This change is ready for production with minor monitoring needed. Core functionality works well, but some edge cases should be watched.*

#### 🧪 Test Recipe
**Critical Path:**
- [ ] User login with valid credentials
- [ ] Token validation for protected routes

**Automation Plan:**
- Unit: Test JWT token generation and validation functions
- Integration: Test login endpoint with database integration
- E2E: Complete user authentication flow
```

### Testing Ovi QA Agent

Run the test script to verify Ovi's functionality:

```bash
npm run test:ovi
```

## Troubleshooting

### Website Routes Not Working (Contact, About, etc.)

If you notice that routes like `/contact`, `/about`, `/how-it-works`, or `/pricing` are not working, make sure that the `webhook-server.js` file properly imports and uses the routes from `src/routes/index.js`:

```javascript
// In webhook-server.js
const indexRoutes = require('./src/routes/index');

// Add this after middleware setup
app.use('/', indexRoutes);
```

This ensures that all the public website routes defined in `src/routes/index.js` are available when running the server.

## License

This project is licensed under the ISC License. 