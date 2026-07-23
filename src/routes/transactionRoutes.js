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
  validateTransactionFilters,
  validateFinancialReport
} from '../middlewares/validationMiddleware.js'

const router = express.Router()

router.use(verifyToken)

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Gestion des entrées et sorties financières
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         type:
 *           type: string
 *           enum: [entree, sortie]
 *           example: "entree"
 *         categorieId:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         membreId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           example: "123e4567-e89b-12d3-a456-426614174002"
 *         montant:
 *           type: number
 *           format: decimal
 *           example: 100.00
 *         devise:
 *           type: string
 *           enum: [USD, CDF]
 *           default: "CDF"
 *           example: "USD"
 *         dateTransaction:
 *           type: string
 *           format: date-time
 *           example: "2026-07-23T10:30:00Z"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Offrande dominicale"
 *         justificatif:
 *           type: string
 *           nullable: true
 *           example: "recu_001.pdf"
 *         createdBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         categorie:
 *           $ref: '#/components/schemas/Categorie'
 *         membre:
 *           $ref: '#/components/schemas/Membre'
 *         createur:
 *           $ref: '#/components/schemas/Utilisateur'
 *     TransactionInput:
 *       type: object
 *       required:
 *         - type
 *         - categorieId
 *         - montant
 *       properties:
 *         type:
 *           type: string
 *           enum: [entree, sortie]
 *           example: "entree"
 *         categorieId:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         membreId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           example: "123e4567-e89b-12d3-a456-426614174002"
 *         montant:
 *           type: number
 *           format: decimal
 *           minimum: 0.01
 *           example: 100.00
 *         devise:
 *           type: string
 *           enum: [USD, CDF]
 *           default: "CDF"
 *           example: "USD"
 *         dateTransaction:
 *           type: string
 *           format: date
 *           example: "2026-07-23"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Offrande dominicale"
 *         justificatif:
 *           type: string
 *           nullable: true
 *           example: "recu_001.pdf"
 */

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Liste des transactions avec filtres
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [entree, sortie]
 *         description: Filtrer par type de transaction
 *       - in: query
 *         name: categorieId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par catégorie
 *       - in: query
 *         name: membreId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par membre
 *       - in: query
 *         name: devise
 *         schema:
 *           type: string
 *           enum: [USD, CDF]
 *         description: Filtrer par devise
 *       - in: query
 *         name: dateDebut
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *       - in: query
 *         name: dateFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Liste des transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/', 
  checkRole('pasteur', 'tresorier', 'administrateur'), 
  validatePagination, 
  validateTransactionFilters, 
  getTransactions
)

