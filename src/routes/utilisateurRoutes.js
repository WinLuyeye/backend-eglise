import express from 'express'
import {
  getUtilisateurs,
  getUtilisateurById,
  createUtilisateur,
  updateUtilisateur,
  deleteUtilisateur,
  resetPassword
} from '../controllers/utilisateurController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'
import { isSecretaireOrAdmin, isAdmin } from '../middlewares/roleMiddleware.js'
import {
  validateUtilisateur,
  validateUtilisateurUpdate,
  validateUtilisateurId,
  validatePagination
} from '../middlewares/validationMiddleware.js'

const router = express.Router()

router.use(verifyToken)

/**
 * @swagger
 * tags:
 *   name: Utilisateurs
 *   description: Gestion des utilisateurs
 */

/**
 * @swagger
 * /utilisateurs:
 *   get:
 *     summary: Liste des utilisateurs
 *     tags: [Utilisateurs]
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
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: actif
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 */
router.get('/', isSecretaireOrAdmin, validatePagination, getUtilisateurs)

/**
 * @swagger
 * /utilisateurs/{id}:
 *   get:
 *     summary: Détails d'un utilisateur
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Détails de l'utilisateur
 */
router.get('/:id', isSecretaireOrAdmin, validateUtilisateurId, getUtilisateurById)

/**
 * @swagger
 * /utilisateurs:
 *   post:
 *     summary: Créer un utilisateur
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - motDePasse
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               motDePasse:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [pasteur, tresorier, secretaire, chef_departement, administrateur]
 *               membreId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur créé
 */
router.post('/', isSecretaireOrAdmin, validateUtilisateur, createUtilisateur)

/**
 * @swagger
 * /utilisateurs/{id}:
 *   put:
 *     summary: Modifier un utilisateur
 *     tags: [Utilisateurs]
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
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *               actif:
 *                 type: boolean
 *               membreId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Utilisateur modifié
 */
router.put('/:id', isSecretaireOrAdmin, validateUtilisateurId, validateUtilisateurUpdate, updateUtilisateur)

/**
 * @swagger
 * /utilisateurs/{id}/reset-password:
 *   post:
 *     summary: Réinitialiser mot de passe
 *     tags: [Utilisateurs]
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
 *             required:
 *               - nouveauMotDePasse
 *             properties:
 *               nouveauMotDePasse:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé
 */
router.post('/:id/reset-password', isSecretaireOrAdmin, validateUtilisateurId, resetPassword)

/**
 * @swagger
 * /utilisateurs/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Utilisateur supprimé
 */
router.delete('/:id', isAdmin, validateUtilisateurId, deleteUtilisateur)

export default router