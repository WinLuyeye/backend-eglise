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

// ==================== SECURITE ====================
// Helmet pour sécuriser les headers HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

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
    environment: process.env.NODE_ENV
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