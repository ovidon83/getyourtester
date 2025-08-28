# GetYourTester Project Structure

This document provides a comprehensive overview of the GetYourTester project structure after the cleanup and reorganization.

## 🏗️ **Root Directory Structure**

```
GetYourTester/
├── 📁 .git/                          # Git repository
├── 📁 docs/                          # Documentation per product area
│   ├── 📁 landing-page/             # Landing page documentation
│   ├── 📁 github-app/               # GitHub App implementation docs
│   ├── 📁 chrome-extension/         # Chrome extension docs (future)
│   ├── 📁 api/                      # API documentation
│   ├── 📁 deployment/               # Deployment guides
│   └── README.md                     # Documentation index
├── 📁 src/                          # Main application source
│   ├── 📁 modules/                  # Feature modules (future)
│   ├── 📁 components/               # Reusable UI components (future)
│   ├── 📁 services/                 # Business logic services (future)
│   ├── 📁 config/                   # Configuration files
│   │   └── env-config.txt           # Environment configuration template
│   ├── 📁 routes/                   # Express.js routes
│   ├── 📁 views/                    # EJS templates
│   ├── 📁 utils/                    # Utility functions
│   │   ├── customers.js             # Customer management
│   │   ├── emailService.js          # Email service
│   │   ├── githubAppAuth.js         # GitHub App authentication
│   │   ├── githubService.js         # GitHub API service
│   │   ├── webhookProxy.js          # Webhook forwarding
│   │   └── fixed-webhook.js         # Webhook proxy for development
│   ├── 📁 public/                   # Static assets
│   │   ├── 📁 css/                  # Stylesheets
│   │   ├── 📁 images/               # Images and icons
│   │   └── 📁 logos/                # Brand logos
│   └── app.js                       # Express application (legacy, removed)
├── 📁 GetYourTester-Extension/      # Chrome extension (future)
├── 📁 ai/                           # AI integration and prompts
│   ├── openaiClient.js              # OpenAI client and analysis logic
│   └── 📁 prompts/                  # AI prompt templates
│       ├── deep-analysis.ejs        # Deep analysis prompt
│       ├── default.ejs              # Default analysis prompt
│       └── short-analysis.ejs       # Short analysis prompt
├── 📁 data/                         # Data storage (JSON files)
│   ├── customers.json               # Customer data
│   ├── test-requests.json           # Test request data
│   ├── archived-requests.json       # Archived test requests
│   └── 📁 backups/                  # Data backups
├── 📁 public/                       # Public static assets (root level)
├── webhook-server.js                # Main production server
├── index.js                         # Production entry point
├── package.json                     # Dependencies and scripts
├── package-lock.json                # Dependency lock file
├── .gitignore                       # Git ignore rules
└── README.md                        # Project overview and getting started
```

## 🔧 **Key Files & Their Purpose**

### **Entry Points**
- **`index.js`**: Production server entry point
- **`webhook-server.js`**: Main application server with GitHub webhook handling
- **`src/app.js`**: Legacy Express app (removed during cleanup)

### **Configuration**
- **`src/config/env-config.txt`**: Environment configuration template
- **`package.json`**: Project dependencies and scripts
- **`.gitignore`**: Git ignore patterns

### **Core Application**
- **`src/routes/`**: Express.js route handlers
- **`src/views/`**: EJS template files
- **`src/utils/`**: Utility functions and services
- **`src/public/`**: Static assets (CSS, images, logos)

### **AI Integration**
- **`ai/openaiClient.js`**: OpenAI integration and analysis logic
- **`ai/prompts/`**: AI prompt templates for different analysis types

### **Data Storage**
- **`data/`**: JSON-based data storage for development
- **`data/backups/`**: Automated data backups

## 🚀 **Application Flow**

### **Production Startup**
1. **`index.js`** → Loads and starts the application
2. **`webhook-server.js`** → Main server with all routes and middleware
3. **GitHub Webhooks** → Processed via `/github/webhook` endpoint
4. **AI Analysis** → Ovi AI processes PR data and generates insights

### **Development Workflow**
1. **`npm run dev`** → Starts development server with nodemon
2. **`npm run webhook`** → Starts webhook proxy for local development
3. **Local Testing** → Use smee.io for webhook testing

## 📁 **Documentation Structure**

### **Product Area Documentation**
- **Landing Page**: User-facing website and forms
- **GitHub App**: GitHub integration and webhook processing
- **Chrome Extension**: Future browser extension (placeholder)
- **API Reference**: REST API endpoints and usage
- **Deployment**: Production deployment guides

### **Technical Documentation**
- **Architecture**: System design and components
- **Security**: Authentication and security measures
- **Performance**: Optimization and scaling considerations
- **Troubleshooting**: Common issues and solutions

## 🔄 **Cleanup Summary**

### **Files Removed**
- ❌ `app.js` - Legacy Express app
- ❌ `server-temp.js` - Temporary server file
- ❌ `no-github-index.js` - Unused entry point
- ❌ `env_config.txt` - Duplicate environment config
- ❌ `landing_page_idea.html` - Development artifact
- ❌ `gosmee.tar.gz` - Unused archive
- ❌ `github-token.txt` - Security risk (exposed token)
- ❌ `scripts/` - Unused test scripts
- ❌ `.DS_Store` - macOS system files

### **Files Reorganized**
- ✅ `fixed-webhook.js` → `src/utils/`
- ✅ `env-config.txt` → `src/config/`
- ✅ Documentation organized by product area
- ✅ Project structure optimized for scalability

### **Branding Updated**
- ✅ All references changed from "QA Karma" to "GetYourTester"
- ✅ Email addresses updated to `ovi@getyourtester.com`
- ✅ Calendly links updated to `getyourtester` organization
- ✅ Package.json updated with new branding

## 🎯 **Next Steps**

### **Immediate Actions**
1. **Test the application** to ensure cleanup didn't break functionality
2. **Update environment variables** using the new config template
3. **Verify GitHub App integration** still works correctly

### **Future Enhancements**
1. **Database migration** from JSON files to persistent database
2. **Chrome extension development** when ready
3. **Enhanced monitoring** and analytics
4. **Performance optimization** and caching

## 🔒 **Security Notes**

- **Environment variables** should be properly configured in production
- **GitHub App credentials** should be securely managed
- **API keys** should never be committed to version control
- **Webhook secrets** should be unique and secure

## 📞 **Support & Maintenance**

For questions about the project structure or cleanup:
- **Email**: ovi@getyourtester.com
- **GitHub Issues**: [Report Issues](https://github.com/ovidon83/firstqa/issues)
- **Documentation**: Check the `docs/` directory for detailed guides

---

**Last Updated**: October 2024  
**Cleanup Version**: 1.0.0  
**Status**: ✅ Complete
