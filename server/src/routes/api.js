const express = require('express');
const router = express.Router();
const { User, Account, Context, Post, TwitterAuth } = require('../models');
const twitter = require('../services/twitter');
const twitterOAuth = require('../services/twitterOAuth');

// Get user profile with populated references
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('context')
      .populate({
        path: 'trackedAccounts',
        populate: {
          path: 'posts',
          model: 'Post'
        }
      });

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      context: user.context,
      trackedAccounts: user.trackedAccounts,
      createdAt: user.createdAt
    };
    
    res.json({ 
      success: true, 
      user: userResponse
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
    // Get user document with tracked accounts
    const user = await User.findById(req.user._id)
      .populate('trackedAccounts');

    if (!user || !user.trackedAccounts || user.trackedAccounts.length === 0) {
      const rateLimitInfo = await twitter.getRateLimitInfo(req.user._id);
      return res.json({ 
        success: true, 
        data: [],
        rateLimit: rateLimitInfo
      });
    }

    // Get account documents with their posts array
    const accounts = await Account.find({
      _id: { $in: user.trackedAccounts }
    });

    if (!accounts.length) {
      const rateLimitInfo = await twitter.getRateLimitInfo(req.user._id);
      return res.json({ 
        success: true, 
        data: [],
        rateLimit: rateLimitInfo
      });
    }

    // Get all posts from the posts arrays
    const allPostIds = accounts.reduce((ids, account) => {
      return [...ids, ...(account.posts || [])];
    }, []);

    // Fetch all posts documents
    const posts = await Post.find({
      _id: { $in: allPostIds }
    }).sort({ 'postDetails.createdAt': -1 });

    // Create a map of username to posts for quick lookup
    const postsByUsername = posts.reduce((acc, post) => {
      const username = post.postDetails.postedByUsername;
      if (!acc[username]) {
        acc[username] = [];
      }
      acc[username].push({
        id: post.postId,
        text: post.postDetails.text,
        created_at: post.postDetails.createdAt,
        public_metrics: post.postDetails.publicMetrics,
        username: post.postDetails.postedByUsername
      });
      return acc;
    }, {});

    const usernames = accounts.map(account => account.username);
    const canCall = await twitter.canMakeApiCall(req.user._id);
    
    // If we can't make API calls, return existing posts from the database
    if (!canCall) {
      const accountsWithExistingPosts = accounts.map(account => ({
        _id: account._id,
        username: account.username,
        twitterId: account.twitterId,
        lastChecked: account.lastChecked,
        keywords: account.keywords || [],
        callCount: account.callCount || 0,
        posts: postsByUsername[account.username] || [],
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }));

      const rateLimitInfo = await twitter.getRateLimitInfo(req.user._id);
      return res.json({ 
        success: true, 
        data: accountsWithExistingPosts,
        rateLimit: rateLimitInfo
      });
    }

    // If we can make API calls, fetch new posts
    let postsData;
    try {
      postsData = await twitter.getMultipleUsersTweets(usernames, req.user._id);
    } catch (error) {
      console.error('Error fetching tweets:', error);
      // If API call fails, use existing posts
      const accountsWithExistingPosts = accounts.map(account => ({
        _id: account._id,
        username: account.username,
        twitterId: account.twitterId,
        lastChecked: account.lastChecked,
        keywords: account.keywords || [],
        callCount: account.callCount || 0,
        posts: postsByUsername[account.username] || [],
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }));

      const rateLimitInfo = await twitter.getRateLimitInfo(req.user._id);
      return res.json({ 
        success: true, 
        data: accountsWithExistingPosts,
        rateLimit: rateLimitInfo
      });
    }

    // Process new posts and update accounts
    const accountsWithPosts = await Promise.all(accounts.map(async account => {
      const newPosts = postsData[account.username] || [];
      
      // Create or update posts and get their IDs
      const newPostIds = await Promise.all(newPosts.map(async post => {
        try {
          const postDoc = await Post.findOneAndUpdate(
            { postId: post.id }, // find by postId
            {
              $set: {
                postId: post.id,
                trackedBy: req.user._id,
                trackedByUsername: req.user.name,
                postDetails: {
                  text: post.text,
                  postedBy: account._id,
                  postedByUsername: account.username,
                  createdAt: post.created_at,
                  publicMetrics: post.public_metrics || {
                    likeCount: 0,
                    retweetCount: 0,
                    replyCount: 0
                  }
                }
              }
            },
            { 
              upsert: true, 
              new: true,
              setDefaultsOnInsert: true 
            }
          );
          return postDoc._id;
        } catch (error) {
          console.error(`Error processing post ${post.id}:`, error);
          // If there's an error, try to find the existing post
          const existingPost = await Post.findOne({ postId: post.id });
          if (existingPost) {
            return existingPost._id;
          }
          // If we can't find the post, skip it
          return null;
        }
      }));

      // Filter out any null values from failed operations
      const validNewPostIds = newPostIds.filter(id => id !== null);

      // Get existing post IDs from the account
      const existingPostIds = account.posts || [];

      // Combine with existing post IDs, keeping the most recent ones first and removing duplicates
      const allPostIds = [...new Set([...validNewPostIds, ...existingPostIds])];

      // Update account with all post references
      await Account.findByIdAndUpdate(account._id, {
        lastChecked: new Date(),
        $inc: { callCount: 1 },
        posts: allPostIds
      });

      // Return formatted response with new posts first
      return {
        _id: account._id,
        username: account.username,
        twitterId: account.twitterId,
        lastChecked: new Date(),
        keywords: account.keywords || [],
        callCount: (account.callCount || 0) + 1,
        posts: [...newPosts, ...(postsByUsername[account.username] || [])],
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };
    }));

    const rateLimitInfo = await twitter.getRateLimitInfo(req.user._id);
    res.json({ 
      success: true, 
      data: accountsWithPosts,
      rateLimit: rateLimitInfo
    });
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
    const existingAccount = await Account.findOne({
      username: username.toLowerCase(),
      user: req.user._id
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        error: `Account @${username} is already being tracked`
      });
    }

    const twitterData = await twitter.startTracking(username, req.user._id);
    
    // Create new account
    const account = new Account({
      username: username.toLowerCase(),
      twitterId: twitterData.user.id,
      user: req.user._id,
      lastChecked: new Date(),
      keywords: [],
      callCount: 1
    });

    await account.save();

    // Handle different tweet response structures
    const tweetsData = twitterData.tweets?.data?.data || // nested structure
                      twitterData.tweets?.data || // flat structure
                      twitterData.tweets || // direct array
                      [];

    const tweets = Array.isArray(tweetsData) ? tweetsData : [tweetsData];

    // Create posts for the account
    const posts = await Promise.all(tweets.map(async tweet => {
      try {
        const post = new Post({
          postId: tweet.id,
          trackedBy: req.user._id,
          trackedByUsername: req.user.name,
          postDetails: {
            text: tweet.text,
            postedBy: account._id,
            postedByUsername: account.username,
            createdAt: tweet.created_at,
            publicMetrics: tweet.public_metrics || {
              likeCount: 0,
              retweetCount: 0,
              replyCount: 0
            }
          }
        });

        await post.save();
        return post;
      } catch (error) {
        console.error('Error creating post:', error);
        return null;
      }
    }));

    // Filter out any failed post creations
    const validPosts = posts.filter(post => post !== null);

    // Update account with posts
    account.posts = validPosts.map(post => post._id);
    await account.save();

    // Update user's tracked accounts
    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { trackedAccounts: account._id } }
    );

    // Log the response structure for debugging
    console.log('Twitter response structure:', {
      user: twitterData.user,
      tweets_count: tweets.length,
      posts_created: validPosts.length
    });

    res.json({ 
      success: true, 
      data: {
        ...account.toObject(),
        posts: validPosts
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
    const { tweetId, reply } = req.body;
    
    const post = await Post.findOne({ postId: tweetId });
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    // Check if the post already has a reply
    if (!post.reply || !post.reply.replyText) {
      // Create a new reply if none exists
      post.reply = {
        replyText: reply.replyText,
        repliedBy: req.user._id,
        generatedAt: new Date(),
        queuedAt: new Date(),
        inQueue: true,
        approvedAt: new Date(),
        approvedBy: req.user._id,
        tone: reply.tone,
        userGeneralContext: reply.userGeneralContext,
        aiEditContext: reply.aiEditContext,
        suggestedReply: reply.suggestedReply,
        afterTextEditReply: reply.afterTextEditReply
      };
    } else {
      // Update existing reply
      post.reply.replyText = reply.replyText;
      post.reply.updatedAt = new Date();
      post.reply.queuedAt = new Date();
      post.reply.inQueue = true;
      post.reply.approvedAt = new Date();
      post.reply.approvedBy = req.user._id;
      post.reply.tone = reply.tone || post.reply.tone;
      post.reply.userGeneralContext = reply.userGeneralContext || post.reply.userGeneralContext;
      post.reply.aiEditContext = reply.aiEditContext || post.reply.aiEditContext;
      post.reply.suggestedReply = reply.suggestedReply || post.reply.suggestedReply;
      post.reply.afterTextEditReply = reply.afterTextEditReply || post.reply.afterTextEditReply;
    }

    await post.save();

    res.json({ 
      success: true, 
      data: post 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get approved replies
router.get('/twitter/approved-replies', async (req, res) => {
  try {
    const posts = await Post.find({
      trackedBy: req.user._id,
      'reply.inQueue': true
    }).populate('postDetails.postedBy');

    const replies = posts.map(post => ({
      tweetId: post.postId,
      username: post.postDetails.postedByUsername,
      originalTweet: post.postDetails.text,
      replyText: post.reply.replyText,
      queuedAt: post.reply.queuedAt
    }));

    res.json({ 
      success: true, 
      data: replies 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete approved reply
router.delete('/twitter/approved-replies/:tweetId', async (req, res) => {
  try {
    const { tweetId } = req.params;
    
    const post = await Post.findOne({ 
      postId: tweetId,
      trackedBy: req.user._id
    });

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Reply not found' 
      });
    }

    post.reply = undefined;
    await post.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post all queued replies
router.post('/twitter/post-all-replies', async (req, res) => {
  try {
    // Find all queued posts for this user
    const posts = await Post.find({
      trackedBy: req.user._id,
      'reply.inQueue': true,
      'reply.sentAt': null
    }).sort({ 'reply.queuedAt': 1 });

    if (!posts || posts.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const results = [];
    for (const post of posts) {
      try {
        // Check rate limit before each post
        const canCall = await twitter.canMakeApiCall(req.user._id);
        if (!canCall) {
          const rateLimitInfo = await twitter.getRateLimitInfo(req.user._id);
          results.push({
            success: false,
            postId: post.postId,
            error: `Rate limit reached. Please wait ${rateLimitInfo.minutesRemaining} minutes.`
          });
          continue;
        }

        // Post the reply using Twitter API
        const tweet = await twitter.postTweet(post.reply.replyText, post.postId, req.user._id);
        
        // Update post with sent information
        post.reply.sentAt = new Date();
        post.reply.inQueue = false;
        post.reply.xPostId = tweet.data.id;
        post.reply.xPostedAt = new Date();
        await post.save();

        results.push({
          success: true,
          postId: post.postId,
          tweetId: tweet.data.id
        });

        // Update API call timestamp
        await twitter.updateApiCallTimestamp(req.user._id);
      } catch (error) {
        console.error(`Error posting reply to ${post.postId}:`, error);
        results.push({
          success: false,
          postId: post.postId,
          error: error.message
        });
      }
    }

    res.json({ 
      success: true, 
      data: results 
    });
  } catch (error) {
    console.error('Error posting all replies:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update context
router.put('/context', async (req, res) => {
  try {
    const context = await Context.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true }
    );

    res.json({ 
      success: true, 
      data: context 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reply for a specific post
router.get('/twitter/post-reply/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findOne({ 
      postId: postId,
      trackedBy: req.user._id
    });

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    res.json({ 
      success: true, 
      data: post
    });
  } catch (error) {
    console.error('Error fetching post reply:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Store a reply in the Post object
router.post('/twitter/store-reply', async (req, res) => {
  try {
    const { postId, replyText, forceUpdate } = req.body;
    
    if (!postId || !replyText) {
      return res.status(400).json({ 
        success: false, 
        error: 'Post ID and reply text are required' 
      });
    }

    const post = await Post.findOne({ 
      postId: postId,
      trackedBy: req.user._id
    });

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    // Check if post already has a reply and we're not forcing an update
    if (post.reply && post.reply.replyText && !forceUpdate) {
      return res.json({ 
        success: true, 
        message: 'Post already has a reply',
        data: post
      });
    }

    // Create or update the reply
    if (!post.reply) {
      post.reply = {
        replyText: replyText,
        repliedBy: req.user._id,
        generatedAt: new Date(),
        inQueue: false
      };
    } else {
      post.reply.replyText = replyText;
      post.reply.updatedAt = new Date();
    }

    await post.save();

    res.json({ 
      success: true, 
      data: post 
    });
  } catch (error) {
    console.error('Error storing reply:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Twitter OAuth Routes

// Start OAuth flow
router.get('/twitter/oauth/login', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Generate auth URL
    const { url, codeVerifier, state } = await twitterOAuth.generateAuthUrl(userId);
    
    // Store code verifier in session
    req.session = req.session || {};
    req.session.twitterOAuth = {
      codeVerifier,
      state,
      userId: userId.toString()
    };
    
    console.log('Setting session data:', {
      sessionId: req.session.id,
      state,
      hasCodeVerifier: !!codeVerifier
    });
    
    // Force session save and wait for it to complete
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('Error saving session:', err);
          reject(err);
        } else {
          console.log('Session saved successfully');
          resolve();
        }
      });
    });
    
    // Return the auth URL
    res.json({
      success: true,
      url,
      sessionId: req.session.id // Include session ID for debugging
    });
  } catch (error) {
    console.error('Twitter OAuth login error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// OAuth callback
router.get('/twitter/oauth/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    console.log('Received callback with params:', req.query);
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

// Get user's connected Twitter accounts
router.get('/twitter/accounts', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's Twitter accounts
    const accounts = await twitterOAuth.getUserTwitterAccounts(userId);
    
    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('Error getting Twitter accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Disconnect a Twitter account
router.delete('/twitter/accounts/:twitterId', async (req, res) => {
  try {
    const userId = req.user._id;
    const { twitterId } = req.params;
    
    // Disconnect the account
    await twitterOAuth.disconnectTwitterAccount(userId, twitterId);
    
    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error disconnecting Twitter account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Post a tweet as the user
router.post('/twitter/tweet-as-user', async (req, res) => {
  try {
    const userId = req.user._id;
    const { text, replyToId } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Tweet text is required'
      });
    }
    
    // Post the tweet
    const tweet = await twitterOAuth.postTweetAsUser(userId, text, replyToId);
    
    res.json({
      success: true,
      tweet
    });
  } catch (error) {
    console.error('Error posting tweet as user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug Twitter OAuth configuration
router.get('/twitter/oauth/debug', async (req, res) => {
  try {
    // Check if Twitter OAuth credentials are set
    const config = {
      clientId: process.env.TWITTER_CLIENT_ID ? 'Set' : 'Not set',
      clientSecret: process.env.TWITTER_CLIENT_SECRET ? 'Set' : 'Not set',
      callbackUrl: process.env.TWITTER_CALLBACK_URL || 'http://localhost:8081/api/twitter/oauth/callback',
      sessionSecret: (process.env.SESSION_SECRET || process.env.JWT_SECRET) ? 'Set' : 'Not set'
    };
    
    // Check if session is working
    req.session.debug = {
      timestamp: Date.now(),
      message: 'Debug session test'
    };
    
    // Check state store
    const stateStoreSize = twitterOAuth.getStateStoreSize();
    
    // Check if we can create a Twitter client
    let clientTest = 'Failed';
    try {
      const client = twitterOAuth.createTestClient();
      clientTest = 'Success';
    } catch (error) {
      clientTest = `Error: ${error.message}`;
    }
    
    res.json({
      success: true,
      config,
      session: {
        id: req.session.id,
        cookie: req.session.cookie,
        debug: req.session.debug
      },
      stateStore: {
        size: stateStoreSize
      },
      clientTest,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'not set'
      }
    });
  } catch (error) {
    console.error('Twitter OAuth debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 