const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const env = require('./config/env');

const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors({ origin: env.clientOrigin.split(','), credentials: false }));
app.use(express.json({ limit: '200kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// API Routes
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/shared'));

// API 404 handler
app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// Static client build serving (Express 5 compatible SPA fallback)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : err.message;
    return res.status(400).json({ message });
  }
  if (err.message?.startsWith('Only PDF')) return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: 'That value is already in use' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on our side' });
});

module.exports = app;
