import { PrismaClient } from '@prisma/client'
import logger from './logger.js'

// Créer une instance PrismaClient avec configuration des logs
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
})

// Logging des requêtes en développement
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`)
    logger.debug(`Params: ${e.params}`)
    logger.debug(`Duration: ${e.duration}ms`)
  })
}

prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`)
})

prisma.$on('warn', (e) => {
  logger.warn(`Prisma Warning: ${e.message}`)
})

// Gestion propre de la déconnexion
process.on('beforeExit', async () => {
  await prisma.$disconnect()
  logger.info('Prisma déconnecté')
})

export default prisma