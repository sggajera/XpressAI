const express = require('express');
const router = express.Router();
const twitter = require('../services/twitter');

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      preferences: req.user.preferences,
      createdAt: req.user.createdAt
    };
    
    res.json({ 
      success: true, 
      user 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test DB connection
router.get('/test-db', (req, res) => {
  res.json({ status: 'Connected' });
});

// Get tracked accounts for authenticated user
router.get('/twitter/tracked-accounts', async (req, res) => {
  try {
    const accounts = await twitter.getTrackedAccounts(req.user._id);
    res.json(accounts);
  } catch (error) {
    console.error('Error in tracked-accounts route:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Track new Twitter account
router.post('/twitter/track', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check if account is already being tracked by this user
    const User = require('../models/User');
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

    const result = await twitter.startTracking(username, req.user._id);
    
    // Ensure tweets is an array
    const tweets = Array.isArray(result.tweets?.data) ? result.tweets.data : [];
    
    // Save to database with normalized username (lowercase) and tweets
    await User.findByIdAndUpdate(
      req.user._id,
      { 
        $addToSet: { 
          'preferences.trackedAccounts': {
            username: username.toLowerCase(),
            twitterId: result.user.id,
            lastChecked: new Date(),
            keywords: [],
            tweets: tweets // Store the tweets array
          }
        }
      },
      { new: true }
    );

    res.json({ 
      success: true, 
      data: {
        ...result,
        tweets: tweets // Include tweets in response
      }
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

// Store approved reply
router.post('/twitter/approved-replies', async (req, res) => {
  try {
    const result = await twitter.storeApprovedReply(req.body.tweetId, req.body.reply);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get approved replies
router.get('/twitter/approved-replies', async (req, res) => {
  try {
    const replies = await twitter.getApprovedReplies();
    res.json({ success: true, data: replies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete approved reply
router.delete('/twitter/approved-replies/:tweetId', async (req, res) => {
  try {
    const { tweetId } = req.params;
    const result = await twitter.removeApprovedReply(tweetId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 