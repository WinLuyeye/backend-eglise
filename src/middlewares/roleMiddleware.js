import { ROLES } from '../utils/constants.js'

/**
 * Vérifier que l'utilisateur a un des rôles autorisés
 * @param {...string} allowedRoles - Liste des rôles autorisés
 */
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié.' 
      })
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé. Vous n\'avez pas les droits nécessaires.',
        requiredRoles: allowedRoles,
        yourRole: req.user.role
      })
    }
    
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
      message: 'Non authentifié.' 
    })
  }
  
  if (req.user.role !== 'administrateur') {
    return res.status(403).json({ 
      success: false, 
      message: 'Accès refusé. Seul l\'administrateur peut effectuer cette action.' 
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
      message: 'Non authentifié.' 
    })
  }
  
  if (!['pasteur', 'administrateur'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Accès refusé. Seul le pasteur ou l\'administrateur peuvent accéder à cette ressource.' 
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
      message: 'Non authentifié.' 
    })
  }
  
  if (!['tresorier', 'administrateur'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Accès refusé. Seul le trésorier ou l\'administrateur peuvent accéder à cette ressource.' 
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
      message: 'Non authentifié.' 
    })
  }
  
  if (!['secretaire', 'administrateur'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Accès refusé. Seul le secrétaire ou l\'administrateur peuvent accéder à cette ressource.' 
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
      message: 'Non authentifié.' 
    })
  }
  
  if (!['chef_departement', 'administrateur'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Accès refusé. Seul un chef de département ou l\'administrateur peuvent accéder à cette ressource.' 
    })
  }
  
  next()
}

/**
 * Vérifier que l'utilisateur est chef de son département
 */
export const isOwnDepartement = async (req, res, next) => {
  try {
    if (req.user.role === 'administrateur') {
      return next()
    }
    
    if (req.user.role !== 'chef_departement') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé. Seul un chef de département peut effectuer cette action.' 
      })
    }
    
    const { departementId } = req.params
    const membre = await prisma.membre.findUnique({
      where: { id: req.user.membreId }
    })
    
    if (membre.departementId !== departementId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé. Vous ne pouvez accéder qu\'à votre propre département.' 
      })
    }
    
    next()
  } catch (error) {
    logger.error('Erreur isOwnDepartement:', error)
    res.status(500).json({ success: false, message: 'Erreur interne du serveur.' })
  }
}