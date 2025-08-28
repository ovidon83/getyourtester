# FirstQA

> **Your First QA Hire for Solo Founders & Startups** - Ovi AI + Human QA Experts

FirstQA is a comprehensive QA platform that combines AI-powered analysis with on-demand human QA expertise. Our platform offers instant PR feedback through Ovi AI and connects you with expert QA engineers for complex testing scenarios.

## 🚀 **What We Offer**

### **🤖 Ovi AI - Your 24/7 QA Agent**
- **⚡ Instant Analysis**: Get comprehensive QA feedback in seconds, not days
- **🎯 Smart Testing**: AI analyzes tickets and PRs like a senior QA engineer
- **🔍 Risk Detection**: Identifies potential issues, bugs, and edge cases
- **📋 Test Recipes**: Generates actionable test plans and scenarios
- **💡 Expert Questions**: Asks the right questions a QA engineer would ask

### **👥 Human QA Experts - When You Need Real Expertise**
- **🔬 Exploratory Testing**: Deep-dive testing for complex features
- **🛡️ Security Testing**: Vulnerability assessment and penetration testing
- **📱 Cross-Platform Validation**: Testing across devices, browsers, and platforms
- **🔄 Regression Testing**: Full/partial regression testing for major releases
- **🎭 User Experience Testing**: Real user scenario validation

## ✨ **Key Features**

- **🎯 AC Analysis & Test Recipe**: Extract user scenarios and create comprehensive test plans
- **🔧 Code-diff & Risk Analysis**: Deep technical analysis with risk assessment
- **🤖 AI-Powered QA Review**: Instant expert review of tickets and PRs
- **👥 Human QA Experts**: On-demand senior QA when it really matters
- **⚡ Lightning Fast**: Get full QA support in seconds, no hiring required
- **🔄 Human + AI**: Best of both worlds - speed and confidence

## 🏗️ **Project Structure**

```
FirstQA/
├── 📁 docs/                          # Documentation per product area
│   ├── 📁 landing-page/             # Landing page documentation
│   ├── 📁 github-app/               # GitHub App implementation docs
│   ├── 📁 chrome-extension/         # Chrome extension docs (future)
│   ├── 📁 api/                      # API documentation
│   └── 📁 deployment/               # Deployment guides
├── 📁 src/                          # Main application source
│   ├── 📁 modules/                  # Feature modules
│   ├── 📁 components/               # Reusable UI components
│   ├── 📁 services/                 # Business logic services
│   ├── 📁 config/                   # Configuration files
│   ├── 📁 routes/                   # Express.js routes
│   ├── 📁 views/                    # EJS templates
│   ├── 📁 utils/                    # Utility functions
│   └── 📁 public/                   # Static assets
├── 📁 FirstQA-Extension/            # Chrome extension (future)
├── 📁 ai/                           # AI integration and prompts
├── 📁 data/                         # Data storage (JSON files)
├── 📁 public/                       # Public static assets
├── webhook-server.js                # Main production server
├── fixed-webhook.js                 # Webhook proxy for development
└── package.json                     # Dependencies and scripts
```

## 🛠️ **Tech Stack**

- **Frontend**: EJS templates, Bootstrap 5, Tailwind-inspired CSS
- **Backend**: Node.js/Express
- **AI**: OpenAI GPT-4 integration
- **Storage**: JSON file storage (no database required)
- **Integration**: GitHub API via Octokit, GitHub App authentication
- **Deployment**: Ready for production deployment

## 🚀 **Getting Started**

### **Prerequisites**

- Node.js (v14+)
- npm
- A GitHub repository with a webhook configured
- A smee.io channel for webhook proxying (for local development)

### **Installation**

1. **Clone the repository**:
```bash
git clone https://github.com/ovidon83/firstqa.git
cd firstqa
```

2. **Install dependencies**:
```bash
npm install
```

3. **Create a `.env` file** with your configuration:
```bash
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

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o

# Webhook configuration
WEBHOOK_PROXY_URL=https://smee.io/your-smee-url
ENABLE_GITHUB=true

# Notification settings
NOTIFICATION_EMAIL=your-email@example.com
```

4. **Start the webhook server**:
```bash
npm start
```

5. **Visit the application**:
- Main site: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- Documentation: http://localhost:3000/docs

## 🤖 **Ovi AI - Your AI QA Agent**

FirstQA features **Ovi**, an AI-powered QA Agent that provides comprehensive analysis for your pull requests.

### **What Ovi Analyzes**

1. **🔍 Change Review**
   - Analyzes PR metadata (title, description, comments)
   - Identifies potential ambiguity or missing requirements
   - Generates smart questions a QA engineer would ask
   - Assesses risks and edge cases
   - Provides a **Production Readiness Score** (1-10)

2. **🧪 Test Recipe**
   - Creates comprehensive test scenarios (Critical Path, General, Edge Cases)
   - Suggests automation plans (Unit, Integration, E2E tests)
   - Provides specific test cases with actionable steps

3. **📊 Code Quality Assessment**
   - Identifies affected modules and dependencies
   - Analyzes existing test coverage and gaps
   - Recommends best practices and improvements

### **Production Readiness Scoring**

Ovi uses a business-focused scoring system (1-10) to assess release readiness:

- **🚀 9-10: Ship It!** - No critical issues, ready for production
- **✅ 7-8: Ship with Monitoring** - Minor issues, can be monitored and fixed quickly
- **⚠️ 5-6: Needs More Testing** - Potential issues affecting some users
- **❌ 3-4: Block Release** - Issues that could significantly impact customer experience
- **🚨 1-2: Critical Block** - Critical bugs that will definitely affect customers

## 🌐 **Production Deployment**

### **Environment Setup**
- Set `NODE_ENV=production`
- Configure production database/storage
- Set up proper SSL certificates
- Configure production webhook endpoints

### **Deployment Options**
- **Heroku**: Easy deployment with Git integration
- **AWS**: EC2, ECS, or Lambda deployment
- **DigitalOcean**: App Platform or Droplet deployment
- **Vercel**: Serverless deployment option

## 📚 **Documentation & Support**

- **📖 Documentation**: [View Documentation →](https://firstqa.dev/docs)
- **💬 Support**: [Get Support](https://firstqa.dev/support)
- **📧 Contact**: [Contact Us](https://firstqa.dev/contact)
- **💰 Pricing**: [View Plans](https://firstqa.dev/pricing)

## 🔗 **Quick Links**

- **🚀 Start Free Trial**: [Get Started](https://firstqa.dev)
- **📅 Schedule Demo**: [Book Demo](https://calendly.com/firstqa/demo)
- **📧 Contact Sales**: [Contact Sales](mailto:sales@firstqa.dev)
- **🐛 Report Issues**: [GitHub Issues](https://github.com/ovidon83/firstqa/issues)

## 📄 **License**

This project is licensed under the ISC License.

---

**Built with ❤️ by the FirstQA Team**

*The Only QA Stack Your Startup Needs* 