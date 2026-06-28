// scripts/list-users.js
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function listUsers() {
  console.log('📋 LISTE DES UTILISATEURS')
  console.log('========================================\n')
  
  try {
    await prisma.$connect()
    
    const users = await prisma.utilisateur.findMany({
      include: {
        membre: {
          select: {
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (users.length === 0) {
      console.log('⚠️  Aucun utilisateur trouvé')
      return
    }
    
    console.log(`📊 ${users.length} utilisateur(s):\n`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   Rôle: ${user.role}`)
      console.log(`   Nom: ${user.membre?.nom} ${user.membre?.prenom}`)
      console.log(`   Actif: ${user.actif ? '✅ Oui' : '❌ Non'}`)
      console.log(`   Créé: ${new Date(user.createdAt).toLocaleDateString('fr-FR')}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

listUsers()