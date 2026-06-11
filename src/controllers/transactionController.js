import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

/**
 * @desc    Obtenir toutes les transactions
 * @route   GET /api/transactions
 * @access  Private (Pasteur, Tresorier, Admin)
 */
export const getTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      categorieId, 
      dateDebut, 
      dateFin,
      membreId 
    } = req.query
    const skip = (page - 1) * limit
    
    let where = {}
    if (type) where.type = type
    if (categorieId) where.categorieId = categorieId
    if (membreId) where.membreId = membreId
    if (dateDebut || dateFin) {
      where.dateTransaction = {}
      if (dateDebut) where.dateTransaction.gte = new Date(dateDebut)
      if (dateFin) where.dateTransaction.lte = new Date(dateFin)
    }
    
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          categorie: true,
          membre: {
            select: { nom: true, prenom: true }
          },
          createur: {
            select: { email: true }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { dateTransaction: 'desc' }
      }),
      prisma.transaction.count({ where })
    ])
    
    // Calculer les totaux
    const totals = await prisma.transaction.aggregate({
      where,
      _sum: { montant: true }
    })
    
    res.json({
      success: true,
      data: transactions,
      totals: {
        totalEntrees: type === 'entree' || !type ? totals._sum.montant : null,
        totalSorties: type === 'sortie' || !type ? totals._sum.montant : null
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Erreur getTransactions:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Obtenir une transaction par ID
 * @route   GET /api/transactions/:id
 * @access  Private
 */
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params
    
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        categorie: true,
        membre: {
          select: { nom: true, prenom: true, telephone: true }
        },
        createur: {
          select: { email: true }
        }
      }
    })
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction non trouvée' })
    }
    
    res.json({ success: true, data: transaction })
  } catch (error) {
    logger.error('Erreur getTransactionById:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Créer une transaction (entrée ou sortie)
 * @route   POST /api/transactions
 * @access  Private (Tresorier, Admin)
 */
export const createTransaction = async (req, res) => {
  try {
    const { type, categorieId, membreId, montant, dateTransaction, description, justificatif } = req.body
    
    if (!type || !categorieId || !montant) {
      return res.status(400).json({ message: 'Type, catégorie et montant sont requis' })
    }
    
    if (type === 'entree' && !membreId) {
      return res.status(400).json({ message: 'Pour une entrée, le membre est requis' })
    }
    
    if (montant <= 0) {
      return res.status(400).json({ message: 'Le montant doit être supérieur à 0' })
    }
    
    // Vérifier que la catégorie existe et correspond au type
    const categorie = await prisma.categorie.findUnique({
      where: { id: categorieId }
    })
    
    if (!categorie) {
      return res.status(404).json({ message: 'Catégorie non trouvée' })
    }
    
    if (categorie.type !== type) {
      return res.status(400).json({ 
        message: `Cette catégorie est de type "${categorie.type}" mais vous essayez de créer une ${type}. Veuillez utiliser une catégorie de type "${type}".` 
      })
    }
    
    const transaction = await prisma.transaction.create({
      data: {
        type,
        categorieId,
        membreId: membreId || null,
        montant: parseFloat(montant),
        dateTransaction: dateTransaction ? new Date(dateTransaction) : new Date(),
        description,
        justificatif,
        createdBy: req.user.id
      },
      include: {
        categorie: true,
        membre: {
          select: { nom: true, prenom: true }
        }
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'CREATE',
        tableName: 'transactions',
        recordId: transaction.id,
        details: { type, montant, description },
        ipAddress: req.ip
      }
    })
    
    logger.info(`💰 ${type === 'entree' ? 'Entrée' : 'Sortie'} créée: ${montant} FCFA par ${req.user.email}`)
    res.status(201).json({ success: true, data: transaction, message: 'Transaction enregistrée avec succès' })
  } catch (error) {
    logger.error('Erreur createTransaction:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Modifier une transaction
 * @route   PUT /api/transactions/:id
 * @access  Private (Tresorier, Admin)
 */
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params
    const { type, categorieId, membreId, montant, dateTransaction, description, justificatif } = req.body
    
    const transactionExistant = await prisma.transaction.findUnique({
      where: { id }
    })
    
    if (!transactionExistant) {
      return res.status(404).json({ message: 'Transaction non trouvée' })
    }
    
    if (categorieId) {
      const categorie = await prisma.categorie.findUnique({
        where: { id: categorieId }
      })
      if (categorie && categorie.type !== (type || transactionExistant.type)) {
        return res.status(400).json({ message: 'La catégorie ne correspond pas au type de transaction' })
      }
    }
    
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        type: type || transactionExistant.type,
        categorieId: categorieId || transactionExistant.categorieId,
        membreId: membreId !== undefined ? membreId : transactionExistant.membreId,
        montant: montant ? parseFloat(montant) : transactionExistant.montant,
        dateTransaction: dateTransaction ? new Date(dateTransaction) : transactionExistant.dateTransaction,
        description: description !== undefined ? description : transactionExistant.description,
        justificatif: justificatif !== undefined ? justificatif : transactionExistant.justificatif
      },
      include: {
        categorie: true,
        membre: true
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'UPDATE',
        tableName: 'transactions',
        recordId: id,
        details: { modifications: req.body },
        ipAddress: req.ip
      }
    })
    
    logger.info(`✏️ Transaction modifiée: ${id} par ${req.user.email}`)
    res.json({ success: true, data: transaction, message: 'Transaction modifiée avec succès' })
  } catch (error) {
    logger.error('Erreur updateTransaction:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Supprimer une transaction
 * @route   DELETE /api/transactions/:id
 * @access  Private (Tresorier, Admin)
 */
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params
    
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    })
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction non trouvée' })
    }
    
    await prisma.transaction.delete({ where: { id } })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'DELETE',
        tableName: 'transactions',
        recordId: id,
        details: { montant: transaction.montant, type: transaction.type },
        ipAddress: req.ip
      }
    })
    
    logger.info(`🗑️ Transaction supprimée: ${id} par ${req.user.email}`)
    res.json({ success: true, message: 'Transaction supprimée avec succès' })
  } catch (error) {
    logger.error('Erreur deleteTransaction:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Rapport financier
 * @route   GET /api/transactions/report/summary
 * @access  Private (Pasteur, Tresorier, Admin)
 */
export const getFinancialReport = async (req, res) => {
  try {
    const { periode = 'month', dateDebut, dateFin } = req.query
    
    let startDate, endDate
    
    if (dateDebut && dateFin) {
      startDate = new Date(dateDebut)
      endDate = new Date(dateFin)
    } else {
      endDate = new Date()
      startDate = new Date()
      
      switch (periode) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
        default:
          startDate.setMonth(startDate.getMonth() - 1)
      }
    }
    
    const transactions = await prisma.transaction.findMany({
      where: {
        dateTransaction: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        categorie: true
      }
    })
    
    const entrees = transactions.filter(t => t.type === 'entree')
    const sorties = transactions.filter(t => t.type === 'sortie')
    
    const totalEntrees = entrees.reduce((sum, t) => sum + parseFloat(t.montant), 0)
    const totalSorties = sorties.reduce((sum, t) => sum + parseFloat(t.montant), 0)
    const solde = totalEntrees - totalSorties
    
    const entreesParCategorie = {}
    entrees.forEach(t => {
      const catName = t.categorie.nom
      entreesParCategorie[catName] = (entreesParCategorie[catName] || 0) + parseFloat(t.montant)
    })
    
    const sortiesParCategorie = {}
    sorties.forEach(t => {
      const catName = t.categorie.nom
      sortiesParCategorie[catName] = (sortiesParCategorie[catName] || 0) + parseFloat(t.montant)
    })
    
    res.json({
      success: true,
      data: {
        periode: { debut: startDate, fin: endDate },
        totalEntrees,
        totalSorties,
        solde,
        tauxCroissance: solde !== 0 ? ((solde / totalEntrees) * 100).toFixed(2) : 0,
        entreesParCategorie,
        sortiesParCategorie,
        nombreTransactions: {
          entrees: entrees.length,
          sorties: sorties.length
        }
      }
    })
  } catch (error) {
    logger.error('Erreur getFinancialReport:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}