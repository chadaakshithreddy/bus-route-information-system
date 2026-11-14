const mongoose = require('mongoose');

let memoryServer = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bus_route_db';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500
    });
    console.log(`[MongoDB] Connected to host: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[MongoDB] Primary connection to ${uri} failed: ${err.message}`);

    // If local/remote MongoDB is not running, provide an automatic in-memory fallback for local dev/testing
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[MongoDB] Starting fallback in-memory MongoDB instance for development/testing...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memUri = memoryServer.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`[MongoDB] In-memory MongoDB active at: ${memUri}`);
        return conn;
      } catch (memErr) {
        console.error('[MongoDB] Failed to start in-memory MongoDB instance:', memErr.message);
        throw err;
      }
    } else {
      throw err;
    }
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
