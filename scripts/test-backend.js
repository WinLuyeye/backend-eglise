// test-backend.js
import axios from 'axios'
import chalk from 'chalk'

// Configuration
const API_URL = 'http://localhost:3000/api'
let TOKEN = null
let TEST_IDS = {
  membreId: null,
  categorieId: null,
  transactionId: null,
  departementId: null,
  rapportId: null,
  utilisateurId: null
}

// Compteurs de tests
let testsPassed = 0
let testsFailed = 0

// Helper pour afficher les résultats
const logSuccess = (msg) => console.log(chalk.green('✅ ' + msg))
const logError = (msg) => console.log(chalk.red('❌ ' + msg))
const logInfo = (msg) => console.log(chalk.blue('📝 ' + msg))
const logSection = (msg) => console.log(chalk.magenta('\n' + '='.repeat(60) + '\n' + msg + '\n' + '='.repeat(60)))

// Helper pour faire des requêtes - VERSION CORRIGÉE
const api = async (method, endpoint, data = null, customToken = null) => {
  try {
    const headers = {}
    const tokenToUse = customToken !== undefined ? customToken : TOKEN
    if (tokenToUse) {
      headers['Authorization'] = `Bearer ${tokenToUse}`
    }
    
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers,
      data
    }
    
    const response = await axios(config)
    return { success: true, data: response.data, status: response.status }
  } catch (error) {
    return { 
      success: false, 
      data: error.response?.data, 
      status: error.response?.status || 500,
      message: error.message
    }
  }
}

// Tester une requête
const testRequest = async (name, method, endpoint, expectedStatus, data = null, useToken = true) => {
  console.log(chalk.cyan(`\n🔍 Test: ${name}`))
  const result = await api(method, endpoint, data, useToken ? TOKEN : null)
  
  if (result.status === expectedStatus) {
    logSuccess(`${name} - Status ${result.status} attendu ${expectedStatus}`)
    testsPassed++
    return result
  } else {
    logError(`${name} - Status ${result.status} au lieu de ${expectedStatus}`)
    if (result.data) console.log('   Réponse:', JSON.stringify(result.data, null, 2).substring(0, 200))
    testsFailed++
    return result
  }
}

// ============================================
// EXERCICE 1: AUTHENTIFICATION
// ============================================
const testAuthentication = async () => {
  logSection('🔐 EXERCICE 1: AUTHENTIFICATION')
  
  // 1.1 Login avec mauvais mot de passe
  logInfo('Test 1.1: Login avec identifiants incorrects')
  const badLogin = await api('post', '/auth/login', {
    email: 'admin@eglise.com',
    motDePasse: 'wrongpassword'
  })
  if (badLogin.status === 401) {
    logSuccess('Login avec mauvais mot de passe - Correct (401)')
    testsPassed++
  } else {
    logError(`Login avec mauvais mot de passe - Status ${badLogin.status}`)
    testsFailed++
  }
  
  // 1.2 Login correct
  logInfo('Test 1.2: Login avec identifiants corrects')
  const login = await api('post', '/auth/login', {
    email: 'admin@eglise.com',
    motDePasse: 'password123'
  })
  
  if (login.status === 200 && login.data.token) {
    TOKEN = login.data.token
    logSuccess(`Login réussi - Token obtenu`)
    logInfo(`   Utilisateur: ${login.data.user.email} (${login.data.user.role})`)
    testsPassed++
  } else {
    logError(`Login échoué - Status ${login.status}`)
    testsFailed++
    return false
  }
  
  // 1.3 Accès sans token
  logInfo('Test 1.3: Accès à une route protégée sans token')
  const noToken = await api('get', '/dashboard/global', null, null)
  if (noToken.status === 401) {
    logSuccess('Route protégée - Token requis (401) - Correct')
    testsPassed++
  } else {
    logError(`Route protégée sans token - Status ${noToken.status} au lieu de 401`)
    testsFailed++
  }
  
  // 1.4 Accès avec token invalide
  logInfo('Test 1.4: Accès avec token invalide')
  const invalidToken = await api('get', '/membres', null, 'invalid.token.here')
  if (invalidToken.status === 401) {
    logSuccess('Token invalide - Rejeté (401) - Correct')
    testsPassed++
  } else {
    logError(`Token invalide - Status ${invalidToken.status} au lieu de 401`)
    testsFailed++
  }
  
  // 1.5 Profil utilisateur
  logInfo('Test 1.5: Récupération du profil utilisateur')
  const profile = await api('get', '/auth/me', null, TOKEN)
  if (profile.status === 200 && profile.data.data?.email === 'admin@eglise.com') {
    logSuccess('Profil récupéré correctement')
    testsPassed++
  } else {
    logError('Échec récupération profil')
    testsFailed++
  }
  
  return true
}

