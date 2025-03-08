const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  originalTweet: {
    id: String,
    text: String,
    author: String
  },
  generatedReply: {
    text: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'posted'],
      default: 'pending'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Reply', replySchema); 