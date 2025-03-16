const mongoose = require('mongoose');

const twitterAuthSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  twitterId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  profileImageUrl: {
    type: String
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  scope: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure each user can only connect a Twitter account once
twitterAuthSchema.index({ userId: 1, twitterId: 1 }, { unique: true });

const TwitterAuth = mongoose.model('TwitterAuth', twitterAuthSchema);

module.exports = TwitterAuth; 