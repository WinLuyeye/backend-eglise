import express from 'express'
import {
  getCategories,
  getCategorieById,
  createCategorie,
  updateCategorie,
  deleteCategorie
} from '../controllers/categorieController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'
import { checkRole, isTresorierOrAdmin, isAdmin } from '../middlewares/roleMiddleware.js'
import {
  validateCategorie,
  validateCategorieId
} from '../middlewares/validationMiddleware.js'

const router = express.Router()

router.use(verifyToken)

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Gestion des catégories
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Liste des catégories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [entree, sortie] }
 *     responses:
 *       200:
 *         description: Liste des catégories
 */
router.get('/', checkRole('pasteur', 'tresorier', 'administrateur'), getCategories)

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Détails d'une catégorie
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Détails de la catégorie
 */
router.get('/:id', checkRole('pasteur', 'tresorier', 'administrateur'), validateCategorieId, getCategorieById)

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Créer une catégorie
 *     tags: [Categories]
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
 *               - type
 *             properties:
 *               nom:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [entree, sortie]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Catégorie créée
 */
router.post('/', isTresorierOrAdmin, validateCategorie, createCategorie)

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Modifier une catégorie
 *     tags: [Categories]
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
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Catégorie modifiée
 */
router.put('/:id', isTresorierOrAdmin, validateCategorieId, validateCategorie, updateCategorie)

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Supprimer une catégorie
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Catégorie supprimée
 */
router.delete('/:id', isAdmin, validateCategorieId, deleteCategorie)

export default router