// scripts/backup-restore.js
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Charger les variables d'environnement
dotenv.config()

// Configuration des clients Prisma - Version CORRIGÉE
const prismaOnline = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
})

const prismaLocal = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL_LOCAL || 'postgresql://postgres:Winner1@localhost:5432/eglise_local'
})

const BACKUP_DIR = path.join(__dirname, '../backups')

// Créer le dossier de backup s'il n'existe pas
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// Liste des tables à exporter (ordre des relations)
const TABLES = [
  'categories',
  'membres',
  'departements',
  'utilisateurs',
  'transactions',
  'rapports_departement',
  'logs_activites',
]

// =====================================================
// FONCTION: VÉRIFIER L'EXISTENCE DES TABLES
// =====================================================
async function checkTables(prisma, dbName) {
  console.log(`\n🔍 Vérification des tables dans ${dbName}...`)
  
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1)
      ORDER BY table_name;
    `, TABLES)
    
    const existingTables = result.map(r => r.table_name)
    const missingTables = TABLES.filter(t => !existingTables.includes(t))
    
    if (missingTables.length > 0) {
      console.log(`⚠️  Tables manquantes dans ${dbName}:`, missingTables.join(', '))
      return false
    } else {
      console.log(`✅ Toutes les tables existent dans ${dbName}`)
      return true
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification des tables dans ${dbName}:`, error.message)
    return false
  }
}

// =====================================================
// FONCTION: EXPORTER LES DONNÉES
// =====================================================
async function exportData() {
  console.log('📤 DÉBUT DE L\'EXPORTATION...')
  console.log('========================================\n')

  const data = {}
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  try {
    // Vérifier que les tables existent avant d'exporter
    const tablesExist = await checkTables(prismaOnline, 'production (Supabase)')
    if (!tablesExist) {
      throw new Error('Les tables n\'existent pas dans la base de production. Exécutez d\'abord les migrations.')
    }

    for (const table of TABLES) {
      console.log(`📊 Exportation de la table: ${table}...`)
      
      try {
        const records = await prismaOnline.$queryRawUnsafe(`SELECT * FROM "${table}"`)
        data[table] = records
        console.log(`   ✅ ${records.length} enregistrements exportés`)
      } catch (error) {
        console.error(`   ❌ Erreur pour la table ${table}:`, error.message)
        data[table] = []
      }
    }

    // Ajouter les métadonnées
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        tables: TABLES,
        totalRecords: Object.values(data).reduce((acc, arr) => acc + arr.length, 0),
      },
      data,
    }

    // Sauvegarder en JSON
    const filename = `backup_${timestamp}.json`
    const filepath = path.join(BACKUP_DIR, filename)
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2))

    console.log('\n✅ EXPORTATION TERMINÉE !')
    console.log(`📁 Fichier: ${filename}`)
    console.log(`📊 Total enregistrements: ${exportData.metadata.totalRecords}`)
    console.log(`📂 Chemin: ${filepath}`)

    return filepath
  } catch (error) {
    console.error('❌ Erreur lors de l\'exportation:', error)
    throw error
  }
}