// ============================================
// EXERCICE 2: GESTION DES MEMBRES
// ============================================
const testMembres = async () => {
  logSection('👥 EXERCICE 2: GESTION DES MEMBRES')
  
  // 2.1 Créer un membre
  logInfo('Test 2.1: Création d\'un membre')
  const newMembre = await testRequest(
    'Création membre TEST',
    'post',
    '/membres',
    201,
    {
      nom: 'TEST',
      prenom: 'API',
      email: `test.${Date.now()}@eglise.com`,
      telephone: '771234567',
      adresse: '123 Rue Test',
      dateNaissance: '1990-01-01'
    },
    true
  )
  
  if (newMembre.status === 201 && newMembre.data.data?.id) {
    TEST_IDS.membreId = newMembre.data.data.id
    logSuccess(`   ID membre créé: ${TEST_IDS.membreId}`)
  }
  
  // 2.2 Lire tous les membres
  logInfo('Test 2.2: Lecture de la liste des membres')
  const membres = await testRequest('Liste des membres', 'get', '/membres', 200, null, true)
  if (membres.status === 200 && membres.data.data?.length > 0) {
    logSuccess(`   ${membres.data.data.length} membres trouvés`)
  }
  
  // 2.3 Lire un membre spécifique
  if (TEST_IDS.membreId) {
    logInfo('Test 2.3: Lecture d\'un membre spécifique')
    const membre = await testRequest('Lecture membre', 'get', `/membres/${TEST_IDS.membreId}`, 200, null, true)
    if (membre.status === 200 && membre.data.data?.nom === 'TEST') {
      logSuccess('   Membre récupéré correctement')
    }
  }
  
  // 2.4 Modifier un membre
  if (TEST_IDS.membreId) {
    logInfo('Test 2.4: Modification d\'un membre')
    const updateMembre = await testRequest(
      'Modification membre',
      'put',
      `/membres/${TEST_IDS.membreId}`,
      200,
      {
        telephone: '778888888',
        adresse: '456 Rue Modifiée'
      },
      true
    )
    if (updateMembre.status === 200 && updateMembre.data.data?.telephone === '778888888') {
      logSuccess('   Membre modifié correctement')
    }
  }
  
  return true
}

// ============================================
// EXERCICE 3: GESTION DES CATÉGORIES
// ============================================
const testCategories = async () => {
  logSection('📂 EXERCICE 3: GESTION DES CATÉGORIES')
  
  // 3.1 Créer une catégorie entrée
  logInfo('Test 3.1: Création catégorie entrée')
  const newCategorie = await testRequest(
    'Création catégorie TEST',
    'post',
    '/categories',
    201,
    {
      nom: `TEST_ENTREE_${Date.now()}`,
      type: 'entree',
      description: 'Catégorie de test entrée'
    },
    true
  )
  
  if (newCategorie.status === 201 && newCategorie.data.data?.id) {
    TEST_IDS.categorieId = newCategorie.data.data.id
    logSuccess(`   ID catégorie créé: ${TEST_IDS.categorieId}`)
  }
  
  return true
}

// ============================================
// EXERCICE 4: GESTION DES TRANSACTIONS
// ============================================
const testTransactions = async () => {
  logSection('💰 EXERCICE 4: GESTION DES TRANSACTIONS')
  
  if (!TEST_IDS.categorieId || !TEST_IDS.membreId) {
    logInfo('Skipping transactions - IDs manquants')
    return true
  }
  
  // 4.1 Créer une entrée
  logInfo('Test 4.1: Création d\'une entrée')
  const entree = await testRequest(
    'Création entrée',
    'post',
    '/transactions',
    201,
    {
      type: 'entree',
      categorieId: TEST_IDS.categorieId,
      membreId: TEST_IDS.membreId,
      montant: 50000,
      dateTransaction: new Date().toISOString().split('T')[0],
      description: 'Test entrée API'
    },
    true
  )
  
  if (entree.status === 201 && entree.data.data?.id) {
    TEST_IDS.transactionId = entree.data.data.id
    logSuccess(`   ID transaction créé: ${TEST_IDS.transactionId}`)
  }
  
  return true
}

// ============================================
// EXERCICE 5: GESTION DES DÉPARTEMENTS
// ============================================
const testDepartements = async () => {
  logSection('🏢 EXERCICE 5: GESTION DES DÉPARTEMENTS')
  
  // 5.1 Créer un département
  logInfo('Test 5.1: Création d\'un département')
  const newDept = await testRequest(
    'Création département TEST',
    'post',
    '/departements',
    201,
    {
      nom: `TEST_DEPT_${Date.now()}`,
      description: 'Département de test'
    },
    true
  )
  
  if (newDept.status === 201 && newDept.data.data?.id) {
    TEST_IDS.departementId = newDept.data.data.id
    logSuccess(`   ID département créé: ${TEST_IDS.departementId}`)
  }
  
  return true
}

