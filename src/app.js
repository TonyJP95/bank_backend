const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const pool = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const crudRoutes = require('./routes/crud.routes');
const transferRoutes = require('./routes/transfer.routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGINS }));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

app.get('/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', service: 'bancotecmi-backend', database: 'postgresql' });
  } catch (error) {
    return next(error);
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transferencias', transferRoutes);
app.use('/api/v1', crudRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;