/**
 * Authentication Middleware
 */

// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  // Dummy authentication - would check session/token in real implementation
  // For demo, we'll create a fake user
  req.user = {
    id: '12345',
    name: 'Demo User',
    email: 'demo@example.com',
    role: 'developer'
  };
  
  next();
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  // Make the user an admin for demo purposes
  req.user.role = 'admin';
  
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).render('error', {
      title: 'Access Denied',
      error: {
        status: 403,
        message: 'Admin access required'
      },
      user: req.user
    });
  }
};

// Middleware to check if user is tester
exports.isTester = (req, res, next) => {
  if (req.user && req.user.role === 'tester') {
    next();
  } else {
    res.status(403).render('error', {
      title: 'Access Denied',
      error: {
        status: 403,
        message: 'Tester access required'
      },
      user: req.user
    });
  }
};

// Middleware to check if user is developer
exports.isDeveloper = (req, res, next) => {
  if (req.user && req.user.role === 'developer') {
    next();
  } else {
    res.status(403).render('error', {
      title: 'Access Denied',
      error: {
        status: 403,
        message: 'Developer access required'
      },
      user: req.user
    });
  }
}; 