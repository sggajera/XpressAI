const express = require('express');
const router = express.Router();
const { User, Account, Context, Post } = require('../models');
const twitter = require('../services/twitter');

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

    post.reply = {
      replyText: reply.replyText,
      repliedBy: req.user._id,
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

module.exports = router; 