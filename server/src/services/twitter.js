const { TwitterApi } = require('twitter-api-v2');
const { User, Account, Post, Context } = require('../models');
const mongoose = require('mongoose');
const { mockTrackedAccounts, mockUserData, mockTweets } = require('../mock/twitterData');

// Add environment check
const USE_MOCK = process.env.USE_MOCK === 'true';
const RATE_LIMIT_MINUTES = parseInt(process.env.TWITTER_API_RATE_LIMIT_MINUTES) || 15;

// Cache for last API call timestamps
const apiCallTimestamps = new Map();

// Function to check if enough time has passed since last API call
const canMakeApiCall = async (userId) => {
  try {
    const user = await User.findById(userId, { lastApiCall: 1 });
    if (!user || !user.lastApiCall) return true;

    const timeSinceLastCall = Date.now() - user.lastApiCall.getTime();
    const minimumWaitTime = RATE_LIMIT_MINUTES * 60 * 1000; // Convert minutes to milliseconds
    
    return timeSinceLastCall >= minimumWaitTime;
  } catch (error) {
    console.error('Error checking API call availability:', error);
    return false;
  }
};

// Function to update last API call timestamp
const updateApiCallTimestamp = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { lastApiCall: new Date() });
  } catch (error) {
    console.error('Error updating API call timestamp:', error);
  }
};

// Get remaining time until next API call allowed
const getRateLimitInfo = async (userId) => {
  try {
    const user = await User.findById(userId, { lastApiCall: 1 });
    if (!user || !user.lastApiCall) {
      return {
        active: false,
        minutesRemaining: 0
      };
    }

    const timeSinceLastCall = Date.now() - user.lastApiCall.getTime();
    const minimumWaitTime = RATE_LIMIT_MINUTES * 60 * 1000;
    const remainingTime = minimumWaitTime - timeSinceLastCall;
    const minutesRemaining = Math.max(0, Math.ceil(remainingTime / 60000));

    return {
      active: minutesRemaining > 0,
      minutesRemaining
    };
  } catch (error) {
    console.error('Error getting rate limit info:', error);
    return {
      active: true, // Fail safe: assume rate limit is active if there's an error
      minutesRemaining: RATE_LIMIT_MINUTES
    };
  }
};

// Initialize Twitter client
const initializeTwitterClient = () => {
  if (USE_MOCK) {
    console.log('Using mock Twitter client');
    return null;
  }

  try {
    // Check for required credentials
    if (!process.env.TWITTER_API_KEY || 
        !process.env.TWITTER_API_SECRET || 
        !process.env.TWITTER_ACCESS_TOKEN || 
        !process.env.TWITTER_ACCESS_SECRET) {
      throw new Error('Missing Twitter API credentials');
    }

    // Create client with OAuth 1.0a User Context
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    console.log('Twitter client initialized with OAuth 1.0a');
    
    return client;
  } catch (error) {
    console.error('Failed to initialize Twitter client:', error);
    throw error;
  }
};

const client = initializeTwitterClient();
const rwClient = client;

// Get user tweets with rate limiting
const getUserTweets = async (twitterId, userId) => {
  try {
    if (USE_MOCK) {
      console.log('Using mock tweets data');
      return mockTweets;
    }

    console.log('Calling Twitter API - getUserTimeline:', {
      twitterId,
      userId,
      params: {
        max_results: 5,
        exclude: ['replies', 'retweets'],
        tweet_fields: ['created_at', 'public_metrics', 'text']
      }
    });

    const tweets = await client.userTimeline(twitterId, {
      max_results: 5,
      exclude: ['replies', 'retweets'],
      'tweet.fields': ['created_at', 'public_metrics', 'text']
    });

    // Update last API call timestamp after successful API call
    if (userId) {
      await updateApiCallTimestamp(userId);
    }

    return tweets;
  } catch (error) {
    console.error('Error fetching user tweets:', error);
    throw error;
  }
};

