const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  twitterId: {
    type: String,
    required: true
  },
  lastChecked: {
    type: Date,
    default: Date.now
  },
  lastApiCall: {
    type: Date,
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  callCount: {
    type: Number,
    default: 0
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ensure username is unique per user
accountSchema.index({ username: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Account', accountSchema); 