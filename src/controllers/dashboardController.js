import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

/**
 * @desc    Dashboard global (Pasteur, Admin)
 * @route   GET /api/dashboard/global
 * @access  Private (Pasteur, Admin)
 */
export const getGlobalDashboard = async (req, res) => {
  try {
    const now = new Date()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)
    const debutAnnee = new Date(now.getFullYear(), 0, 1)
    
    // Statistiques membres
    const [totalMembres, membresActifs, nouveauxMois, nouveauxAnnee] = await Promise.all([
      prisma.membre.count(),
      prisma.membre.count({ where: { statut: 'actif' } }),
      prisma.membre.count({
        where: {
          dateInscription: { gte: debutMois }
        }
      }),
      prisma.membre.count({
        where: {
          dateInscription: { gte: debutAnnee }
        }
      })
    ])
    
    // Statistiques financières
    const [entreesMois, sortiesMois, entreesAnnee, sortiesAnnee, topDonateurs] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'entree', dateTransaction: { gte: debutMois } },
        _sum: { montant: true }
      }),
      prisma.transaction.aggregate({
        where: { type: 'sortie', dateTransaction: { gte: debutMois } },
        _sum: { montant: true }
      }),
      prisma.transaction.aggregate({
        where: { type: 'entree', dateTransaction: { gte: debutAnnee } },
        _sum: { montant: true }
      }),
      prisma.transaction.aggregate({
        where: { type: 'sortie', dateTransaction: { gte: debutAnnee } },
        _sum: { montant: true }
      }),
      prisma.transaction.groupBy({
        by: ['membreId'],
        where: { type: 'entree', membreId: { not: null }, dateTransaction: { gte: debutMois } },
        _sum: { montant: true },
        orderBy: { _sum: { montant: 'desc' } },
        take: 5
      })
    ])
    
    // Récupérer les infos des top donateurs
    const topDonateursDetails = []
    for (const donateur of topDonateurs) {
      if (donateur.membreId) {
        const membre = await prisma.membre.findUnique({
          where: { id: donateur.membreId },
          select: { nom: true, prenom: true, id: true }
        })
        if (membre) {
          topDonateursDetails.push({
            ...membre,
            total: donateur._sum.montant
          })
        }
      }
    }
    
    // Rapports récents
    const rapportsRecents = await prisma.rapportDepartement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        departement: { select: { nom: true } },
        createur: { select: { email: true } }
      }
    })
    
    // Transactions récentes
    const transactionsRecentes = await prisma.transaction.findMany({
      take: 10,
      orderBy: { dateTransaction: 'desc' },
      include: {
        categorie: true,
        membre: { select: { nom: true, prenom: true } }
      }
    })
    
    // Évolution mensuelle (12 derniers mois)
    const evolutionMensuelle = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const finMois = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const entrees = await prisma.transaction.aggregate({
        where: {
          type: 'entree',
          dateTransaction: { gte: date, lte: finMois }
        },
        _sum: { montant: true }
      })
      
      const sorties = await prisma.transaction.aggregate({
        where: {
          type: 'sortie',
          dateTransaction: { gte: date, lte: finMois }
        },
        _sum: { montant: true }
      })
      
      evolutionMensuelle.push({
        mois: date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
        entrees: entrees._sum.montant || 0,
        sorties: sorties._sum.montant || 0,
        solde: (entrees._sum.montant || 0) - (sorties._sum.montant || 0)
      })
    }
    
    res.json({
      success: true,
      data: {
        membres: {
          total: totalMembres,
          actifs: membresActifs,
          tauxActivite: ((membresActifs / totalMembres) * 100).toFixed(2),
          nouveauxMois,
          nouveauxAnnee
        },
        finances: {
          mois: {
            entrees: entreesMois._sum.montant || 0,
            sorties: sortiesMois._sum.montant || 0,
            solde: (entreesMois._sum.montant || 0) - (sortiesMois._sum.montant || 0)
          },
          annee: {
            entrees: entreesAnnee._sum.montant || 0,
            sorties: sortiesAnnee._sum.montant || 0,
            solde: (entreesAnnee._sum.montant || 0) - (sortiesAnnee._sum.montant || 0)
          }
        },
        topDonateurs: topDonateursDetails,
        rapportsRecents,
        transactionsRecentes,
        evolutionMensuelle
      }
    })
  } catch (error) {
    logger.error('Erreur getGlobalDashboard:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Dashboard trésorier
 * @route   GET /api/dashboard/tresorier
 * @access  Private (Tresorier, Admin)
 */
export const getTresorierDashboard = async (req, res) => {
  try {
    const now = new Date()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)
    const debutSemaine = new Date(now)
    debutSemaine.setDate(now.getDate() - 7)
    
    // Totaux par catégorie
    const [entreesParCategorie, sortiesParCategorie] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['categorieId'],
        where: { type: 'entree', dateTransaction: { gte: debutMois } },
        _sum: { montant: true }
      }),
      prisma.transaction.groupBy({
        by: ['categorieId'],
        where: { type: 'sortie', dateTransaction: { gte: debutMois } },
        _sum: { montant: true }
      })
    ])
    
    // Récupérer les noms des catégories
    const categoriesMap = new Map()
    const allCategorieIds = [...entreesParCategorie.map(e => e.categorieId), ...sortiesParCategorie.map(s => s.categorieId)]
    const categories = await prisma.categorie.findMany({
      where: { id: { in: allCategorieIds } }
    })
    categories.forEach(c => categoriesMap.set(c.id, c.nom))
    
    const entreesDetails = entreesParCategorie.map(e => ({
      categorie: categoriesMap.get(e.categorieId),
      total: e._sum.montant
    }))
    
    const sortiesDetails = sortiesParCategorie.map(s => ({
      categorie: categoriesMap.get(s.categorieId),
      total: s._sum.montant
    }))
    
    // Dernières transactions
    const dernieresTransactions = await prisma.transaction.findMany({
      take: 20,
      orderBy: { dateTransaction: 'desc' },
      include: {
        categorie: true,
        membre: { select: { nom: true, prenom: true } }
      }
    })
    
    // Moyennes
    const moyenneHebdo = await prisma.transaction.aggregate({
      where: {
        dateTransaction: { gte: debutSemaine }
      },
      _avg: { montant: true }
    })
    
    res.json({
      success: true,
      data: {
        entreesParCategorie: entreesDetails,
        sortiesParCategorie: sortiesDetails,
        dernieresTransactions,
        moyenneTransaction: moyenneHebdo._avg.montant || 0,
        nombreTransactionsMois: await prisma.transaction.count({
          where: { dateTransaction: { gte: debutMois } }
        })
      }
    })
  } catch (error) {
    logger.error('Erreur getTresorierDashboard:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}

/**
 * @desc    Dashboard chef département
 * @route   GET /api/dashboard/departement
 * @access  Private (Chef département)
 */
export const getDepartementDashboard = async (req, res) => {
  try {
    const membre = await prisma.membre.findUnique({
      where: { id: req.user.membreId },
      include: { departement: true }
    })
    
    if (!membre.departementId) {
      return res.status(400).json({ message: 'Vous n\'êtes pas assigné à un département' })
    }
    
    const departementId = membre.departementId
    
    // Membres du département
    const membres = await prisma.membre.count({
      where: { departementId }
    })
    
    // Rapports du département
    const rapports = await prisma.rapportDepartement.findMany({
      where: { departementId },
      orderBy: { periode: 'desc' },
      take: 6
    })
    
    // Dernier rapport
    const dernierRapport = rapports[0] || null
    
    // Activité récente
    const activitesRecentes = await prisma.logActivite.findMany({
      where: {
        tableName: 'rapports_departement',
        details: { path: ['departementId'], equals: departementId }
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        utilisateur: { select: { email: true } }
      }
    })
    
    res.json({
      success: true,
      data: {
        departement: membre.departement,
        statistiques: {
          membres,
          rapports: await prisma.rapportDepartement.count({ where: { departementId } }),
          rapportsCetteAnnee: await prisma.rapportDepartement.count({
            where: {
              departementId,
              periode: { gte: new Date(new Date().getFullYear(), 0, 1) }
            }
          })
        },
        dernierRapport,
        rapportsRecents: rapports,
        activitesRecentes
      }
    })
  } catch (error) {
    logger.error('Erreur getDepartementDashboard:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}