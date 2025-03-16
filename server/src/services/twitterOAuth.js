const { TwitterApi } = require('twitter-api-v2');
const { TwitterAuth, User } = require('../models');
const crypto = require('crypto');

// Store state parameters to prevent CSRF attacks
const stateStore = new Map();

// Twitter OAuth 2.0 scopes we need
const SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

// Create a Twitter OAuth 2.0 client
const createOAuthClient = () => {
  return new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });
};

// Generate authorization URL for a user
const generateAuthUrl = async (userId) => {
  try {
    const client = createOAuthClient();
    
    // Generate a random state parameter to prevent CSRF attacks
    const state = crypto.randomBytes(32).toString('hex');
    
    // Get the callback URL from environment or use default
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || 'http://localhost:8081/api/twitter/oauth/callback';
    console.log('Using callback URL:', callbackUrl);
    
    // Log Twitter client credentials (without exposing secrets)
    console.log('Twitter client configured with:', {
      clientId: process.env.TWITTER_CLIENT_ID ? 'Set' : 'Not set',
      clientSecret: process.env.TWITTER_CLIENT_SECRET ? 'Set' : 'Not set',
      callbackUrl
    });
    
    // Generate the authorization URL
    const authUrl = client.generateOAuth2AuthLink(
      callbackUrl,
      { scope: SCOPES, state }
    );
    
    console.log('Generated auth URL with state:', state);
    
    // Store the state parameter with the user ID and code verifier
    stateStore.set(state, { 
      userId, 
      timestamp: Date.now(),
      codeVerifier: authUrl.codeVerifier
    });
    
    // Clean up old state parameters (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [key, value] of stateStore.entries()) {
      if (value.timestamp < oneHourAgo) {
        stateStore.delete(key);
      }
    }
    
    return {
      url: authUrl.url,
      codeVerifier: authUrl.codeVerifier,
      state
    };
  } catch (error) {
    console.error('Error generating Twitter auth URL:', error);
    throw error;
  }
};

// Handle the OAuth callback
const handleCallback = async (code, state, codeVerifier) => {
  try {
    // Verify the state parameter
    const storedState = stateStore.get(state);
    if (!storedState) {
      throw new Error('Invalid state parameter');
    }
    
    const { userId } = storedState;
    
    // Clean up the state parameter
    stateStore.delete(state);
    
    // Get the callback URL from environment or use default
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || 'http://localhost:8081/api/twitter/oauth/callback';
    
    // Exchange the code for tokens
    const client = createOAuthClient();
    const { accessToken, refreshToken, expiresIn, scope } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: callbackUrl,
    });
    
    // Get the user's Twitter profile
    const loggedClient = new TwitterApi(accessToken);
    const { data: userInfo } = await loggedClient.v2.me();
    
    // Calculate token expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    // Store the tokens in the database
    await TwitterAuth.findOneAndUpdate(
      { userId: userId, twitterId: userInfo.id },
      {
        userId: userId,
        twitterId: userInfo.id,
        username: userInfo.username,
        name: userInfo.name || userInfo.username,
        profileImageUrl: userInfo.profile_image_url || null,
        accessToken,
        refreshToken,
        expiresAt,
        scope,
        isActive: true
      },
      { upsert: true, new: true }
    );
    
    return {
      success: true,
      username: userInfo.username,
      twitterId: userInfo.id
    };
  } catch (error) {
    console.error('Error handling Twitter OAuth callback:', error);
    throw error;
  }
};

