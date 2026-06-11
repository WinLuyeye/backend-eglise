import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

// Taux de change par défaut (1 USD = 2250 CDF)
const DEFAULT_TX_RATE = 2250

// Fonction pour convertir les montants
const convertirMontant = (montant, deviseSource, deviseCible, tauxChange = DEFAULT_TX_RATE) => {
  if (deviseSource === deviseCible) return montant
  
  if (deviseSource === 'USD' && deviseCible === 'CDF') {
    return montant * tauxChange
  } else if (deviseSource === 'CDF' && deviseCible === 'USD') {
    return montant / tauxChange
  }
  return montant
}

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
      membreId,
      devise
    } = req.query
    const skip = (page - 1) * limit
    
    let where = {}
    if (type) where.type = type
    if (categorieId) where.categorieId = categorieId
    if (membreId) where.membreId = membreId
    if (devise) where.devise = devise
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
    
    // Calculer les totaux par devise
    const totalsByDevise = await prisma.transaction.groupBy({
      by: ['devise'],
      where,
      _sum: { montant: true }
    })
    
    res.json({
      success: true,
      data: transactions,
      totals: {
        parDevise: totalsByDevise
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
    const { type, categorieId, membreId, montant, devise, dateTransaction, description, justificatif } = req.body
    
    if (!type || !categorieId || !montant || !devise) {
      return res.status(400).json({ message: 'Type, catégorie, montant et devise sont requis' })
    }
    
    if (type === 'entree' && !membreId) {
      return res.status(400).json({ message: 'Pour une entrée, le membre est requis' })
    }
    
    if (montant <= 0) {
      return res.status(400).json({ message: 'Le montant doit être supérieur à 0' })
    }
    
    if (!['USD', 'CDF'].includes(devise)) {
      return res.status(400).json({ message: 'Devise invalide. Utilisez USD ou CDF' })
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
    
    // Calculer les montants convertis
    const tauxChange = DEFAULT_TX_RATE
    const montantUSD = devise === 'USD' ? montant : convertirMontant(montant, 'CDF', 'USD', tauxChange)
    const montantCDF = devise === 'CDF' ? montant : convertirMontant(montant, 'USD', 'CDF', tauxChange)
    
    const transaction = await prisma.transaction.create({
      data: {
        type,
        categorieId,
        membreId: membreId || null,
        montant: parseFloat(montant),
        devise,
        tauxChange,
        montantUSD,
        montantCDF,
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
        details: { type, montant, devise, description },
        ipAddress: req.ip
      }
    })
    
    logger.info(`💰 ${type === 'entree' ? 'Entrée' : 'Sortie'} créée: ${montant} ${devise} par ${req.user.email}`)
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
    const { type, categorieId, membreId, montant, devise, dateTransaction, description, justificatif } = req.body
    
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
    
    // Recalculer les montants convertis si devise ou montant change
    let montantUSD = transactionExistant.montantUSD
    let montantCDF = transactionExistant.montantCDF
    let newDevise = devise || transactionExistant.devise
    let newMontant = montant ? parseFloat(montant) : transactionExistant.montant
    
    if (devise !== transactionExistant.devise || montant) {
      const tauxChange = DEFAULT_TX_RATE
      if (newDevise === 'USD') {
        montantUSD = newMontant
        montantCDF = convertirMontant(newMontant, 'USD', 'CDF', tauxChange)
      } else {
        montantUSD = convertirMontant(newMontant, 'CDF', 'USD', tauxChange)
        montantCDF = newMontant
      }
    }
    
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        type: type || transactionExistant.type,
        categorieId: categorieId || transactionExistant.categorieId,
        membreId: membreId !== undefined ? membreId : transactionExistant.membreId,
        montant: newMontant,
        devise: newDevise,
        tauxChange: DEFAULT_TX_RATE,
        montantUSD,
        montantCDF,
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
        details: { montant: transaction.montant, type: transaction.type, devise: transaction.devise },
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
 * @desc    Rapport financier avec gestion des devises
 * @route   GET /api/transactions/report/summary
 * @access  Private (Pasteur, Tresorier, Admin)
 */
export const getFinancialReport = async (req, res) => {
  try {
    const { periode = 'year', dateDebut, dateFin } = req.query
    
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
          startDate.setFullYear(startDate.getFullYear() - 1)
      }
    }
    
    console.log('📊 RAPPORT - Période:', { startDate, endDate, periode })
    
    // Récupérer TOUTES les transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        dateTransaction: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        categorie: true,
        membre: {
          select: { nom: true, prenom: true }
        }
      }
    })
    
    console.log(`📊 Total transactions: ${transactions.length}`)
    
    // Initialiser les statistiques par devise
    const statsParDevise = {
      USD: { entrees: 0, sorties: 0, solde: 0, nombre: 0 },
      CDF: { entrees: 0, sorties: 0, solde: 0, nombre: 0 }
    }
    
    // Parcourir TOUTES les transactions
    for (const t of transactions) {
      const devise = t.devise || 'CDF'
      const montant = parseFloat(t.montant)
      
      if (t.type === 'entree') {
        statsParDevise[devise].entrees += montant
        statsParDevise[devise].nombre++
      } else {
        statsParDevise[devise].sorties += montant
      }
    }
    
    // Calculer les soldes
    statsParDevise.USD.solde = statsParDevise.USD.entrees - statsParDevise.USD.sorties
    statsParDevise.CDF.solde = statsParDevise.CDF.entrees - statsParDevise.CDF.sorties
    
    console.log('📊 Stats USD:', statsParDevise.USD)
    console.log('📊 Stats CDF:', statsParDevise.CDF)
    
    // Calculer les totaux en CDF (pour le résumé global)
    let totalEntreesCDF = statsParDevise.CDF.entrees + (statsParDevise.USD.entrees * DEFAULT_TX_RATE)
    let totalSortiesCDF = statsParDevise.CDF.sorties + (statsParDevise.USD.sorties * DEFAULT_TX_RATE)
    
    // Calculer les totaux par catégorie (en CDF)
    const entreesParCategorie = {}
    const sortiesParCategorie = {}
    
    for (const t of transactions) {
      const catName = t.categorie?.nom || 'Sans catégorie'
      let montant = parseFloat(t.montant)
      
      // Convertir en CDF pour l'affichage
      if (t.devise === 'USD') {
        montant = montant * DEFAULT_TX_RATE
      }
      
      if (t.type === 'entree') {
        entreesParCategorie[catName] = (entreesParCategorie[catName] || 0) + montant
      } else {
        sortiesParCategorie[catName] = (sortiesParCategorie[catName] || 0) + montant
      }
    }
    
    // Données pour l'évolution mensuelle (en CDF)
    const evolutionMensuelle = []
    const moisTransactions = {}
    
    for (const t of transactions) {
      const date = new Date(t.dateTransaction)
      const moisKey = `${date.getFullYear()}-${date.getMonth() + 1}`
      const moisLabel = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
      let montant = parseFloat(t.montant)
      
      if (t.devise === 'USD') {
        montant = montant * DEFAULT_TX_RATE
      }
      
      if (!moisTransactions[moisKey]) {
        moisTransactions[moisKey] = { mois: moisLabel, entrees: 0, sorties: 0 }
      }
      
      if (t.type === 'entree') {
        moisTransactions[moisKey].entrees += montant
      } else {
        moisTransactions[moisKey].sorties += montant
      }
    }
    
    for (const key in moisTransactions) {
      evolutionMensuelle.push(moisTransactions[key])
    }
    evolutionMensuelle.sort((a, b) => {
      const moisOrder = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
      return moisOrder.indexOf(a.mois.split(' ')[0]) - moisOrder.indexOf(b.mois.split(' ')[0])
    })
    
    res.json({
      success: true,
      data: {
        periode: { debut: startDate, fin: endDate },
        tauxChange: DEFAULT_TX_RATE,
        statsParDevise,
        total: {
          entrees: totalEntreesCDF,
          sorties: totalSortiesCDF,
          solde: totalEntreesCDF - totalSortiesCDF
        },
        entreesParCategorie,
        sortiesParCategorie,
        evolutionMensuelle,
        nombreTransactions: {
          entrees: transactions.filter(t => t.type === 'entree').length,
          sorties: transactions.filter(t => t.type === 'sortie').length,
          parDevise: {
            USD: statsParDevise.USD.nombre,
            CDF: statsParDevise.CDF.nombre
          }
        }
      }
    })
  } catch (error) {
    console.error('❌ Erreur getFinancialReport:', error)
    logger.error('Erreur getFinancialReport:', error)
    res.status(500).json({ message: 'Erreur interne du serveur', error: error.message })
  }
}