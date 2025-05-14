# GetYourTester

> Expert manual testing directly in your GitHub PRs.

GetYourTester is a GitHub app that allows developers to request manual testing on their pull requests. This implementation provides a webhook server that responds to GitHub events and processes test requests.

## Features

- 🚀 **Simple Integration**: Request testing with a single comment (`/test`)
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
   - Send "Issue comments" events
   - Content type should be "application/json"

2. Create a pull request in your repository
3. Comment `/test` on the PR to request testing
4. The webhook server will:
   - Add a "testing-requested" label to the PR
   - Post an acknowledgment comment
   - Store the test request in the local database
   - (Optionally) Send a notification email

5. View the test request in the dashboard at http://localhost:3000/dashboard

## Webhook Implementation

The webhook implementation consists of two main components:

1. **webhook-server.js**: The main Express server that receives webhook events and processes them
2. **fixed-webhook.js**: A client that connects to smee.io and forwards events to the local server

When a PR comment containing "/test" is received:

```
GitHub PR Comment → GitHub Webhook → smee.io → fixed-webhook.js → webhook-server.js → githubService
```

The githubService then:
1. Creates a test request record
2. Posts an acknowledgment comment on the PR
3. Adds a label to the PR
4. Stores the test request for the dashboard

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