import express from 'express'
import {
  getGlobalDashboard,
  getTresorierDashboard,
  getDepartementDashboard
} from '../controllers/dashboardController.js'
import { verifyToken, authorize } from '../middlewares/authMiddleware.js' // ✅ Import authorize

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
 *       Affiche les statistiques globales de l'église
 *     responses:
 *       200:
 *         description: Dashboard global récupéré avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
// ✅ CORRECTION: Utiliser authorize avec les rôles en majuscules
router.get('/global', authorize('ADMIN', 'PASTEUR', 'SECRETAIRE', 'TRESORIER', 'CHEF_DEPARTEMENT'), getGlobalDashboard)

/**
 * @swagger
 * /dashboard/tresorier:
 *   get:
 *     summary: Dashboard trésorier - Vue financière détaillée
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard trésorier récupéré avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
// ✅ CORRECTION: Utiliser authorize avec les rôles en majuscules
router.get('/tresorier', authorize('ADMIN', 'TRESORIER'), getTresorierDashboard)

/**
 * @swagger
 * /dashboard/departement:
 *   get:
 *     summary: Dashboard chef département - Vue de son département
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard département récupéré avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
// ✅ CORRECTION: Utiliser authorize avec les rôles en majuscules
router.get('/departement', authorize('ADMIN', 'CHEF_DEPARTEMENT'), getDepartementDashboard)

export default router