import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

/**
 * @desc    Obtenir tous les rapports
 * @route   GET /api/rapports
 * @access  Private
 */
export const getRapports = async (req, res) => {
  try {
    const { page = 1, limit = 50, departementId, periodeDebut, periodeFin } = req.query
    const skip = (page - 1) * limit
    
    let where = {}
    
    // 🔒 Chef département voit seulement les rapports de son département
    if (req.user.role === 'chef_departement') {
      const membre = await prisma.membre.findUnique({
        where: { id: req.user.membreId },
        include: { departement: true }
      })
      
      if (!membre?.departementId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas assigné à un département' })
      }
      
      where.departementId = membre.departementId
    }
    
    if (departementId) where.departementId = departementId
    if (periodeDebut || periodeFin) {
      where.periode = {}
      if (periodeDebut) where.periode.gte = new Date(periodeDebut)
      if (periodeFin) where.periode.lte = new Date(periodeFin)
    }
    
    const [rapports, total] = await Promise.all([
      prisma.rapportDepartement.findMany({
        where,
        include: {
          departement: true,
          createur: {
            select: { email: true, id: true }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.rapportDepartement.count({ where })
    ])
    
    res.json({
      success: true,
      data: rapports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Erreur getRapports:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Obtenir un rapport par ID
 * @route   GET /api/rapports/:id
 * @access  Private
 */
export const getRapportById = async (req, res) => {
  try {
    const { id } = req.params
    
    const rapport = await prisma.rapportDepartement.findUnique({
      where: { id },
      include: {
        departement: true,
        createur: {
          select: { email: true }
        }
      }
    })
    
    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' })
    }
    
    // 🔒 Chef département ne peut voir que les rapports de son département
    if (req.user.role === 'chef_departement') {
      const membre = await prisma.membre.findUnique({
        where: { id: req.user.membreId },
        include: { departement: true }
      })
      
      if (rapport.departementId !== membre?.departementId) {
        return res.status(403).json({ message: 'Accès non autorisé à ce rapport' })
      }
    }
    
    res.json({ success: true, data: rapport })
  } catch (error) {
    logger.error('Erreur getRapportById:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Créer un rapport
 * @route   POST /api/rapports
 * @access  Private (Chef département, Admin)
 */
export const createRapport = async (req, res) => {
  try {
    const { departementId, titre, contenu, periode } = req.body
    
    if (!departementId || !titre || !contenu) {
      return res.status(400).json({ message: 'Département, titre et contenu sont requis' })
    }
    
    let targetDepartementId = departementId
    
    // 🔒 Chef département ne peut créer que pour son département
    if (req.user.role === 'chef_departement') {
      const membre = await prisma.membre.findUnique({
        where: { id: req.user.membreId },
        include: { departement: true }
      })
      
      if (!membre?.departementId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas assigné à un département' })
      }
      
      if (departementId !== membre.departementId) {
        return res.status(403).json({ message: 'Vous ne pouvez créer que pour votre département' })
      }
      
      targetDepartementId = membre.departementId
    }
    
    const departement = await prisma.departement.findUnique({
      where: { id: targetDepartementId }
    })
    
    if (!departement) {
      return res.status(404).json({ message: 'Département non trouvé' })
    }
    
    const rapport = await prisma.rapportDepartement.create({
      data: {
        departementId: targetDepartementId,
        titre,
        contenu,
        periode: periode ? new Date(periode) : new Date(),
        createdBy: req.user.id
      },
      include: {
        departement: true
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'CREATE',
        tableName: 'rapports_departement',
        recordId: rapport.id,
        details: { titre, departementId: targetDepartementId },
        ipAddress: req.ip
      }
    })
    
    logger.info(`📄 Rapport créé: ${titre} par ${req.user.email}`)
    res.status(201).json({ success: true, data: rapport, message: 'Rapport créé avec succès' })
  } catch (error) {
    logger.error('Erreur createRapport:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Modifier un rapport
 * @route   PUT /api/rapports/:id
 * @access  Private (Créateur ou Admin)
 */
export const updateRapport = async (req, res) => {
  try {
    const { id } = req.params
    const { titre, contenu, periode } = req.body
    
    const rapportExistant = await prisma.rapportDepartement.findUnique({
      where: { id }
    })
    
    if (!rapportExistant) {
      return res.status(404).json({ message: 'Rapport non trouvé' })
    }
    
    // 🔒 Chef département ne peut modifier que ses propres rapports
    if (req.user.role === 'chef_departement' && rapportExistant.createdBy !== req.user.id) {
      const membre = await prisma.membre.findUnique({
        where: { id: req.user.membreId }
      })
      
      if (rapportExistant.departementId !== membre?.departementId) {
        return res.status(403).json({ message: 'Vous ne pouvez modifier que vos propres rapports' })
      }
    }
    
    const rapport = await prisma.rapportDepartement.update({
      where: { id },
      data: {
        titre: titre || rapportExistant.titre,
        contenu: contenu || rapportExistant.contenu,
        periode: periode ? new Date(periode) : rapportExistant.periode
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'UPDATE',
        tableName: 'rapports_departement',
        recordId: id,
        details: { modifications: req.body },
        ipAddress: req.ip
      }
    })
    
    logger.info(`✏️ Rapport modifié: ${id} par ${req.user.email}`)
    res.json({ success: true, data: rapport, message: 'Rapport modifié avec succès' })
  } catch (error) {
    logger.error('Erreur updateRapport:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Supprimer un rapport
 * @route   DELETE /api/rapports/:id
 * @access  Private (Admin seulement)
 */
export const deleteRapport = async (req, res) => {
  try {
    const { id } = req.params
    
    if (req.user.role !== 'administrateur') {
      return res.status(403).json({ message: 'Seul l\'administrateur peut supprimer des rapports' })
    }
    
    await prisma.rapportDepartement.delete({ where: { id } })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'DELETE',
        tableName: 'rapports_departement',
        recordId: id,
        ipAddress: req.ip
      }
    })
    
    logger.info(`🗑️ Rapport supprimé: ${id} par ${req.user.email}`)
    res.json({ success: true, message: 'Rapport supprimé avec succès' })
  } catch (error) {
    logger.error('Erreur deleteRapport:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Obtenir les rapports d'un département
 * @route   GET /api/rapports/departement/:departementId
 * @access  Private
 */
export const getRapportsByDepartement = async (req, res) => {
  try {
    const { departementId } = req.params
    const { limit = 12 } = req.query
    
    // 🔒 Chef département ne peut voir que son département
    if (req.user.role === 'chef_departement') {
      const membre = await prisma.membre.findUnique({
        where: { id: req.user.membreId },
        include: { departement: true }
      })
      
      if (departementId !== membre?.departementId) {
        return res.status(403).json({ message: 'Accès non autorisé' })
      }
    }
    
    const rapports = await prisma.rapportDepartement.findMany({
      where: { departementId },
      include: {
        createur: {
          select: { email: true }
        }
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    })
    
    res.json({ success: true, data: rapports })
  } catch (error) {
    logger.error('Erreur getRapportsByDepartement:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}