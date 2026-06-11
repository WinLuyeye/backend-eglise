import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

/**
 * @desc    Connexion utilisateur
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body
    
    console.log('🔐 Tentative login:', email)
    
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      include: { membre: true }
    })
    
    if (!utilisateur) {
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      })
    }
    
    if (!utilisateur.actif) {
      return res.status(401).json({ 
        success: false,
        message: 'Compte désactivé. Contactez l\'administrateur.' 
      })
    }
    
    const isValidPassword = await bcrypt.compare(motDePasse, utilisateur.motDePasse)
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      })
    }
    
    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { dernierConnexion: new Date() }
    })
    
    const token = jwt.sign(
      { 
        id: utilisateur.id, 
        email: utilisateur.email, 
        role: utilisateur.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    )
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: utilisateur.id,
        action: 'LOGIN',
        tableName: 'utilisateurs',
        details: { ip: req.ip, userAgent: req.headers['user-agent'] },
        ipAddress: req.ip
      }
    })
    
    logger.info(`✅ Connexion réussie: ${email} (${utilisateur.role})`)
    
    res.json({
      success: true,
      token,
      user: {
        id: utilisateur.id,
        email: utilisateur.email,
        role: utilisateur.role,
        nom: utilisateur.membre?.nom,
        prenom: utilisateur.membre?.prenom,
        membreId: utilisateur.membreId
      }
    })
  } catch (error) {
    console.error('❌ Erreur login:', error)
    logger.error('Erreur lors de la connexion:', error)
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * @desc    Déconnexion
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    if (req.user) {
      await prisma.logActivite.create({
        data: {
          utilisateurId: req.user.id,
          action: 'LOGOUT',
          tableName: 'utilisateurs',
          details: { ip: req.ip },
          ipAddress: req.ip
        }
      })
      logger.info(`👋 Déconnexion: ${req.user.email}`)
    }
    
    res.json({ 
      success: true, 
      message: 'Déconnecté avec succès' 
    })
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error)
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    })
  }
}

/**
 * @desc    Changer mot de passe
 * @route   POST /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body
    const userId = req.user.id
    
    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({ 
        success: false,
        message: 'Tous les champs sont requis' 
      })
    }
    
    if (nouveauMotDePasse.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
      })
    }
    
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: userId }
    })
    
    if (!utilisateur) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      })
    }
    
    const isValid = await bcrypt.compare(ancienMotDePasse, utilisateur.motDePasse)
    
    if (!isValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Ancien mot de passe incorrect' 
      })
    }
    
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10)
    
    await prisma.utilisateur.update({
      where: { id: userId },
      data: { motDePasse: hashedPassword }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: userId,
        action: 'CHANGE_PASSWORD',
        tableName: 'utilisateurs',
        details: { changement: 'mot_de_passe' }
      }
    })
    
    logger.info(`🔐 Mot de passe changé pour: ${req.user.email}`)
    res.json({ 
      success: true, 
      message: 'Mot de passe changé avec succès' 
    })
  } catch (error) {
    logger.error('Erreur changement mot de passe:', error)
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    })
  }
}

/**
 * @desc    Obtenir profil utilisateur connecté
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: req.user.id },
      include: {
        membre: {
          include: {
            departement: true
          }
        }
      }
    })
    
    if (!utilisateur) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      })
    }
    
    res.json({
      success: true,
      data: {
        id: utilisateur.id,
        email: utilisateur.email,
        role: utilisateur.role,
        actif: utilisateur.actif,
        dernierConnexion: utilisateur.dernierConnexion,
        membre: utilisateur.membre
      }
    })
  } catch (error) {
    logger.error('Erreur getMe:', error)
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    })
  }
}

/**
 * @desc    Vérifier si le serveur est en ligne
 * @route   GET /api/auth/health
 * @access  Public
 */
export const health = async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    
    res.json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    })
  }
}

/**
 * @desc    Créer un premier utilisateur admin
 * @route   POST /api/auth/setup
 * @access  Public
 */
export const setupAdmin = async (req, res) => {
  try {
    const existingAdmin = await prisma.utilisateur.findFirst({
      where: { role: 'administrateur' }
    })
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Un administrateur existe déjà'
      })
    }
    
    const { email, motDePasse, nom, prenom } = req.body
    
    if (!email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      })
    }
    
    const membre = await prisma.membre.create({
      data: {
        nom: nom || 'ADMIN',
        prenom: prenom || 'SYSTEM',
        email: email,
        statut: 'actif'
      }
    })
    
    const hashedPassword = await bcrypt.hash(motDePasse, 10)
    
    const utilisateur = await prisma.utilisateur.create({
      data: {
        email: email,
        motDePasse: hashedPassword,
        role: 'administrateur',
        membreId: membre.id,
        actif: true
      }
    })
    
    logger.info(`🎉 Admin créé: ${email}`)
    
    res.status(201).json({
      success: true,
      message: 'Administrateur créé avec succès',
      data: {
        email: utilisateur.email,
        role: utilisateur.role
      }
    })
  } catch (error) {
    logger.error('Erreur création admin:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    })
  }
}