// Get tweets from multiple users
const getMultipleUsersTweets = async (usernames, userId) => {
  try {
    if (USE_MOCK) {
      console.log('Using mock data for multiple users tweets');
      return { data: mockTweets.data };
    }

    const canCall = await canMakeApiCall(userId);
    if (!canCall) {
      const rateLimitInfo = await getRateLimitInfo(userId);
      throw new Error(`Rate limit in effect. Please wait ${rateLimitInfo.minutesRemaining} minutes.`);
    }

    // Get timestamp for 6 hours ago
    const startTime = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    // Create query string with OR operator and filter
    const query = `(${usernames.map(username => `from:${username}`).join(' OR ')}) -is:reply -is:retweet`;

    console.log('Calling Twitter API - search:', {
      query,
      userId,
      startTime,
      params: {
        max_results: 100,
        tweet_fields: ['created_at', 'public_metrics', 'text', 'author_id'],
        user_fields: ['username'],
        expansions: ['author_id']
      }
    });

    const tweets = await client.search(query, {
      start_time: startTime,
      max_results: 100,
      'tweet.fields': ['created_at', 'public_metrics', 'text', 'author_id'],
      'user.fields': ['username'],
      expansions: ['author_id']
    });

    // Update last API call timestamp after successful API call
    await updateApiCallTimestamp(userId);

    // Extract the actual tweets data from the nested structure
    const tweetsData = tweets?.data?.data || tweets?.data || [];
    const includesUsers = tweets?.data?.includes?.users || tweets?.includes?.users || [];

    // Handle case where no tweets are found
    if (!tweetsData || tweetsData.length === 0) {
      console.log('No tweets found for the given criteria');
      return usernames.reduce((acc, username) => {
        acc[username.toLowerCase()] = [];
        return acc;
      }, {});
    }

    // Log the full response structure for debugging
    console.log('Twitter API Response Structure:', {
      data_length: tweetsData.length,
      includes_users: includesUsers.length,
      meta: tweets?.data?.meta || tweets?.meta
    });

    // Create a map of author_id to username from the includes
    const userMap = {};
    includesUsers.forEach(user => {
      if (user.id && user.username) {
        userMap[user.id] = user.username.toLowerCase();
      }
    });
    console.log('User mapping:', userMap);

    // Ensure tweets data is always an array and validate each tweet
    const tweetsArray = Array.isArray(tweetsData) ? tweetsData : [tweetsData];
    console.log('Processing tweets array length:', tweetsArray.length);

    // Group tweets by author
    const tweetsByAuthor = tweetsArray.reduce((acc, tweet) => {
      // Skip invalid tweets
      if (!tweet || !tweet.id) {
        console.log('Skipping invalid tweet:', tweet);
        return acc;
      }

      const username = tweet.author_id ? userMap[tweet.author_id] : null;
      
      // Log detailed information about the tweet and author mapping
      console.log('Processing tweet:', {
        tweet_id: tweet.id,
        author_id: tweet.author_id,
        found_username: username,
        text_preview: tweet.text?.substring(0, 50)
      });

      if (!username) {
        console.log(`No username found for tweet:`, {
          tweet_id: tweet.id,
          author_id: tweet.author_id,
          available_users: Object.keys(userMap),
          available_usernames: Object.values(userMap)
        });
        return acc;
      }
      
      if (!acc[username]) {
        acc[username] = [];
      }
      
      acc[username].push({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics ? {
          likeCount: tweet.public_metrics.like_count || 0,
          retweetCount: tweet.public_metrics.retweet_count || 0,
          replyCount: tweet.public_metrics.reply_count || 0
        } : {
          likeCount: 0,
          retweetCount: 0,
          replyCount: 0
        },
        username
      });
      return acc;
    }, {});

    // Initialize empty arrays for usernames with no tweets
    usernames.forEach(username => {
      const normalizedUsername = username.toLowerCase().replace('@', '');
      if (!tweetsByAuthor[normalizedUsername]) {
        console.log(`Initializing empty array for username: ${normalizedUsername}`);
        tweetsByAuthor[normalizedUsername] = [];
      }
    });

    // Log final result structure
    console.log('Final tweets by author structure:', Object.keys(tweetsByAuthor).map(username => ({
      username,
      tweet_count: tweetsByAuthor[username].length
    })));

    return tweetsByAuthor;
  } catch (error) {
    console.error('Error in getMultipleUsersTweets:', error);
    throw error;
  }
};

