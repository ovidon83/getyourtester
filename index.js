/**
 * Entry point for GetYourTester application
 * This file serves as the main entry point for production deployments
 * It simply requires the webhook-server module which contains all the application logic
 */

console.log('🚀 Starting GetYourTester production server...');
console.log('📁 Current working directory:', process.cwd());
console.log('📄 Loading webhook-server.js...');

// Import the main application
require('./webhook-server.js');

console.log('✅ GetYourTester production server started successfully!'); 