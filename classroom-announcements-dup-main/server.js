const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const announcementRoutes = require('./routes/announcements');

const app = express();

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/announcements', announcementRoutes);

// Health check route (optional but helpful)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Announcement Backend Running!',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
