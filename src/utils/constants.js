// ==================== RÔLES UTILISATEURS ====================
export const ROLES = {
  PASTEUR: 'pasteur',
  TRESORIER: 'tresorier',
  SECRETAIRE: 'secretaire',
  CHEF_DEPARTEMENT: 'chef_departement',
  ADMINISTRATEUR: 'administrateur'
}

// Liste des rôles pour validation
export const ROLES_LIST = Object.values(ROLES)

// ==================== STATUTS DES MEMBRES ====================
export const STATUT_MEMBRE = {
  ACTIF: 'actif',
  INACTIF: 'inactif',
  TRANSFERE: 'transfere'
}

export const STATUTS_MEMBRE_LIST = Object.values(STATUT_MEMBRE)

// ==================== TYPES DE TRANSACTIONS ====================
export const TYPE_TRANSACTION = {
  ENTREE: 'entree',
  SORTIE: 'sortie'
}

export const TYPES_TRANSACTION_LIST = Object.values(TYPE_TRANSACTION)

// ==================== PERMISSIONS PAR RÔLE ====================
export const PERMISSIONS = {
  [ROLES.ADMINISTRATEUR]: {
    membres: ['create', 'read', 'update', 'delete'],
    transactions: ['create', 'read', 'update', 'delete'],
    categories: ['create', 'read', 'update', 'delete'],
    departements: ['create', 'read', 'update', 'delete'],
    rapports: ['create', 'read', 'update', 'delete'],
    utilisateurs: ['create', 'read', 'update', 'delete'],
    dashboard: ['read']
  },
  [ROLES.PASTEUR]: {
    membres: ['read'],
    transactions: ['read'],
    categories: ['read'],
    departements: ['read'],
    rapports: ['read'],
    dashboard: ['read']
  },
  [ROLES.TRESORIER]: {
    transactions: ['create', 'read', 'update', 'delete'],
    categories: ['create', 'read', 'update', 'delete'],
    dashboard: ['read']
  },
  [ROLES.SECRETAIRE]: {
    membres: ['create', 'read', 'update', 'delete'],
    utilisateurs: ['create', 'read', 'update', 'delete'],
    departements: ['read']
  },
  [ROLES.CHEF_DEPARTEMENT]: {
    rapports: ['create', 'read', 'update', 'delete'],
    membres: ['read'],
    departements: ['read']
  }
}

// ==================== MESSAGES D'ERREUR ====================
export const ERROR_MESSAGES = {
  // Auth
  UNAUTHORIZED: 'Non authentifié. Veuillez vous connecter.',
  TOKEN_EXPIRED: 'Session expirée. Veuillez vous reconnecter.',
  TOKEN_INVALID: 'Token invalide.',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
  ACCOUNT_DISABLED: 'Compte désactivé. Contactez l\'administrateur.',
  
  // Permissions
  FORBIDDEN: 'Accès refusé. Vous n\'avez pas les droits nécessaires.',
  INSUFFICIENT_PERMISSIONS: 'Permissions insuffisantes pour cette action.',
  
  // Resources
  NOT_FOUND: 'Ressource non trouvée.',
  DUPLICATE: 'Cette ressource existe déjà.',
  ASSOCIATED_RECORDS: 'Cette ressource a des enregistrements associés.',
  
  // Validation
  INVALID_DATA: 'Données invalides.',
  MISSING_FIELDS: 'Champs requis manquants.',
  INVALID_FORMAT: 'Format de données invalide.',
  
  // Server
  INTERNAL_ERROR: 'Erreur interne du serveur.',
  DATABASE_ERROR: 'Erreur de base de données.',
  
  // Upload
  FILE_TOO_LARGE: 'Fichier trop volumineux.',
  FILE_TYPE_NOT_ALLOWED: 'Type de fichier non autorisé.',
  
  // Transactions
  INSUFFICIENT_FUNDS: 'Fonds insuffisants pour cette opération.',
  INVALID_TRANSACTION_TYPE: 'Type de transaction invalide.',
  CATEGORY_TYPE_MISMATCH: 'La catégorie ne correspond pas au type de transaction.',
}

// ==================== MESSAGES DE SUCCÈS ====================
export const SUCCESS_MESSAGES = {
  CREATED: 'Créé avec succès.',
  UPDATED: 'Modifié avec succès.',
  DELETED: 'Supprimé avec succès.',
  FETCHED: 'Récupéré avec succès.',
  LOGIN_SUCCESS: 'Connexion réussie.',
  LOGOUT_SUCCESS: 'Déconnexion réussie.',
  PASSWORD_CHANGED: 'Mot de passe changé avec succès.',
  UPLOAD_SUCCESS: 'Fichier uploadé avec succès.',
}

// ==================== CONFIGURATIONS ====================
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100
}

export const FILE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
}

// ==================== FORMATS DE DATE ====================
export const DATE_FORMATS = {
  DEFAULT: 'YYYY-MM-DD',
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_LONG: 'DD MMMM YYYY',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  API: 'YYYY-MM-DD'
}