// backend/src/controllers/transactionController.js
import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

// Taux de change par défaut (1 USD = 2250 CDF)
const DEFAULT_TX_RATE = 2250

// ✅ Fonction pour normaliser la devise
const normalizeDevise = (devise) => {
  if (!devise) return 'CDF'
  const normalized = String(devise).toUpperCase().trim()
  return normalized === 'USD' ? 'USD' : 'CDF'
}

// ✅ Fonction pour extraire la devise de différentes sources
const extractDevise = (body) => {
  const possibleFields = ['devise', 'currency', 'deviseCode', 'DEVISE', 'Devise', 'currencyCode', 'deviseValue']
  
  for (const field of possibleFields) {
    if (body[field] !== undefined && body[field] !== null) {
      const value = String(body[field]).toUpperCase().trim()
      if (value === 'USD' || value === 'CDF') {
        console.log(`💵 Devise trouvée dans le champ "${field}": ${value}`)
        return value
      }
    }
  }
  
  console.log('💵 Aucune devise trouvée, utilisation de la valeur par défaut: CDF')
  return 'CDF'
}

// ✅ Fonction pour normaliser le type
const normalizeType = (type) => {
  if (!type) return null
  const normalized = String(type).toLowerCase().trim()
  if (['entree', 'revenu', 'revenue', 'income'].includes(normalized)) return 'entree'
  if (['sortie', 'depense', 'expense', 'outcome'].includes(normalized)) return 'sortie'
  return normalized
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
    if (devise) where.devise = normalizeDevise(devise)
    if (dateDebut || dateFin) {
      where.dateTransaction = {}
      if (dateDebut) where.dateTransaction.gte = new Date(dateDebut)
      if (dateFin) where.dateTransaction.lte = new Date(dateFin)
    }
    
    console.log('🔍 Where clause:', where)
    
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: {
          id: true,
          type: true,
          categorieId: true,
          membreId: true,
          montant: true,
          devise: true,        // ✅ AJOUTÉ
          montantCdf: true,    // ✅ AJOUTÉ
          montantUsd: true,    // ✅ AJOUTÉ
          tauxChange: true,    // ✅ AJOUTÉ
          dateTransaction: true,
          description: true,
          justificatif: true,
          createdBy: true,
          createdAt: true,
          categorie: {
            select: {
              id: true,
              nom: true,
              type: true,
              description: true,
              createdAt: true
            }
          },
          membre: {
            select: { 
              id: true,
              nom: true, 
              prenom: true 
            }
          },
          createur: {
            select: { 
              id: true,
              email: true 
            }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { dateTransaction: 'desc' }
      }),
      prisma.transaction.count({ where })
    ])
    
    console.log(`📊 ${transactions.length} transactions trouvées`)
    
    if (transactions.length > 0) {
      const devises = [...new Set(transactions.map(t => t.devise || 'NULL'))]
      console.log('💵 Devises présentes:', devises)
      console.log('📋 Première transaction:', {
        id: transactions[0].id,
        type: transactions[0].type,
        montant: String(transactions[0].montant),
        devise: transactions[0].devise,
        date: transactions[0].dateTransaction
      })
    }
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('❌ Erreur getTransactions:', error)
    logger.error('Erreur getTransactions:', error)
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    })
  }
}

/**
 * @desc    Rapport financier avec gestion des devises
 * @route   GET /api/transactions/report/summary
 * @access  Private (Pasteur, Tresorier, Admin)
 */
