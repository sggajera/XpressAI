const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  replyText: {
    type: String,
    required: true
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedAt: Date,
  updatedAt: Date,
  queuedAt: Date,
  sentAt: Date,
  inQueue: {
    type: Boolean,
    default: false
  },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tone: String,
  userGeneralContext: String,
  aiEditContext: String,
  suggestedReply: String,
  afterTextEditReply: String,
  xPostId: String,
  xPostedAt: Date
});

const postSchema = new mongoose.Schema({
  postId: {
    type: String,
    required: true,
    unique: true
  },
  trackedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trackedByUsername: String,
  postDetails: {
    text: String,
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    postedByUsername: String,
    createdAt: Date,
    publicMetrics: {
      likeCount: Number,
      retweetCount: Number,
      replyCount: Number
    }
  },
  reply: replySchema
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure uniqueness of postId per user
postSchema.index({ postId: 1, trackedBy: 1 }, { unique: true });

module.exports = mongoose.model('Post', postSchema); 