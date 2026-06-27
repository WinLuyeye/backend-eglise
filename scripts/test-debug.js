// test-debug.js
import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

console.log('🚀 TEST DE CONNEXION\n')

// Test 1: Health check
console.log('1. Health check...')
try {
  const health = await axios.get('http://localhost:3000/health')
  console.log('✅ Serveur OK\n')
} catch (error) {
  console.log('❌ Serveur indisponible')
  process.exit(1)
}

// Test 2: Setup admin (si nécessaire)
console.log('2. Tentative de création admin (si pas d\'admin)...')
try {
  const setup = await axios.post(`${API_URL}/auth/setup`, {
    email: 'admin@eglise.com',
    motDePasse: 'password123',
    nom: 'ADMIN',
    prenom: 'TEST'
  })
  console.log('✅ Admin créé ou déjà existant\n')
} catch (error) {
  if (error.response?.status === 400) {
    console.log('ℹ️ Admin existe déjà\n')
  } else {
    console.log('⚠️ Setup non disponible\n')
  }
}

// Test 3: Login
console.log('3. Tentative de login...')
try {
  const login = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@eglise.com',
    motDePasse: 'password123'
  })
  
  console.log('✅ LOGIN RÉUSSI !')
  console.log('   Token:', login.data.token.substring(0, 50) + '...')
  console.log('   Utilisateur:', login.data.user.email)
  console.log('   Rôle:', login.data.user.role)
  console.log('\n🎉 Tout fonctionne !')
  
} catch (error) {
  console.log('❌ LOGIN ÉCHOUÉ')
  if (error.response) {
    console.log('   Status:', error.response.status)
    console.log('   Message:', error.response.data.message)
  } else {
    console.log('   Erreur:', error.message)
  }
}