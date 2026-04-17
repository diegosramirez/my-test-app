const express = require('express');
const cors = require('cors');
const path = require('path');
const countriesRoutes = require('./routes/countries');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for frontend integration
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Static file serving for flag images
app.use('/flags', express.static(path.join(__dirname, 'public/flags')));

// API Routes
app.use('/api/countries', countriesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    code: 500
  });
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 404
  });
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  console.log(`Flag images served from: http://localhost:${PORT}/flags/`);
  console.log(`API available at: http://localhost:${PORT}/api/`);
});

module.exports = app;