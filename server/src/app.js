require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const cron      = require('node-cron');

const { seed }                   = require('./db');
const { swaggerUi, swaggerSpec } = require('./utils/swagger');

// Routes
const authRouter     = require('./routes/auth');
const profileRouter  = require('./routes/profile');
const bidsRouter     = require('./routes/bids');
const winnersRouter  = require('./routes/winners');
const sponsorsRouter = require('./routes/sponsors');
const eventsRouter   = require('./routes/events');
const walletRouter   = require('./routes/wallet');
const apiKeysRouter  = require('./routes/apiKeys');
const publicRouter   = require('./routes/public');

const app  = express();
const PORT = process.env.PORT || 3000;

// Security Headers 
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc:     ["'self'", 'data:', 'https:'],
    },
  },
}));

// CORS 
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin:         corsOrigin === '*' ? '*' : corsOrigin.split(','),
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Rate Limiting
app.use('/api', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
}));
app.use('/api/auth/login',           rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: 'Too many login attempts.' } }));
app.use('/api/auth/register',        rateLimit({ windowMs: 60 * 60 * 1000, max: 5,  message: { success: false, message: 'Too many registration attempts.' } }));
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 5,  message: { success: false, message: 'Too many reset requests.' } }));

// Body Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//  Static uploads 
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));


// Static frontend 
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
// Swagger UI 
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Alumni Influencers API Docs',
  customCss:       '.swagger-ui .topbar { background-color: #1a1a2e; }',
  swaggerOptions:  { persistAuthorization: true },
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

//Request Logger 
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Route Mounting 
app.use('/api/auth',     authRouter);
app.use('/api/profile',  profileRouter);
app.use('/api/bids',     bidsRouter);
app.use('/api/winners',  winnersRouter);
app.use('/api/sponsors', sponsorsRouter);
app.use('/api/events',   eventsRouter);
app.use('/api/wallet',   walletRouter);
app.use('/api/keys',     apiKeysRouter);
app.use('/api/public',   publicRouter);

// Root 
app.get('/', (req, res) => {
  res.json({
    name:        'Alumni Influencers API',
    version:     '1.0.0',
    description: 'Phantasmagoria Ltd × University of Eastminster',
    docs:        `http://localhost:${PORT}/api-docs`,
    endpoints: {
      auth:     '/api/auth',    profile:  '/api/profile',
      bids:     '/api/bids',    winners:  '/api/winners',
      sponsors: '/api/sponsors',events:   '/api/events',
      wallet:   '/api/wallet',  keys:     '/api/keys',
      public:   '/api/public',
    },
  });
});

//404 
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

//  Global Error Handler 
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Automated Midnight Winner Selection 
const WINNER_HOUR = process.env.WINNER_SELECT_HOUR_UTC || '0';
if (process.env.NODE_ENV !== 'test') {
  cron.schedule(`0 ${WINNER_HOUR} * * *`, async () => {
    console.log(`[CRON] Automated winner selection at ${new Date().toISOString()}`);
    try {
      const Bid  = require('./models/Bid');
      const User = require('./models/User');
      const { db, dateStr } = require('./db');
      const { sendWinnerNotification, sendLostBidNotification } = require('./utils/email');
      const displayDate = dateStr(1);
      if (db.winners.find(w => w.displayDate === displayDate)) {
        return console.log('[CRON] Winner already selected, skipping.');
      }
      const result = Bid.resolveAuction();
      if (!result.winner) return console.log('[CRON] No winner selected:', result);
      const winUser = User.findById(result.winner.userId);
      if (winUser) sendWinnerNotification(winUser.email, winUser.name, result.winner.displayDate).catch(() => {});
      (result.loserIds || []).forEach(uid => {
        const u = User.findById(uid);
        if (u) sendLostBidNotification(u.email, u.name, result.winner.displayDate).catch(() => {});
      });
      console.log(`[CRON] Winner: ${winUser?.name} for ${result.winner.displayDate}`);
    } catch (err) {
      console.error('[CRON ERROR]', err.message);
    }
  });
  console.log(`  Cron job: winner selection at ${WINNER_HOUR}:00 UTC daily`);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function start() {
  await seed();
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log(`\n  Alumni Influencers API  →  http://localhost:${PORT}`);
      console.log(`  Swagger Docs           →  http://localhost:${PORT}/api-docs`);
    });
  }
}

start().catch(console.error);
module.exports = app;