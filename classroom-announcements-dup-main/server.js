const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const announcementRoutes = require('./routes/announcements');
const logger = require('./utils/logger');
const morgan = require('morgan');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use(morgan('combined', { stream: logger.stream }));

app.use('/api/announcements', announcementRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Announcement Backend Running!',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