// Handle the OAuth callback using state when session is missing
const handleCallbackWithState = async (code, state) => {
  try {
    // Verify the state parameter
    const storedState = stateStore.get(state);
    if (!storedState) {
      throw new Error('Invalid state parameter');
    }
    
    const { userId, codeVerifier } = storedState;
    
    if (!codeVerifier) {
      throw new Error('Missing code verifier in state store');
    }
    
    console.log('Found stored state with userId and codeVerifier:', {
      userId: userId,
      codeVerifier: codeVerifier.substring(0, 5) + '...'
    });
    
    // Clean up the state parameter
    stateStore.delete(state);
    
    // Get the callback URL from environment or use default
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || 'http://localhost:8081/api/twitter/oauth/callback';
    
    // Exchange the code for tokens
    const client = createOAuthClient();
    
    console.log('Attempting to exchange code for tokens with stored code verifier');
    
    try {
      const { accessToken, refreshToken, expiresIn, scope } = await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: callbackUrl,
      });
      
      // Get the user's Twitter profile
      const loggedClient = new TwitterApi(accessToken);
      const { data: userInfo } = await loggedClient.v2.me();
      
      // Calculate token expiration date
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      // Store the tokens in the database
      await TwitterAuth.findOneAndUpdate(
        { userId: userId, twitterId: userInfo.id },
        {
          userId: userId,
          twitterId: userInfo.id,
          username: userInfo.username,
          name: userInfo.name || userInfo.username,
          profileImageUrl: userInfo.profile_image_url || null,
          accessToken,
          refreshToken,
          expiresAt,
          scope,
          isActive: true
        },
        { upsert: true, new: true }
      );
      
      return {
        success: true,
        username: userInfo.username,
        twitterId: userInfo.id
      };
    } catch (tokenError) {
      console.error('Error exchanging code for tokens:', tokenError);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  } catch (error) {
    console.error('Error handling Twitter OAuth callback with state:', error);
    throw error;
  }
};

// Get a client for a specific user
const getUserClient = async (userId) => {
  try {
    // Find the user's Twitter auth
    const auth = await TwitterAuth.findOne({ 
      userId: userId, 
      isActive: true 
    }).sort({ createdAt: -1 });
    
    if (!auth) {
      return null;
    }
    
    // Check if the token is expired
    if (auth.expiresAt < new Date()) {
      // Refresh the token
      const client = createOAuthClient();
      const { accessToken, refreshToken, expiresIn } = await client.refreshOAuth2Token(auth.refreshToken);
      
      // Update the token in the database
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      await TwitterAuth.findByIdAndUpdate(auth._id, {
        accessToken,
        refreshToken,
        expiresAt
      });
      
      // Return a client with the new token
      return new TwitterApi(accessToken);
    }
    
    // Return a client with the existing token
    return new TwitterApi(auth.accessToken);
  } catch (error) {
    console.error('Error getting user Twitter client:', error);
    throw error;
  }
};

// Post a tweet on behalf of a user
const postTweetAsUser = async (userId, text, replyToId = null) => {
  try {
    const client = await getUserClient(userId);
    
    if (!client) {
      throw new Error('User not authenticated with Twitter');
    }
    
    // Create the tweet data
    const tweetData = { text };
    if (replyToId) {
      tweetData.reply = { in_reply_to_tweet_id: replyToId };
    }
    
    // Post the tweet
    const result = await client.v2.tweet(tweetData);
    
    return result.data;
  } catch (error) {
    console.error('Error posting tweet as user:', error);
    throw error;
  }
};

// Get user's Twitter connections
const getUserTwitterAccounts = async (userId) => {
  try {
    const connections = await TwitterAuth.find({ 
      userId: userId, 
      isActive: true 
    }).select('username twitterId createdAt');
    
    return connections;
  } catch (error) {
    console.error('Error getting user Twitter accounts:', error);
    throw error;
  }
};

// Disconnect a Twitter account
const disconnectTwitterAccount = async (userId, twitterId) => {
  try {
    await TwitterAuth.findOneAndUpdate(
      { userId: userId, twitterId },
      { isActive: false }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting Twitter account:', error);
    throw error;
  }
};

// Get the size of the state store (for debugging)
const getStateStoreSize = () => {
  return stateStore.size;
};

// Create a test client (for debugging)
const createTestClient = () => {
  return createOAuthClient();
};

module.exports = {
  generateAuthUrl,
  handleCallback,
  handleCallbackWithState,
  getUserClient,
  postTweetAsUser,
  getUserTwitterAccounts,
  disconnectTwitterAccount,
  getStateStoreSize,
  createTestClient
}; 