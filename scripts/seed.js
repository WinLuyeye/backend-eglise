import prisma from '../src/utils/prisma.js'
import bcrypt from 'bcrypt'
import { faker } from '@faker-js/faker'

// Configuration
const SEED_CONFIG = {
  MEMBRES: 50,
  DEPARTEMENTS: 8,
  CATEGORIES: 20,
  TRANSACTIONS: 100,
  RAPPORTS: 15,
  LOGS: 50
}

// Départements typiques d'une église
const DEPARTEMENTS_SEED = [
  { nom: 'Pasteur', description: 'Direction spirituelle de l\'église' },
  { nom: 'Adoration', description: 'Équipe de louange et adoration' },
  { nom: 'Enseignement', description: 'École du dimanche et études bibliques' },
  { nom: 'Jeunesse', description: 'Ministère des jeunes et adolescents' },
  { nom: 'Enfants', description: 'Ministère des enfants' },
  { nom: 'Évangélisation', description: 'Mission et évangélisation' },
  { nom: 'Diaconie', description: 'Services sociaux et entraide' },
  { nom: 'Administration', description: 'Gestion et finances de l\'église' }
]

// Membres célèbres de la Bible pour les noms
const BIBLICAL_NAMES = [
  'Pierre', 'Jean', 'Jacques', 'André', 'Philippe', 'Thomas', 'Matthieu', 'Simon',
  'Paul', 'Étienne', 'Philippe', 'Barnabé', 'Silas', 'Timothée', 'Tite', 'Apollos',
  'Marie', 'Marthe', 'Agnès', 'Claudie', 'Dorcas', 'Lydie', 'Phoebé', 'Priscille',
  'Aquilas', 'Onésime', 'Épaphras', 'Lucas', 'Marc', 'Luc', 'Josué', 'Samuel',
  'David', 'Salomon', 'Élisabeth', 'Anne', 'Ruth', 'Esther', 'Agar', 'Amina',
  'Fatou', 'Moussa', 'Diouf', 'Ndiaye', 'Sarr', 'Fall', 'Diallo', 'Kane'
]

// Catégories de transactions
const CATEGORIES_SEED = {
  entree: [
    { nom: 'Dîmes', description: 'Dîmes des membres' },
    { nom: 'Offrandes', description: 'Offrandes volontaires' },
    { nom: 'Dons', description: 'Dons spéciaux' },
    { nom: 'Fonds de mission', description: 'Contributions pour les missions' },
    { nom: 'Construction', description: 'Fonds pour le bâtiment' },
    { nom: 'Fêtes de fin d\'année', description: 'Offrandes pour les célébrations' },
    { nom: 'Solidarité', description: 'Aide aux membres dans le besoin' },
    { nom: 'Projets spéciaux', description: 'Fonds pour les projets' },
    { nom: 'Dîmes de reconnaissance', description: 'Actions de grâce' }
  ],
  sortie: [
    { nom: 'Loyer', description: 'Loyer du lieu de culte' },
    { nom: 'Électricité', description: 'Factures d\'électricité' },
    { nom: 'Eau', description: 'Factures d\'eau' },
    { nom: 'Salaire pasteur', description: 'Rémunération du pasteur' },
    { nom: 'Achat équipement', description: 'Équipement de sonorisation, etc.' },
    { nom: 'Mission', description: 'Soutien aux missionnaires' },
    { nom: 'Aide sociale', description: 'Assistance aux nécessiteux' },
    { nom: 'Fournitures', description: 'Papeterie, impressions' },
    { nom: 'Entretien', description: 'Entretien du bâtiment' },
    { nom: 'Frais bancaires', description: 'Frais de gestion bancaire' },
    { nom: 'Événements', description: 'Organisation d\'événements' }
  ]
}

// Fonctions utilitaires
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min, max, decimals = 2) {
  const num = Math.random() * (max - min) + min
  return parseFloat(num.toFixed(decimals))
}

