const { TwitterApi } = require('twitter-api-v2');
const mongoose = require('mongoose');
const User = require('../models/User');
const { mockTrackedAccounts, mockUserData, mockTweets } = require('../mock/twitterData');

// Add environment check
const USE_MOCK = process.env.USE_MOCK === 'true';

// Update the Twitter client initialization with better error handling
const initializeTwitterClient = () => {
  if (USE_MOCK) {
    console.log('Using mock Twitter client');
    return null;
  }

  try {
    if (!process.env.TWITTER_API_KEY || 
        !process.env.TWITTER_API_SECRET || 
        !process.env.TWITTER_ACCESS_TOKEN || 
        !process.env.TWITTER_ACCESS_SECRET) {
      throw new Error('Missing Twitter API credentials');
    }

    return new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
  } catch (error) {
    console.error('Failed to initialize Twitter client:', error);
    throw error;
  }
};

const client = initializeTwitterClient();
const rwClient = client;

const postTweet = async (text, replyToId = null) => {
  try {
    const tweet = await rwClient.v2.tweet({
      text,
      ...(replyToId && { reply: { in_reply_to_tweet_id: replyToId } }),
    });
    return tweet;
  } catch (error) {
    console.error('Twitter API Error:', error);
    throw new Error('Failed to post tweet');
  }
};

const getTweet = async (tweetId) => {
  try {
    const tweet = await rwClient.v2.singleTweet(tweetId);
    return tweet;
  } catch (error) {
    console.error('Twitter API Error:', error);
    throw new Error('Failed to fetch tweet');
  }
};

const listenToUser = async (userId) => {
  try {
    const stream = await rwClient.v2.searchStream({
      'tweet.fields': ['referenced_tweets', 'author_id'],
      expansions: ['referenced_tweets.id'],
    });

    return stream;
  } catch (error) {
    console.error('Twitter API Error:', error);
    throw new Error('Failed to create stream');
  }
};

const testConnection = async () => {
  try {
    if (USE_MOCK) {
      console.log('Using mock data for test connection');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      return mockUserData;
    }

    const me = await rwClient.v2.me();
    return me;
  } catch (error) {
    console.error('Twitter API Error:', error);
    throw error;
  }
};

const startTracking = async (username) => {
  try {
    if (USE_MOCK) {
      console.log('Using mock data for start tracking');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      return {
        success: true,
        user: mockUserData.data,
        tweets: mockTweets.data
      };
    }

    // Validate Twitter client
    if (!rwClient) {
      throw new Error('Twitter client not initialized');
    }

    // Get user info
    const user = await rwClient.v2.userByUsername(username, {
      'user.fields': ['id', 'name', 'username', 'description']
    }).catch(error => {
      if (error.code === 401) {
        throw new Error('Twitter API authentication failed. Please check your credentials.');
      }
      throw error;
    });

    if (!user.data) {
      throw new Error('User not found');
    }

    // Add delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get user's tweets
    const tweets = await rwClient.v2.userTimeline(user.data.id, {
      exclude: ['retweets', 'replies'],
      max_results: 5,
      'tweet.fields': ['created_at', 'public_metrics']
    }).catch(error => {
      console.error('Error fetching tweets:', error);
      return { data: [] };
    });

    // Store in database
    await User.findOneAndUpdate(
      { email: 'test@example.com' },
      { 
        $addToSet: {
          'preferences.trackedAccounts': {
            username: username,
            twitterId: user.data.id,
            lastChecked: new Date().toISOString(),
            keywords: [],
            tweets: tweets.data || []
          }
        }
      },
      { upsert: true }
    );

    return {
      success: true,
      user: user.data,
      tweets: tweets.data || []
    };
  } catch (error) {
    console.error('Twitter API Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to track account',
      details: error.data || error
    };
  }
};

const getTrackedAccounts = async () => {
  try {
    if (USE_MOCK) {
      console.log('Using mock data for tracked accounts');
      console.log('Mock data:', mockTrackedAccounts); // Add this debug log
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        success: true, 
        data: mockTrackedAccounts.map(account => ({
          ...account,
          tweets: account.tweets || [] // Ensure tweets array exists
        }))
      };
    }

    const user = await User.findOne({ email: 'test@example.com' });
    if (!user?.preferences?.trackedAccounts) {
      return { success: true, data: [] };
    }

    // Ensure trackedAccounts is an array
    const trackedAccounts = Array.isArray(user.preferences.trackedAccounts) 
      ? user.preferences.trackedAccounts 
      : [];

    // Fetch fresh tweets for each account
    const accounts = await Promise.all(
      trackedAccounts.map(async (account) => {
        try {
          const tweets = await rwClient.v2.userTimeline(account.twitterId, {
            exclude: ['retweets', 'replies'],
            max_results: 5,
            'tweet.fields': ['created_at', 'public_metrics']
          });

          return {
            ...account.toObject(),
            tweets: tweets.data || []
          };
        } catch (error) {
          console.error(`Error fetching tweets for ${account.username}:`, error);
          return {
            ...account.toObject(),
            tweets: []
          };
        }
      })
    );

    return { success: true, data: accounts };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, data: [], error: 'Failed to fetch tracked accounts' };
  }
};

// Add these functions to handle approved replies
const approvedReplies = new Map(); // In-memory store (replace with DB in production)

const storeApprovedReply = async (tweetId, reply) => {
  approvedReplies.set(tweetId, reply);
  return { success: true };
};

const getApprovedReplies = async () => {
  return Array.from(approvedReplies.entries()).map(([tweetId, reply]) => ({
    tweetId,
    ...reply
  }));
};

// Add this function to handle removing approved replies
const removeApprovedReply = async (tweetId) => {
  approvedReplies.delete(tweetId);
  return { success: true };
};

const handleRemoveFromQueue = async (tweetId) => {
  try {
    console.log('Removing tweet from queue:', tweetId);

    // Remove from DB first
    const response = await fetch(`/api/twitter/approved-replies/${tweetId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove reply from database');
    }

    // Remove from local state
    setQueuedReplies(prev => {
      console.log('Current queue:', prev);
      console.log('Filtering out tweet ID:', tweetId);
      // Filter out the reply with the matching tweetId
      return prev.filter(reply => reply.tweetId !== tweetId);
    });
  } catch (error) {
    console.error('Error removing reply from queue:', error);
  }
};

const handleUnapprove = async (tweet) => {
  try {
    // Remove from DB first
    const response = await fetch(`/api/twitter/approved-replies/${tweet.id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove reply from database');
    }
    
    // Update local state
    setApprovedReplies(prev => {
      const next = new Set(prev);
      next.delete(tweet.id);
      return next;
    });
    
    // Remove from queue - ensure we're passing the correct ID structure
    if (onRemoveFromQueue) {
      console.log('Unapproving tweet with ID:', tweet.id);
      onRemoveFromQueue(tweet.id);
    }

    // Reset the approve button state to "Accepted"
    setSuggestions(prev => ({
      ...prev,
      [tweet.id]: 'Accepted' // Ensure this reflects the correct state
    }));
  } catch (error) {
    console.error('Error removing approved reply:', error);
  }
};

module.exports = {
  postTweet,
  getTweet,
  listenToUser,
  client: rwClient,
  testConnection,
  startTracking,
  getTrackedAccounts,
  storeApprovedReply,
  getApprovedReplies,
  removeApprovedReply,
  handleRemoveFromQueue,
  handleUnapprove,
}; 