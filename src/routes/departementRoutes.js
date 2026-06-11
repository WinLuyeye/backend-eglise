import express from 'express'
import {
  getDepartements,
  getDepartementById,
  createDepartement,
  updateDepartement,
  deleteDepartement,
  getDepartementMembres
} from '../controllers/departementController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'
import { checkRole, isAdmin } from '../middlewares/roleMiddleware.js'
import {
  validateDepartement,
  validateDepartementId,
  validatePagination
} from '../middlewares/validationMiddleware.js'

const router = express.Router()

// Toutes les routes nécessitent une authentification
router.use(verifyToken)

/**
 * @swagger
 * tags:
 *   name: Departements
 *   description: Gestion des départements de l'église
 */

/**
 * @swagger
 * /departements:
 *   get:
 *     summary: Liste tous les départements
 *     tags: [Departements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des départements récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       nom:
 *                         type: string
 *                       description:
 *                         type: string
 *                       responsable:
 *                         type: object
 *                       _count:
 *                         type: object
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.get('/', checkRole('pasteur', 'secretaire', 'administrateur', 'chef_departement'), validatePagination, getDepartements)

/**
 * @swagger
 * /departements/{id}:
 *   get:
 *     summary: Récupère un département par son ID
 *     tags: [Departements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du département
 *     responses:
 *       200:
 *         description: Département récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     nom:
 *                       type: string
 *                     description:
 *                       type: string
 *                     responsable:
 *                       type: object
 *                     membres:
 *                       type: array
 *                     rapports:
 *                       type: array
 *       404:
 *         description: Département non trouvé
 *       401:
 *         description: Non authentifié
 */
router.get('/:id', checkRole('pasteur', 'secretaire', 'administrateur', 'chef_departement'), validateDepartementId, getDepartementById)

/**
 * @swagger
 * /departements/{id}/membres:
 *   get:
 *     summary: Récupère tous les membres d'un département
 *     tags: [Departements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du département
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Membres du département récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Département non trouvé
 *       401:
 *         description: Non authentifié
 */
router.get('/:id/membres', checkRole('pasteur', 'secretaire', 'administrateur', 'chef_departement'), validateDepartementId, validatePagination, getDepartementMembres)

/**
 * @swagger
 * /departements:
 *   post:
 *     summary: Crée un nouveau département
 *     tags: [Departements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "Chorale"
 *                 description: Nom du département
 *               description:
 *                 type: string
 *                 example: "Département de la chorale"
 *                 description: Description du département
 *               responsableId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: ID du membre responsable
 *     responses:
 *       201:
 *         description: Département créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Admin seulement
 *       409:
 *         description: Département déjà existant
 */
router.post('/', isAdmin, validateDepartement, createDepartement)

/**
 * @swagger
 * /departements/{id}:
 *   put:
 *     summary: Modifie un département existant
 *     tags: [Departements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du département
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "Chorale Gospel"
 *                 description: Nouveau nom du département
 *               description:
 *                 type: string
 *                 example: "Département de la chorale gospel"
 *                 description: Nouvelle description
 *               responsableId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: ID du nouveau responsable
 *     responses:
 *       200:
 *         description: Département modifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Admin seulement
 *       404:
 *         description: Département non trouvé
 */
router.put('/:id', isAdmin, validateDepartementId, validateDepartement, updateDepartement)

/**
 * @swagger
 * /departements/{id}:
 *   delete:
 *     summary: Supprime un département
 *     tags: [Departements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du département
 *     responses:
 *       200:
 *         description: Département supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Impossible de supprimer - département non vide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Admin seulement
 *       404:
 *         description: Département non trouvé
 */
router.delete('/:id', isAdmin, validateDepartementId, deleteDepartement)

export default router