# MOTIF — Instructions pour les agents de développement

## Mission
MOTIF — Des documents qui donnent à entendre. Projet conçu et dirigé par Cian Reid, professeur d’éducation musicale. Permettre aux enseignants de transformer des PDF ou images (notamment des paroles préparées dans Canva) en documents interactifs contenant des zones cliquables associées à des extraits audio. L'élève doit pouvoir écouter facilement sur ordinateur, tablette ou téléphone.

## Principes non négociables
- Interface française, simple, accessible, identité violette et sobre. Préserver les usages existants.
- Gratuit, sans compte obligatoire, hébergement statique GitHub Pages. Pas de serveur applicatif ni API payante obligatoire.
- Traitement audio et documents local autant que possible. Ne pas transmettre les fichiers ou données des élèves à des services tiers. Documenter les requêtes externes et leurs implications RGPD; ne pas prétendre à une conformité certifiée.
- Préserver la compatibilité des projets .motif et des exports HTML autonomes. Tester hors ligne lorsque pertinent.
- Distinguer mode Essentiel (usage courant) et Avancé (outils experts). Ne pas surcharger l'interface.
- Ne pas ajouter de licence de diffusion sans décision du propriétaire.

## État et objectifs
Au 25 novembre 2026, index.html sur main et dev correspond à V0.8.1. Des versions locales V0.9.3/V0.9.4 ont été évoquées mais ne sont pas encore intégrées ni validées dans GitHub. Ne pas considérer les fonctionnalités suivantes comme acquises avant inspection et tests.
- Atelier : import PDF/image, création de zones, association à des extraits, lecture/pause, fondus, boucle, vitesse, zoom, marqueurs, sauvegarde et réouverture; vérifier ce qui existe réellement.
- Analyse de forme musicale (Avancé uniquement) : bouton explicite Analyser la forme, jamais automatique à l'import. Détecter les frontières et regrouper les sections similaires (A/B/C, couleurs communes). Ne pas prétendre identifier automatiquement couplet/refrain avec certitude. Renommage et correction manuelle des limites, fusion si pertinente, sélection d'une section puis création explicite d'un extrait. Marqueurs manuels indépendants. Masquer/supprimer l'analyse sans détruire les extraits. Persistance .motif. Structure commune pour pistes synchronisées. Traitement local, non bloquant si possible via Web Worker. Aucune séparation de stems demandée.
- Zones : guides temporaires horizontaux/verticaux, bords et centres des zones et de la page, magnétisme à la création, déplacement et redimensionnement. Désactivation via réglage et Alt/Option sur ordinateur. Prévoir tactile. Guides absents de l'export.
- Audio : pictogrammes explicites play/pause et courbes fade-in/out; préserver synchronisation des pistes, précision des extraits et qualité des fondus.
- Architecture : modularisation progressive et tests automatisés souhaités; TypeScript à évaluer, pas de réécriture massive imposée. Python possible pour prototypage/test, pas comme dépendance serveur en production.

## Workflow Git
- main = version publique. Ne jamais modifier, fusionner, déployer ou publier sur main sans accord explicite du propriétaire.
- dev = base de développement; branches de tâche et pull requests vers dev si possible. Petits commits explicites. Ne pas écraser les modifications existantes.
- MOTIF Lab = futur espace de test web séparé; pas encore publié. Proposer une stratégie de prévisualisation compatible Pages avant de la mettre en place.
- Inspecter le dépôt et la branche avant chaque tâche. Si un fichier local plus récent est fourni, comparer avant intégration; ne pas inventer son contenu.
- Expliquer en français les changements, tests réellement effectués, limites, risques et étapes de validation. Ne jamais annoncer un test non exécuté.
- Demander clarification avant une décision produit structurante, une dépendance externe importante, une migration incompatible ou une publication.

## Validation
Tester import PDF/image/audio, création/déplacement/redimensionnement de zones, lecture et fondus, sauvegarde/relecture .motif (anciens projets inclus), export HTML élève, mobile/tactile, clavier et accessibilité. Tester plusieurs genres pour l'analyse de forme et signaler ses limites. Vérifier erreurs console et régressions. Les blocages réseau/certificat de l'environnement cloud ne prouvent pas un bug de production.
Le projet actuel est statique; un serveur HTTP local (par ex. python3 -m http.server 8000) peut servir aux tests. Inspecter les dépendances réelles avant de changer la configuration.
