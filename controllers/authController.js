/**
 * Authentication Controller
 * Handles user registration, login, and password reset
 */

// Login function
exports.login = (req, res) => {
  // Dummy login function - would validate credentials in real implementation
  console.log('Login attempt:', req.body.email);
  res.redirect('/dashboard');
};

// Register function
exports.register = (req, res) => {
  // Dummy register function - would create user in real implementation
  console.log('Registration attempt:', req.body);
  res.redirect('/auth/login');
};

// Logout function
exports.logout = (req, res) => {
  // Dummy logout function - would destroy session in real implementation
  res.redirect('/');
};

// Forgot password function
exports.forgotPassword = (req, res) => {
  // Dummy forgot password function - would send reset email in real implementation
  console.log('Password reset request for:', req.body.email);
  res.redirect('/auth/login');
};

// Reset password function
exports.resetPassword = (req, res) => {
  // Dummy reset password function - would reset password in real implementation
  console.log('Password reset with token:', req.params.token);
  res.redirect('/auth/login');
};

// Get login page
exports.getLoginPage = (req, res) => {
  res.render('auth/login', {
    title: 'Login - GetYourTester',
    user: null,
    error: null
  });
};

// Get register page
exports.getRegisterPage = (req, res) => {
  res.render('auth/register', {
    title: 'Register - GetYourTester',
    user: null,
    error: null
  });
};

// Get forgot password page
exports.getForgotPasswordPage = (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password - GetYourTester',
    user: null,
    error: null
  });
};

// Get reset password page
exports.getResetPasswordPage = (req, res) => {
  res.render('auth/reset-password', {
    title: 'Reset Password - GetYourTester',
    user: null,
    error: null,
    token: req.params.token
  });
}; 