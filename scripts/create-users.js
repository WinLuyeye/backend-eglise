// scripts/create-users.js
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL || 'postgresql://postgres:Winner1@localhost:5432/eglise_local',
    },
  },
})

// Configuration des utilisateurs
const USERS = [
  {
    email: 'admin@user.com',
    password: 'user123',
    role: 'ADMIN',
    nom: 'Admin',
    prenom: 'Principal'
  },
  {
    email: 'pasteur@user.com',
    password: 'user123',
    role: 'PASTEUR',
    nom: 'Pasteur',
    prenom: 'Jean'
  },
  {
    email: 'secretaire@user.com',
    password: 'user123',
    role: 'SECRETAIRE',
    nom: 'Secrétaire',
    prenom: 'Marie'
  },
  {
    email: 'tresorier@user.com',
    password: 'user123',
    role: 'TRESORIER',
    nom: 'Trésorier',
    prenom: 'Pierre'
  },
  {
    email: 'chefdep@user.com',
    password: 'user123',
    role: 'CHEF_DEPARTEMENT',
    nom: 'Chef',
    prenom: 'Departement'
  }
]

// Fonction pour créer un utilisateur avec son membre associé
async function createUser(userData) {
  try {
    console.log(`\n👤 Création de l'utilisateur: ${userData.email}`)
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.utilisateur.findUnique({
      where: { email: userData.email }
    })
    
    if (existingUser) {
      console.log(`   ⚠️  L'utilisateur ${userData.email} existe déjà`)
      return existingUser
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(userData.password, 10)

    // Créer le membre associé
    const membre = await prisma.membre.create({
      data: {
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        statut: 'actif',
        date_inscription: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    console.log(`   ✅ Membre créé: ${membre.nom} ${membre.prenom}`)

    // Créer l'utilisateur
    const utilisateur = await prisma.utilisateur.create({
      data: {
        email: userData.email,
        mot_de_passe: hashedPassword,
        role: userData.role,
        membre_id: membre.id,
        actif: true,
        created_at: new Date()
      }
    })
    console.log(`   ✅ Utilisateur créé: ${utilisateur.email} (${utilisateur.role})`)

    return utilisateur
  } catch (error) {
    console.error(`   ❌ Erreur pour ${userData.email}:`, error.message)
    throw error
  }
}

// Fonction pour vérifier les tables
async function checkTables() {
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('utilisateurs', 'membres')
      ORDER BY table_name;
    `)
    
    if (tables.length < 2) {
      console.error('❌ Les tables "utilisateurs" et "membres" doivent exister')
      console.log('   Exécutez d\'abord: npx prisma db push')
      process.exit(1)
    }
    console.log('✅ Tables vérifiées avec succès')
    return true
  } catch (error) {
    console.error('❌ Erreur de vérification des tables:', error.message)
    process.exit(1)
  }
}

// Fonction pour créer tous les utilisateurs
async function createAllUsers() {
  console.log('👥 CRÉATION DES UTILISATEURS')
  console.log('========================================\n')
  
  // Vérifier les connexions
  console.log('🔌 Vérification de la connexion...')
  try {
    await prisma.$connect()
    console.log('✅ Connexion établie')
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message)
    console.log('   Vérifiez votre DATABASE_URL dans .env')
    process.exit(1)
  }

  // Vérifier les tables
  await checkTables()

  // Afficher les utilisateurs à créer
  console.log('\n📋 Utilisateurs à créer:')
  USERS.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email} (${user.role})`)
  })

  // Demander confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const answer = await new Promise((resolve) => {
    rl.question('\nVoulez-vous continuer ? (y/N): ', resolve)
  })
  rl.close()

  if (answer.toLowerCase() !== 'y') {
    console.log('❌ Opération annulée')
    await prisma.$disconnect()
    process.exit(0)
  }

  // Créer les utilisateurs
  console.log('\n🔄 Création des utilisateurs...')
  console.log('========================================')
  
  const results = []
  for (const userData of USERS) {
    try {
      const result = await createUser(userData)
      results.push({ success: true, data: result, email: userData.email })
    } catch (error) {
      results.push({ success: false, email: userData.email, error: error.message })
    }
  }

  // Résumé
  console.log('\n📊 RÉSUMÉ')
  console.log('========================================')
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  
  console.log(`✅ Réussis: ${successCount}`)
  console.log(`❌ Échecs: ${failCount}`)

  if (failCount > 0) {
    console.log('\n❌ Échecs:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.email}: ${r.error}`)
    })
  }

  // Afficher les identifiants
  console.log('\n🔑 IDENTIFIANTS DES UTILISATEURS CRÉÉS')
  console.log('========================================')
  console.log('Email          | Mot de passe | Rôle')
  console.log('----------------------------------------')
  USERS.forEach(user => {
    console.log(`${user.email.padEnd(15)} | ${'user123'.padEnd(13)} | ${user.role}`)
  })

  await prisma.$disconnect()
}

// Fonction pour supprimer tous les utilisateurs (optionnel)
async function deleteAllUsers() {
  console.log('🗑️  SUPPRESSION DE TOUS LES UTILISATEURS')
  console.log('========================================\n')
  
  try {
    await prisma.$connect()
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise((resolve) => {
      rl.question('⚠️  Êtes-vous sûr de vouloir supprimer TOUS les utilisateurs et membres ? (y/N): ', resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Opération annulée')
      await prisma.$disconnect()
      process.exit(0)
    }

    // Supprimer les utilisateurs (les membres seront supprimés automatiquement grâce à ON DELETE CASCADE)
    const deletedUsers = await prisma.$executeRawUnsafe(`
      DELETE FROM public.utilisateurs 
      WHERE email = ANY($1)
    `, [USERS.map(u => u.email)])
    
    console.log(`✅ ${deletedUsers} utilisateurs supprimés`)

    // Supprimer les membres associés
    const deletedMembres = await prisma.$executeRawUnsafe(`
      DELETE FROM public.membres 
      WHERE email = ANY($1)
    `, [USERS.map(u => u.email)])
    
    console.log(`✅ ${deletedMembres} membres supprimés`)

    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Erreur:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

// =====================================================
// MAIN
// =====================================================
const command = process.argv[2] || 'create'

async function main() {
  switch (command) {
    case 'create':
    case '--create':
      await createAllUsers()
      break
    case 'delete':
    case '--delete':
      await deleteAllUsers()
      break
    default:
      console.log(`
Usage: node scripts/create-users.js [commande]

Commandes disponibles:
  create  - Créer les utilisateurs par défaut
  delete  - Supprimer les utilisateurs par défaut

Exemples:
  node scripts/create-users.js create
  node scripts/create-users.js delete
      `)
      process.exit(0)
  }
}

main().catch(console.error)