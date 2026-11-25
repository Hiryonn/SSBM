# Builder de PlatFight Studio

Ce dossier contient les sources de l'app (`main.js`, `index.html`) et de quoi
fabriquer `PlatFight Studio.exe`.

## Construire le .exe sur ton PC

1. Installe [Node.js](https://nodejs.org) (version LTS), une seule fois.
2. Double-clique sur `build.bat`.
3. Le résultat arrive dans `dist/` :
   - `win-unpacked/PlatFight Studio.exe` : le jeu, prêt à lancer
   - `PlatFight-Studio-<version>-windows.zip` : le dossier complet zippé
   - `PlatFight-Studio-<version>-portable.exe` : un seul fichier, sans installation

Pour tester sans construire : `npm install` une fois, puis `npm start`.

Ne mets **pas** `node_modules/` ni `dist/` sur GitHub : ils sont trop lourds
(le `.gitignore` les exclut).

## Construire automatiquement sur GitHub

Le fichier `.github/workflows/build.yml` fait le build sur les serveurs de GitHub :

1. Publie une Release avec un tag du type `v1.2.0` (onglet **Releases › Draft a new release**). Le numéro du tag devient la version du build.
2. Attends quelques minutes : le `.zip` et le `.exe` portable sont ajoutés tout seuls à la Release.

Tu peux aussi lancer le build à la main : onglet **Actions › Build PlatFight Studio › Run workflow**.
Le résultat se télécharge alors en bas de la page du build.

## Modifier le jeu

Tout le code du jeu est dans `index.html`. Modifie-le, relance `build.bat`, c'est tout.
