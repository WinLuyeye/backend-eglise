import prisma from './src/utils/prisma.js'

try {
  await prisma.$connect()
  console.log('✅ Base de données connectée')
  
  const result = await prisma.$queryRaw`SELECT 1 as test`
  console.log('✅ Requête test réussie:', result)
  
  const users = await prisma.utilisateur.findMany()
  console.log(`✅ ${users.length} utilisateurs trouvés`)
  
  await prisma.$disconnect()
} catch (error) {
  console.error('❌ Erreur:', error.message)
  console.error(error)
}