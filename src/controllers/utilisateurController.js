import bcrypt from 'bcryptjs'
import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

/**
 * @desc    Obtenir tous les utilisateurs
 * @route   GET /api/utilisateurs
 * @access  Private (Secretaire, Admin)
 */
export const getUtilisateurs = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, actif } = req.query
    const skip = (page - 1) * limit
    
    let where = {}
    if (role) where.role = role
    if (actif !== undefined) where.actif = actif === 'true'
    
    const [utilisateurs, total] = await Promise.all([
      prisma.utilisateur.findMany({
        where,
        include: {
          membre: {
            select: { nom: true, prenom: true, telephone: true }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.utilisateur.count({ where })
    ])
    
    // Ne pas renvoyer les mots de passe
    const utilisateursSansMdp = utilisateurs.map(u => {
      const { motDePasse, ...rest } = u
      return rest
    })
    
    res.json({
      success: true,
      data: utilisateursSansMdp,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Erreur getUtilisateurs:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Obtenir un utilisateur par ID
 * @route   GET /api/utilisateurs/:id
 * @access  Private (Secretaire, Admin)
 */
export const getUtilisateurById = async (req, res) => {
  try {
    const { id } = req.params
    
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
      include: {
        membre: {
          include: {
            departement: true
          }
        },
        logs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    
    const { motDePasse, ...utilisateurSansMdp } = utilisateur
    
    res.json({ success: true, data: utilisateurSansMdp })
  } catch (error) {
    logger.error('Erreur getUtilisateurById:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Créer un utilisateur
 * @route   POST /api/utilisateurs
 * @access  Private (Secretaire, Admin)
 */
export const createUtilisateur = async (req, res) => {
  try {
    const { email, motDePasse, role, membreId } = req.body
    
    if (!email || !motDePasse || !role) {
      return res.status(400).json({ message: 'Email, mot de passe et rôle sont requis' })
    }
    
    const rolesValides = ['pasteur', 'tresorier', 'secretaire', 'chef_departement', 'administrateur']
    if (!rolesValides.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' })
    }
    
    if (membreId) {
      const membre = await prisma.membre.findUnique({
        where: { id: membreId }
      })
      if (!membre) {
        return res.status(404).json({ message: 'Membre non trouvé' })
      }
      
      const utilisateurExistant = await prisma.utilisateur.findFirst({
        where: { membreId }
      })
      if (utilisateurExistant) {
        return res.status(400).json({ message: 'Ce membre a déjà un compte utilisateur' })
      }
    }
    
    const hashedPassword = await bcrypt.hash(motDePasse, 10)
    
    const utilisateur = await prisma.utilisateur.create({
      data: {
        email,
        motDePasse: hashedPassword,
        role,
        membreId: membreId || null
      },
      include: {
        membre: {
          select: { nom: true, prenom: true }
        }
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'CREATE',
        tableName: 'utilisateurs',
        recordId: utilisateur.id,
        details: { email, role },
        ipAddress: req.ip
      }
    })
    
    const { motDePasse: _, ...utilisateurSansMdp } = utilisateur
    
    logger.info(`👤 Utilisateur créé: ${email} (${role}) par ${req.user.email}`)
    res.status(201).json({ success: true, data: utilisateurSansMdp, message: 'Utilisateur créé avec succès' })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }
    logger.error('Erreur createUtilisateur:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Modifier un utilisateur
 * @route   PUT /api/utilisateurs/:id
 * @access  Private (Secretaire, Admin)
 */
export const updateUtilisateur = async (req, res) => {
  try {
    const { id } = req.params
    const { email, role, actif, membreId } = req.body
    
    const utilisateurExistant = await prisma.utilisateur.findUnique({
      where: { id }
    })
    
    if (!utilisateurExistant) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    
    if (membreId !== undefined) {
      if (membreId) {
        const membre = await prisma.membre.findUnique({
          where: { id: membreId }
        })
        if (!membre) {
          return res.status(404).json({ message: 'Membre non trouvé' })
        }
      }
    }
    
    const utilisateur = await prisma.utilisateur.update({
      where: { id },
      data: {
        email: email || utilisateurExistant.email,
        role: role || utilisateurExistant.role,
        actif: actif !== undefined ? actif : utilisateurExistant.actif,
        membreId: membreId !== undefined ? membreId : utilisateurExistant.membreId
      },
      include: {
        membre: {
          select: { nom: true, prenom: true }
        }
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'UPDATE',
        tableName: 'utilisateurs',
        recordId: id,
        details: { modifications: req.body },
        ipAddress: req.ip
      }
    })
    
    const { motDePasse, ...utilisateurSansMdp } = utilisateur
    
    logger.info(`✏️ Utilisateur modifié: ${id} par ${req.user.email}`)
    res.json({ success: true, data: utilisateurSansMdp, message: 'Utilisateur modifié avec succès' })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }
    logger.error('Erreur updateUtilisateur:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Supprimer un utilisateur
 * @route   DELETE /api/utilisateurs/:id
 * @access  Private (Admin seulement)
 */
export const deleteUtilisateur = async (req, res) => {
  try {
    const { id } = req.params
    
    if (req.user.role !== 'administrateur') {
      return res.status(403).json({ message: 'Seul l\'administrateur peut supprimer un utilisateur' })
    }
    
    if (req.user.id === id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' })
    }
    
    await prisma.utilisateur.delete({ where: { id } })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'DELETE',
        tableName: 'utilisateurs',
        recordId: id,
        ipAddress: req.ip
      }
    })
    
    logger.info(`🗑️ Utilisateur supprimé: ${id} par ${req.user.email}`)
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' })
  } catch (error) {
    logger.error('Erreur deleteUtilisateur:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Réinitialiser mot de passe
 * @route   POST /api/utilisateurs/:id/reset-password
 * @access  Private (Secretaire, Admin)
 */
export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params
    const { nouveauMotDePasse } = req.body
    
    if (!nouveauMotDePasse || nouveauMotDePasse.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' })
    }
    
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id }
    })
    
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10)
    
    await prisma.utilisateur.update({
      where: { id },
      data: { motDePasse: hashedPassword }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'RESET_PASSWORD',
        tableName: 'utilisateurs',
        recordId: id,
        details: { resetBy: req.user.email },
        ipAddress: req.ip
      }
    })
    
    logger.info(`🔑 Mot de passe réinitialisé pour: ${utilisateur.email} par ${req.user.email}`)
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' })
  } catch (error) {
    logger.error('Erreur resetPassword:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}