import express from 'express'
import { 
  login, 
  logout, 
  changePassword, 
  getMe,
  health,
  setupAdmin
} from '../controllers/authController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'
import { 
  validateLogin, 
  validateChangePassword 
} from '../middlewares/validationMiddleware.js'

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification
 */

/**
 * @swagger
 * /auth/health:
 *   get:
 *     summary: Vérifier l'état du serveur
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Serveur OK
 */
router.get('/health', health)

/**
 * @swagger
 * /auth/setup:
 *   post:
 *     summary: Créer le premier administrateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - motDePasse
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               motDePasse:
 *                 type: string
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *     responses:
 *       201:
 *         description: Administrateur créé
 */
router.post('/setup', setupAdmin)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - motDePasse
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               motDePasse:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Identifiants incorrects
 */
router.post('/login', validateLogin, login)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Déconnexion
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
router.post('/logout', verifyToken, logout)

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Changer mot de passe
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ancienMotDePasse
 *               - nouveauMotDePasse
 *             properties:
 *               ancienMotDePasse:
 *                 type: string
 *               nouveauMotDePasse:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mot de passe changé
 */
router.post('/change-password', verifyToken, validateChangePassword, changePassword)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtenir profil utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur
 */
router.get('/me', verifyToken, getMe)

export default router