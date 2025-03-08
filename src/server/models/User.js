const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const tweetSchema = new mongoose.Schema({
  id: String,
  text: String,
  username: String,
  public_metrics: {
    like_count: Number,
    retweet_count: Number,
    reply_count: Number
  }
});

const trackedAccountSchema = new mongoose.Schema({
  username: String,
  twitterId: String,
  lastChecked: Date,
  keywords: [String],
  tweets: [tweetSchema]
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: String,
  preferences: {
    trackedAccounts: {
      type: [trackedAccountSchema],
      default: []
    },
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema); 