const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    feedbackId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    userId: {
      type: String,
      default: null,
      trim: true
    },
    routeId: {
      type: String,
      default: null,
      trim: true
    },
    message: {
      type: String,
      required: [true, 'message is required'],
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'Feedback',
    timestamps: true
  }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
