import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration du dossier d'upload
const uploadDir = path.join(__dirname, '../../uploads')

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'others'
    
    if (file.fieldname === 'justificatif') {
      subfolder = 'justificatifs'
    } else if (file.fieldname === 'avatar') {
      subfolder = 'avatars'
    } else if (file.fieldname === 'document') {
      subfolder = 'documents'
    }
    
    const folderPath = path.join(uploadDir, subfolder)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }
    
    cb(null, folderPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext)
    cb(null, `${name}-${uniqueSuffix}${ext}`)
  }
})

// Filtrer les fichiers
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
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
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Type de fichier non supporté'), false)
  }
}

// Configuration multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB par défaut
  },
  fileFilter: fileFilter
})

// Middleware pour upload simple
export const uploadJustificatif = upload.single('justificatif')

// Middleware pour upload avatar
export const uploadAvatar = upload.single('avatar')

// Middleware pour upload multiple
export const uploadMultiple = upload.fields([
  { name: 'justificatif', maxCount: 1 },
  { name: 'document', maxCount: 5 }
])

// Gestionnaire d'erreurs pour multer
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ 
        success: false, 
        message: 'Le fichier est trop volumineux' 
      })
    }
    return res.status(400).json({ 
      success: false, 
      message: err.message 
    })
  }
  if (err) {
    return res.status(400).json({ 
      success: false, 
      message: err.message 
    })
  }
  next()
}