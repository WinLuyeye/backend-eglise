import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

const TAUX_CHANGE = 2250

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
    
    // Transactions du mois
    const transactionsMois = await prisma.transaction.findMany({
      where: {
        dateTransaction: { gte: debutMois }
      }
    })
    
    // Transactions de l'année
    const transactionsAnnee = await prisma.transaction.findMany({
      where: {
        dateTransaction: { gte: debutAnnee }
      }
    })
    
    // Fonction pour calculer les totaux par devise
    const calculerTotaux = (transactions) => {
      let totalUSD = 0
      let totalCDF = 0
      
      transactions.forEach(t => {
        const montant = parseFloat(t.montant)
        if (t.devise === 'USD') {
          totalUSD += montant
        } else {
          totalCDF += montant
        }
      })
      
      const totalCDFEquivalent = totalCDF + (totalUSD * TAUX_CHANGE)
      
      return {
        entrees: transactions.filter(t => t.type === 'entree').reduce((sum, t) => sum + parseFloat(t.montant), 0),
        sorties: transactions.filter(t => t.type === 'sortie').reduce((sum, t) => sum + parseFloat(t.montant), 0),
        parDevise: {
          USD: {
            entrees: transactions.filter(t => t.type === 'entree' && t.devise === 'USD').reduce((sum, t) => sum + parseFloat(t.montant), 0),
            sorties: transactions.filter(t => t.type === 'sortie' && t.devise === 'USD').reduce((sum, t) => sum + parseFloat(t.montant), 0)
          },
          CDF: {
            entrees: transactions.filter(t => t.type === 'entree' && t.devise === 'CDF').reduce((sum, t) => sum + parseFloat(t.montant), 0),
            sorties: transactions.filter(t => t.type === 'sortie' && t.devise === 'CDF').reduce((sum, t) => sum + parseFloat(t.montant), 0)
          }
        },
        totalCDFEquivalent
      }
    }
    
    const financesMois = calculerTotaux(transactionsMois)
    const financesAnnee = calculerTotaux(transactionsAnnee)
    
    // Statistiques par devise pour l'affichage
    const statsParDevise = {
      USD: {
        entrees: financesAnnee.parDevise.USD.entrees,
        sorties: financesAnnee.parDevise.USD.sorties,
        solde: financesAnnee.parDevise.USD.entrees - financesAnnee.parDevise.USD.sorties
      },
      CDF: {
        entrees: financesAnnee.parDevise.CDF.entrees,
        sorties: financesAnnee.parDevise.CDF.sorties,
        solde: financesAnnee.parDevise.CDF.entrees - financesAnnee.parDevise.CDF.sorties
      }
    }
    
    // Top donateurs (toutes devises confondues, converti en CDF)
    const topDonateursRaw = await prisma.transaction.groupBy({
      by: ['membreId'],
      where: {
        type: 'entree',
        membreId: { not: null },
        dateTransaction: { gte: debutAnnee }
      },
      _sum: { montant: true }
    })
    
    const topDonateurs = []
    for (const donateur of topDonateursRaw) {
      if (donateur.membreId) {
        const membre = await prisma.membre.findUnique({
          where: { id: donateur.membreId },
          select: { id: true, nom: true, prenom: true }
        })
        if (membre) {
          // Récupérer le montant total en CDF pour ce membre
          const transactionsMembre = await prisma.transaction.findMany({
            where: {
              type: 'entree',
              membreId: donateur.membreId,
              dateTransaction: { gte: debutAnnee }
            }
          })
          
          let totalCDF = 0
          transactionsMembre.forEach(t => {
            const montant = parseFloat(t.montant)
            if (t.devise === 'USD') {
              totalCDF += montant * TAUX_CHANGE
            } else {
              totalCDF += montant
            }
          })
          
          topDonateurs.push({
            ...membre,
            total: totalCDF
          })
        }
      }
    }
    topDonateurs.sort((a, b) => b.total - a.total)
    
    // Transactions récentes
    const transactionsRecentes = await prisma.transaction.findMany({
      take: 10,
      orderBy: { dateTransaction: 'desc' },
      include: {
        categorie: true,
        membre: { select: { nom: true, prenom: true } }
      }
    })
    
    // Rapports récents
    const rapportsRecents = await prisma.rapportDepartement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        departement: { select: { nom: true } },
        createur: { select: { email: true } }
      }
    })
    
    // Évolution mensuelle (12 derniers mois)
    const evolutionMensuelle = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const finMois = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const transactionsMois = await prisma.transaction.findMany({
        where: {
          dateTransaction: { gte: date, lte: finMois }
        }
      })
      
      let totalEntrees = 0
      let totalSorties = 0
      
      transactionsMois.forEach(t => {
        const montant = parseFloat(t.montant)
        let montantCDF = t.devise === 'USD' ? montant * TAUX_CHANGE : montant
        
        if (t.type === 'entree') {
          totalEntrees += montantCDF
        } else {
          totalSorties += montantCDF
        }
      })
      
      evolutionMensuelle.push({
        mois: date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
        entrees: totalEntrees,
        sorties: totalSorties,
        solde: totalEntrees - totalSorties
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
            entrees: financesMois.entrees,
            sorties: financesMois.sorties,
            solde: financesMois.entrees - financesMois.sorties,
            parDevise: financesMois.parDevise
          },
          annee: {
            entrees: financesAnnee.entrees,
            sorties: financesAnnee.sorties,
            solde: financesAnnee.entrees - financesAnnee.sorties,
            parDevise: financesAnnee.parDevise,
            statsParDevise
          }
        },
        topDonateurs: topDonateurs.slice(0, 5),
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
    
    // Transactions du mois
    const transactionsMois = await prisma.transaction.findMany({
      where: {
        dateTransaction: { gte: debutMois }
      },
      include: {
        categorie: true,
        membre: { select: { nom: true, prenom: true } }
      }
    })
    
    // Statistiques par catégorie
    const entreesParCategorie = {}
    const sortiesParCategorie = {}
    
    transactionsMois.forEach(t => {
      const catName = t.categorie.nom
      const montant = parseFloat(t.montant)
      
      if (t.type === 'entree') {
        entreesParCategorie[catName] = (entreesParCategorie[catName] || 0) + montant
      } else {
        sortiesParCategorie[catName] = (sortiesParCategorie[catName] || 0) + montant
      }
    })
    
    res.json({
      success: true,
      data: {
        entreesParCategorie,
        sortiesParCategorie,
        dernieresTransactions: transactionsMois.slice(0, 10),
        nombreTransactionsMois: transactionsMois.length
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
    
    const membres = await prisma.membre.count({
      where: { departementId }
    })
    
    const rapports = await prisma.rapportDepartement.findMany({
      where: { departementId },
      orderBy: { periode: 'desc' },
      take: 6
    })
    
    res.json({
      success: true,
      data: {
        departement: membre.departement,
        statistiques: {
          membres,
          rapports: await prisma.rapportDepartement.count({ where: { departementId } })
        },
        rapportsRecents: rapports
      }
    })
  } catch (error) {
    logger.error('Erreur getDepartementDashboard:', error)
    res.status(500).json({ message: 'Erreur interne du serveur' })
  }
}