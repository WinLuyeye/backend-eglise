import app from './src/app.js'
import prisma from './src/utils/prisma.js'
import logger from './src/utils/logger.js'

const PORT = process.env.PORT || 3000
const NODE_ENV = process.env.NODE_ENV || 'development'

// Gestion propre de l'arrêt
let server = null

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} reçu. Fermeture gracieuse...`)
  
  if (server) {
    server.close(async () => {
      logger.info('Serveur HTTP fermé')
      
      try {
        await prisma.$disconnect()
        logger.info('Base de données déconnectée')
        process.exit(0)
      } catch (error) {
        logger.error('Erreur lors de la déconnexion:', error)
        process.exit(1)
      }
    })
    
    // Forcer la fermeture après 10 secondes
    setTimeout(() => {
      logger.error('Impossible de fermer les connexions, arrêt forcé')
      process.exit(1)
    }, 10000)
  } else {
    process.exit(0)
  }
}

// Démarrer le serveur
async function startServer() {
  try {
    // Tester la connexion à la base de données
    await prisma.$connect()
    logger.info('✅ Base de données connectée avec succès')
    
    // Vérifier la connexion en exécutant une requête simple
    await prisma.$queryRaw`SELECT 1`
    logger.info('✅ Base de données opérationnelle')
    
    // Démarrer le serveur
    server = app.listen(PORT, () => {
      logger.info(`🚀 Serveur démarré avec succès`)
      logger.info(`📡 Environnement: ${NODE_ENV}`)
      logger.info(`🌐 Port: ${PORT}`)
      logger.info(`📚 Documentation: http://localhost:${PORT}/api-docs`)
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`)
    })
    
    // Écouter les signaux d'arrêt
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
  } catch (error) {
    logger.error('❌ Erreur de connexion à la base de données:', error)
    logger.error(error.stack)
    process.exit(1)
  }
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('UNHANDLED_REJECTION')
})

// Démarrer l'application
startServer()