function generateEmail(nom, prenom) {
  const cleanNom = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const cleanPrenom = prenom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return `${cleanPrenom}.${cleanNom}@eglise.org`
}

function generatePhone() {
  const prefixes = ['78', '76', '77', '70', '71', '75']
  const prefix = randomItem(prefixes)
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return `${prefix}${number}`
}

// ============================================
// 1. CRÉATION DES MEMBRES
// ============================================
async function seedMembres(departements) {
  console.log('👥 Création des membres...')
  
  const membres = []
  const usedNames = new Set()
  const usedEmails = new Set()

  for (let i = 0; i < SEED_CONFIG.MEMBRES; i++) {
    let nom, prenom, email
    let attempts = 0
    
    do {
      nom = randomItem(BIBLICAL_NAMES)
      prenom = randomItem(BIBLICAL_NAMES)
      email = generateEmail(nom, prenom)
      attempts++
    } while (
      (usedNames.has(`${nom}-${prenom}`) || usedEmails.has(email)) &&
      attempts < 50
    )
    
    usedNames.add(`${nom}-${prenom}`)
    usedEmails.add(email)
    
    const departement = randomItem(departements)
    const dateInscription = randomDate(
      new Date('2023-01-01'),
      new Date('2026-07-20')
    )
    
    const membre = {
      nom,
      prenom,
      email,
      telephone: generatePhone(),
      adresse: `${randomInt(1, 200)} Rue de la ${randomItem(['Paix', 'Espoir', 'Charité', 'Foi', 'Fraternité'])}`,
      dateNaissance: randomDate(
        new Date('1960-01-01'),
        new Date('2005-12-31')
      ),
      dateInscription,
      statut: Math.random() > 0.15 ? 'actif' : 'inactif',
      departementId: departement.id
    }
    
    membres.push(membre)
  }
  
  // Ajouter des responsables de départements comme membres spéciaux
  for (const dept of departements) {
    if (Math.random() > 0.3) {
      const responsable = {
        nom: randomItem(BIBLICAL_NAMES),
        prenom: randomItem(BIBLICAL_NAMES),
        email: `responsable.${dept.nom.toLowerCase()}@eglise.org`,
        telephone: generatePhone(),
        adresse: `${randomInt(1, 200)} Rue de la ${randomItem(['Paix', 'Espoir', 'Charité'])}`,
        dateNaissance: randomDate(
          new Date('1960-01-01'),
          new Date('1990-12-31')
        ),
        dateInscription: randomDate(
          new Date('2020-01-01'),
          new Date('2025-12-31')
        ),
        statut: 'actif',
        departementId: dept.id
      }
      membres.push(responsable)
    }
  }

  const created = await prisma.membre.createMany({
    data: membres,
    skipDuplicates: true
  })
  
  console.log(`✅ ${created.count} membres créés`)
  
  // Récupérer tous les membres créés
  return await prisma.membre.findMany()
}

