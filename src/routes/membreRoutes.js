import express from 'express'
import { 
  getMembres,
  getMembreById,
  createMembre,
  updateMembre,
  deleteMembre,
  getMembreStats
} from '../controllers/membreController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'
import { 
  checkRole,
  isSecretaireOrAdmin,
  isAdmin
} from '../middlewares/roleMiddleware.js'
import {
  validateMembre,
  validateMembreId,
  validatePagination,
  validateMembreUpdate
} from '../middlewares/validationMiddleware.js'

const router = express.Router()

// ============================================
// MIDDLEWARE D'AUTHENTIFICATION GLOBAL
// ============================================
// Toutes les routes après ce point nécessitent un token valide
router.use(verifyToken)

/**
 * @swagger
 * tags:
 *   name: Membres
 *   description: Gestion des membres de l'église
 */

/**
 * @swagger
 * /membres:
 *   get:
 *     summary: Liste tous les membres
 *     tags: [Membres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [actif, inactif, transfere]
 *         description: Filtrer par statut
 *       - in: query
 *         name: departementId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par département
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Rechercher par nom, prénom ou email
 *     responses:
 *       200:
 *         description: Liste des membres récupérée avec succès
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
 *                     $ref: '#/components/schemas/Membre'
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
 */
router.get('/', validatePagination, getMembres)

/**
 * @swagger
 * /membres/stats/global:
 *   get:
 *     summary: Statistiques globales des membres
 *     tags: [Membres]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
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
 *                     total:
 *                       type: integer
 *                     actifs:
 *                       type: integer
 *                     inactifs:
 *                       type: integer
 *                     tauxActivite:
 *                       type: string
 *                     parDepartement:
 *                       type: array
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Réservé au Pasteur et Admin
 */
router.get('/stats/global', checkRole('pasteur', 'administrateur'), getMembreStats)

/**
 * @swagger
 * /membres/{id}:
 *   get:
 *     summary: Récupère un membre par son ID
 *     tags: [Membres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du membre
 *     responses:
 *       200:
 *         description: Membre récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Membre'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Membre non trouvé
 */
router.get('/:id', validateMembreId, getMembreById)

/**
 * @swagger
 * /membres:
 *   post:
 *     summary: Crée un nouveau membre
 *     tags: [Membres]
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
 *               - prenom
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "MARTIN"
 *                 description: Nom du membre
 *               prenom:
 *                 type: string
 *                 example: "Jean"
 *                 description: Prénom du membre
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jean.martin@eglise.com"
 *                 description: Email du membre
 *               telephone:
 *                 type: string
 *                 example: "+221771234567"
 *                 description: Téléphone
 *               adresse:
 *                 type: string
 *                 example: "12 Rue de l'Église, Dakar"
 *                 description: Adresse
 *               dateNaissance:
 *                 type: string
 *                 format: date
 *                 example: "1975-03-15"
 *                 description: Date de naissance
 *               departementId:
 *                 type: string
 *                 format: uuid
 *                 description: ID du département
 *     responses:
 *       201:
 *         description: Membre créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Membre'
 *                 message:
 *                   type: string
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Réservé au Secrétaire et Admin
 *       409:
 *         description: Email déjà utilisé
 */
router.post('/', isSecretaireOrAdmin, validateMembre, createMembre)

/**
 * @swagger
 * /membres/{id}:
 *   put:
 *     summary: Modifie un membre existant
 *     tags: [Membres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du membre
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "MARTIN"
 *                 description: Nom du membre
 *               prenom:
 *                 type: string
 *                 example: "Jean"
 *                 description: Prénom du membre
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jean.martin@eglise.com"
 *                 description: Email du membre
 *               telephone:
 *                 type: string
 *                 example: "+221771234567"
 *                 description: Téléphone
 *               adresse:
 *                 type: string
 *                 example: "12 Rue de l'Église, Dakar"
 *                 description: Adresse
 *               dateNaissance:
 *                 type: string
 *                 format: date
 *                 example: "1975-03-15"
 *                 description: Date de naissance
 *               statut:
 *                 type: string
 *                 enum: [actif, inactif, transfere]
 *                 description: Statut du membre
 *               departementId:
 *                 type: string
 *                 format: uuid
 *                 description: ID du département
 *     responses:
 *       200:
 *         description: Membre modifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Membre'
 *                 message:
 *                   type: string
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Réservé au Secrétaire et Admin
 *       404:
 *         description: Membre non trouvé
 *       409:
 *         description: Email déjà utilisé
 */
router.put('/:id', isSecretaireOrAdmin, validateMembreId, validateMembreUpdate, updateMembre)

/**
 * @swagger
 * /membres/{id}:
 *   delete:
 *     summary: Supprime un membre
 *     tags: [Membres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du membre
 *     responses:
 *       200:
 *         description: Membre supprimé avec succès
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
 *         description: Impossible de supprimer - Membre a des transactions
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Réservé à l'Administrateur
 *       404:
 *         description: Membre non trouvé
 */
router.delete('/:id', isAdmin, validateMembreId, deleteMembre)

export default router