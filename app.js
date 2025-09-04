const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Configure CORS and middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const authRoutes = require('./routes/authRoutes');
const feeRoutes = require('./routes/feeRoutes');

// Use routes
app.use('/api/students', studentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/fees', feeRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working perfectly!',
    timestamp: new Date(),
    status: 'success',
    port: process.env.PORT || 5000
  });
});

// ✅ FIXED MongoDB connection - Removed deprecated options
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gyan-daini')
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    console.log('🔗 Host:', mongoose.connection.host);
    console.log('📡 Port:', mongoose.connection.port);
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('📴 MongoDB connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('📴 MongoDB connection closed');
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🧪 Test URL: http://localhost:${PORT}/api/test`);
  console.log(`👥 Students API: http://localhost:${PORT}/api/students`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`💰 Fee API: http://localhost:${PORT}/api/fees`);
});

// Export app
module.exports = app;
