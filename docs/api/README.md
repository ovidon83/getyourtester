# API Reference

GetYourTester provides a REST API for integrating with the platform and managing QA workflows.

## 🔑 **Authentication**

### **API Key Authentication**
```bash
# Include API key in headers
Authorization: Bearer YOUR_API_KEY

# Or as query parameter
?api_key=YOUR_API_KEY
```

### **Session Authentication**
For web-based integrations, use session-based authentication:
```bash
# Login first to get session
POST /auth/login
# Then use session cookie for subsequent requests
```

## 📡 **Base URL**

- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`

## 🔗 **Endpoints**

### **Health Check**
```http
GET /status
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-10-15T14:30:00Z",
  "version": "1.0.0",
  "services": {
    "github": "connected",
    "ai": "available",
    "database": "connected"
  }
}
```

### **Customer Management**

#### **Get All Customers**
```http
GET /api/customers
```

**Response:**
```json
[
  {
    "id": "customer-123",
    "email": "user@example.com",
    "plan": "Starter",
    "status": "paid",
    "createdAt": "2023-10-15T14:30:00Z"
  }
]
```

#### **Get Customer Statistics**
```http
GET /api/customers/stats
```

**Response:**
```json
{
  "totalCustomers": 150,
  "paidCustomers": 120,
  "freeTrialCustomers": 30,
  "lastUpdated": "2023-10-15T14:30:00Z"
}
```

#### **Add New Customer**
```http
POST /api/customers
Content-Type: application/json

{
  "email": "newuser@example.com",
  "plan": "Starter",
  "status": "free_trial"
}
```

**Response:**
```json
{
  "id": "customer-456",
  "email": "newuser@example.com",
  "plan": "Starter",
  "status": "free_trial",
  "createdAt": "2023-10-15T14:30:00Z"
}
```

### **GitHub Integration**

#### **Webhook Endpoint**
```http
POST /github/webhook
Content-Type: application/json
X-Hub-Signature-256: sha256=...

{
  "action": "opened",
  "pull_request": {
    "number": 42,
    "title": "Add new feature",
    "body": "This PR adds...",
    "html_url": "https://github.com/owner/repo/pull/42"
  },
  "repository": {
    "full_name": "owner/repo"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Webhook processed successfully",
  "analysis": {
    "id": "analysis-789",
    "status": "completed",
    "shipScore": 8
  }
}
```

#### **Get Test Requests**
```http
GET /dashboard
```

**Response:** HTML page with test requests dashboard

#### **Get Test Request Details**
```http
GET /request/{id}
```

**Response:** HTML page with detailed test request information

### **Contact & Support**

#### **Submit Contact Form**
```http
POST /contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "General Inquiry",
  "message": "I have a question about...",
  "service": "Human QA"
}
```

**Response:** Redirect to success page or error page

#### **Submit Email Form**
```http
POST /email
Content-Type: application/json

{
  "recipients": "user1@example.com,user2@example.com",
  "subject": "Test Email",
  "message": "This is a test message"
}
```

**Response:** Redirect to success page or error page

## 📊 **Data Models**

### **Customer Object**
```json
{
  "id": "string",
  "email": "string",
  "plan": "string",
  "status": "string",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

### **Test Request Object**
```json
{
  "id": "string",
  "owner": "string",
  "repo": "string",
  "prNumber": "number",
  "prTitle": "string",
  "prUrl": "string",
  "requestedAt": "string (ISO 8601)",
  "status": "string",
  "comment": "string",
  "parsedDetails": {
    "summary": "string",
    "questions": ["string"],
    "testRecipe": "object",
    "risks": ["string"]
  }
}
```

### **Analysis Result Object**
```json
{
  "summary": {
    "description": "string",
    "riskLevel": "LOW|MEDIUM|HIGH",
    "shipScore": "number (1-10)",
    "reasoning": "string"
  },
  "questions": ["string"],
  "testRecipe": {
    "criticalPath": ["string"],
    "edgeCases": ["string"],
    "automation": {
      "unit": ["string"],
      "integration": ["string"],
      "e2e": ["string"]
    }
  },
  "risks": ["string"]
}
```

## 🚨 **Error Handling**

### **Error Response Format**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "timestamp": "2023-10-15T14:30:00Z"
}
```

### **Common Error Codes**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### **Rate Limiting**
- **Standard Endpoints**: 100 requests per minute
- **Webhook Endpoints**: 1000 requests per minute
- **Admin Endpoints**: 50 requests per minute

## 🔒 **Security**

### **HTTPS Required**
All production API calls must use HTTPS.

### **Input Validation**
All inputs are validated and sanitized:
- Email addresses must be valid format
- Strings are trimmed and length-limited
- JSON payloads are validated against schemas

### **CORS Policy**
```javascript
// CORS configuration
{
  origin: ['https://yourdomain.com', 'https://app.getyourtester.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

## 📱 **SDK & Libraries**

### **JavaScript/Node.js**
```javascript
// Example API client
class GetYourTesterAPI {
  constructor(apiKey, baseURL = 'https://api.getyourtester.com') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async getCustomers() {
    const response = await fetch(`${this.baseURL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    return response.json();
  }
}
```

### **Python**
```python
import requests

class GetYourTesterAPI:
    def __init__(self, api_key, base_url="https://api.getyourtester.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def get_customers(self):
        response = requests.get(f"{self.base_url}/api/customers", headers=self.headers)
        return response.json()
```

## 📊 **Webhooks**

### **Webhook Events**
- `pull_request.opened` - New PR created
- `pull_request.synchronize` - PR updated
- `pull_request.reopened` - PR reopened
- `pull_request.closed` - PR closed

### **Webhook Security**
- **Signature Verification**: All webhooks include `X-Hub-Signature-256`
- **Secret Validation**: Webhook secret must match configuration
- **HTTPS Only**: Webhooks only accepted over HTTPS

### **Webhook Retry Logic**
- **Automatic Retries**: 3 attempts with exponential backoff
- **Dead Letter Queue**: Failed webhooks stored for manual review
- **Monitoring**: Webhook success/failure rates tracked

## 🚀 **Getting Started**

### **1. Get API Key**
Contact support to get your API key: ovi@getyourtester.com

### **2. Test Connection**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://yourdomain.com/status
```

### **3. Make Your First Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://yourdomain.com/api/customers
```

## 📚 **Related Documentation**

- [GitHub App Documentation](../github-app/)
- [Deployment Guide](../deployment/)
- [Landing Page Documentation](../landing-page/)
- [Chrome Extension Documentation](../chrome-extension/)

## 🆘 **Support**

For API support:
- **Email**: ovi@getyourtester.com
- **GitHub Issues**: [Report Issues](https://github.com/ovidon83/getyourtester/issues)
- **Documentation**: [Full Documentation](../)
