const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// Import routes
const indexRoutes = require('./routes/index');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Make auth status available to all views
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.user = req.session.user || null;
  next();
});

// Layout middleware
app.use((req, res, next) => {
  res.locals.title = 'GetYourTester';
  
  // Override res.render to use layouts
  const originalRender = res.render;
  res.render = function(view, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    if (!options) {
      options = {};
    }
    
    // Merge view options and locals
    const mergedOptions = { ...res.locals, ...options };
    
    if (view !== 'layout') {
      originalRender.call(this, view, mergedOptions, (err, html) => {
        if (err) return callback ? callback(err) : next(err);
        
        // Don't use layout for API responses or if explicitly disabled
        if (req.xhr || mergedOptions.layout === false) {
          return callback ? callback(null, html) : res.send(html);
        }
        
        mergedOptions.content = html;
        originalRender.call(this, 'layout', mergedOptions, callback);
      });
    } else {
      originalRender.call(this, view, mergedOptions, callback);
    }
  };
  
  next();
});

// Register routes
app.use('/', indexRoutes);
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error', { 
    title: 'Error',
    message: err.message,
    error: res.locals.error
  });
});

module.exports = app; 