// ============================================
// EXERCICE 6: GESTION DES RAPPORTS
// ============================================
const testRapports = async () => {
  logSection('📄 EXERCICE 6: GESTION DES RAPPORTS')
  
  if (!TEST_IDS.departementId) {
    logInfo('Skipping rapports - Département ID manquant')
    return true
  }
  
  // 6.1 Créer un rapport
  logInfo('Test 6.1: Création d\'un rapport')
  const newRapport = await testRequest(
    'Création rapport TEST',
    'post',
    '/rapports',
    201,
    {
      departementId: TEST_IDS.departementId,
      titre: 'Rapport de test',
      contenu: 'Ceci est un rapport généré automatiquement par les tests',
      periode: new Date().toISOString()
    },
    true
  )
  
  if (newRapport.status === 201 && newRapport.data.data?.id) {
    TEST_IDS.rapportId = newRapport.data.data.id
    logSuccess(`   ID rapport créé: ${TEST_IDS.rapportId}`)
  }
  
  return true
}

// ============================================
// EXERCICE 7: DASHBOARDS
// ============================================
const testDashboards = async () => {
  logSection('📊 EXERCICE 7: TABLEAUX DE BORD')
  
  // 7.1 Dashboard global
  logInfo('Test 7.1: Dashboard global')
  const globalDashboard = await testRequest('Dashboard global', 'get', '/dashboard/global', 200, null, true)
  if (globalDashboard.status === 200 && globalDashboard.data.data) {
    logSuccess(`   Total membres: ${globalDashboard.data.data.membres?.total || 0}`)
  }
  
  return true
}

// ============================================
// EXERCICE 8: VALIDATIONS
// ============================================
const testValidations = async () => {
  logSection('✔️ EXERCICE 8: VALIDATIONS DES DONNÉES')
  
  // 8.1 Création membre sans nom
  logInfo('Test 8.1: Création membre sans champ requis')
  const noNom = await api('post', '/membres', { prenom: 'Test' }, TOKEN)
  if (noNom.status === 400) {
    logSuccess('Validation champ requis - OK (400)')
    testsPassed++
  } else {
    logError(`Validation échouée - Status ${noNom.status}`)
    testsFailed++
  }
  
  return true
}

// ============================================
// EXERCICE 9: NETTOYAGE
// ============================================
const testCleanup = async () => {
  logSection('🧹 EXERCICE 9: NETTOYAGE')
  
  if (TEST_IDS.rapportId) {
    await testRequest('Suppression rapport', 'delete', `/rapports/${TEST_IDS.rapportId}`, 200, null, true)
  }
  if (TEST_IDS.transactionId) {
    await testRequest('Suppression transaction', 'delete', `/transactions/${TEST_IDS.transactionId}`, 200, null, true)
  }
  if (TEST_IDS.categorieId) {
    await testRequest('Suppression catégorie', 'delete', `/categories/${TEST_IDS.categorieId}`, 200, null, true)
  }
  if (TEST_IDS.departementId) {
    await testRequest('Suppression département', 'delete', `/departements/${TEST_IDS.departementId}`, 200, null, true)
  }
  if (TEST_IDS.membreId) {
    await testRequest('Suppression membre', 'delete', `/membres/${TEST_IDS.membreId}`, 200, null, true)
  }
  
  return true
}

// ============================================
// AFFICHAGE DES RÉSULTATS
// ============================================
const printResults = () => {
  console.log(chalk.magenta('\n' + '='.repeat(60)))
  console.log(chalk.bold('📊 RÉSULTATS DES TESTS'))
  console.log(chalk.magenta('='.repeat(60)))
  
  const total = testsPassed + testsFailed
  const percentage = (testsPassed / total * 100).toFixed(2)
  
  console.log(chalk.green(`✅ Tests réussis: ${testsPassed}`))
  console.log(chalk.red(`❌ Tests échoués: ${testsFailed}`))
  console.log(chalk.blue(`📈 Total: ${total}`))
  console.log(chalk.cyan(`🎯 Taux de succès: ${percentage}%`))
  
  if (testsFailed === 0) {
    console.log(chalk.green.bold('\n🎉 FÉLICITATIONS ! Tous les tests sont passés !'))
    console.log(chalk.green('   Le backend est prêt pour le développement frontend !'))
  } else {
    console.log(chalk.yellow.bold(`\n⚠️ ${testsFailed} test(s) échoué(s).`))
  }
}

// ============================================
// EXÉCUTION PRINCIPALE
// ============================================
const runAllTests = async () => {
  console.log(chalk.cyan.bold('\n🚀 DÉMARRAGE DES TESTS BACKEND\n'))
  
  try {
    await testAuthentication()
    await testMembres()
    await testCategories()
    await testTransactions()
    await testDepartements()
    await testRapports()
    await testDashboards()
    await testValidations()
    await testCleanup()
    
    printResults()
  } catch (error) {
    console.log(chalk.red('\n❌ ERREUR CRITIQUE:'))
    console.log(error)
  }
}

runAllTests()