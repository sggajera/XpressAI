const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  preferences: {
    trackedAccounts: [{
      username: String,
      twitterId: String,
      lastChecked: Date,
      keywords: [String],
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    replySettings: {
      tone: {
        type: String,
        enum: ['professional', 'casual', 'friendly', 'formal'],
        default: 'professional'
      },
      autoApprove: {
        type: Boolean,
        default: false
      }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema); 