export const getFinancialReport = async (req, res) => {
  try {
    const { periode = 'all', dateDebut, dateFin } = req.query
    
    console.log('📊 RAPPORT - Paramètres reçus:', { periode, dateDebut, dateFin })
    
    let startDate, endDate
    
    if (dateDebut && dateFin) {
      startDate = new Date(dateDebut)
      endDate = new Date(dateFin)
    } else {
      if (periode === 'all' || !periode) {
        const firstTransaction = await prisma.transaction.findFirst({
          orderBy: { dateTransaction: 'asc' },
          select: { dateTransaction: true }
        })
        
        if (firstTransaction) {
          startDate = new Date(firstTransaction.dateTransaction)
          startDate.setMonth(0, 1)
          startDate.setHours(0, 0, 0, 0)
        } else {
          startDate = new Date()
          startDate.setFullYear(startDate.getFullYear() - 2)
          startDate.setMonth(0, 1)
          startDate.setHours(0, 0, 0, 0)
        }
        
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        
        console.log('📊 Période "all":', { startDate, endDate })
      } else {
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        
        switch (periode) {
          case 'week':
            startDate.setDate(startDate.getDate() - 7)
            break
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1)
            break
          case 'year':
          default:
            startDate.setFullYear(startDate.getFullYear() - 1)
            break
        }
      }
    }
    
    console.log('📊 Période calculée:', { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString()
    })
    
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
      },
      orderBy: { dateTransaction: 'desc' }
    })
    
    console.log(`📊 Total transactions trouvées: ${transactions.length}`)
    
    const statsParDevise = {
      USD: { entrees: 0, sorties: 0, solde: 0, nombre: 0 },
      CDF: { entrees: 0, sorties: 0, solde: 0, nombre: 0 }
    }
    
    let totalEntreesUSD = 0
    let totalSortiesUSD = 0
    let totalEntreesCDF = 0
    let totalSortiesCDF = 0
    
    for (const t of transactions) {
      const devise = normalizeDevise(t.devise)
      const montant = parseFloat(t.montant) || 0
      const type = normalizeType(t.type)
      
      console.log(`💰 ${t.type} -> ${type} - ${montant} ${devise}`)
      
      if (type === 'entree') {
        statsParDevise[devise].entrees += montant
        statsParDevise[devise].nombre++
        if (devise === 'USD') {
          totalEntreesUSD += montant
        } else {
          totalEntreesCDF += montant
        }
      } else if (type === 'sortie') {
        statsParDevise[devise].sorties += montant
        if (devise === 'USD') {
          totalSortiesUSD += montant
        } else {
          totalSortiesCDF += montant
        }
      }
    }
    
    statsParDevise.USD.solde = statsParDevise.USD.entrees - statsParDevise.USD.sorties
    statsParDevise.CDF.solde = statsParDevise.CDF.entrees - statsParDevise.CDF.sorties
    
    console.log('📊 Stats USD:', statsParDevise.USD)
    console.log('📊 Stats CDF:', statsParDevise.CDF)
    
    const totalEntreesCDFEquivalent = totalEntreesCDF + (totalEntreesUSD * DEFAULT_TX_RATE)
    const totalSortiesCDFEquivalent = totalSortiesCDF + (totalSortiesUSD * DEFAULT_TX_RATE)
    
    const entreesParCategorie = {}
    const sortiesParCategorie = {}
    
    for (const t of transactions) {
      const catName = t.categorie?.nom || 'Sans catégorie'
      const devise = normalizeDevise(t.devise)
      let montant = parseFloat(t.montant) || 0
      const type = normalizeType(t.type)
      
      if (devise === 'USD') {
        montant = montant * DEFAULT_TX_RATE
      }
      
      if (type === 'entree') {
        entreesParCategorie[catName] = (entreesParCategorie[catName] || 0) + montant
      } else if (type === 'sortie') {
        sortiesParCategorie[catName] = (sortiesParCategorie[catName] || 0) + montant
      }
    }
    
    const evolutionMensuelle = []
    const moisTransactions = {}
    
    for (const t of transactions) {
      const date = new Date(t.dateTransaction)
      const moisKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const moisLabel = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
      const devise = normalizeDevise(t.devise)
      let montant = parseFloat(t.montant) || 0
      const type = normalizeType(t.type)
      
      if (devise === 'USD') {
        montant = montant * DEFAULT_TX_RATE
      }
      
      if (!moisTransactions[moisKey]) {
        moisTransactions[moisKey] = { mois: moisLabel, entrees: 0, sorties: 0 }
      }
      
      if (type === 'entree') {
        moisTransactions[moisKey].entrees += montant
      } else if (type === 'sortie') {
        moisTransactions[moisKey].sorties += montant
      }
    }
    
    for (const key in moisTransactions) {
      evolutionMensuelle.push(moisTransactions[key])
    }
    evolutionMensuelle.sort((a, b) => {
      const moisOrder = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
      const moisA = a.mois.split(' ')[0]
      const moisB = b.mois.split(' ')[0]
      return moisOrder.indexOf(moisA) - moisOrder.indexOf(moisB)
    })
    
    const responseData = {
      periode: { 
        debut: startDate, 
        fin: endDate, 
        libelle: periode 
      },
      tauxChange: DEFAULT_TX_RATE,
      statsParDevise,
      total: {
        entrees: totalEntreesCDFEquivalent,
        sorties: totalSortiesCDFEquivalent,
        solde: totalEntreesCDFEquivalent - totalSortiesCDFEquivalent,
        parDevise: {
          USD: {
            entrees: totalEntreesUSD,
            sorties: totalSortiesUSD,
            solde: totalEntreesUSD - totalSortiesUSD
          },
          CDF: {
            entrees: totalEntreesCDF,
            sorties: totalSortiesCDF,
            solde: totalEntreesCDF - totalSortiesCDF
          }
        }
      },
      entreesParCategorie,
      sortiesParCategorie,
      evolutionMensuelle,
      nombreTransactions: {
        entrees: transactions.filter(t => normalizeType(t.type) === 'entree').length,
        sorties: transactions.filter(t => normalizeType(t.type) === 'sortie').length,
        total: transactions.length,
        parDevise: {
          USD: statsParDevise.USD.nombre,
          CDF: statsParDevise.CDF.nombre
        }
      },
      transactions: transactions
    }
    
    console.log('📊 Rapport généré avec succès')
    console.log(`📊 Total transactions dans le rapport: ${transactions.length}`)
    
    res.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('❌ Erreur getFinancialReport:', error)
    logger.error('Erreur getFinancialReport:', error)
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur', 
      error: error.message 
    })
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
      return res.status(404).json({ 
        success: false,
        message: 'Transaction non trouvée' 
      })
    }
    
    res.json({ success: true, data: transaction })
  } catch (error) {
    logger.error('Erreur getTransactionById:', error)
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    })
  }
}

