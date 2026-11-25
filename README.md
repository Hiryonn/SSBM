# PlatFight Studio

Créateur de jeux de combat façon Super Smash Bros, en 2D. Il importe les persos et stages **Mugen** (dont les JUS chars) et contient un éditeur de persos, un éditeur de stages et un mode combat jusqu'à 4 joueurs (humains ou CPU).

## Lancer le logiciel

- **Windows** : télécharge `PlatFight-Studio-Windows.zip` dans l'onglet **Releases** de ce dépôt, extrais-le et lance `PlatFight Studio.exe` (laisse-le dans son dossier). Le dossier `PlatFight-Studio-Windows` du dépôt ne contient pas le `.exe` : il dépasse la limite de 100 Mo de GitHub. Tes persos et stages sont gardés dans `%APPDATA%\PlatFight Studio`.
- **N'importe quel PC** : ouvre `dist/index.html` dans Chrome ou Edge. Les données sont gardées dans le navigateur.

F11 passe en plein écran dans la version .exe.

**Manette** : elle marche partout. Dans les menus : stick ou croix pour bouger, bouton bas pour valider, bouton droit pour revenir. Sur l'écran Combat, chaque manette rejoint la partie au premier appui et Start lance le combat. En jeu, Start met en pause (puis B pour quitter). Les boutons se règlent dans Options → Manettes.

## Importer des persos Mugen / JUS

Menu **Importer**, puis dépose un dossier de perso, plusieurs dossiers ou un `.zip`.
Le logiciel lit le `.def`, le `.sff` (v1 et v2), le `.air` (animations et hitbox Clsn), le `.cmd` (pour deviner quels coups vont où) et les palettes `.act`.

Les fichiers `.cns` / `.st` (le code Mugen) ne sont **pas** utilisés : le gameplay Smash est géré par le moteur. Après l'import, ouvre le perso dans l'**éditeur de persos** pour vérifier quels coups sont attribués à quelles animations.

Les sons `.snd` ne sont pas encore importés (le jeu génère des bruitages simples).

## Commandes par défaut

| Action | Clavier 1 | Clavier 2 | Manette |
|---|---|---|---|
| Bouger | Z Q S D (W A S D en QWERTY) | Flèches | Stick gauche / croix |
| Attaque | J | Pavé 1 | Bouton droit |
| Spécial | K | Pavé 2 | Bouton bas |
| Saut | L ou Espace (ou Haut) | Pavé 3 | Boutons gauche / haut |
| Bouclier / esquive | M ou Maj gauche | Pavé 0 | Gâchettes |
| Smash | I (ou direction + attaque en même temps) | Pavé 5 | Stick droit |
| Pause | Entrée | Entrée du pavé | Start |

Tout se change dans **Options**.

## Le gameplay

- Pourcentages, éjection calculée avec la formule de Smash (dégâts, poids, base, croissance), influence directionnelle (DI).
- Vies ou temps, équipes, jusqu'à 4 joueurs, CPU niveaux 1 à 9.
- Double saut, petit saut, chute rapide, plateformes traversables (Bas pour descendre), rebords (accroche automatique, remontée, saut, attaque).
- Bouclier (s'use et peut se briser), roulades, esquive sur place, esquive aérienne.
- Attaques smash chargeables, aériens avec retard à l'atterrissage, spécial haut avec chute sans défense, projectiles.
- Rattrapage au sol (appuie sur Bouclier juste avant de toucher le sol en vrille).

## Éditeur de persos

- **Coups** : 19 emplacements Smash (attaques au sol, smashs, aériens, spéciaux, rebord, relevé). Pour chacun : l'animation, puis un ou plusieurs « coups » (éléments couverts, dégâts, angle, éjection de base, croissance). Une estimation du pourcentage de KO s'affiche.
- **Anims** : toutes les animations ; on peut ajouter, dupliquer, supprimer, réordonner les éléments, changer sprite, durée, décalage.
- **Hitbox** : dessine-les à la souris (rouge = frappe, bleu = zone touchable), déplace-les et redimensionne-les avec les poignées.
- **États** : quelle anim jouer à l'attente, la marche, le saut, le bouclier, quand on est touché…
- **Fiche** : nom, échelle, poids, vitesses, sauts, gravité, couleurs alternatives (palettes .act ou teinte), ajout de tes propres sprites PNG (y compris des planches de sprites).
- **▶ Tester** lance un entraînement sans enregistrer (H affiche les hitbox, R remet à zéro).
- Ctrl+Z / Ctrl+Y pour annuler et rétablir, Ctrl+S pour enregistrer.

## Éditeur de stages

Sols pleins (avec rebords), plateformes traversables, points de départ des 4 joueurs, point de réapparition, zone de KO, limites de la caméra, calques de décor (parallaxe, répétition, défilement, devant ou derrière les persos), images PNG en décor, couleur ou dégradé de fond, musique.

Pour un stage Mugen importé, le sol est posé par défaut de -200 à 200 : ajuste-le pour qu'il colle au dessin du décor.

## Fichiers

- `.pfchar.json` : un perso PlatFight (sprites, anims, coups, stats, couleurs).
- `.pfstage.json` : un stage PlatFight.
- Options → **Exporter toute la bibliothèque** sauvegarde tout en un seul fichier.

Le dossier `PlatFight-contenu-MYTHOS/contenu` contient les 4 persos MYTHOS et le stage SSB64 déjà convertis : Importer → choisis ces fichiers `.json`.

## Mettre à jour / reconstruire le .exe

Double-clique sur **`mettre-a-jour.bat`** à la racine du dépôt. Il :

1. récupère la dernière version depuis GitHub (si le dossier a été cloné avec Git) ;
2. installe les outils nécessaires (la première fois seulement) ;
3. reconstruit le jeu et l'application Windows ;
4. place le résultat, `.exe` compris, dans `PlatFight-Studio-Windows\PlatFight Studio` ;
5. propose de lancer le jeu.

Il faut [Node.js](https://nodejs.org) (version LTS). Pour les mises à jour automatiques, il faut aussi [Git](https://git-scm.com) et avoir récupéré le dépôt avec `git clone https://github.com/Hiryonn/SSBM`. Tes persos et stages ne sont pas touchés.

## Modifier le code et reconstruire

Il faut [Node.js](https://nodejs.org) 18 ou plus.

```
npm install
node build.mjs            # crée dist/index.html
cd desktop
copy ..\dist\index.html .
npm install
npm run exe               # crée desktop/sortie/PlatFight-Studio-1.0.0.exe
npm run installeur        # ou un installeur classique
```

Organisation du code (`src/`) :

- `import/` : lecture des formats Mugen (sff, air, def, cmd, act) et des zip.
- `engine/` : moteur (personnage, stage, match, IA, entrées, sons).
- `ui/` : écrans (menus, combat, import, éditeurs).
- `data/` : formats, bibliothèque, contenu intégré.

Les persos et décors importés restent la propriété de leurs auteurs (et de Nintendo pour les personnages) : garde-les pour un usage personnel.
