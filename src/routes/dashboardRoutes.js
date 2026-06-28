// backend/src/routes/dashboardRoutes.js
import express from 'express'
import {
  getGlobalDashboard,
  getTresorierDashboard,
  getDepartementDashboard
} from '../controllers/dashboardController.js'
import { verifyToken, authorize } from '../middlewares/authMiddleware.js'
import { ROLES } from '../utils/constants.js'

const router = express.Router()

// MIDDLEWARE DE DEBUG
router.use((req, res, next) => {
  console.log('=== DASHBOARD ROUTER ===')
  console.log('URL:', req.method, req.originalUrl)
  console.log('Has token?', !!req.headers.authorization)
  next()
})

// Appliquer verifyToken à toutes les routes
router.use(verifyToken)

// ✅ Routes avec les rôles normalisés (utilisant les constantes ROLES)
router.get('/global', 
  authorize(
    ROLES.ADMINISTRATEUR, 
    ROLES.PASTEUR, 
    ROLES.SECRETAIRE, 
    ROLES.TRESORIER, 
    ROLES.CHEF_DEPARTEMENT
  ), 
  getGlobalDashboard
)

router.get('/tresorier', 
  authorize(ROLES.ADMINISTRATEUR, ROLES.TRESORIER), 
  getTresorierDashboard
)

router.get('/departement', 
  authorize(ROLES.ADMINISTRATEUR, ROLES.CHEF_DEPARTEMENT), 
  getDepartementDashboard
)

export default router