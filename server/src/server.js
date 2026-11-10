const mongoose = require('mongoose');
const env = require('./config/env');
const app = require('./app');
const { seed } = require('./seed');

let memoryServer = null;

(async () => {
  try {
    let mongoUri = env.mongoUri;
    try {
      console.log(`Connecting to MongoDB at ${mongoUri}...`);
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log('MongoDB connected successfully');
    } catch (err) {
      console.warn(`\n⚠️  Could not connect to external MongoDB at ${mongoUri} (${err.message}).`);
      console.log('🚀 Starting embedded MongoDB (in-memory) for instant zero-config run...');
      try { await mongoose.disconnect(); } catch (_) {}
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`Embedded MongoDB started at: ${mongoUri}`);
      console.log('🌱 Seeding demo clinical data...');
      await seed();
    }

    const server = app.listen(env.port, () => {
      console.log(`\n======================================================`);
      console.log(`  🏥 Universal Health Record (UHR) API & Web Server`);
      console.log(`  🔗 Running at: http://localhost:${env.port}`);
      console.log(`  🌐 Client UI:  http://localhost:5173 (or http://localhost:${env.port})`);
      console.log(`======================================================\n`);
    });

    const gracefulShutdown = async () => {
      console.log('\nShutting down UHR server...');
      server.close();
      await mongoose.disconnect();
      if (memoryServer) await memoryServer.stop();
      process.exit(0);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (fatalErr) {
    console.error('Fatal server startup error:', fatalErr);
    process.exit(1);
  }
})();
