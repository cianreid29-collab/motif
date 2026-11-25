# motif
MOTIF — Des documents qui donnent à entendre. Atelier de création pédagogique musicale.

## Documents, audio et connexion Internet

- **Import PDF.** Au premier import, le navigateur charge PDF.js depuis `cdn.jsdelivr.net`. PDF.js lit et convertit le fichier sur ton appareil. Le PDF et les pistes audio restent sur ton appareil. Si le réseau de l’établissement bloque ce chargement, tu peux importer les pages sous forme d’images PNG ou JPEG.
- **QR code facultatif.** Après confirmation, `api.qrserver.com` reçoit l’adresse que tu as saisie et renvoie une image de QR code. Utilise une adresse publique sans données personnelles ni lien privé. MOTIF laisse l’hébergement du document à ta charge. Tu peux aussi transmettre directement son adresse aux élèves.
- **Fichiers et sauvegardes.** La bibliothèque locale est liée au navigateur et à l’appareil. Télécharge un fichier `.motif` pour conserver une copie modifiable. L’export HTML contient le document et le son nécessaires à l’écoute hors ligne.

## Vérifier l’analyse de forme

Depuis la racine du dépôt, lance `node --test` avec Node.js. Les tests génèrent des signaux en mémoire pour vérifier le regroupement A/B/A, un signal homogène et un son très court. Ils servent à détecter des régressions entre versions. L’évaluation musicale se fait à l’écoute sur des morceaux variés.
