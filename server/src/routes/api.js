const express = require('express');
const router = express.Router();
const twitter = require('../services/twitter');

// Test DB connection
router.get('/test-db', (req, res) => {
  res.json({ status: 'Connected' });
});

// Get tracked accounts
router.get('/twitter/tracked-accounts', async (req, res) => {
  try {
    const accounts = await twitter.getTrackedAccounts();
    console.log('API response:', accounts);
    res.json(accounts);
  } catch (error) {
    console.error('Error in tracked-accounts route:', error);
    res.status(500).json({ error: error.message });
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

// Add this route to handle deleting approved replies
router.delete('/twitter/approved-replies/:tweetId', async (req, res) => {
  try {
    const { tweetId } = req.params;
    // Remove from in-memory store (or DB in production)
    const result = await twitter.removeApprovedReply(tweetId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ... other routes

module.exports = router; 