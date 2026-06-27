// scripts/check-local.js
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prismaLocal = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_LOCAL || 'postgresql://postgres:Winner1@localhost:5432/eglise_local',
    },
  },
})

async function check() {
  try {
    await prismaLocal.$connect()
    console.log('✅ Connexion locale réussie')
    
    const tables = await prismaLocal.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log('📊 Tables dans la base locale:')
    tables.forEach(t => console.log(`   - ${t.table_name}`))
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prismaLocal.$disconnect()
  }
}

check()