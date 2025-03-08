const { TwitterApi } = require('twitter-api-v2');
const mongoose = require('mongoose');
const User = require('../models/User');
const { mockTrackedAccounts, mockUserData, mockTweets } = require('../mock/twitterData');

// Add environment check
const USE_MOCK = process.env.USE_MOCK === 'true' || true; // Default to mock data

// Add rate limit handling
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
}, {
  retry: {
    maxAttempts: 3,
    statusCodes: [429, 500, 502, 503, 504],
    calculateDelay: ({ attemptCount, error, metadata }) => {
      if (error?.code === 429) {
        // Get rate limit reset time from headers
        const resetTime = metadata?.rateLimit?.reset;
        if (resetTime) {
          const now = Date.now() / 1000;
          const waitTime = Math.max(resetTime - now, 0);
          return waitTime * 1000; // Convert to milliseconds
        }
      }
      return 1000 * Math.pow(2, attemptCount - 1);
    }
  }
});

const rwClient = client.readWrite;

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

// Simple test function
const testConnection = async () => {
  try {
    if (USE_MOCK) {
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
      // Use mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      // Store in database
      await User.findOneAndUpdate(
        { email: 'test@example.com' },
        { 
          $addToSet: {
            'preferences.trackedAccounts': {
              username: username,
              twitterId: mockUserData.data.id,
              lastChecked: new Date(),
              keywords: []
            }
          }
        },
        { upsert: true }
      );

      return {
        user: mockUserData.data,
        tweets: mockTweets.data
      };
    }

    // Real API code...
    const user = await rwClient.v2.userByUsername(username, {
      'user.fields': ['id', 'name', 'username', 'description']
    });

    if (!user.data) {
      throw new Error('User not found');
    }

    // Add delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get user's tweets with more fields
    const tweets = await rwClient.v2.userTimeline(user.data.id, {
      exclude: ['retweets', 'replies'],
      max_results: 3,
      'tweet.fields': ['created_at', 'public_metrics']
    });

    // Store in database
    await User.findOneAndUpdate(
      { email: 'test@example.com' }, // We'll replace this with actual user later
      { 
        $addToSet: { // Using addToSet to avoid duplicates
          'preferences.trackedAccounts': {
            username: username,
            twitterId: user.data.id,
            lastChecked: new Date(),
            keywords: []
          }
        }
      },
      { upsert: true }
    );

    return {
      user: user.data,
      tweets: tweets.data || []
    };
  } catch (error) {
    console.error('Twitter API Error:', error);
    if (error.code === 429) {
      const resetTime = error.rateLimit?.reset;
      if (resetTime) {
        const now = Date.now() / 1000;
        const waitMinutes = Math.ceil((resetTime - now) / 60);
        throw new Error(`Rate limit reached. Please wait ${waitMinutes} minutes before trying again.`);
      }
      throw new Error('Rate limit reached. Please wait 15 minutes before trying again.');
    }
    throw error;
  }
};

// New function to get tracked accounts
const getTrackedAccounts = async () => {
  try {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      return mockTrackedAccounts;
    }

    const user = await User.findOne({ email: 'test@example.com' });
    return user?.preferences?.trackedAccounts || [];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch tracked accounts');
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
}; 