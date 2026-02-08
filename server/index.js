const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const stocksRouter = require('./routes/stocks');

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// Allowed origins for CORS
const allowedOrigins = isDev
  ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
  : (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

// CORS - Environment-based configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests in dev)
    if (!origin && isDev) return callback(null, true);

    if (allowedOrigins.includes(origin) || isDev) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// Security middleware - Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:3001', 'http://localhost:5173'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isDev ? null : [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for dev compatibility
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: isDev ? false : { maxAge: 31536000, includeSubDomains: true },
}));

// Rate limiting - Stricter for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 500 : 100, // Higher limit for dev
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Request body size limit
app.use(express.json({ limit: '10kb' }));


// API Routes
app.use('/api', stocksRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`MoatWise API server running on http://localhost:${PORT}`);
});
