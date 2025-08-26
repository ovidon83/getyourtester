# Deployment Guide

This guide covers deploying GetYourTester to various production environments.

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 14+ installed
- Git repository access
- Environment variables configured
- Domain name (for production)

### **Basic Deployment**
```bash
# Clone repository
git clone https://github.com/ovidon83/getyourtester.git
cd getyourtester

# Install dependencies
npm install

# Set environment variables
cp env-config.txt .env
# Edit .env with your production values

# Start production server
npm start
```

## 🌐 **Environment Configuration**

### **Required Environment Variables**
```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Session Management
SESSION_SECRET=your-production-session-secret

# GitHub App Configuration
GITHUB_APP_ID=your-app-id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your-webhook-secret
ENABLE_GITHUB=true

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o

# Webhook Configuration
WEBHOOK_PROXY_URL=https://your-domain.com/github/webhook

# SMTP Configuration (for production emails)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password

# Notification Settings
NOTIFICATION_EMAIL=your-email@domain.com
```

### **Environment-Specific Configs**
- **Development**: Use `env-config.txt` as template
- **Staging**: Copy development config, update URLs
- **Production**: Use production SMTP, HTTPS, domain

## 🐳 **Docker Deployment**

### **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### **Docker Compose**
```yaml
version: '3.8'
services:
  getyourtester:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### **Docker Commands**
```bash
# Build and run
docker build -t getyourtester .
docker run -p 3000:3000 getyourtester

# With Docker Compose
docker-compose up -d
```

## ☁️ **Cloud Platform Deployment**

### **Heroku**
```bash
# Install Heroku CLI
npm install -g heroku

# Create app
heroku create your-getyourtester-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set GITHUB_APP_ID=your-app-id
heroku config:set GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
heroku config:set GITHUB_WEBHOOK_SECRET=your-webhook-secret
heroku config:set OPENAI_API_KEY=your-openai-api-key

# Deploy
git push heroku main

# Open app
heroku open
```

### **AWS (EC2)**
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t2.micro \
  --key-name your-key-pair

# Connect and setup
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Clone and deploy
git clone https://github.com/ovidon83/getyourtester.git
cd getyourtester
npm install
npm start
```

### **DigitalOcean App Platform**
1. **Create App**: Use DigitalOcean App Platform
2. **Connect Repository**: Link to GitHub repository
3. **Configure Environment**: Set environment variables
4. **Deploy**: Automatic deployment on push

### **Vercel (Serverless)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 🔒 **SSL & HTTPS Setup**

### **Let's Encrypt (Free)**
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 **Monitoring & Logging**

### **Health Checks**
```bash
# Health check endpoint
curl https://yourdomain.com/status

# Expected response
{
  "status": "healthy",
  "timestamp": "2023-10-15T14:30:00Z",
  "version": "1.0.0"
}
```

### **Logging Setup**
```javascript
// Add to webhook-server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### **Performance Monitoring**
- **Response Times**: Monitor API response times
- **Error Rates**: Track error frequencies
- **Resource Usage**: Monitor CPU, memory, disk
- **Webhook Processing**: Track webhook success rates

## 🔄 **CI/CD Pipeline**

### **GitHub Actions**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: ${{ secrets.HEROKU_APP_NAME }}
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
```

### **Environment-Specific Deployments**
- **Development**: Auto-deploy on push to `dev` branch
- **Staging**: Auto-deploy on push to `staging` branch
- **Production**: Manual approval required for `main` branch

## 📈 **Scaling Considerations**

### **Horizontal Scaling**
- **Load Balancer**: Distribute traffic across instances
- **Multiple Instances**: Run multiple app instances
- **Database**: Consider persistent database for production

### **Vertical Scaling**
- **Instance Size**: Increase CPU/memory as needed
- **Resource Limits**: Monitor and adjust limits
- **Caching**: Implement response caching

### **Performance Optimization**
- **CDN**: Use CDN for static assets
- **Compression**: Enable gzip compression
- **Minification**: Minify CSS/JS files
- **Image Optimization**: Optimize image sizes

## 🚨 **Troubleshooting**

### **Common Issues**
1. **Port Already in Use**: Check if port 3000 is available
2. **Environment Variables**: Verify all required vars are set
3. **GitHub Webhook**: Ensure webhook endpoint is accessible
4. **SSL Issues**: Check certificate validity and configuration

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=true npm start

# Check logs
tail -f logs/app.log
```

### **Health Check Commands**
```bash
# Check if app is running
curl http://localhost:3000/status

# Check GitHub webhook
curl -X POST http://localhost:3000/github/webhook

# Check environment
node -e "console.log(process.env.NODE_ENV)"
```

## 📚 **Related Documentation**

- [GitHub App Documentation](../github-app/)
- [API Reference](../api/)
- [Landing Page Documentation](../landing-page/)
- [Chrome Extension Documentation](../chrome-extension/)

## 🆘 **Support**

For deployment issues:
- **Email**: ovi@getyourtester.com
- **GitHub Issues**: [Report Issues](https://github.com/ovidon83/getyourtester/issues)
- **Documentation**: [Full Documentation](../)
