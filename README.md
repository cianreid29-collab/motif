# motif
MOTIF — Des documents qui donnent à entendre. Atelier de création pédagogique musicale.

## Documents, audio et connexion Internet

- **Import PDF.** Au premier import, le navigateur charge PDF.js depuis `cdn.jsdelivr.net`. PDF.js lit et convertit le fichier sur ton appareil. Le PDF et les pistes audio restent sur ton appareil. Si le réseau de l’établissement bloque ce chargement, tu peux importer les pages sous forme d’images PNG ou JPEG.
- **QR code facultatif.** Après confirmation, `api.qrserver.com` reçoit l’adresse que tu as saisie et renvoie une image de QR code. Utilise une adresse publique sans données personnelles ni lien privé. MOTIF laisse l’hébergement du document à ta charge. Tu peux aussi transmettre directement son adresse aux élèves.
- **Fichiers et sauvegardes.** La bibliothèque locale est liée au navigateur et à l’appareil. Télécharge un fichier `.motif` pour conserver une copie modifiable. L’export HTML contient le document et le son nécessaires à l’écoute hors ligne.

## Vérifier l’analyse de forme

Depuis la racine du dépôt, lance `node --test` avec Node.js. Les tests génèrent des signaux en mémoire pour vérifier le regroupement A/B/A, un signal homogène et un son très court. Ils servent à détecter des régressions entre versions. L’évaluation musicale se fait à l’écoute sur des morceaux variés.

## Pilote de publication sur motif-demo

Depuis **Partager → Connecter GitHub pour publier**, configure un jeton à accès limité dans GitHub. Choisis le dépôt `cianreid29-collab/motif-demo` seul et le droit **Contents → Read and write**. Colle le jeton dans l’atelier. L’option **Mémoriser sur cet appareil personnel** le conserve dans le navigateur jusqu’à déconnexion ou expiration. Sur un appareil partagé, utilise la connexion pour l’onglet. Révoque le jeton dans GitHub si nécessaire.

**Partager → Publier et copier le lien** envoie à GitHub une fiche HTML contenant les pages et les seuls extraits liés aux zones, ainsi que sa miniature créée à partir de la première page. Les deux fichiers sont ajoutés ensemble dans `fiches/` sur `main` dans `motif-demo`. GitHub Pages doit servir la racine de cette branche pour que le lien devienne accessible. Le passage en ligne peut prendre quelques minutes. La fiche et sa miniature sont publiques.

La copie .motif, les pistes complètes et les annotations de l’élève sont conservées à part. Le jeton n’entre ni dans le projet ni dans le document élève. L’export HTML local et le ZIP restent utilisables avec la connexion GitHub désactivée.

## Service de partage par lien public

Le bouton **Créer un lien public** utilise le service Node.js de `publication/server.mjs`. Les professeurs ouvrent une fenêtre de connexion avec l’identifiant `enseignant`. Le navigateur peut retenir cette connexion pendant sa session. Les élèves consultent les fiches directement par HTTPS. L’atelier transmet la fiche et sa miniature ensemble. Le professeur garde son fichier .motif à part.

Pour activer le service sur un hébergement Node.js 22 ou supérieur, configurer ces variables dans l’hébergeur.

| Variable | Valeur |
| --- | --- |
| `MOTIF_ATELIER_ORIGIN` | Origine HTTPS de l’atelier, par exemple `https://cianreid29-collab.github.io` |
| `MOTIF_PUBLISHER_ORIGIN` | Origine HTTPS réservée à la publication, par exemple `https://publier.example.org` |
| `MOTIF_PUBLIC_ORIGIN` | Origine HTTPS distincte pour les fiches publiques, par exemple `https://lire.example.org` |
| `MOTIF_PUBLISH_PASSWORD` | Mot de passe enseignant aléatoire, d’au moins 20 caractères, renseigné côté serveur |
| `MOTIF_STORAGE` | Dossier persistant et sauvegardé pour les fiches |

Lancer `node publication/server.mjs`. Le service écoute sur `127.0.0.1:8880` par défaut. Deux hôtes virtuels HTTPS du proxy inverse redirigent vers ce serveur en conservant chacun l’en-tête `Host`. Puis renseigner `window.MOTIF_PUBLICATION = {publisherOrigin: 'https://publier.example.org', publicOrigin: 'https://lire.example.org'}` dans `sharing-config.js` et republier l’atelier pour activer le bouton. La connexion GitHub du pilote reste disponible dans le menu en attendant l’activation. Les fiches deviennent accessibles à toute personne ayant leur lien.
