// backend/src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken'
import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'
import { ROLES_LIST, normalizeRole, ERROR_MESSAGES } from '../utils/constants.js'

/**
 * Vérifier et décoder le token JWT
 */
export const verifyToken = async (req, res, next) => {
  console.log('🔴 VERIFY TOKEN - Vérification du token')
  console.log('URL:', req.method, req.originalUrl)
  
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ PAS DE TOKEN - Renvoi 401')
      return res.status(401).json({ 
        success: false, 
        message: ERROR_MESSAGES.UNAUTHORIZED
      })
    }
    
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    console.log('🔍 Token décodé:', decoded)
    
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id }
    })
    
    if (!utilisateur || !utilisateur.actif) {
      return res.status(401).json({ 
        success: false, 
        message: ERROR_MESSAGES.ACCOUNT_DISABLED
      })
    }
    
    // ✅ Normaliser le rôle de l'utilisateur
    const normalizedRole = normalizeRole(utilisateur.role)
    if (!normalizedRole) {
      console.error(`❌ Rôle invalide pour l'utilisateur ${utilisateur.email}: ${utilisateur.role}`)
      return res.status(401).json({
        success: false,
        message: 'Rôle utilisateur invalide'
      })
    }
    
    // ✅ Stocker le rôle normalisé dans req.user
    utilisateur.role = normalizedRole
    
    console.log('✅ TOKEN VALIDE - Utilisateur:', utilisateur.email, 'Rôle:', utilisateur.role)
    req.user = utilisateur
    next()
  } catch (error) {
    console.log('❌ ERREUR TOKEN:', error.message)
    return res.status(401).json({ 
      success: false, 
      message: ERROR_MESSAGES.TOKEN_INVALID
    })
  }
}

/**
 * Middleware d'autorisation avec normalisation des rôles
 * @param {...string} allowedRoles - Liste des rôles autorisés
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED
      })
    }
    
    // ✅ Normaliser le rôle de l'utilisateur
    const userRole = normalizeRole(req.user.role)
    
    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: 'Rôle utilisateur invalide'
      })
    }
    
    // ✅ Normaliser les rôles autorisés
    const normalizedAllowedRoles = allowedRoles
      .map(role => normalizeRole(role))
      .filter(role => role !== null)
    
    console.log(`🔍 Vérification rôle: ${userRole} vs ${normalizedAllowedRoles.join(', ')}`)
    
    if (!normalizedAllowedRoles.includes(userRole)) {
      console.log(`❌ Rôle non autorisé: ${userRole}`)
      return res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN,
        requiredRoles: normalizedAllowedRoles,
        yourRole: userRole
      })
    }
    
    console.log(`✅ Rôle autorisé: ${userRole}`)
    next()
  }
}

/**
 * Vérifier que l'utilisateur est administrateur
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: ERROR_MESSAGES.UNAUTHORIZED
    })
  }
  
  const userRole = normalizeRole(req.user.role)
  if (userRole !== 'administrateur') {
    return res.status(403).json({ 
      success: false, 
      message: ERROR_MESSAGES.FORBIDDEN
    })
  }
  
  next()
}

/**
 * Vérifier que l'utilisateur est pasteur ou admin
 */
export const isPasteurOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: ERROR_MESSAGES.UNAUTHORIZED
    })
  }
  
  const userRole = normalizeRole(req.user.role)
  if (!['pasteur', 'administrateur'].includes(userRole)) {
    return res.status(403).json({ 
      success: false, 
      message: ERROR_MESSAGES.FORBIDDEN
    })
  }
  
  next()
}

/**
 * Vérifier que l'utilisateur est trésorier ou admin
 */
export const isTresorierOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: ERROR_MESSAGES.UNAUTHORIZED
    })
  }
  
  const userRole = normalizeRole(req.user.role)
  if (!['tresorier', 'administrateur'].includes(userRole)) {
    return res.status(403).json({ 
      success: false, 
      message: ERROR_MESSAGES.FORBIDDEN
    })
  }
  
  next()
}

/**
 * Vérifier que l'utilisateur est secrétaire ou admin
 */
export const isSecretaireOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: ERROR_MESSAGES.UNAUTHORIZED
    })
  }
  
  const userRole = normalizeRole(req.user.role)
  if (!['secretaire', 'administrateur'].includes(userRole)) {
    return res.status(403).json({ 
      success: false, 
      message: ERROR_MESSAGES.FORBIDDEN
    })
  }
  
  next()
}

/**
 * Vérifier que l'utilisateur est chef de département ou admin
 */
export const isChefDepartementOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: ERROR_MESSAGES.UNAUTHORIZED
    })
  }
  
  const userRole = normalizeRole(req.user.role)
  if (!['chef_departement', 'administrateur'].includes(userRole)) {
    return res.status(403).json({ 
      success: false, 
      message: ERROR_MESSAGES.FORBIDDEN
    })
  }
  
  next()
}