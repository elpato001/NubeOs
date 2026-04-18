const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const filesRoutes = require('./routes/files');
const appsRoutes = require('./routes/apps');
const usersRoutes = require('./routes/users');
const systemRoutes = require('./routes/system');
const networkRoutes = require('./routes/network');
const storageRoutes = require('./routes/storage');
const { authMiddleware } = require('./middleware/auth');

dotenv.config();

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// ... (Existing Middleware)
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/storage', storageRoutes);

// Socket Control for Terminal
const { initTerminalSocket } = require('./services/terminalService');
const { initNotificationService } = require('./services/notificationService');

initTerminalSocket(io);
initNotificationService(io);

// Protected Sample Route
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'NubeOS Backend is running', time: new Date() });
});

// --- Custom Wallpapers Storage ---
const wallpapersDir = path.join(__dirname, '../../data/wallpapers');
if (!fs.existsSync(wallpapersDir)) {
  fs.mkdirSync(wallpapersDir, { recursive: true });
}
// Serve custom wallpapers statically
app.use('/wallpapers/custom', express.static(wallpapersDir));

// --- Serve Frontend Static Files in Production ---
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  console.log('📦 Frontend build detected at:', frontendDistPath);

  app.use(express.static(frontendDistPath, {
    etag: false,
    maxAge: '1h', // Standard cache for static assets
    setHeaders: (res, path) => {
      // For index.html, never cache
      if (path.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      }
    }
  }));

  // SPA Fallback
  app.get('*', (req, res) => {
    // Only handle if not an API route (which should have been handled before)
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
       res.sendFile(path.join(frontendDistPath, 'index.html'));
    } else {
       res.status(404).json({ error: 'Endpoint not found' });
    }
  });
} else {
  console.warn('⚠️  Frontend build (dist) not found. The UI will not be available.');
  console.log('   Run "npm run build" in the frontend directory to fix this.');
  
  app.get('/', (req, res) => {
    res.send('<h1>NubeOS Backend is running</h1><p>UI is missing. Run <code>npm run build</code> in the frontend folder.</p>');
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 NubeOS Server unificado activo`);
  console.log(`📡 Local: http://localhost:${PORT}`);
});

server.timeout = 600000; // 10 minutes timeout for large uploads
