const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const Stop = require('./src/models/Stop');
const Route = require('./src/models/Route');
const { seedData } = require('./src/utils/seedData');

const PORT = process.env.PORT || 5000;

// Start server after connecting to database
const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed sample data if database is empty
    const stopCount = await Stop.countDocuments();
    const routeCount = await Route.countDocuments();
    if (stopCount === 0 && routeCount === 0) {
      console.log('[Server] Database is empty. Preloading sample routes and stops...');
      await seedData(false);
    }

    const server = app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(` Bus Route Information System API Server Running `);
      console.log(` Port: ${PORT} | Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health: http://localhost:${PORT}/api/health`);
      console.log(` Routes: http://localhost:${PORT}/api/routes`);
      console.log(` Stops:  http://localhost:${PORT}/api/stops`);
      console.log(`==================================================`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated.');
      });
    });

    process.on('unhandledRejection', (err) => {
      console.error(`Unhandled Rejection: ${err.message}`);
    });
  } catch (error) {
    console.error(`Server failed to start: ${error.message}`);
    process.exit(1);
  }
};

startServer();