// ============================================
// 2. CRÉATION DES UTILISATEURS
// ============================================
async function seedUtilisateurs(membres) {
  console.log('👤 Création des utilisateurs...')
  
  const utilisateurs = []
  const adminMembres = membres.slice(0, 3)
  
  // Créer un administrateur
  const adminMembre = adminMembres[0] || membres[0]
  const hashedAdminPw = await bcrypt.hash('Admin123!', 10)
  
  utilisateurs.push({
    email: 'admin@eglise.org',
    motDePasse: hashedAdminPw,
    role: 'admin',
    membreId: adminMembre.id,
    actif: true,
    dernierConnexion: randomDate(
      new Date('2026-07-10'),
      new Date('2026-07-20')
    )
  })
  
  // Créer des pasteurs
  const pasteurMembres = membres.slice(1, 4)
  const hashedPasteurPw = await bcrypt.hash('Pasteur123!', 10)
  
  for (const membre of pasteurMembres) {
    utilisateurs.push({
      email: `pasteur.${membre.email}`,
      motDePasse: hashedPasteurPw,
      role: 'pasteur',
      membreId: membre.id,
      actif: true,
      dernierConnexion: randomDate(
        new Date('2026-07-05'),
        new Date('2026-07-20')
      )
    })
  }
  
  // Créer des trésoriers
  const tresorierMembres = membres.slice(4, 8)
  const hashedTresorierPw = await bcrypt.hash('Tresorier123!', 10)
  
  for (const membre of tresorierMembres) {
    utilisateurs.push({
      email: `tresorier.${membre.email}`,
      motDePasse: hashedTresorierPw,
      role: 'tresorier',
      membreId: membre.id,
      actif: true,
      dernierConnexion: randomDate(
        new Date('2026-07-01'),
        new Date('2026-07-19')
      )
    })
  }
  
  // Créer des utilisateurs normaux
  const normalMembres = membres.slice(8, 20)
  const hashedNormalPw = await bcrypt.hash('User123!', 10)
  
  for (const membre of normalMembres) {
    if (Math.random() > 0.4) {
      utilisateurs.push({
        email: membre.email,
        motDePasse: hashedNormalPw,
        role: 'membre',
        membreId: membre.id,
        actif: Math.random() > 0.1,
        dernierConnexion: randomDate(
          new Date('2026-06-01'),
          new Date('2026-07-20')
        )
      })
    }
  }
  
  const created = await prisma.utilisateur.createMany({
    data: utilisateurs,
    skipDuplicates: true
  })
  
  console.log(`✅ ${created.count} utilisateurs créés`)
  
  return await prisma.utilisateur.findMany()
}

// ============================================
// 3. CRÉATION DES CATÉGORIES
// ============================================
async function seedCategories() {
  console.log('📂 Création des catégories...')
  
  const categories = []
  
  // Catégories d'entrées
  for (const cat of CATEGORIES_SEED.entree) {
    categories.push({
      nom: cat.nom,
      type: 'entree',
      description: cat.description
    })
  }
  
  // Catégories de sorties
  for (const cat of CATEGORIES_SEED.sortie) {
    categories.push({
      nom: cat.nom,
      type: 'sortie',
      description: cat.description
    })
  }
  
  const created = await prisma.categorie.createMany({
    data: categories,
    skipDuplicates: true
  })
  
  console.log(`✅ ${created.count} catégories créées`)
  
  return await prisma.categorie.findMany()
}

