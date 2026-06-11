import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

/**
 * @desc    Obtenir tous les membres
 * @route   GET /api/membres
 * @access  Private (Pasteur, Secretaire, Admin, Chef dept)
 */
export const getMembres = async (req, res) => {
  try {
    const { page = 1, limit = 50, statut, departementId, search } = req.query
    const skip = (page - 1) * limit
    
    let where = {}
    
    // 🔒 Chef département voit seulement son département
    if (req.user.role === 'chef_departement') {
      const membre = await prisma.membre.findUnique({
        where: { id: req.user.membreId }
      })
      
      if (!membre?.departementId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas assigné à un département' })
      }
      
      where.departementId = membre.departementId
    }
    
    // 🔒 Le secrétaire ne voit pas les administrateurs
    if (req.user.role === 'secretaire') {
      where.utilisateur = {
        NOT: {
          role: 'administrateur'
        }
      }
    }
    
    if (statut) where.statut = statut
    if (departementId && req.user.role !== 'chef_departement') where.departementId = departementId
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    const [membres, total] = await Promise.all([
      prisma.membre.findMany({
        where,
        include: {
          departement: true,
          utilisateur: {
            select: { role: true, actif: true }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { nom: 'asc' }
      }),
      prisma.membre.count({ where })
    ])
    
    res.json({
      success: true,
      data: membres,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Erreur getMembres:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Obtenir un membre par ID
 * @route   GET /api/membres/:id
 * @access  Private
 */
export const getMembreById = async (req, res) => {
  try {
    const { id } = req.params
    
    const membre = await prisma.membre.findUnique({
      where: { id },
      include: {
        departement: true,
        utilisateur: {
          select: { role: true, actif: true, email: true, dernierConnexion: true }
        },
        transactions: {
          take: 10,
          orderBy: { dateTransaction: 'desc' },
          include: { categorie: true }
        },
        responsableDe: true
      }
    })
    
    if (!membre) {
      return res.status(404).json({ message: 'Membre non trouvé' })
    }
    
    // Vérifier les permissions pour chef département
    if (req.user.role === 'chef_departement') {
      const userMembre = await prisma.membre.findUnique({
        where: { id: req.user.membreId }
      })
      if (membre.departementId !== userMembre.departementId && req.user.membreId !== id) {
        return res.status(403).json({ message: 'Accès non autorisé à ce membre' })
      }
    }
    
    // 🔒 Le secrétaire ne peut pas voir un administrateur
    if (req.user.role === 'secretaire' && membre.utilisateur?.role === 'administrateur') {
      return res.status(403).json({ message: 'Accès non autorisé' })
    }
    
    res.json({ success: true, data: membre })
  } catch (error) {
    logger.error('Erreur getMembreById:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Créer un membre
 * @route   POST /api/membres
 * @access  Private (Secretaire, Admin)
 */
export const createMembre = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, adresse, dateNaissance, departementId } = req.body
    
    if (!nom || !prenom) {
      return res.status(400).json({ message: 'Le nom et prénom sont requis' })
    }
    
    const membre = await prisma.membre.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        adresse,
        dateNaissance: dateNaissance ? new Date(dateNaissance) : null,
        departementId: departementId || null
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'CREATE',
        tableName: 'membres',
        recordId: membre.id,
        details: { nom, prenom, email },
        ipAddress: req.ip
      }
    })
    
    logger.info(`📝 Membre créé: ${nom} ${prenom} par ${req.user.email}`)
    res.status(201).json({ success: true, data: membre, message: 'Membre créé avec succès' })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }
    logger.error('Erreur createMembre:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Modifier un membre
 * @route   PUT /api/membres/:id
 * @access  Private (Secretaire, Admin)
 */
export const updateMembre = async (req, res) => {
  try {
    const { id } = req.params
    const { nom, prenom, email, telephone, adresse, dateNaissance, statut, departementId } = req.body
    
    const membreExistant = await prisma.membre.findUnique({ where: { id } })
    if (!membreExistant) {
      return res.status(404).json({ message: 'Membre non trouvé' })
    }
    
    // 🔒 Le secrétaire ne peut pas modifier un administrateur
    if (req.user.role === 'secretaire') {
      const membreWithUser = await prisma.membre.findUnique({
        where: { id },
        include: { utilisateur: true }
      })
      if (membreWithUser?.utilisateur?.role === 'administrateur') {
        return res.status(403).json({ message: 'Vous ne pouvez pas modifier un administrateur' })
      }
    }
    
    const membre = await prisma.membre.update({
      where: { id },
      data: {
        nom: nom || membreExistant.nom,
        prenom: prenom || membreExistant.prenom,
        email: email !== undefined ? email : membreExistant.email,
        telephone: telephone !== undefined ? telephone : membreExistant.telephone,
        adresse: adresse !== undefined ? adresse : membreExistant.adresse,
        dateNaissance: dateNaissance ? new Date(dateNaissance) : membreExistant.dateNaissance,
        statut: statut || membreExistant.statut,
        departementId: departementId !== undefined ? departementId : membreExistant.departementId,
        updatedAt: new Date()
      }
    })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'UPDATE',
        tableName: 'membres',
        recordId: membre.id,
        details: { modifications: req.body },
        ipAddress: req.ip
      }
    })
    
    logger.info(`✏️ Membre modifié: ${id} par ${req.user.email}`)
    res.json({ success: true, data: membre, message: 'Membre modifié avec succès' })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }
    logger.error('Erreur updateMembre:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Supprimer un membre
 * @route   DELETE /api/membres/:id
 * @access  Private (Admin seulement)
 */
export const deleteMembre = async (req, res) => {
  try {
    const { id } = req.params
    
    if (req.user.role !== 'administrateur') {
      return res.status(403).json({ message: 'Seul l\'administrateur peut supprimer un membre' })
    }
    
    // Vérifier si le membre a des transactions
    const transactions = await prisma.transaction.count({
      where: { membreId: id }
    })
    
    if (transactions > 0) {
      return res.status(400).json({ 
        message: 'Ce membre a des transactions associées. Impossible de le supprimer.' 
      })
    }
    
    await prisma.membre.delete({ where: { id } })
    
    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        action: 'DELETE',
        tableName: 'membres',
        recordId: id,
        ipAddress: req.ip
      }
    })
    
    logger.info(`🗑️ Membre supprimé: ${id} par ${req.user.email}`)
    res.json({ success: true, message: 'Membre supprimé avec succès' })
  } catch (error) {
    logger.error('Erreur deleteMembre:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Statistiques des membres
 * @route   GET /api/membres/stats/global
 * @access  Private (Pasteur, Admin)
 */
export const getMembreStats = async (req, res) => {
  try {
    const [total, actifs, inactifs, parDepartement] = await Promise.all([
      prisma.membre.count(),
      prisma.membre.count({ where: { statut: 'actif' } }),
      prisma.membre.count({ where: { statut: 'inactif' } }),
      prisma.membre.groupBy({
        by: ['departementId'],
        _count: true,
        where: { departementId: { not: null } }
      })
    ])
    
    const departements = await prisma.departement.findMany({
      where: { id: { in: parDepartement.map(p => p.departementId) } }
    })
    
    const statsParDepartement = parDepartement.map(p => ({
      departement: departements.find(d => d.id === p.departementId)?.nom,
      count: p._count
    }))
    
    res.json({
      success: true,
      data: {
        total,
        actifs,
        inactifs,
        tauxActivite: ((actifs / total) * 100).toFixed(2),
        parDepartement: statsParDepartement
      }
    })
  } catch (error) {
    logger.error('Erreur getMembreStats:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}