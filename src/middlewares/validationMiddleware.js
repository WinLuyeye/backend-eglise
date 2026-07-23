import { body, param, query, validationResult } from 'express-validator'

/**
 * Gérer les erreurs de validation
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array(),
      message: 'Erreur de validation des données.'
    })
  }
  next()
}

// ========== VALIDATIONS AUTH ==========
export const validateLogin = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('motDePasse')
    .notEmpty().withMessage('Le mot de passe est requis'),
  handleValidationErrors
]

export const validateChangePassword = [
  body('ancienMotDePasse')
    .notEmpty().withMessage('L\'ancien mot de passe est requis'),
  body('nouveauMotDePasse')
    .isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
  handleValidationErrors
]

// ========== VALIDATIONS MEMBRE ==========
export const validateMembre = [
  body('nom')
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('prenom')
    .notEmpty().withMessage('Le prénom est requis')
    .isLength({ max: 100 }).withMessage('Le prénom ne peut pas dépasser 100 caractères'),
  body('email')
    .optional()
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('telephone')
    .optional()
    .isLength({ max: 20 }).withMessage('Le téléphone ne peut pas dépasser 20 caractères'),
  body('adresse')
    .optional()
    .isLength({ max: 500 }).withMessage('L\'adresse ne peut pas dépasser 500 caractères'),
  body('dateNaissance')
    .optional()
    .isISO8601().withMessage('Date de naissance invalide')
    .toDate(),
  body('statut')
    .optional()
    .isIn(['actif', 'inactif', 'transfere']).withMessage('Statut invalide'),
  body('departementId')
    .optional()
    .isUUID().withMessage('ID de département invalide'),
  handleValidationErrors
]

// Validation pour modification de membre (champs optionnels)
export const validateMembreUpdate = [
  body('nom')
    .optional()
    .notEmpty().withMessage('Le nom ne peut pas être vide')
    .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('prenom')
    .optional()
    .notEmpty().withMessage('Le prénom ne peut pas être vide')
    .isLength({ max: 100 }).withMessage('Le prénom ne peut pas dépasser 100 caractères'),
  body('email')
    .optional()
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('telephone')
    .optional()
    .isLength({ max: 20 }).withMessage('Le téléphone ne peut pas dépasser 20 caractères'),
  body('adresse')
    .optional()
    .isLength({ max: 500 }).withMessage('L\'adresse ne peut pas dépasser 500 caractères'),
  body('dateNaissance')
    .optional()
    .isISO8601().withMessage('Date de naissance invalide')
    .toDate(),
  body('statut')
    .optional()
    .isIn(['actif', 'inactif', 'transfere']).withMessage('Statut invalide'),
  body('departementId')
    .optional()
    .isUUID().withMessage('ID de département invalide'),
  handleValidationErrors
]

export const validateMembreId = [
  param('id')
    .isUUID().withMessage('ID de membre invalide'),
  handleValidationErrors
]

// ========== VALIDATIONS TRANSACTION ==========
export const validateTransaction = [
  body('type')
    .isIn(['entree', 'sortie']).withMessage('Le type doit être "entree" ou "sortie"'),
  body('categorieId')
    .isUUID().withMessage('ID de catégorie invalide'),
  body('membreId')
    .optional()
    .isUUID().withMessage('ID de membre invalide'),
  body('montant')
    .isFloat({ min: 0.01 }).withMessage('Le montant doit être supérieur à 0'),
  body('devise')
    .optional()
    .isIn(['USD', 'CDF']).withMessage('La devise doit être "USD" ou "CDF"')
    .customSanitizer(value => {
      if (!value) return 'CDF'
      return String(value).toUpperCase().trim()
    }),
  body('dateTransaction')
    .optional()
    .isISO8601().withMessage('Date invalide')
    .toDate(),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
  body('justificatif')
    .optional()
    .isLength({ max: 255 }).withMessage('Le justificatif ne peut pas dépasser 255 caractères'),
  // Validation conditionnelle : si type est 'entree', membreId est requis
  body('membreId')
    .custom((value, { req }) => {
      if (req.body.type === 'entree' && !value) {
        throw new Error('Pour une entrée, le membre est requis')
      }
      return true
    }),
  handleValidationErrors
]

export const validateTransactionId = [
  param('id')
    .isUUID().withMessage('ID de transaction invalide'),
  handleValidationErrors
]

// ========== VALIDATIONS CATEGORIE ==========
export const validateCategorie = [
  body('nom')
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('type')
    .isIn(['entree', 'sortie']).withMessage('Le type doit être "entree" ou "sortie"'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
  handleValidationErrors
]

export const validateCategorieId = [
  param('id')
    .isUUID().withMessage('ID de catégorie invalide'),
  handleValidationErrors
]

// ========== VALIDATIONS DEPARTEMENT ==========
export const validateDepartement = [
  body('nom')
    .notEmpty().withMessage('Le nom du département est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
  body('responsableId')
    .optional()
    .isUUID().withMessage('ID de responsable invalide'),
  handleValidationErrors
]

export const validateDepartementId = [
  param('id')
    .isUUID().withMessage('ID de département invalide'),
  handleValidationErrors
]

// ========== VALIDATIONS RAPPORT ==========
export const validateRapport = [
  body('departementId')
    .isUUID().withMessage('ID de département invalide'),
  body('titre')
    .notEmpty().withMessage('Le titre est requis')
    .isLength({ max: 200 }).withMessage('Le titre ne peut pas dépasser 200 caractères'),
  body('contenu')
    .notEmpty().withMessage('Le contenu est requis'),
  body('periode')
    .optional()
    .isISO8601().withMessage('Date de période invalide')
    .toDate(),
  handleValidationErrors
]

export const validateRapportId = [
  param('id')
    .isUUID().withMessage('ID de rapport invalide'),
  handleValidationErrors
]

// ========== VALIDATIONS UTILISATEUR ==========
export const validateUtilisateur = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('motDePasse')
    .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('role')
    .isIn(['pasteur', 'tresorier', 'secretaire', 'chef_departement', 'administrateur'])
    .withMessage('Rôle invalide'),
  body('membreId')
    .optional()
    .isUUID().withMessage('ID de membre invalide'),
  handleValidationErrors
]

export const validateUtilisateurUpdate = [
  body('email')
    .optional()
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['pasteur', 'tresorier', 'secretaire', 'chef_departement', 'administrateur'])
    .withMessage('Rôle invalide'),
  body('actif')
    .optional()
    .isBoolean().withMessage('actif doit être un booléen'),
  body('membreId')
    .optional()
    .isUUID().withMessage('ID de membre invalide'),
  handleValidationErrors
]

export const validateUtilisateurId = [
  param('id')
    .isUUID().withMessage('ID d\'utilisateur invalide'),
  handleValidationErrors
]

// ========== VALIDATIONS PAGINATION ==========
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La page doit être un nombre positif')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100')
    .toInt(),
  handleValidationErrors
]

// ========== VALIDATIONS DATE ==========
export const validateDateRange = [
  query('dateDebut')
    .optional()
    .isISO8601().withMessage('Date de début invalide')
    .toDate(),
  query('dateFin')
    .optional()
    .isISO8601().withMessage('Date de fin invalide')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.dateDebut && value && new Date(value) < new Date(req.query.dateDebut)) {
        throw new Error('La date de fin doit être après la date de début')
      }
      return true
    }),
  handleValidationErrors
]

// ========== VALIDATIONS SPECIFIQUES POUR LES TRANSACTIONS ==========

/**
 * Validation pour les filtres de transaction
 */
