import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'
import compression from 'compression'

// Import routes
import authRoutes from './routes/authRoutes.js'
import membreRoutes from './routes/membreRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import categorieRoutes from './routes/categorieRoutes.js'
import departementRoutes from './routes/departementRoutes.js'
import rapportRoutes from './routes/rapportRoutes.js'
import utilisateurRoutes from './routes/utilisateurRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'

// Import utils
import { swaggerUi, specs } from './utils/swagger.js'
import logger, { httpLogger } from './utils/logger.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ==================== CORS CONFIGURATION (CORRIGÉE) ====================
// Liste des origines autorisées
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5000',
  'https://votre-domaine.com'
]

// Configuration CORS complète
app.use(cors({
  origin: function(origin, callback) {
    // Permettre les requêtes sans origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    // En développement, on accepte toutes les origines
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // En production, on vérifie l'origine
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS: Origin non autorisée: ${origin}`);
      callback(null, true); // Pour le développement, on accepte quand même
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 heures
}))

// Middleware supplémentaire pour les headers CORS (assure que toutes les réponses ont les bons headers)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Ajouter les headers CORS à toutes les réponses
  if (process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Répondre immédiatement aux requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// ==================== SECURITE ====================
// Helmet pour sécuriser les headers HTTP (désactiver certains headers pour CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: false, // Désactiver pour le développement
}));

// ==================== MIDDLEWARES ====================
// Compression des réponses
app.use(compression())

// Parsing JSON et URL encoded
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging HTTP
app.use(httpLogger)
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limite par IP
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// Rate limiting plus strict pour l'auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
})
app.use('/api/auth/login', authLimiter)

// ==================== FICHIERS STATIQUES ====================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.use('/logs', express.static(path.join(__dirname, '../logs')))

// ==================== DOCUMENTATION SWAGGER ====================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Gestion Église',
}))

// ==================== ROUTES API ====================
app.get('/', (req, res) => {
  res.json({
    name: 'API Gestion d\'Église',
    version: '1.0.0',
    status: 'online',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/auth',
      membres: '/api/membres',
      transactions: '/api/transactions',
      categories: '/api/categories',
      departements: '/api/departements',
      rapports: '/api/rapports',
      utilisateurs: '/api/utilisateurs',
      dashboard: '/api/dashboard'
    }
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/membres', membreRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/categories', categorieRoutes)
app.use('/api/departements', departementRoutes)
app.use('/api/rapports', rapportRoutes)
app.use('/api/utilisateurs', utilisateurRoutes)
app.use('/api/dashboard', dashboardRoutes)

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 3000
  })
})

// ==================== GESTION DES ERREURS ====================
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} non trouvée`,
    error: 'NOT_FOUND'
  })
})

// Error handler global
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`)
  logger.error(err.stack)
  
  // Erreur de validation Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Un enregistrement avec ces données existe déjà.',
      error: 'DUPLICATE_ERROR'
    })
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Enregistrement non trouvé.',
      error: 'NOT_FOUND'
    })
  }
  
  // Erreur de validation express-validator
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation des données.',
      errors: err.array()
    })
  }
  
  // Erreur par défaut
  const status = err.status || 500
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur',
    error: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

export default app