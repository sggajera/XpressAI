const mongoose = require('mongoose');

const contextSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  tone: {
    type: String,
    enum: ['professional', 'casual', 'friendly', 'formal'],
    default: 'professional'
  },
  autoApprove: {
    type: Boolean,
    default: false
  },
  userGeneralContext: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Context', contextSchema); 