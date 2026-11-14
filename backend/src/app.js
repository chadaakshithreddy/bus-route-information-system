const path = require('path');
const express = require('express');
const cors = require('cors');

// Import routes
const routeRoutes = require('./routes/routeRoutes');
const stopRoutes = require('./routes/stopRoutes');
const authRoutes = require('./routes/authRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

// Import middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Core middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const frontendDir = path.join(__dirname, '../../frontend');
app.use(express.static(frontendDir));

// Health Check Endpoint (Section 19)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bus Route Information System API is running'
  });
});

// API Routes
app.use('/api/routes', routeRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Admin Route Aliases
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendDir, 'admin', 'login.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(frontendDir, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(frontendDir, 'admin', 'dashboard.html'));
});

// 404 & Centralized Error Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