// Get tracked accounts
const getTrackedAccounts = async (userId) => {
  try {
    if (USE_MOCK) {
      console.log('Using mock data for tracked accounts');
      return {
        data: mockTrackedAccounts.map(account => ({
          ...account,
          posts: mockTweets.data,
          lastChecked: new Date().toISOString()
        }))
      };
    }

    const accounts = await Account.find({ user: userId })
      .populate('posts')
      .lean();

    const accountsWithPosts = await Promise.all(
      accounts.map(async (account) => {
        const canCall = await canMakeApiCall(userId);
        if (!canCall) {
          // Transform stored posts into the expected format
          const posts = (account.posts || []).map(post => ({
            id: post.postId,
            text: post.postDetails.text,
            created_at: post.postDetails.createdAt,
            public_metrics: post.postDetails.publicMetrics,
            username: post.postDetails.postedByUsername
          }));

          return {
            _id: account._id,
            username: account.username,
            twitterId: account.twitterId,
            lastChecked: account.lastChecked,
            keywords: account.keywords || [],
            callCount: account.callCount || 0,
            posts,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt
          };
        }

        try {
          const latestPosts = await getUserTweets(account.twitterId, userId);
          // Note: getUserTweets now handles updating the timestamp

          return {
            _id: account._id,
            username: account.username,
            twitterId: account.twitterId,
            lastChecked: account.lastChecked,
            keywords: account.keywords || [],
            callCount: account.callCount || 0,
            posts: latestPosts.data || [],
            createdAt: account.createdAt,
            updatedAt: account.updatedAt
          };
        } catch (error) {
          console.error(`Error fetching posts for account ${account.username}:`, error);
          // If API call fails, use existing posts
          const posts = (account.posts || []).map(post => ({
            id: post.postId,
            text: post.postDetails.text,
            created_at: post.postDetails.createdAt,
            public_metrics: post.postDetails.publicMetrics,
            username: post.postDetails.postedByUsername
          }));

          return {
            _id: account._id,
            username: account.username,
            twitterId: account.twitterId,
            lastChecked: account.lastChecked,
            keywords: account.keywords || [],
            callCount: account.callCount || 0,
            posts,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt
          };
        }
      })
    );

    return { 
      data: accountsWithPosts
    };
  } catch (error) {
    console.error('Error in getTrackedAccounts:', error);
    throw error;
  }
};

// Start tracking a new Twitter account
const startTracking = async (username, userId) => {
  try {
    const canCall = await canMakeApiCall(userId);
    if (!canCall) {
      const rateLimitInfo = await getRateLimitInfo(userId);
      throw new Error(`Rate limit in effect. Please wait ${rateLimitInfo.minutesRemaining} minutes before tracking new accounts.`);
    }

    if (USE_MOCK) {
      console.log('Using mock data for tracking');
      return { user: mockUserData.data, tweets: mockTweets };
    }

    console.log('Calling Twitter API - userByUsername:', {
      username,
      userId
    });

    // Get user info first
    const user = await client.userByUsername(username);
    if (!user?.data) {
      throw new Error('User not found');
    }

    // Get recent tweets
    const tweets = await getUserTweets(user.data.id, userId);

    // Update last API call timestamp
    await updateApiCallTimestamp(userId);

    return {
      user: user.data,
      tweets
    };
  } catch (error) {
    console.error('Error in startTracking:', error);
    throw error;
  }
};

