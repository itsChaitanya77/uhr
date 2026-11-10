const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Find and load .env from known locations regardless of launch directory
const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Ensure development defaults are present so dev and quickstarts never fail unexpectedly
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET was not provided. Using default development secret.');
  process.env.JWT_SECRET = 'uhr-dev-secret-super-safe-key-change-in-production-12345';
}

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/uhr';
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5000',
  emergencyWindowMinutes: Number(process.env.EMERGENCY_WINDOW_MINUTES) || 30,
};
