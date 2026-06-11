import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gestion d\'Église',
      version: '1.0.0',
      description: `
        API complète pour la gestion d'une église.
        
        ## Fonctionnalités
        - Gestion des membres
        - Gestion financière (entrées/sorties)
        - Gestion des départements
        - Rapports départementaux
        - Gestion des utilisateurs et rôles
        - Tableaux de bord
        
        ## Rôles disponibles
        - **Pasteur**: Vue globale
        - **Trésorier**: Gestion finances
        - **Secrétaire**: Gestion membres et utilisateurs
        - **Chef département**: Rapports de son département
        - **Administrateur**: Accès total
      `,
      contact: {
        name: 'Support Technique',
        email: 'support@eglise.com',
        url: 'https://eglise.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Serveur de développement',
      },
      {
        url: 'https://api.eglise.com/api',
        description: 'Serveur de production',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Entrez votre token JWT',
        },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['email', 'motDePasse'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'pasteur@eglise.com',
            },
            motDePasse: {
              type: 'string',
              format: 'password',
              example: 'password123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                nom: { type: 'string' },
                prenom: { type: 'string' },
              },
            },
          },
        },
        Membre: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nom: { type: 'string', example: 'MARTIN' },
            prenom: { type: 'string', example: 'Jean' },
            email: { type: 'string', format: 'email', example: 'jean@eglise.com' },
            telephone: { type: 'string', example: '771234567' },
            adresse: { type: 'string', example: '12 Rue de l\'Église' },
            dateNaissance: { type: 'string', format: 'date' },
            statut: { type: 'string', enum: ['actif', 'inactif', 'transfere'] },
            departementId: { type: 'string', format: 'uuid' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['entree', 'sortie'] },
            montant: { type: 'number', example: 50000 },
            dateTransaction: { type: 'string', format: 'date' },
            description: { type: 'string', example: 'Dîme janvier' },
            categorie: {
              type: 'object',
              properties: {
                nom: { type: 'string' },
                type: { type: 'string' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: { type: 'string' },
                  param: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentification' },
      { name: 'Membres', description: 'Gestion des membres' },
      { name: 'Transactions', description: 'Gestion financière' },
      { name: 'Categories', description: 'Catégories de transactions' },
      { name: 'Departements', description: 'Gestion des départements' },
      { name: 'Rapports', description: 'Rapports départementaux' },
      { name: 'Utilisateurs', description: 'Gestion des utilisateurs' },
      { name: 'Dashboard', description: 'Tableaux de bord' },
    ],
  },
  apis: ['./src/routes/*.js'],
}

export const specs = swaggerJsdoc(options)
export { swaggerUi }