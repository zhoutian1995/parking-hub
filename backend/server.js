require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/init');
const apiRoutes = require('./api/routes');
const config = require('./config');

const app = express();
const PORT = config.port;

// ========== 安全中间件 ==========
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3400', `https://${config.domain}`, `http://${config.domain}`];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (config.env === 'development') return cb(null, true);
    cb(new Error('CORS'));
  },
  credentials: true
}));

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(express.json({ limit: '10mb' }));

// ========== 静态文件 ==========
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ========== API 路由 ==========
app.use('/api', apiRoutes);

// ========== SPA fallback ==========
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ========== 启动 ==========
try {
  initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚗 ParkingHub running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('Startup failed:', err);
  process.exit(1);
}
