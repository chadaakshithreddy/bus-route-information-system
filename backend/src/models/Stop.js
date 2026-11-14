const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    stopId: {
      type: String,
      required: [true, 'stopId is required'],
      unique: true,
      trim: true
    },
    stopName: {
      type: String,
      required: [true, 'stopName is required'],
      trim: true
    },
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    },
    connectedRoutes: {
      type: [String],
      default: []
    }
  },
  {
    collection: 'Stops',
    timestamps: true
  }
);

// Indexes for faster lookups
stopSchema.index({ stopName: 'text' });

const Stop = mongoose.model('Stop', stopSchema);

module.exports = Stop;
