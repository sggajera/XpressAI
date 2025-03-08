require('dotenv').config();
const express = require('express');
const app = express();

// Add JWT secret to env
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const auth = require('./middleware/auth');

app.use('/auth', authRoutes);
app.use('/api', auth, apiRoutes); // Protect all API routes

// ... rest of your server code 