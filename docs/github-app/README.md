# GitHub App Documentation

The GetYourTester GitHub App provides automated QA analysis for pull requests using AI-powered insights and human QA expertise.

## 🏗️ **Architecture**

### **Core Components**
- **Webhook Server**: Handles GitHub webhook events
- **GitHub Service**: Manages GitHub API interactions
- **AI Integration**: OpenAI-powered PR analysis
- **Test Request Management**: Tracks and manages testing requests

### **File Structure**
```
src/
├── utils/
│   ├── githubService.js      # GitHub API interactions
│   ├── githubAppAuth.js      # GitHub App authentication
│   └── webhookProxy.js       # Webhook forwarding
├── routes/
│   └── github.js             # GitHub webhook routes
└── views/
    └── admin/                # Admin dashboard views
        ├── dashboard.ejs      # Test requests overview
        └── test-request-details.ejs  # Individual request details
```

## 🔐 **Authentication & Security**

### **GitHub App Setup**
1. **App Registration**: Create a GitHub App in your organization
2. **Permissions**: Configure read access to pull requests
3. **Webhook**: Set up webhook endpoint for PR events
4. **Private Key**: Generate and configure RSA private key

### **Environment Variables**
```bash
GITHUB_APP_ID=your-app-id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your-webhook-secret
ENABLE_GITHUB=true
```

### **Security Features**
- Webhook signature verification
- JWT token generation for API calls
- Row-level security policies
- Rate limiting and throttling

## 🔗 **Webhook Handling**

### **Supported Events**
- `pull_request.opened`
- `pull_request.synchronize`
- `pull_request.reopened`
- `pull_request.closed`

### **Webhook Processing Flow**
1. **Event Reception**: GitHub sends webhook to our endpoint
2. **Signature Verification**: Validate webhook authenticity
3. **Event Parsing**: Extract PR metadata and changes
4. **AI Analysis**: Process with Ovi AI for insights
5. **Response Generation**: Create comprehensive QA feedback
6. **Comment Posting**: Add analysis to PR as comment

### **Webhook Endpoint**
```
POST /github/webhook
```

## 🤖 **AI Integration (Ovi AI)**

### **Analysis Capabilities**
- **PR Metadata Analysis**: Title, description, labels, assignees
- **Code Change Review**: Diff analysis and impact assessment
- **Risk Assessment**: Production readiness scoring (1-10)
- **Test Recipe Generation**: Comprehensive testing scenarios
- **Question Generation**: Expert QA engineer questions

### **AI Models**
- **Primary**: OpenAI GPT-4
- **Fallback**: GPT-3.5-turbo
- **Configuration**: Customizable via environment variables

### **Analysis Output**
```json
{
  "summary": {
    "description": "PR summary",
    "riskLevel": "LOW|MEDIUM|HIGH",
    "shipScore": 8,
    "reasoning": "Detailed reasoning"
  },
  "questions": ["QA questions"],
  "testRecipe": {
    "criticalPath": ["Critical test scenarios"],
    "edgeCases": ["Edge case tests"],
    "automation": {
      "unit": ["Unit test suggestions"],
      "integration": ["Integration test suggestions"],
      "e2e": ["End-to-end test suggestions"]
    }
  },
  "risks": ["Identified risks"]
}
```

## 📊 **Test Request Management**

### **Data Structure**
```json
{
  "id": "unique-identifier",
  "owner": "repository-owner",
  "repo": "repository-name",
  "prNumber": 42,
  "prTitle": "PR title",
  "prUrl": "https://github.com/owner/repo/pull/42",
  "requestedAt": "2023-10-15T14:30:00Z",
  "status": "Pending|In Progress|Complete-PASS|Complete-FAIL",
  "comment": "Full AI analysis comment",
  "parsedDetails": {
    "summary": "Parsed summary",
    "questions": ["Parsed questions"],
    "testRecipe": "Parsed test recipe",
    "risks": ["Parsed risks"]
  }
}
```

### **Status Tracking**
- **Pending**: Analysis requested, waiting for processing
- **In Progress**: Analysis in progress
- **Complete-PASS**: Analysis complete, ready for review
- **Complete-FAIL**: Analysis complete, issues identified

## 🎛️ **Admin Dashboard**

### **Features**
- **Overview**: All test requests with status
- **Details**: Individual request analysis
- **Filtering**: By status, repository, date range
- **Search**: Find specific requests
- **Status Updates**: Manual status management

### **Access Control**
- Admin authentication required
- Session-based access control
- Secure admin routes

## 🔧 **Development & Testing**

### **Local Development**
1. **Webhook Proxy**: Use smee.io for local webhook testing
2. **Environment Setup**: Configure local environment variables
3. **GitHub App**: Use development app for testing
4. **Database**: Local JSON file storage

### **Testing Tools**
- **Webhook Testing**: Test webhook endpoints locally
- **AI Testing**: Test AI integration with sample PRs
- **Integration Testing**: End-to-end workflow testing

### **Debug Mode**
```bash
NODE_ENV=development
DEBUG=true
```

## 🚀 **Production Deployment**

### **Requirements**
- **HTTPS**: Required for GitHub webhooks
- **Domain**: Valid domain for webhook endpoint
- **Environment**: Production environment variables
- **Monitoring**: Health checks and logging

### **Scaling Considerations**
- **Webhook Processing**: Handle high webhook volume
- **AI API Limits**: Manage OpenAI rate limits
- **Database**: Consider persistent storage for production
- **Caching**: Implement response caching

## 📊 **Monitoring & Analytics**

### **Metrics to Track**
- Webhook processing time
- AI analysis success rate
- Error rates and types
- User engagement metrics

### **Logging**
- Structured logging for all operations
- Error tracking and alerting
- Performance monitoring
- Security event logging

## 🔒 **Security Best Practices**

### **Webhook Security**
- Always verify webhook signatures
- Use HTTPS for all communications
- Implement rate limiting
- Validate all input data

### **API Security**
- Use GitHub App authentication
- Implement proper error handling
- Secure environment variables
- Regular security audits

## 📚 **Related Documentation**

- [Landing Page Documentation](../landing-page/)
- [API Reference](../api/)
- [Deployment Guide](../deployment/)
- [Chrome Extension Documentation](../chrome-extension/)

## 🆘 **Troubleshooting**

### **Common Issues**
1. **Webhook Not Receiving**: Check endpoint URL and HTTPS
2. **Authentication Errors**: Verify GitHub App configuration
3. **AI Analysis Failures**: Check OpenAI API key and limits
4. **Database Errors**: Verify file permissions and structure

### **Support**
For technical support, contact:
- **Email**: ovi@getyourtester.com
- **GitHub Issues**: [Report Issues](https://github.com/ovidon83/getyourtester/issues)
- **Documentation**: [Full Documentation](../)
