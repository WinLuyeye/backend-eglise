import express from 'express'
import {
  getRapports,
  getRapportById,
  createRapport,
  updateRapport,
  deleteRapport,
  getRapportsByDepartement
} from '../controllers/rapportController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'
import { checkRole, isChefDepartementOrAdmin, isAdmin } from '../middlewares/roleMiddleware.js'
import {
  validateRapport,
  validateRapportId,
  validatePagination
} from '../middlewares/validationMiddleware.js'

const router = express.Router()

router.use(verifyToken)

/**
 * @swagger
 * tags:
 *   name: Rapports
 *   description: Gestion des rapports départementaux
 */

/**
 * @swagger
 * /rapports:
 *   get:
 *     summary: Liste des rapports
 *     tags: [Rapports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: departementId
 *         schema: { type: string }
 *       - in: query
 *         name: periodeDebut
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: periodeFin
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Liste des rapports
 */
router.get('/', checkRole('pasteur', 'administrateur', 'chef_departement'), validatePagination, getRapports)

/**
 * @swagger
 * /rapports/departement/{departementId}:
 *   get:
 *     summary: Rapports d'un département
 *     tags: [Rapports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departementId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Liste des rapports du département
 */
router.get('/departement/:departementId', checkRole('pasteur', 'administrateur', 'chef_departement'), getRapportsByDepartement)

/**
 * @swagger
 * /rapports/{id}:
 *   get:
 *     summary: Détails d'un rapport
 *     tags: [Rapports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Détails du rapport
 */
router.get('/:id', checkRole('pasteur', 'administrateur', 'chef_departement'), validateRapportId, getRapportById)

/**
 * @swagger
 * /rapports:
 *   post:
 *     summary: Créer un rapport
 *     tags: [Rapports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - departementId
 *               - titre
 *               - contenu
 *             properties:
 *               departementId:
 *                 type: string
 *               titre:
 *                 type: string
 *               contenu:
 *                 type: string
 *               periode:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Rapport créé
 */
router.post('/', isChefDepartementOrAdmin, validateRapport, createRapport)

/**
 * @swagger
 * /rapports/{id}:
 *   put:
 *     summary: Modifier un rapport
 *     tags: [Rapports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titre:
 *                 type: string
 *               contenu:
 *                 type: string
 *               periode:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Rapport modifié
 */
router.put('/:id', isChefDepartementOrAdmin, validateRapportId, validateRapport, updateRapport)

/**
 * @swagger
 * /rapports/{id}:
 *   delete:
 *     summary: Supprimer un rapport
 *     tags: [Rapports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rapport supprimé
 */
router.delete('/:id', isAdmin, validateRapportId, deleteRapport)

export default router