import jwt from 'jsonwebtoken'
import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

export const verifyToken = async (req, res, next) => {
  console.log('🔴 VERIFY TOKEN EXÉCUTÉ - Vérification du token')
  console.log('URL:', req.method, req.originalUrl)
  console.log('Authorization header:', req.headers.authorization)
  
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ PAS DE TOKEN - Renvoi 401')
      return res.status(401).json({ 
        success: false, 
        message: 'Accès non autorisé. Token non fourni.' 
      })
    }
    
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id }
    })
    
    if (!utilisateur || !utilisateur.actif) {
      return res.status(401).json({ 
        success: false, 
        message: 'Utilisateur non trouvé ou inactif.' 
      })
    }
    
    console.log('✅ TOKEN VALIDE - Utilisateur:', utilisateur.email)
    req.user = utilisateur
    next()
  } catch (error) {
    console.log('❌ ERREUR TOKEN:', error.message)
    return res.status(401).json({ 
      success: false, 
      message: 'Token invalide.' 
    })
  }
}
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: decoded.id }
      })
      if (utilisateur && utilisateur.actif) {
        req.user = utilisateur
      }
    }
    next()
  } catch (error) {
    next()
  }
}