/**
 * @desc    Créer une transaction (entrée ou sortie)
 * @route   POST /api/transactions
 * @access  Private (Tresorier, Admin)
 */
export const createTransaction = async (req, res) => {
  try {
    console.log('💰 Création d\'une transaction - Body reçu:', req.body)
    console.log('📦 Body keys:', Object.keys(req.body))
    console.log('📦 Body raw:', JSON.stringify(req.body, null, 2))
    
    const { type, categorieId, membreId, montant, dateTransaction, description, justificatif } = req.body
    
    const devise = extractDevise(req.body)
    
    console.log('💵 Devise extraite:', devise)
    console.log('💵 Devise originale (req.body.devise):', req.body.devise)
    console.log('💵 Type de devise originale:', typeof req.body.devise)
    
    const errors = []
    
    if (!type) {
      errors.push({ field: 'type', message: 'Le type est requis' })
    }
    
    if (!categorieId) {
      errors.push({ field: 'categorieId', message: 'La catégorie est requise' })
    }
    
    if (!montant) {
      errors.push({ field: 'montant', message: 'Le montant est requis' })
    }
    
    if (errors.length > 0) {
      console.log('❌ Erreurs de validation:', errors)
      return res.status(400).json({ 
        success: false,
        message: 'Erreur de validation des données.',
        errors
      })
    }
    
    const normalizedType = normalizeType(type)
    console.log(`📝 Type normalisé: ${type} -> ${normalizedType}`)
    
    if (!normalizedType || !['entree', 'sortie'].includes(normalizedType)) {
      console.log(`❌ Type invalide: ${type}`)
      return res.status(400).json({ 
        success: false,
        message: 'Type invalide. Utilisez entree ou sortie' 
      })
    }
    
    if (normalizedType === 'entree' && !membreId) {
      console.log('❌ Membre manquant pour une entrée')
      return res.status(400).json({ 
        success: false,
        message: 'Pour une entrée, le membre est requis' 
      })
    }
    
    const montantNum = parseFloat(montant)
    if (isNaN(montantNum) || montantNum <= 0) {
      console.log(`❌ Montant invalide: ${montant}`)
      return res.status(400).json({ 
        success: false,
        message: 'Le montant doit être un nombre supérieur à 0' 
      })
    }
    
    console.log(`🔍 Recherche de la catégorie: ${categorieId}`)
    const categorie = await prisma.categorie.findUnique({
      where: { id: categorieId }
    })
    
    if (!categorie) {
      console.log(`❌ Catégorie non trouvée: ${categorieId}`)
      return res.status(404).json({ 
        success: false,
        message: 'Catégorie non trouvée' 
      })
    }
    
    console.log(`📂 Catégorie trouvée: ${categorie.nom} (${categorie.type})`)
    
    const categorieType = normalizeType(categorie.type)
    console.log(`📝 Type catégorie normalisé: ${categorie.type} -> ${categorieType}`)
    
    let isValidCategory = false
    
    if (normalizedType === 'entree' && categorieType === 'entree') {
      isValidCategory = true
    } else if (normalizedType === 'sortie' && categorieType === 'sortie') {
      isValidCategory = true
    }
    
    if (!isValidCategory) {
      console.log(`❌ Type de catégorie incorrect: ${categorie.type} pour ${normalizedType}`)
      return res.status(400).json({ 
        success: false,
        message: `Cette catégorie est de type "${categorie.type}" mais vous essayez de créer une ${normalizedType}.` 
      })
    }
    
    const tauxChange = DEFAULT_TX_RATE
    const montantUSD = devise === 'USD' ? montantNum : montantNum / tauxChange
    const montantCDF = devise === 'CDF' ? montantNum : montantNum * tauxChange
    
    console.log(`💰 Montant: ${montantNum} ${devise} (USD: ${montantUSD}, CDF: ${montantCDF})`)
    
    const transactionData = {
      type: normalizedType,
      categorieId: categorieId,
      membreId: membreId || null,
      montant: montantNum,
      devise: devise,
      tauxChange: tauxChange,
      montantUsd: montantUSD,
      montantCdf: montantCDF,
      dateTransaction: dateTransaction ? new Date(dateTransaction) : new Date(),
      description: description || null,
      justificatif: justificatif || null,
      createdBy: req.user?.id || null
    }
    
    console.log('📝 Données de la transaction à créer:', transactionData)
    
    const transaction = await prisma.transaction.create({
      data: transactionData,
      include: {
        categorie: true,
        membre: {
          select: { nom: true, prenom: true }
        }
      }
    })
    
    console.log(`✅ Transaction créée avec succès: ${transaction.id}`)
    
    try {
      await prisma.logActivite.create({
        data: {
          utilisateurId: req.user?.id || null,
          action: 'CREATE',
          tableName: 'transactions',
          recordId: transaction.id,
          details: { 
            type: normalizedType, 
            montant: montantNum, 
            devise: devise, 
            description: description || null 
          },
          ipAddress: req.ip || null
        }
      })
    } catch (logError) {
      console.warn('⚠️ Erreur lors de la création du log:', logError.message)
    }
    
    logger.info(`💰 ${normalizedType === 'entree' ? 'Entrée' : 'Sortie'} créée: ${montantNum} ${devise} par ${req.user?.email || 'Système'}`)
    
    res.status(201).json({ 
      success: true, 
      data: transaction, 
      message: 'Transaction enregistrée avec succès' 
    })
    
  } catch (error) {
    console.error('❌ Erreur createTransaction:', error)
    console.error('❌ Stack:', error.stack)
    logger.error('Erreur createTransaction:', error)
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Une transaction avec ces informations existe déjà'
      })
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Ressource associée non trouvée'
      })
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur', 
      error: error.message 
    })
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
    
    console.log(`✏️ Modification de la transaction: ${id}`)
    console.log('📦 Body reçu:', req.body)
    
    const transactionExistant = await prisma.transaction.findUnique({
      where: { id }
    })
    
    if (!transactionExistant) {
      return res.status(404).json({ 
        success: false,
        message: 'Transaction non trouvée' 
      })
    }
    
    let normalizedType = null
    if (type) {
      normalizedType = normalizeType(type)
      if (!normalizedType || !['entree', 'sortie'].includes(normalizedType)) {
        return res.status(400).json({ 
          success: false,
          message: 'Type invalide. Utilisez entree ou sortie' 
        })
      }
    }
    
    if (categorieId) {
      const categorie = await prisma.categorie.findUnique({
        where: { id: categorieId }
      })
      
      if (!categorie) {
        return res.status(404).json({ 
          success: false,
          message: 'Catégorie non trouvée' 
        })
      }
      
      const finalType = normalizedType || transactionExistant.type
      const categorieType = normalizeType(categorie.type)
      
      let isValidCategory = false
      if (finalType === 'entree' && categorieType === 'entree') {
        isValidCategory = true
      } else if (finalType === 'sortie' && categorieType === 'sortie') {
        isValidCategory = true
      }
      
      if (!isValidCategory) {
        return res.status(400).json({ 
          success: false,
          message: `Cette catégorie est de type "${categorie.type}" mais vous essayez de créer une ${finalType}.` 
        })
      }
    }
    
    let newDevise = transactionExistant.devise
    if (devise) {
      newDevise = normalizeDevise(devise)
      if (!newDevise || !['USD', 'CDF'].includes(newDevise)) {
        return res.status(400).json({
          success: false,
          message: 'Devise invalide. Utilisez USD ou CDF'
        })
      }
    }
    
    const newMontant = montant ? parseFloat(montant) : transactionExistant.montant
    const tauxChange = DEFAULT_TX_RATE
    
    const montantUSD = newDevise === 'USD' ? newMontant : newMontant / tauxChange
    const montantCDF = newDevise === 'CDF' ? newMontant : newMontant * tauxChange
    
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        type: normalizedType || transactionExistant.type,
        categorieId: categorieId || transactionExistant.categorieId,
        membreId: membreId !== undefined ? membreId : transactionExistant.membreId,
        montant: newMontant,
        devise: newDevise,
        tauxChange: tauxChange,
        montantUsd: montantUSD,
        montantCdf: montantCDF,
        dateTransaction: dateTransaction ? new Date(dateTransaction) : transactionExistant.dateTransaction,
        description: description !== undefined ? description : transactionExistant.description,
        justificatif: justificatif !== undefined ? justificatif : transactionExistant.justificatif
      },
      include: {
        categorie: true,
        membre: true
      }
    })
    
    console.log(`✅ Transaction modifiée: ${id}`)
    
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
    res.json({ 
      success: true, 
      data: transaction, 
      message: 'Transaction modifiée avec succès' 
    })
  } catch (error) {
    console.error('❌ Erreur updateTransaction:', error)
    logger.error('Erreur updateTransaction:', error)
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    })
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
    
    console.log(`🗑️ Suppression de la transaction: ${id}`)
    
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    })
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: 'Transaction non trouvée' 
      })
    }
    
    await prisma.transaction.delete({ where: { id } })
    
    console.log(`✅ Transaction supprimée: ${id}`)
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'DELETE',
        tableName: 'transactions',
        recordId: id,
        details: { 
          montant: String(transaction.montant), 
          type: transaction.type, 
          devise: transaction.devise 
        },
        ipAddress: req.ip
      }
    })
    
    logger.info(`🗑️ Transaction supprimée: ${id} par ${req.user.email}`)
    res.json({ 
      success: true, 
      message: 'Transaction supprimée avec succès' 
    })
  } catch (error) {
    console.error('❌ Erreur deleteTransaction:', error)
    logger.error('Erreur deleteTransaction:', error)
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    })
  }
}