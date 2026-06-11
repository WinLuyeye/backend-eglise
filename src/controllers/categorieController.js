import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

/**
 * @desc    Obtenir toutes les catégories
 * @route   GET /api/categories
 * @access  Private
 */
export const getCategories = async (req, res) => {
  try {
    const { type } = req.query
    
    let where = {}
    if (type) where.type = type
    
    const categories = await prisma.categorie.findMany({
      where,
      include: {
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { type: 'asc' }
    })
    
    res.json({ success: true, data: categories })
  } catch (error) {
    logger.error('Erreur getCategories:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Obtenir une catégorie par ID
 * @route   GET /api/categories/:id
 * @access  Private
 */
export const getCategorieById = async (req, res) => {
  try {
    const { id } = req.params
    
    const categorie = await prisma.categorie.findUnique({
      where: { id },
      include: {
        transactions: {
          take: 10,
          orderBy: { dateTransaction: 'desc' }
        }
      }
    })
    
    if (!categorie) {
      return res.status(404).json({ message: 'Catégorie non trouvée' })
    }
    
    res.json({ success: true, data: categorie })
  } catch (error) {
    logger.error('Erreur getCategorieById:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Créer une catégorie
 * @route   POST /api/categories
 * @access  Private (Tresorier, Admin)
 */
export const createCategorie = async (req, res) => {
  try {
    const { nom, type, description } = req.body
    
    if (!nom || !type) {
      return res.status(400).json({ message: 'Nom et type sont requis' })
    }
    
    if (!['entree', 'sortie'].includes(type)) {
      return res.status(400).json({ message: 'Type doit être "entree" ou "sortie"' })
    }
    
    const categorie = await prisma.categorie.create({
      data: {
        nom,
        type,
        description
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'CREATE',
        tableName: 'categories',
        recordId: categorie.id,
        details: { nom, type },
        ipAddress: req.ip
      }
    })
    
    logger.info(`📂 Catégorie créée: ${nom} (${type}) par ${req.user.email}`)
    res.status(201).json({ success: true, data: categorie, message: 'Catégorie créée avec succès' })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Cette catégorie existe déjà pour ce type' })
    }
    logger.error('Erreur createCategorie:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Modifier une catégorie
 * @route   PUT /api/categories/:id
 * @access  Private (Tresorier, Admin)
 */
export const updateCategorie = async (req, res) => {
  try {
    const { id } = req.params
    const { nom, description } = req.body
    
    const categorieExistant = await prisma.categorie.findUnique({
      where: { id }
    })
    
    if (!categorieExistant) {
      return res.status(404).json({ message: 'Catégorie non trouvée' })
    }
    
    const categorie = await prisma.categorie.update({
      where: { id },
      data: {
        nom: nom || categorieExistant.nom,
        description: description !== undefined ? description : categorieExistant.description
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'UPDATE',
        tableName: 'categories',
        recordId: id,
        details: { modifications: req.body },
        ipAddress: req.ip
      }
    })
    
    logger.info(`✏️ Catégorie modifiée: ${id} par ${req.user.email}`)
    res.json({ success: true, data: categorie, message: 'Catégorie modifiée avec succès' })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ce nom existe déjà pour ce type' })
    }
    logger.error('Erreur updateCategorie:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Supprimer une catégorie
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin seulement)
 */
export const deleteCategorie = async (req, res) => {
  try {
    const { id } = req.params
    
    if (req.user.role !== 'administrateur') {
      return res.status(403).json({ message: 'Seul l\'administrateur peut supprimer une catégorie' })
    }
    
    const transactions = await prisma.transaction.count({
      where: { categorieId: id }
    })
    
    if (transactions > 0) {
      return res.status(400).json({ 
        message: `Cette catégorie est utilisée dans ${transactions} transaction(s). Impossible de la supprimer.` 
      })
    }
    
    await prisma.categorie.delete({ where: { id } })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'DELETE',
        tableName: 'categories',
        recordId: id,
        ipAddress: req.ip
      }
    })
    
    logger.info(`🗑️ Catégorie supprimée: ${id} par ${req.user.email}`)
    res.json({ success: true, message: 'Catégorie supprimée avec succès' })
  } catch (error) {
    logger.error('Erreur deleteCategorie:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}