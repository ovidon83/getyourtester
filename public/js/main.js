// Main JavaScript file for GetYourTester

document.addEventListener('DOMContentLoaded', function() {
  console.log('GetYourTester application initialized');
  
  // Test API connection
  fetch('/api/status')
    .then(response => response.json())
    .then(data => {
      console.log('API Status:', data);
    })
    .catch(error => {
      console.error('API Error:', error);
    });
}); 