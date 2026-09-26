require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const auth = require('./routes/auth');
const organizations = require('./routes/organizations');
const locations = require('./routes/locations');
const resources = require('./routes/resources');
const consumption = require('./routes/consumption');
const production = require('./routes/production');
const analytics = require('./routes/analytics');
const anomalies = require('./routes/anomalies');
const ai = require('./routes/ai');
const insights = require('./routes/insights');
const actions = require('./routes/actions');
const outcomes = require('./routes/outcomes');
const demo = require('./routes/demo');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4000',
  process.env.FRONTEND_URL
].filter(Boolean));

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    if (url.hostname.endsWith('.vercel.app') || url.hostname === 'ecopulse.vercel.app') return true;
  } catch {
    return false;
  }
  return false;
}

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error('CORS origin not allowed'));
  },
  credentials: false
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => res.json({
  success: true,
  data: { name: 'EcoPulse AI API', status: 'online', docs: 'Use /api/health for health status.' }
}));

app.get('/api/health', (req, res) => res.json({
  success: true,
  data: { status: 'ok', system: 'EcoPulse AI', timestamp: new Date().toISOString() }
}));

app.use('/api/auth', auth);
app.use('/api/organizations', organizations);
app.use('/api/locations', locations);
app.use('/api/resources', resources);
app.use('/api/consumption', consumption);
app.use('/api/production', production);
app.use('/api/analytics', analytics);
app.use('/api/anomalies', anomalies);
app.use('/api/ai', ai);
app.use('/api/insights', insights);
app.use('/api/actions', actions);
app.use('/api/outcomes', outcomes);
app.use('/api/demo', demo);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