/**
 * @swagger
 * /transactions/report/summary:
 *   get:
 *     summary: Rapport financier avec statistiques par devise
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periode
 *         schema:
 *           type: string
 *           enum: [all, week, month, year]
 *           default: all
 *         description: Période du rapport
 *       - in: query
 *         name: dateDebut
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD) - Prioritaire sur periode
 *       - in: query
 *         name: dateFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD) - Prioritaire sur periode
 *     responses:
 *       200:
 *         description: Rapport financier généré
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
 *                     periode:
 *                       type: object
 *                       properties:
 *                         debut:
 *                           type: string
 *                           format: date-time
 *                         fin:
 *                           type: string
 *                           format: date-time
 *                         libelle:
 *                           type: string
 *                     tauxChange:
 *                       type: number
 *                       example: 2250
 *                     statsParDevise:
 *                       type: object
 *                       properties:
 *                         USD:
 *                           type: object
 *                           properties:
 *                             entrees:
 *                               type: number
 *                             sorties:
 *                               type: number
 *                             solde:
 *                               type: number
 *                             nombre:
 *                               type: integer
 *                         CDF:
 *                           type: object
 *                           properties:
 *                             entrees:
 *                               type: number
 *                             sorties:
 *                               type: number
 *                             solde:
 *                               type: number
 *                             nombre:
 *                               type: integer
 *                     total:
 *                       type: object
 *                       properties:
 *                         entrees:
 *                           type: number
 *                         sorties:
 *                           type: number
 *                         solde:
 *                           type: number
 *                         parDevise:
 *                           type: object
 *                           properties:
 *                             USD:
 *                               type: object
 *                             CDF:
 *                               type: object
 *                     entreesParCategorie:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                     sortiesParCategorie:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                     evolutionMensuelle:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           mois:
 *                             type: string
 *                           entrees:
 *                             type: number
 *                           sorties:
 *                             type: number
 *                     nombreTransactions:
 *                       type: object
 *                       properties:
 *                         entrees:
 *                           type: integer
 *                         sorties:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         parDevise:
 *                           type: object
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/report/summary', 
  checkRole('pasteur', 'tresorier', 'administrateur'), 
  validateFinancialReport, 
  getFinancialReport
)

/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Obtenir une transaction par son ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la transaction
 *     responses:
 *       200:
 *         description: Détails de la transaction
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Transaction non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:id', 
  checkRole('pasteur', 'tresorier', 'administrateur'), 
  validateTransactionId, 
  getTransactionById
)

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Créer une nouvelle transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionInput'
 *           examples:
 *             Entrée en USD:
 *               value:
 *                 type: "entree"
 *                 categorieId: "123e4567-e89b-12d3-a456-426614174001"
 *                 membreId: "123e4567-e89b-12d3-a456-426614174002"
 *                 montant: 100.00
 *                 devise: "USD"
 *                 dateTransaction: "2026-07-23"
 *                 description: "Offrande dominicale"
 *             Sortie en CDF:
 *               value:
 *                 type: "sortie"
 *                 categorieId: "123e4567-e89b-12d3-a456-426614174003"
 *                 montant: 50000.00
 *                 devise: "CDF"
 *                 dateTransaction: "2026-07-23"
 *                 description: "Achat fournitures bureau"
 *             Entrée sans devise (CDF par défaut):
 *               value:
 *                 type: "entree"
 *                 categorieId: "123e4567-e89b-12d3-a456-426614174001"
 *                 membreId: "123e4567-e89b-12d3-a456-426614174002"
 *                 montant: 50000.00
 *                 dateTransaction: "2026-07-23"
 *                 description: "Offrande en CDF"
 *     responses:
 *       201:
 *         description: Transaction créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *                 message:
 *                   type: string
 *                   example: "Transaction enregistrée avec succès"
 *       400:
 *         description: Erreur de validation des données
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé (nécessite rôle Tresorier ou Admin)
 *       404:
 *         description: Catégorie ou membre non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/', 
  isTresorierOrAdmin, 
  validateTransaction, 
  createTransaction
)

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Modifier une transaction existante
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la transaction à modifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [entree, sortie]
 *               categorieId:
 *                 type: string
 *                 format: uuid
 *               membreId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               montant:
 *                 type: number
 *                 minimum: 0.01
 *               devise:
 *                 type: string
 *                 enum: [USD, CDF]
 *               dateTransaction:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *                 nullable: true
 *               justificatif:
 *                 type: string
 *                 nullable: true
 *           example:
 *             type: "entree"
 *             montant: 150.00
 *             devise: "USD"
 *             description: "Offrande dominicale modifiée"
 *     responses:
 *       200:
 *         description: Transaction modifiée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *                 message:
 *                   type: string
 *                   example: "Transaction modifiée avec succès"
 *       400:
 *         description: Erreur de validation
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Transaction non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.put(
  '/:id', 
  isTresorierOrAdmin, 
  validateTransactionId, 
  validateTransaction, 
  updateTransaction
)

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
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la transaction à supprimer
 *     responses:
 *       200:
 *         description: Transaction supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Transaction supprimée avec succès"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Transaction non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete(
  '/:id', 
  isTresorierOrAdmin, 
  validateTransactionId, 
  deleteTransaction
)

export default router