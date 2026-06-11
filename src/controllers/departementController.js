import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

/**
 * @desc    Obtenir tous les départements
 * @route   GET /api/departements
 * @access  Private
 */
export const getDepartements = async (req, res) => {
  try {
    const departements = await prisma.departement.findMany({
      include: {
        responsable: {
          select: { nom: true, prenom: true, email: true, telephone: true }
        },
        _count: {
          select: { membres: true, rapports: true }
        }
      },
      orderBy: { nom: 'asc' }
    })
    
    res.json({ success: true, data: departements })
  } catch (error) {
    logger.error('Erreur getDepartements:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Obtenir un département par ID
 * @route   GET /api/departements/:id
 * @access  Private
 */
export const getDepartementById = async (req, res) => {
  try {
    const { id } = req.params
    
    const departement = await prisma.departement.findUnique({
      where: { id },
      include: {
        responsable: {
          select: { nom: true, prenom: true, email: true, telephone: true }
        },
        membres: {
          select: { id: true, nom: true, prenom: true, email: true, telephone: true }
        },
        rapports: {
          orderBy: { periode: 'desc' },
          take: 5
        }
      }
    })
    
    if (!departement) {
      return res.status(404).json({ message: 'Département non trouvé' })
    }
    
    res.json({ success: true, data: departement })
  } catch (error) {
    logger.error('Erreur getDepartementById:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Créer un département
 * @route   POST /api/departements
 * @access  Private (Admin)
 */
export const createDepartement = async (req, res) => {
  try {
    const { nom, description, responsableId } = req.body
    
    if (!nom) {
      return res.status(400).json({ message: 'Le nom du département est requis' })
    }
    
    if (responsableId) {
      const responsable = await prisma.membre.findUnique({
        where: { id: responsableId }
      })
      if (!responsable) {
        return res.status(404).json({ message: 'Responsable non trouvé' })
      }
    }
    
    const departement = await prisma.departement.create({
      data: {
        nom,
        description,
        responsableId
      },
      include: {
        responsable: true
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'CREATE',
        tableName: 'departements',
        recordId: departement.id,
        details: { nom, description },
        ipAddress: req.ip
      }
    })
    
    logger.info(`🏢 Département créé: ${nom} par ${req.user.email}`)
    res.status(201).json({ success: true, data: departement, message: 'Département créé avec succès' })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ce département existe déjà' })
    }
    logger.error('Erreur createDepartement:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Modifier un département
 * @route   PUT /api/departements/:id
 * @access  Private (Admin)
 */
export const updateDepartement = async (req, res) => {
  try {
    const { id } = req.params
    const { nom, description, responsableId } = req.body
    
    const departementExistant = await prisma.departement.findUnique({
      where: { id }
    })
    
    if (!departementExistant) {
      return res.status(404).json({ message: 'Département non trouvé' })
    }
    
    if (responsableId) {
      const responsable = await prisma.membre.findUnique({
        where: { id: responsableId }
      })
      if (!responsable) {
        return res.status(404).json({ message: 'Responsable non trouvé' })
      }
    }
    
    const departement = await prisma.departement.update({
      where: { id },
      data: {
        nom: nom || departementExistant.nom,
        description: description !== undefined ? description : departementExistant.description,
        responsableId: responsableId !== undefined ? responsableId : departementExistant.responsableId
      },
      include: {
        responsable: true
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'UPDATE',
        tableName: 'departements',
        recordId: id,
        details: { modifications: req.body },
        ipAddress: req.ip
      }
    })
    
    logger.info(`✏️ Département modifié: ${id} par ${req.user.email}`)
    res.json({ success: true, data: departement, message: 'Département modifié avec succès' })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ce nom de département existe déjà' })
    }
    logger.error('Erreur updateDepartement:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Supprimer un département
 * @route   DELETE /api/departements/:id
 * @access  Private (Admin)
 */
export const deleteDepartement = async (req, res) => {
  try {
    const { id } = req.params
    
    const membres = await prisma.membre.count({
      where: { departementId: id }
    })
    
    if (membres > 0) {
      return res.status(400).json({ 
        message: `Ce département a ${membres} membre(s). Transférez-les d'abord.` 
      })
    }
    
    await prisma.departement.delete({ where: { id } })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'DELETE',
        tableName: 'departements',
        recordId: id,
        ipAddress: req.ip
      }
    })
    
    logger.info(`🗑️ Département supprimé: ${id} par ${req.user.email}`)
    res.json({ success: true, message: 'Département supprimé avec succès' })
  } catch (error) {
    logger.error('Erreur deleteDepartement:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Obtenir les membres d'un département
 * @route   GET /api/departements/:id/membres
 * @access  Private
 */
export const getDepartementMembres = async (req, res) => {
  try {
    const { id } = req.params
    
    const departement = await prisma.departement.findUnique({
      where: { id }
    })
    
    if (!departement) {
      return res.status(404).json({ message: 'Département non trouvé' })
    }
    
    const membres = await prisma.membre.findMany({
      where: { departementId: id },
      orderBy: { nom: 'asc' }
    })
    
    res.json({ success: true, data: membres })
  } catch (error) {
    logger.error('Erreur getDepartementMembres:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}