// =====================================================
// FONCTION: IMPORTER LES DONNÉES EN LOCAL
// =====================================================
async function importData(backupFile = null) {
  console.log('📥 DÉBUT DE L\'IMPORTATION EN LOCAL...')
  console.log('========================================\n')

  let filepath

  try {
    if (backupFile) {
      filepath = path.isAbsolute(backupFile) ? backupFile : path.join(BACKUP_DIR, backupFile)
    } else {
      // Prendre le dernier fichier de backup
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .sort()
        .reverse()

      if (files.length === 0) {
        throw new Error('Aucun fichier de backup trouvé')
      }
      filepath = path.join(BACKUP_DIR, files[0])
    }

    console.log(`📂 Fichier source: ${path.basename(filepath)}`)

    if (!fs.existsSync(filepath)) {
      throw new Error(`Fichier non trouvé: ${filepath}`)
    }

    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    const { data } = backupData

    // Vérifier que les tables existent localement
    const tablesExist = await checkTables(prismaLocal, 'local')
    if (!tablesExist) {
      console.log('\n⚠️  Les tables n\'existent pas localement.')
      console.log('   Exécutez: npx prisma db push ou npx prisma migrate dev')
      throw new Error('Tables manquantes en local')
    }

    console.log(`\n📊 Données à importer:`)
    for (const table of TABLES) {
      console.log(`   - ${table}: ${data[table]?.length || 0} enregistrements`)
    }

    // Vérifier s'il y a des données à importer
    const totalRecords = Object.values(data).reduce((acc, arr) => arr?.length || 0, 0)
    if (totalRecords === 0) {
      console.log('\n⚠️  Aucune donnée à importer')
      return
    }

    console.log('\n⚠️  ATTENTION: Cela va SUPPRIMER toutes les données existantes en local !')
    console.log('   Les données seront réinitialisées avec les données de production.')
    
    // Demander confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise((resolve) => {
      rl.question('   Voulez-vous continuer ? (y/N): ', resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Importation annulée')
      return
    }

    // Désactiver les contraintes de clés étrangères
    console.log('\n🔓 Désactivation des contraintes...')
    await prismaLocal.$executeRawUnsafe(`SET session_replication_role = 'replica';`)

    try {
      // Supprimer les données existantes dans l'ordre inverse
      console.log('🗑️  Suppression des données existantes...')
      for (const table of [...TABLES].reverse()) {
        try {
          await prismaLocal.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`)
          console.log(`   ✅ Table ${table} vidée`)
        } catch (error) {
          console.log(`   ⚠️  Table ${table}: ${error.message}`)
        }
      }

      // Importer les nouvelles données
      console.log('\n📥 Importation des nouvelles données...')
      for (const table of TABLES) {
        const records = data[table] || []
        if (records.length === 0) {
          console.log(`   ⏭️  Table ${table}: aucun enregistrement`)
          continue
        }

        console.log(`   📊 Importation de ${table} (${records.length} enregistrements)...`)
        
        try {
          // Construire la requête d'insertion
          const columns = Object.keys(records[0]).map(col => `"${col}"`).join(', ')
          
          // Insérer les enregistrements un par un pour éviter les problèmes de syntaxe
          for (const record of records) {
            const keys = Object.keys(record)
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
            const values = Object.values(record)
            
            const query = `
              INSERT INTO "${table}" (${columns})
              VALUES (${placeholders})
              ON CONFLICT (id) DO UPDATE SET
              ${keys
                .filter(col => col !== 'id')
                .map(col => `"${col}" = EXCLUDED."${col}"`)
                .join(', ')}
            `
            
            await prismaLocal.$executeRawUnsafe(query, ...values)
          }
          
          console.log(`   ✅ Table ${table}: ${records.length} enregistrements importés`)
        } catch (error) {
          console.error(`   ❌ Erreur pour ${table}:`, error.message)
        }
      }

      console.log('\n✅ IMPORTATION TERMINÉE !')
      console.log('📊 Base de données locale synchronisée avec la production.')

    } finally {
      // Réactiver les contraintes
      console.log('\n🔒 Réactivation des contraintes...')
      await prismaLocal.$executeRawUnsafe(`SET session_replication_role = 'origin';`)
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'importation:', error)
    await prismaLocal.$executeRawUnsafe(`SET session_replication_role = 'origin';`)
    throw error
  }
}

// =====================================================
// FONCTION: EXPORTER ET IMPORTER EN UNE SEULE COMMANDE
// =====================================================
async function syncData() {
  console.log('🔄 SYNCHRONISATION DES DONNÉES...')
  console.log('========================================\n')
  
  try {
    // Vérifier les connexions
    console.log('🔌 Vérification des connexions...')
    await prismaOnline.$connect()
    await prismaLocal.$connect()
    console.log('✅ Connexions établies')
    
    // 1. Exporter
    const backupFile = await exportData()
    
    // 2. Importer
    await importData(backupFile)
    
    console.log('\n✅ SYNCHRONISATION TERMINÉE !')
    console.log('   Les données de production sont maintenant en local.')
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error)
    process.exit(1)
  }
}

// =====================================================
// FONCTION: EXPORTER UNIQUEMENT (SANS IMPORTER)
// =====================================================
async function exportOnly() {
  try {
    await prismaOnline.$connect()
    await exportData()
  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  } finally {
    await prismaOnline.$disconnect()
  }
}

// =====================================================
// FONCTION: IMPORTER UNIQUEMENT (SANS EXPORTER)
// =====================================================
async function importOnly() {
  try {
    await prismaLocal.$connect()
    const file = process.argv[3] || null
    await importData(file)
  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  } finally {
    await prismaLocal.$disconnect()
  }
}

// =====================================================
// MAIN
// =====================================================
const command = process.argv[2] || 'sync'

async function main() {
  console.log('🔄 GESTION DES DONNÉES')
  console.log('========================================')
  console.log(`📋 Commande: ${command}`)
  console.log('')

  try {
    switch (command) {
      case 'sync':
        await syncData()
        break
      case 'export':
        await exportOnly()
        break
      case 'import':
        await importOnly()
        break
      default:
        console.log(`
Usage: node scripts/backup-restore.js [commande]

Commandes disponibles:
  sync    - Exporter les données de production ET les importer en local
  export  - Exporter UNIQUEMENT les données de production (sans importer)
  import  - Importer UNIQUEMENT les données en local (dernier backup)

Exemples:
  node scripts/backup-restore.js sync
  node scripts/backup-restore.js export
  node scripts/backup-restore.js import
  node scripts/backup-restore.js import backup_2026-01-01.json
        `)
        process.exit(0)
    }
  } catch (error) {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  } finally {
    // Déconnexion
    await prismaOnline.$disconnect().catch(console.error)
    await prismaLocal.$disconnect().catch(console.error)
  }
}

main().catch(console.error)