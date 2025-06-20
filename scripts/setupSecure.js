#!/usr/bin/env node

/**
 * Secure setup script for GetYourTester OpenAI integration
 * Helps configure API keys safely without exposing them in tracked files
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_FILE = path.join(process.cwd(), '.env');
const ENV_CONFIG_FILE = path.join(process.cwd(), 'env-config.txt');

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  return colors[color] + text + colors.reset;
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function checkGitIgnore() {
  const gitIgnorePath = path.join(process.cwd(), '.gitignore');
  
  if (!fs.existsSync(gitIgnorePath)) {
    console.log(colorize('⚠️  WARNING: No .gitignore file found!', 'yellow'));
    return false;
  }

  const gitIgnore = fs.readFileSync(gitIgnorePath, 'utf8');
  if (!gitIgnore.includes('.env')) {
    console.log(colorize('⚠️  WARNING: .env is not in .gitignore!', 'yellow'));
    return false;
  }

  console.log(colorize('✅ .env is properly gitignored', 'green'));
  return true;
}

function loadEnvConfig() {
  if (!fs.existsSync(ENV_CONFIG_FILE)) {
    console.log(colorize('❌ env-config.txt not found!', 'red'));
    return null;
  }

  const config = {};
  const lines = fs.readFileSync(ENV_CONFIG_FILE, 'utf8').split('\n');
  
  for (const line of lines) {
    if (line.includes('=') && !line.trim().startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      config[key.trim()] = valueParts.join('=').trim();
    }
  }
  
  return config;
}

function createEnvFile(config, openaiApiKey) {
  // Update the config with the new API key
  config.OPENAI_API_KEY = openaiApiKey;
  
  let envContent = '# GetYourTester Environment Configuration\n';
  envContent += '# This file contains sensitive information and should NEVER be committed to git\n\n';
  
  for (const [key, value] of Object.entries(config)) {
    if (key && value) {
      envContent += `${key}=${value}\n`;
    }
  }
  
  fs.writeFileSync(ENV_FILE, envContent);
  console.log(colorize('✅ .env file created successfully', 'green'));
}

async function main() {
  console.log(colorize('🔒 GetYourTester Secure Setup', 'bold'));
  console.log(colorize('================================', 'blue'));
  console.log();
  
  // Check git setup
  console.log(colorize('1. Checking security setup...', 'cyan'));
  const gitOk = checkGitIgnore();
  
  if (!gitOk) {
    console.log(colorize('❌ Please fix .gitignore first!', 'red'));
    console.log('Add this line to .gitignore:');
    console.log(colorize('.env', 'yellow'));
    process.exit(1);
  }
  
  // Load configuration template
  console.log(colorize('\n2. Loading configuration template...', 'cyan'));
  const config = loadEnvConfig();
  
  if (!config) {
    console.log(colorize('❌ Could not load env-config.txt', 'red'));
    process.exit(1);
  }
  
  console.log(colorize('✅ Configuration template loaded', 'green'));
  
  // Check if .env already exists
  if (fs.existsSync(ENV_FILE)) {
    console.log(colorize('\n⚠️  .env file already exists!', 'yellow'));
    const overwrite = await promptUser('Do you want to overwrite it? (y/N): ');
    
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log(colorize('Operation cancelled.', 'yellow'));
      process.exit(0);
    }
  }
  
  // Get OpenAI API key
  console.log(colorize('\n3. Setting up OpenAI API key...', 'cyan'));
  console.log(colorize('⚠️  SECURITY NOTICE:', 'yellow'));
  console.log('• Your API key will be stored in .env (gitignored)');
  console.log('• Never share this key or commit it to version control');
  console.log('• You can regenerate it anytime at platform.openai.com');
  console.log();
  
  const apiKey = await promptUser('Enter your OpenAI API key: ');
  
  if (!apiKey || !apiKey.startsWith('sk-')) {
    console.log(colorize('❌ Invalid API key format!', 'red'));
    console.log('OpenAI API keys start with "sk-"');
    process.exit(1);
  }
  
  // Create .env file
  console.log(colorize('\n4. Creating secure .env file...', 'cyan'));
  createEnvFile(config, apiKey);
  
  // Final verification
  console.log(colorize('\n5. Verifying setup...', 'cyan'));
  
  // Test if the key can be loaded
  require('dotenv').config();
  const loadedKey = process.env.OPENAI_API_KEY;
  
  if (loadedKey === apiKey) {
    console.log(colorize('✅ API key loaded successfully', 'green'));
  } else {
    console.log(colorize('❌ API key verification failed', 'red'));
    process.exit(1);
  }
  
  // Success message
  console.log(colorize('\n🎉 Setup completed successfully!', 'green'));
  console.log(colorize('================================', 'blue'));
  console.log();
  console.log('Next steps:');
  console.log(colorize('• Test AI integration: npm run test:ai', 'cyan'));
  console.log(colorize('• Test full integration: npm run test:integration', 'cyan'));
  console.log(colorize('• Start the server: npm start', 'cyan'));
  console.log();
  console.log(colorize('Security reminders:', 'yellow'));
  console.log('• Never commit .env to git');
  console.log('• Regenerate API keys if they get exposed');
  console.log('• Monitor your OpenAI usage and billing');
  
  console.log(colorize('\n📚 View the AI documentation: ai/README.md', 'magenta'));
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(colorize('❌ Setup failed:', 'red'), error.message);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(colorize('❌ Setup failed:', 'red'), error.message);
  process.exit(1);
});

// Run setup
if (require.main === module) {
  main().catch(error => {
    console.error(colorize('❌ Setup failed:', 'red'), error.message);
    process.exit(1);
  });
}

module.exports = { main }; 