// ============================================
// 4. CRÉATION DES TRANSACTIONS
// ============================================
async function seedTransactions(membres, categories, utilisateurs) {
  console.log('💰 Création des transactions...')
  
  const transactions = []
  const types = ['entree', 'sortie']
  const devises = ['CDF', 'USD']
  const tauxChange = 2250
  
  const startDate = new Date('2023-01-01')
  const endDate = new Date('2026-07-20')
  
  const entreeCategories = categories.filter(c => c.type === 'entree')
  const sortieCategories = categories.filter(c => c.type === 'sortie')
  
  // Obtenir les utilisateurs actifs pour createdBy
  const activeUsers = utilisateurs.filter(u => u.actif)
  
  for (let i = 0; i < SEED_CONFIG.TRANSACTIONS; i++) {
    const type = randomItem(types)
    const categoriesList = type === 'entree' ? entreeCategories : sortieCategories
    const categorie = randomItem(categoriesList)
    const devise = randomItem(devises)
    
    let montant
    let montantCdf, montantUsd
    
    if (type === 'entree') {
      if (devise === 'CDF') {
        montant = randomFloat(500, 50000)
        montantCdf = montant
        montantUsd = montant / tauxChange
      } else {
        montant = randomFloat(5, 500)
        montantCdf = montant * tauxChange
        montantUsd = montant
      }
    } else {
      if (devise === 'CDF') {
        montant = randomFloat(1000, 100000)
        montantCdf = montant
        montantUsd = montant / tauxChange
      } else {
        montant = randomFloat(10, 1000)
        montantCdf = montant * tauxChange
        montantUsd = montant
      }
    }
    
    const membre = randomItem(membres)
    const dateTransaction = randomDate(startDate, endDate)
    
    transactions.push({
      type,
      categorieId: categorie.id,
      membreId: Math.random() > 0.2 ? membre.id : null,
      montant,
      dateTransaction,
      devise,
      montantCdf,
      montantUsd,
      tauxChange,
      description: `Transaction ${type} - ${categorie.nom}`,
      justificatif: Math.random() > 0.7 ? `https://eglise.org/justificatif/${i}.pdf` : null,
      createdBy: Math.random() > 0.3 ? randomItem(activeUsers).id : null,
      createdAt: dateTransaction
    })
  }
  
  // Ajouter quelques transactions au nom de l'église (sans membre)
  for (let i = 0; i < 10; i++) {
    const type = randomItem(types)
    const categoriesList = type === 'entree' ? entreeCategories : sortieCategories
    const categorie = randomItem(categoriesList)
    const devise = randomItem(devises)
    
    let montant
    let montantCdf, montantUsd
    
    if (type === 'entree') {
      if (devise === 'CDF') {
        montant = randomFloat(10000, 200000)
        montantCdf = montant
        montantUsd = montant / tauxChange
      } else {
        montant = randomFloat(50, 1000)
        montantCdf = montant * tauxChange
        montantUsd = montant
      }
    } else {
      if (devise === 'CDF') {
        montant = randomFloat(5000, 50000)
        montantCdf = montant
        montantUsd = montant / tauxChange
      } else {
        montant = randomFloat(20, 200)
        montantCdf = montant * tauxChange
        montantUsd = montant
      }
    }
    
    const dateTransaction = randomDate(startDate, endDate)
    
    transactions.push({
      type,
      categorieId: categorie.id,
      membreId: null, // Transaction de l'église
      montant,
      dateTransaction,
      devise,
      montantCdf,
      montantUsd,
      tauxChange,
      description: `Transaction église - ${categorie.nom}`,
      justificatif: Math.random() > 0.8 ? `https://eglise.org/justificatif/eglise/${i}.pdf` : null,
      createdBy: Math.random() > 0.4 ? randomItem(activeUsers).id : null,
      createdAt: dateTransaction
    })
  }
  
  const created = await prisma.transaction.createMany({
    data: transactions,
    skipDuplicates: true
  })
  
  console.log(`✅ ${created.count} transactions créées`)
  
  return await prisma.transaction.findMany()
}

// ============================================
// 5. CRÉATION DES RAPPORTS
// ============================================
async function seedRapports(departements, utilisateurs) {
  console.log('📊 Création des rapports...')
  
  const rapports = []
  const activeUsers = utilisateurs.filter(u => u.actif)
  
  const contenuExemples = [
    'Ce rapport couvre les activités du trimestre.',
    'Bilan des actions menées dans le département.',
    'Rapport d\'avancement des projets.',
    'Présentation des résultats obtenus.',
    'Analyse des performances du département.',
    'Plan d\'action pour le prochain trimestre.',
    'Compte-rendu des activités.',
    'Statistiques et indicateurs clés.'
  ]
  
  for (let i = 0; i < SEED_CONFIG.RAPPORTS; i++) {
    const departement = randomItem(departements)
    const createur = randomItem(activeUsers)
    const date = randomDate(
      new Date('2025-01-01'),
      new Date('2026-07-20')
    )
    
    rapports.push({
      departementId: departement.id,
      titre: `Rapport ${i + 1} - ${departement.nom}`,
      contenu: randomItem(contenuExemples) + `\n\nCe rapport détaille les activités du département ${departement.nom}.\n\n- Activité 1: Description\n- Activité 2: Description\n- Activité 3: Description\n\nTotal des participants: ${randomInt(10, 100)}\nObjectifs atteints: ${randomInt(50, 100)}%`,
      periode: date,
      createdBy: createur.id,
      createdAt: date
    })
  }
  
  const created = await prisma.rapportDepartement.createMany({
    data: rapports,
    skipDuplicates: true
  })
  
  console.log(`✅ ${created.count} rapports créés`)
  
  return await prisma.rapportDepartement.findMany()
}

