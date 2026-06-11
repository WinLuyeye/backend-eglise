import express from 'express'
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getFinancialReport
} from '../controllers/transactionController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'
import { checkRole, isTresorierOrAdmin } from '../middlewares/roleMiddleware.js'
import {
  validateTransaction,
  validateTransactionId,
  validatePagination,
  validateDateRange
} from '../middlewares/validationMiddleware.js'

const router = express.Router()

router.use(verifyToken)

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Gestion des entrées et sorties
 */

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Liste des transactions
 *     tags: [Transactions]
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
 *         name: type
 *         schema: { type: string, enum: [entree, sortie] }
 *       - in: query
 *         name: categorieId
 *         schema: { type: string }
 *       - in: query
 *         name: dateDebut
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateFin
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Liste des transactions
 */
router.get('/', checkRole('pasteur', 'tresorier', 'administrateur'), validatePagination, validateDateRange, getTransactions)

/**
 * @swagger
 * /transactions/report/summary:
 *   get:
 *     summary: Rapport financier
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periode
 *         schema: { type: string, enum: [week, month, year] }
 *       - in: query
 *         name: dateDebut
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateFin
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Rapport financier
 */
router.get('/report/summary', checkRole('pasteur', 'tresorier', 'administrateur'), validateDateRange, getFinancialReport)

/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Détails d'une transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Détails de la transaction
 */
router.get('/:id', checkRole('pasteur', 'tresorier', 'administrateur'), validateTransactionId, getTransactionById)

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Créer une transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - categorieId
 *               - montant
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [entree, sortie]
 *               categorieId:
 *                 type: string
 *               membreId:
 *                 type: string
 *               montant:
 *                 type: number
 *               dateTransaction:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction créée
 */
router.post('/', isTresorierOrAdmin, validateTransaction, createTransaction)

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Modifier une transaction
 *     tags: [Transactions]
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
 *     responses:
 *       200:
 *         description: Transaction modifiée
 */
router.put('/:id', isTresorierOrAdmin, validateTransactionId, validateTransaction, updateTransaction)

/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     summary: Supprimer une transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction supprimée
 */
router.delete('/:id', isTresorierOrAdmin, validateTransactionId, deleteTransaction)

export default router