// Post a tweet or reply
const postTweet = async (text, replyToId = null, userId = null) => {
  try {
    if (USE_MOCK) {
      console.log('Using mock data for posting tweet');
      return { data: { id: `mock_tweet_${Date.now()}`, text } };
    }

    // Log request parameters
    console.log('🚀 Twitter API Request - postTweet:', {
      text,
      replyToId,
      userId,
      timestamp: new Date().toISOString()
    });

    // Verify client initialization
    if (!client) {
      console.error('Twitter client not initialized');
      throw new Error('Twitter client not initialized');
    }

    // Verify we can post by trying to get our own user info
    try {
      console.log('Verifying Twitter credentials...');
      const me = await client.v2.me();
      console.log('Twitter credentials verified:', me);
    } catch (verifyError) {
      console.error('Failed to verify Twitter credentials:', verifyError);
      
      if (verifyError.code === 403) {
        console.error('OAuth Permission Error Details:', {
          error: verifyError.data?.error,
          description: verifyError.data?.error_description
        });
        throw new Error('OAuth permission error: Please check your app permissions in the Twitter Developer Portal');
      }
      throw verifyError;
    }

    // Create the tweet data object according to v2 API schema
    const tweetData = replyToId ? {
      text,
      reply: {
        in_reply_to_tweet_id: replyToId
      }
    } : {
      text
    };

    // Post the tweet using v2 endpoint
    console.log('Posting tweet with data:', tweetData);
    const response = await client.v2.tweet(tweetData);

    // Update API call timestamp if userId is provided
    if (userId) {
      await updateApiCallTimestamp(userId);
    }

    return response;
  } catch (error) {
    console.error('Error posting tweet:', error);
    
    // Enhanced error handling
    if (error.data?.errors) {
      const errorDetails = error.data.errors.map(e => e.message).join(', ');
      throw new Error(`Twitter API Error: ${errorDetails}`);
    }
    
    throw error;
  }
};

// Get a single tweet
const getTweet = async (tweetId, userId = null) => {
  try {
    if (USE_MOCK) {
      console.log('Using mock data for tweet fetch');
      return { data: { id: tweetId, text: 'Mock tweet' } };
    }

    console.log('Calling Twitter API - singleTweet:', {
      tweetId,
      userId,
      params: {
        tweet_fields: ['created_at', 'public_metrics', 'text']
      }
    });

    const tweet = await client.singleTweet(tweetId, {
      'tweet.fields': ['created_at', 'public_metrics', 'text']
    });

    // Update timestamp if userId is provided
    if (userId) {
      await updateApiCallTimestamp(userId);
    }

    return tweet;
  } catch (error) {
    console.error('Twitter API Error:', error);
    throw new Error('Failed to fetch tweet');
  }
};

// Test Twitter connection
const testConnection = async (userId = null) => {
  try {
    if (USE_MOCK) {
      return { id: 'mock_id', name: 'Mock User' };
    }

    console.log('Calling Twitter API - me:', {
      userId
    });

    const me = await client.v2.me();

    // Update timestamp if userId is provided
    if (userId) {
      await updateApiCallTimestamp(userId);
    }

    return me;
  } catch (error) {
    console.error('Twitter API Error:', error);
    throw error;
  }
};

// Send queued replies
const sendQueuedReplies = async (userId) => {
  try {
    const posts = await Post.find({
      trackedBy: userId,
      'reply.inQueue': true,
      'reply.sentAt': null
    }).sort({ 'reply.queuedAt': 1 });

    const results = [];
    for (const post of posts) {
      try {
        const canCall = await canMakeApiCall(userId);
        if (!canCall) {
          break;
        }

        // Pass userId to postTweet to update timestamp
        const tweet = await postTweet(post.reply.replyText, post.postId, userId);
        
        // Update post with sent information
        post.reply.sentAt = new Date();
        post.reply.inQueue = false;
        post.reply.xPostId = tweet.data.id;
        post.reply.xPostedAt = new Date();
        await post.save();

        results.push({ success: true, postId: post.postId });
      } catch (error) {
        console.error(`Error sending reply to ${post.postId}:`, error);
        results.push({ success: false, postId: post.postId, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in sendQueuedReplies:', error);
    throw error;
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
  canMakeApiCall,
  getRateLimitInfo,
  getUserTweets,
  getMultipleUsersTweets,
  startTracking,
  postTweet,
  getTweet,
  testConnection,
  sendQueuedReplies,
  client,
  storeApprovedReply,
  getApprovedReplies,
  removeApprovedReply,
  handleRemoveFromQueue,
  handleUnapprove,
  getTrackedAccounts,
  updateApiCallTimestamp
}; 