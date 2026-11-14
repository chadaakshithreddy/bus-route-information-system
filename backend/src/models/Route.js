const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      required: [true, 'routeId is required'],
      unique: true,
      trim: true
    },
    routeNumber: {
      type: String,
      required: [true, 'routeNumber is required'],
      unique: true,
      trim: true
    },
    startStop: {
      type: String,
      required: [true, 'startStop is required'],
      trim: true
    },
    endStop: {
      type: String,
      required: [true, 'endStop is required'],
      trim: true
    },
    distance: {
      type: Number,
      required: [true, 'distance is required'],
      min: [0, 'distance must be a positive number']
    },
    duration: {
      type: Number,
      required: [true, 'duration is required'],
      min: [0, 'duration must be a positive number']
    },
    stops: {
      type: [String],
      required: [true, 'stops array is required'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 2;
        },
        message: 'A route must contain at least 2 stops'
      }
    },
    timings: {
      firstTrip: {
        type: String,
        required: [true, 'firstTrip timing is required'],
        trim: true
      },
      lastTrip: {
        type: String,
        required: [true, 'lastTrip timing is required'],
        trim: true
      }
    }
  },
  {
    collection: 'Routes',
    timestamps: true
  }
);

// Indexes for faster lookups
routeSchema.index({ stops: 1 });

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;