export const validateTransactionFilters = [
  query('type')
    .optional()
    .isIn(['entree', 'sortie']).withMessage('Le type doit être "entree" ou "sortie"'),
  query('categorieId')
    .optional()
    .isUUID().withMessage('ID de catégorie invalide'),
  query('membreId')
    .optional()
    .isUUID().withMessage('ID de membre invalide'),
  query('devise')
    .optional()
    .isIn(['USD', 'CDF']).withMessage('La devise doit être "USD" ou "CDF"')
    .customSanitizer(value => {
      if (!value) return undefined
      return String(value).toUpperCase().trim()
    }),
  query('dateDebut')
    .optional()
    .isISO8601().withMessage('Date de début invalide')
    .toDate(),
  query('dateFin')
    .optional()
    .isISO8601().withMessage('Date de fin invalide')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.dateDebut && value && new Date(value) < new Date(req.query.dateDebut)) {
        throw new Error('La date de fin doit être après la date de début')
      }
      return true
    }),
  handleValidationErrors
]

/**
 * Validation pour les rapports financiers
 */
export const validateFinancialReport = [
  query('periode')
    .optional()
    .isIn(['all', 'week', 'month', 'year']).withMessage('La période doit être "all", "week", "month" ou "year"'),
  query('dateDebut')
    .optional()
    .isISO8601().withMessage('Date de début invalide')
    .toDate(),
  query('dateFin')
    .optional()
    .isISO8601().withMessage('Date de fin invalide')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.dateDebut && value && new Date(value) < new Date(req.query.dateDebut)) {
        throw new Error('La date de fin doit être après la date de début')
      }
      return true
    }),
  handleValidationErrors
]

// ========== EXPORT PAR DÉFAUT ==========
export default {
  handleValidationErrors,
  validateLogin,
  validateChangePassword,
  validateMembre,
  validateMembreUpdate,
  validateMembreId,
  validateTransaction,
  validateTransactionId,
  validateTransactionFilters,
  validateFinancialReport,
  validateCategorie,
  validateCategorieId,
  validateDepartement,
  validateDepartementId,
  validateRapport,
  validateRapportId,
  validateUtilisateur,
  validateUtilisateurUpdate,
  validateUtilisateurId,
  validatePagination,
  validateDateRange
}