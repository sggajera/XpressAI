const { TwitterApi } = require('twitter-api-v2');
const mongoose = require('mongoose');
const User = require('../models/User');
const { mockTrackedAccounts, mockUserData, mockTweets } = require('../mock/twitterData');

// Add environment check
const USE_MOCK = process.env.USE_MOCK === 'true';
const RATE_LIMIT_MINUTES = parseInt(process.env.TWITTER_API_RATE_LIMIT_MINUTES) || 15;

// Cache for last API call timestamps
const apiCallTimestamps = new Map();

// Function to check if enough time has passed since last API call
const canMakeApiCall = (userId) => {
  const lastCallTime = apiCallTimestamps.get(userId);
  if (!lastCallTime) return true;

  const timeSinceLastCall = Date.now() - lastCallTime;
  const minimumWaitTime = RATE_LIMIT_MINUTES * 60 * 1000; // Convert minutes to milliseconds
  
  return timeSinceLastCall >= minimumWaitTime;
};

// Function to update last API call timestamp
const updateApiCallTimestamp = (userId) => {
  apiCallTimestamps.set(userId, Date.now());
};

// Get remaining time until next API call allowed
const getTimeUntilNextCall = (userId) => {
  const lastCallTime = apiCallTimestamps.get(userId);
  if (!lastCallTime) return 0;

  const timeSinceLastCall = Date.now() - lastCallTime;
  const minimumWaitTime = RATE_LIMIT_MINUTES * 60 * 1000;
  const remainingTime = minimumWaitTime - timeSinceLastCall;
  
  return Math.max(0, Math.ceil(remainingTime / 60000)); // Return remaining minutes
};

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

const startTracking = async (username, userId) => {
  try {
    // Check if we can make API call
    if (!canMakeApiCall(userId)) {
      const minutesRemaining = getTimeUntilNextCall(userId);
      throw new Error(`Rate limit in effect. Please wait ${minutesRemaining} minutes before tracking new accounts.`);
    }

    // Get user info first
    const user = await client.v2.userByUsername(username);
    if (!user) {
      throw new Error('User not found');
    }

    // Get recent tweets
    const tweets = await client.v2.userTimeline(user.data.id, {
      max_results: 5,
      exclude: ['replies', 'retweets'],
      'tweet.fields': ['created_at', 'public_metrics', 'text']
    });

    // Update last API call timestamp
    updateApiCallTimestamp(userId);

    // Store the account and tweets in the database
    const accountData = {
      username: user.data.username.toLowerCase(),
      twitterId: user.data.id,
      lastChecked: new Date(),
      keywords: [],
      tweets: tweets.data || []
    };

    // Update user's tracked accounts in database
    await User.findByIdAndUpdate(
      userId,
      { 
        $addToSet: { 
          'preferences.trackedAccounts': accountData
        }
      },
      { new: true }
    );

    return {
      success: true,
      user: {
        username: user.data.username,
        id: user.data.id,
        name: user.data.name,
        description: user.data.description || ''
      },
      tweets: {
        data: tweets.data || []
      },
      rateLimit: {
        active: false,
        minutesRemaining: RATE_LIMIT_MINUTES
      }
    };
  } catch (error) {
    console.error('Error in startTracking:', error);
    throw error;
  }
};

const getTrackedAccounts = async (userId) => {
  try {
    if (USE_MOCK) {
      console.log('Using mock data for tracked accounts');
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        success: true, 
        data: mockTrackedAccounts
      };
    }

    // Get user from database
    const user = await User.findById(userId);
    if (!user?.preferences?.trackedAccounts) {
      return { success: true, data: [] };
    }

    // Check if we can make API call
    const canCallApi = canMakeApiCall(userId);
    
    // If we can't make API call, return data from database with rate limit info
    if (!canCallApi) {
      const minutesRemaining = getTimeUntilNextCall(userId);
      console.log('Rate limit active, returning cached data from database');
      return { 
        success: true, 
        data: user.preferences.trackedAccounts,
        fromCache: true,
        rateLimit: {
          active: true,
          minutesRemaining: minutesRemaining
        }
      };
    }

    // If we can make API call, fetch fresh tweets
    let accountsWithTweets = [];
    for (const account of user.preferences.trackedAccounts) {
      try {
        const tweets = await client.v2.userTimeline(account.twitterId, {
          max_results: 5,
          exclude: ['replies', 'retweets'],
          'tweet.fields': ['created_at', 'public_metrics', 'text']
        });

        // Prepare the updated account data
        accountsWithTweets.push({
          ...account.toObject(),  // Convert Mongoose document to plain object
          lastChecked: new Date(),
          tweets: tweets.data || account.tweets || [] // Keep existing tweets if API call fails
        });
      } catch (error) {
        console.error(`Error fetching tweets for ${account.username}:`, error);
        // On error, use existing account data from database
        accountsWithTweets.push({
          ...account.toObject(),  // Convert Mongoose document to plain object
          tweets: account.tweets || [] // Ensure tweets is always an array
        });
      }
    }

    // Update last API call timestamp
    updateApiCallTimestamp(userId);

    // Update user's tracked accounts in database with new data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        'preferences.trackedAccounts': accountsWithTweets
      },
      { new: true }
    );

    console.log('Updated tracked accounts in database with fresh tweets');

    return { 
      success: true, 
      data: accountsWithTweets,
      rateLimit: {
        active: false,
        minutesRemaining: RATE_LIMIT_MINUTES
      }
    };
  } catch (error) {
    console.error('Error in getTrackedAccounts:', error);
    // If there's an error, return the cached data from database
    const user = await User.findById(userId);
    return {
      success: true,
      data: user?.preferences?.trackedAccounts || [],
      fromCache: true,
      error: error.message
    };
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