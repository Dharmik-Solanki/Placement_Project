const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initSchema } = require('./database/db');

// Initialize Database
initSchema();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible SPA assets
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting to prevent DoS and brute-force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    university: 'National Forensic Sciences University (NFSU)',
    session: '2026-27',
    system: 'Placement Cell Policy-Driven Management Portal',
    timestamp: new Date().toISOString()
  });
});

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/drives', require('./routes/driveRoutes'));
app.use('/api/offers', require('./routes/offerRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/policy', require('./routes/policyRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));

// Serve Static Frontend Assets in Production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>NFSU Placement Portal 2026-27 API</title></head>
          <body style="font-family:sans-serif;padding:40px;background:#f8fafc;color:#1e293b;">
            <h2>🎓 NFSU Placement Management System 2026-27</h2>
            <p>API server is running actively on port ${PORT}.</p>
            <p>Frontend client can be accessed at <a href="http://localhost:5173">http://localhost:5173</a> during development.</p>
          </body>
        </html>
      `);
    }
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred.'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 NFSU Placement Portal Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
