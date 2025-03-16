require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const session = require('express-session');
const { generateReply } = require('./services/openai');
const { postTweet, getTweet, testConnection, startTracking, getTrackedAccounts } = require('./services/twitter');
const auth = require('./middleware/auth');

const app = express();

// Add JWT secret to env
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Connect to MongoDB
connectDB();

// Import required modules at the top of your file
const { TwitterAuth, User } = require('./models');
const twitterOAuth = require('./services/twitterOAuth');

// Add this BEFORE any middleware or other routes
app.get('/api/twitter/oauth/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    console.log('Received Twitter callback with params:', req.query);
    console.log('Session ID:', req.session?.id);
    console.log('Session data:', req.session);
    
    // Check for error from Twitter
    if (error) {
      console.error('Twitter OAuth error:', error, error_description);
      return res.redirect(`/#/profile?twitter_connected=false&error=${encodeURIComponent(error_description || error)}`);
    }
    
    // Check for missing code or state
    if (!code || !state) {
      console.error('Missing code or state in callback');
      return res.redirect(`/#/profile?twitter_connected=false&error=${encodeURIComponent('Missing authorization code or state')}`);
    }
    
    // Since we're having session issues, let's try a workaround
    // We'll use the state parameter to identify the user
    // This is less secure but will help us debug the issue
    
    try {
      // Try to get the user from the state store in twitterOAuth service
      const result = await twitterOAuth.handleCallbackWithState(code, state);
      
      if (result && result.success) {
        return res.redirect(`/#/profile?twitter_connected=true&username=${result.username}`);
      }
    } catch (stateError) {
      console.error('Error handling callback with state:', stateError);
      // Continue to try with session if state handling fails
    }
    
    // Get code verifier from session
    if (!req.session || !req.session.twitterOAuth) {
      console.error('Invalid session or missing twitterOAuth data');
      return res.redirect(`/#/profile?twitter_connected=false&error=${encodeURIComponent('Session expired or invalid')}`);
    }
    
    const { codeVerifier } = req.session.twitterOAuth;
    
    if (!codeVerifier) {
      console.error('Missing code verifier in session');
      return res.redirect(`/#/profile?twitter_connected=false&error=${encodeURIComponent('Missing authentication data')}`);
    }
    
    // Handle callback
    const result = await twitterOAuth.handleCallback(code, state, codeVerifier);
    
    // Clear session data
    delete req.session.twitterOAuth;
    
    // Save the session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session after callback:', err);
      }
      
      // Redirect to success page with hash routing
      res.redirect(`/#/profile?twitter_connected=true&username=${result.username}`);
    });
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    res.redirect(`/#/profile?twitter_connected=false&error=${encodeURIComponent(error.message || 'Unknown error occurred')}`);
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add session support
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to false for local development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none', // Changed from 'lax' to allow cross-site cookies
    path: '/'
  },
  name: 'xpress.sid', // Custom name to avoid default connect.sid
  store: new session.MemoryStore() // Explicitly use memory store for testing
}));

// Debug middleware for session tracking
app.use((req, res, next) => {
  console.log('Session ID:', req.session.id);
  next();
});

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

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../client/build')));

// The "catchall" handler: for any request that doesn't match an API route,
// send back the React app's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});