// ============================================
// 6. CRÉATION DES LOGS
// ============================================
async function seedLogs(utilisateurs) {
  console.log('📝 Création des logs...')
  
  const logs = []
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'READ']
  const tables = ['membres', 'transactions', 'categories', 'departements', 'utilisateurs']
  const activeUsers = utilisateurs.filter(u => u.actif)
  
  for (let i = 0; i < SEED_CONFIG.LOGS; i++) {
    const utilisateur = randomItem(activeUsers)
    
    logs.push({
      utilisateurId: utilisateur.id,
      action: randomItem(actions),
      tableName: randomItem(tables),
      recordId: randomItem(utilisateurs).id,
      details: {
        action: randomItem(actions),
        timestamp: new Date().toISOString(),
        metadata: {
          userAgent: 'Mozilla/5.0 (compatible)',
          ip: `192.168.${randomInt(0, 255)}.${randomInt(0, 255)}`
        }
      },
      ipAddress: `192.168.${randomInt(0, 255)}.${randomInt(0, 255)}`,
      createdAt: randomDate(
        new Date('2026-06-01'),
        new Date('2026-07-20')
      )
    })
  }
  
  const created = await prisma.logActivite.createMany({
    data: logs,
    skipDuplicates: true
  })
  
  console.log(`✅ ${created.count} logs créés`)
}

// ============================================
// 7. MISE À JOUR DES RESPONSABLES DE DÉPARTEMENT
// ============================================
async function updateDepartementResponsables(departements, membres) {
  console.log('🔄 Mise à jour des responsables de départements...')
  
  let updated = 0
  for (const dept of departements) {
    // Trouver un membre dans ce département pour en faire le responsable
    const membreDept = membres.find(m => m.departementId === dept.id && m.statut === 'actif')
    
    if (membreDept && Math.random() > 0.3) {
      await prisma.departement.update({
        where: { id: dept.id },
        data: { responsableId: membreDept.id }
      })
      updated++
    }
  }
  
  console.log(`✅ ${updated} départements ont un responsable`)
}

// ============================================
// 8. FONCTION PRINCIPALE
// ============================================
async function main() {
  console.log('🚀 DEBUT DU SEEDING...')
  console.log('====================================\n')
  
  try {
    // 1. Création des départements
    console.log('🏛️ Création des départements...')
    const departements = await prisma.departement.createMany({
      data: DEPARTEMENTS_SEED,
      skipDuplicates: true
    })
    console.log(`✅ ${departements.count} départements créés\n`)
    
    // Récupérer les départements
    const allDepartements = await prisma.departement.findMany()
    
    // 2. Membres
    const membres = await seedMembres(allDepartements)
    
    // 3. Utilisateurs
    const utilisateurs = await seedUtilisateurs(membres)
    
    // 4. Catégories
    const categories = await seedCategories()
    
    // 5. Transactions
    const transactions = await seedTransactions(membres, categories, utilisateurs)
    
    // 6. Rapports
    const rapports = await seedRapports(allDepartements, utilisateurs)
    
    // 7. Logs
    const logs = await seedLogs(utilisateurs)
    
    // 8. Mise à jour des responsables de départements
    await updateDepartementResponsables(allDepartements, membres)
    
    console.log('\n====================================')
    console.log('🎉 SEEDING TERMINÉ AVEC SUCCÈS !')
    console.log('====================================')
    console.log(`📊 Statistiques finales:`)
    console.log(`   - Départements: ${allDepartements.length}`)
    console.log(`   - Membres: ${membres.length}`)
    console.log(`   - Utilisateurs: ${utilisateurs.length}`)
    console.log(`   - Catégories: ${categories.length}`)
    console.log(`   - Transactions: ${transactions.length}`)
    console.log(`   - Rapports: ${rapports.length}`)
    console.log('====================================')
    
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// ============================================
// 9. EXÉCUTION
// ============================================
main()
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })