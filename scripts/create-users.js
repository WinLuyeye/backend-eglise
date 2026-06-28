// create-users.js
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createUsers() {
  try {
    console.log('🚀 Début de la création des utilisateurs...\n');

    // Récupérer les membres existants
    const membres = await prisma.membre.findMany({
      where: {
        email: {
          in: [
            'jean.dupont@email.com',
            'marie.mbemba@email.com',
            'pierre.kabasele@email.com',
            'claire.tshisekedi@email.com',
            'david.kibwe@email.com',
            'sophie.mulumba@email.com'
          ]
        }
      }
    });

    console.log(`📋 ${membres.length} membres trouvés dans la base\n`);

    // Créer un mapping email -> membreId
    const membreMap = {};
    membres.forEach(m => {
      membreMap[m.email] = m.id;
    });

    // Liste des utilisateurs à créer
    const utilisateursData = [
      {
        email: 'jean.dupont@email.com',
        motDePasse: 'Admin@123456',
        role: 'administrateur',
        membreEmail: 'jean.dupont@email.com',
        description: 'Administrateur'
      },
      {
        email: 'marie.mbemba@email.com',
        motDePasse: 'User@123456',
        role: 'tresorier',
        membreEmail: 'marie.mbemba@email.com',
        description: 'Trésorier'
      },
      {
        email: 'pierre.kabasele@email.com',
        motDePasse: 'User@123456',
        role: 'chef_departement',
        membreEmail: 'pierre.kabasele@email.com',
        description: 'Chef de département'
      },
      {
        email: 'claire.tshisekedi@email.com',
        motDePasse: 'User@123456',
        role: 'secretaire',
        membreEmail: 'claire.tshisekedi@email.com',
        description: 'Secrétaire'
      },
      {
        email: 'david.kibwe@email.com',
        motDePasse: 'User@123456',
        role: 'pasteur',
        membreEmail: 'david.kibwe@email.com',
        description: 'Pasteur'
      },
      {
        email: 'sophie.mulumba@email.com',
        motDePasse: 'User@123456',
        role: 'tresorier',
        membreEmail: 'sophie.mulumba@email.com',
        description: 'Trésorière adjointe'
      }
    ];

    const results = {
      created: [],
      errors: [],
      skipped: []
    };

    for (const userData of utilisateursData) {
      try {
        console.log(`📧 Traitement de: ${userData.email} (${userData.description})`);

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await prisma.utilisateur.findUnique({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`⚠️ L'utilisateur ${userData.email} existe déjà - Ignoré\n`);
          results.skipped.push({
            email: userData.email,
            reason: 'Utilisateur déjà existant'
          });
          continue;
        }

        // Récupérer le membreId
        const membreId = membreMap[userData.membreEmail] || null;
        
        if (membreId) {
          console.log(`✅ Membre trouvé pour ${userData.membreEmail}`);
        } else {
          console.log(`⚠️ Aucun membre trouvé pour ${userData.membreEmail} - L'utilisateur sera créé sans lien`);
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(userData.motDePasse, 10);

        // Créer l'utilisateur
        const utilisateur = await prisma.utilisateur.create({
          data: {
            email: userData.email,
            motDePasse: hashedPassword,
            role: userData.role,
            membreId: membreId,
            actif: true
          },
          include: {
            membre: {
              select: {
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        });

        // Supprimer le mot de passe pour l'affichage
        const { motDePasse, ...utilisateurSansMdp } = utilisateur;

        results.created.push({
          ...utilisateurSansMdp,
          motDePasse: userData.motDePasse,
          description: userData.description,
          membre: utilisateur.membre ? {
            nom: utilisateur.membre.nom,
            prenom: utilisateur.membre.prenom,
            email: utilisateur.membre.email
          } : null
        });

        console.log(`✅ Utilisateur créé: ${userData.email} (${userData.role}) - ${userData.description}\n`);

      } catch (error) {
        console.error(`❌ Erreur pour ${userData.email}:`, error.message);
        results.errors.push({
          email: userData.email,
          error: error.message
        });
      }
    }

    // Afficher les résultats
    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSULTATS DE LA CRÉATION DES UTILISATEURS');
    console.log('='.repeat(70) + '\n');

    if (results.created.length > 0) {
      console.log('✅ UTILISATEURS CRÉÉS AVEC SUCCÈS:');
      console.log('-'.repeat(70));
      results.created.forEach((user, index) => {
        console.log(`\n📌 Utilisateur ${index + 1}:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Mot de passe: ${user.motDePasse}`);
        console.log(`   Rôle: ${user.role}`);
        console.log(`   Description: ${user.description}`);
        console.log(`   Statut: ${user.actif ? '✅ Actif' : '❌ Inactif'}`);
        if (user.membre) {
          console.log(`   Membre: ${user.membre.nom} ${user.membre.prenom}`);
        } else {
          console.log(`   ⚠️ Non lié à un membre`);
        }
        console.log(`   ID: ${user.id}`);
      });
    }

    if (results.skipped.length > 0) {
      console.log('\n⏭️ UTILISATEURS IGNORÉS (déjà existants):');
      console.log('-'.repeat(70));
      results.skipped.forEach((skipped, index) => {
        console.log(`   ${index + 1}. ${skipped.email}: ${skipped.reason}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ ERREURS:');
      console.log('-'.repeat(70));
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.email}: ${error.error}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('📈 RÉSUMÉ:');
    console.log(`   ✅ Créés: ${results.created.length}`);
    console.log(`   ⏭️ Ignorés: ${results.skipped.length}`);
    console.log(`   ❌ Erreurs: ${results.errors.length}`);
    console.log('='.repeat(70) + '\n');

    // Résumé des identifiants de connexion
    if (results.created.length > 0) {
      console.log('🔑 IDENTIFIANTS DE CONNEXION:');
      console.log('-'.repeat(70));
      console.log('   EMAIL                    | MOT DE PASSE    | RÔLE');
      console.log('   ' + '-'.repeat(68));
      results.created.forEach(user => {
        const email = user.email.padEnd(25);
        const password = user.motDePasse.padEnd(15);
        console.log(`   ${email}| ${password}| ${user.role}`);
      });
      console.log('-'.repeat(70) + '\n');
    }

    // Sauvegarder les résultats dans un fichier
    try {
      const fs = await import('fs');
      const resultsJson = {
        timestamp: new Date().toISOString(),
        total: results.created.length + results.errors.length + results.skipped.length,
        ...results
      };
      fs.writeFileSync(
        'utilisateurs_creation_results.json',
        JSON.stringify(resultsJson, null, 2)
      );
      console.log('📄 Résultats sauvegardés dans utilisateurs_creation_results.json');
    } catch (error) {
      console.log('⚠️ Impossible de sauvegarder le fichier JSON');
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Déconnexion de la base de données');
  }
}

// Exécution du script
createUsers();