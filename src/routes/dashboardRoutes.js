import express from 'express'
import {
  getGlobalDashboard,
  getTresorierDashboard,
  getDepartementDashboard
} from '../controllers/dashboardController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'
import { checkRole } from '../middlewares/roleMiddleware.js'

const router = express.Router()

// MIDDLEWARE DE DEBUG
router.use((req, res, next) => {
  console.log('=== DASHBOARD ROUTER ===')
  console.log('URL:', req.method, req.originalUrl)
  console.log('Has token?', !!req.headers.authorization)
  next()
})

// Appliquer verifyToken à toutes les routes
router.use(verifyToken)

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Tableaux de bord et statistiques
 */

/**
 * @swagger
 * /dashboard/global:
 *   get:
 *     summary: Dashboard global - Vue d'ensemble de l'église
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Affiche les statistiques globales de l'église :
 *       - Nombre de membres (total, actifs, nouveaux)
 *       - Finances (entrées, sorties, solde du mois et de l'année)
 *       - Top donateurs
 *       - Rapports récents
 *       - Transactions récentes
 *       - Évolution mensuelle sur 12 mois
 *     responses:
 *       200:
 *         description: Dashboard global récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     membres:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         actifs:
 *                           type: integer
 *                           example: 145
 *                         tauxActivite:
 *                           type: string
 *                           example: "96.67"
 *                         nouveauxMois:
 *                           type: integer
 *                           example: 5
 *                         nouveauxAnnee:
 *                           type: integer
 *                           example: 25
 *                     finances:
 *                       type: object
 *                       properties:
 *                         mois:
 *                           type: object
 *                           properties:
 *                             entrees:
 *                               type: string
 *                               example: "1250000"
 *                             sorties:
 *                               type: string
 *                               example: "450000"
 *                             solde:
 *                               type: number
 *                               example: 800000
 *                         annee:
 *                           type: object
 *                           properties:
 *                             entrees:
 *                               type: string
 *                               example: "5000000"
 *                             sorties:
 *                               type: string
 *                               example: "2000000"
 *                             solde:
 *                               type: number
 *                               example: 3000000
 *                     topDonateurs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           nom:
 *                             type: string
 *                           prenom:
 *                             type: string
 *                           total:
 *                             type: string
 *                     rapportsRecents:
 *                       type: array
 *                     transactionsRecentes:
 *                       type: array
 *                     evolutionMensuelle:
 *                       type: array
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Réservé au Pasteur et Admin
 */
router.get('/global', checkRole('pasteur', 'administrateur'), getGlobalDashboard)

/**
 * @swagger
 * /dashboard/tresorier:
 *   get:
 *     summary: Dashboard trésorier - Vue financière détaillée
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Affiche les statistiques financières détaillées :
 *       - Entrées par catégorie
 *       - Sorties par catégorie
 *       - Dernières transactions
 *       - Moyenne des transactions
 *       - Nombre de transactions du mois
 *     responses:
 *       200:
 *         description: Dashboard trésorier récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     entreesParCategorie:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           categorie:
 *                             type: string
 *                           total:
 *                             type: number
 *                     sortiesParCategorie:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           categorie:
 *                             type: string
 *                           total:
 *                             type: number
 *                     dernieresTransactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *                     moyenneTransaction:
 *                       type: number
 *                       example: 25000
 *                     nombreTransactionsMois:
 *                       type: integer
 *                       example: 45
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Réservé au Trésorier et Admin
 */
router.get('/tresorier', checkRole('tresorier', 'administrateur'), getTresorierDashboard)

/**
 * @swagger
 * /dashboard/departement:
 *   get:
 *     summary: Dashboard chef département - Vue de son département
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Affiche les statistiques du département du chef :
 *       - Informations du département
 *       - Nombre de membres
 *       - Nombre de rapports
 *       - Dernier rapport
 *       - Rapports récents
 *       - Activités récentes
 *     responses:
 *       200:
 *         description: Dashboard département récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     departement:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         nom:
 *                           type: string
 *                         description:
 *                           type: string
 *                     statistiques:
 *                       type: object
 *                       properties:
 *                         membres:
 *                           type: integer
 *                         rapports:
 *                           type: integer
 *                         rapportsCetteAnnee:
 *                           type: integer
 *                     dernierRapport:
 *                       type: object
 *                     rapportsRecents:
 *                       type: array
 *                     activitesRecentes:
 *                       type: array
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Réservé aux Chefs de département et Admin
 */
router.get('/departement', checkRole('chef_departement', 'administrateur'), getDepartementDashboard)

export default router