require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const { generateReply } = require('./services/openai');
const { postTweet, getTweet, testConnection, startTracking, getTrackedAccounts } = require('./services/twitter');
const auth = require('./middleware/auth');

const app = express();

// Add JWT secret to env
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

// Use routes
app.use('/auth', authRoutes);
app.use('/api', auth, apiRoutes);

// API Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Hello World' });
});

// Test MongoDB connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { connection } = mongoose;
    res.json({ 
      status: 'Database connected',
      database: connection.name,
      host: connection.host
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this after your other routes
app.post('/api/test-user', async (req, res) => {
  try {
    const User = require('./models/User');
    
    const testUser = new User({
      email: 'test@example.com',
      name: 'Test User',
      preferences: {
        trackedAccounts: [{
          username: '@testaccount',
          keywords: ['test', 'demo']
        }]
      }
    });

    await testUser.save();
    res.json(testUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test OpenAI integration
app.post('/api/test-reply', async (req, res) => {
  try {
    const { tweet, context } = req.body;
    
    if (!tweet) {
      return res.status(400).json({ error: 'Tweet is required' });
    }

    const reply = await generateReply(
      tweet, 
      context || 'Be professional and friendly'
    );

    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Twitter integration
app.post('/api/twitter/tweet', async (req, res) => {
  try {
    const { text, replyToId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Tweet text is required' });
    }

    const tweet = await postTweet(text, replyToId);
    res.json(tweet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/twitter/tweet/:id', async (req, res) => {
  try {
    const tweet = await getTweet(req.params.id);
    res.json(tweet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this new route
app.get('/api/twitter/test', async (req, res) => {
  try {
    const result = await testConnection();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Twitter Test Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.data // Twitter API often sends detailed error info
    });
  }
});

// Add this new route
app.post('/api/twitter/track', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check if account is already being tracked by this user
    const User = require('./models/User');
    const existingTracking = await User.findOne({
      _id: req.user._id,
      'preferences.trackedAccounts.username': username.toLowerCase()
    });

    if (existingTracking) {
      return res.status(400).json({
        success: false,
        error: `Account @${username} is already being tracked`
      });
    }

    const result = await startTracking(username);
    
    // Save to database with normalized username (lowercase) for the authenticated user
    await User.findByIdAndUpdate(
      req.user._id,
      { 
        $addToSet: { 
          'preferences.trackedAccounts': {
            username: username.toLowerCase(),
            twitterId: result.user.id,
            lastChecked: new Date(),
            keywords: [],
            tweets: result.tweets || []
          }
        }
      },
      { new: true }
    );

    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Track Account Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.data
    });
  }
});

// Add this new route
app.get('/api/twitter/tracked-accounts', async (req, res) => {
  try {
    const accounts = await getTrackedAccounts();
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching tracked accounts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../../client/build')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});