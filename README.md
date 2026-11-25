# PlatFight Studio

Créateur de jeux de combat façon Super Smash Bros, en 2D. Il importe les persos et stages **Mugen** (dont les JUS chars) et contient un éditeur de persos, un éditeur de stages et un mode combat jusqu'à 4 joueurs (humains ou CPU).

## Lancer le logiciel

- **Windows** : télécharge `PlatFight-Studio-Windows.zip` dans l'onglet **Releases** de ce dépôt, extrais-le et lance `PlatFight Studio.exe` (laisse-le dans son dossier). Le dossier `PlatFight-Studio-Windows` du dépôt ne contient pas le `.exe` : il dépasse la limite de 100 Mo de GitHub. Tes persos et stages sont gardés dans `%APPDATA%\PlatFight Studio`.
- **N'importe quel PC** : ouvre `dist/index.html` dans Chrome ou Edge. Les données sont gardées dans le navigateur.

F11 passe en plein écran dans la version .exe.

**Manette** : elle marche partout. Dans les menus : stick ou croix pour bouger, bouton bas pour valider, bouton droit pour revenir. Sur l'écran Combat, chaque manette rejoint la partie au premier appui et Start lance le combat. En jeu, Start met en pause (puis B pour quitter). Les boutons se règlent dans Options → Manettes.

## Projets (comme Pokémon Studio)

Au lancement, l'accueil liste tes **projets récents**. Un projet = un jeu.

- **Nouveau projet** : tu donnes un nom, puis tu choisis où créer son dossier. Il contient :
  - `projet.json` : le nom, le logo, l'écran titre, les règles et la physique du jeu ;
  - `persos/` : un fichier `.pfchar.json` par perso ;
  - `stages/` : un fichier `.pfstage.json` par stage (l'arène d'entraînement est ajoutée au départ).
- **Ouvrir un projet** : choisis le dossier qui contient `projet.json`.
- Dans le navigateur, les projets sont rangés dans le navigateur au lieu d'un dossier.
- Si tu avais des persos dans l'ancienne version, l'accueil propose de les mettre dans un nouveau projet.

Une fois le projet ouvert, la barre de gauche donne accès à **Accueil** (tableau de bord avec une liste « À faire »), **Persos**, **Stages**, **Jeu** (réglages, physique, export), **Importer** et **Options**.

## Tester le jeu

Le bouton **Tester** en bas de la barre (ou **F5**, depuis n'importe quel écran) lance ton jeu dans **sa propre fenêtre**, exactement comme les joueurs le verront. L'éditeur reste ouvert à côté : modifie, enregistre, puis appuie de nouveau sur F5 pour relancer le test dans la même fenêtre. « Quitter » ferme seulement la fenêtre de test.

Dans les éditeurs, « Essayer ce perso » / « Essayer ce stage » lancent un entraînement rapide sans enregistrer.

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
- **Sons** (dans la Fiche) : importe des MP3/WAV/OGG, écoute-les, choisis le son du saut, de l'éjection et du KO. Chaque coup a son propre « Son du coup ».
- **Découper une planche automatiquement…** (dans la Fiche) : ouvre une planche de sprites brute (fond uni), le logiciel détecte chaque pose, les range par rangée et crée une anim par rangée cochée.
- **▶ Tester** lance un entraînement sans enregistrer (H affiche les hitbox, R remet à zéro).
- Ctrl+Z / Ctrl+Y pour annuler et rétablir, Ctrl+S pour enregistrer.

## Éditeur de stages

Sols pleins (avec rebords), plateformes traversables, points de départ des 4 joueurs, point de réapparition, zone de KO, limites de la caméra, calques de décor (parallaxe, répétition, défilement, devant ou derrière les persos), images PNG en décor, couleur ou dégradé de fond, musique.

Pour un stage Mugen importé, le sol est posé par défaut de -200 à 200 : ajuste-le pour qu'il colle au dessin du décor.

## Exporter ton jeu

Page **Jeu** du projet :

- le nom, le sous-titre, l'auteur, la version et la couleur principale du jeu ;
- un logo (PNG transparent conseillé ; sinon le nom est écrit en grand) ;
- l'écran titre : un combat de démonstration entre CPU sur le stage de ton choix, ou une image ;
- les règles par défaut, si le mode entraînement est accessible, et la physique du jeu.

Tous les persos et stages du projet sont dans le jeu.

**Aperçu de l'écran titre** montre l'écran titre sans rien créer.
**Exporter le jeu** :

- depuis `PlatFight Studio.exe` : tu choisis un dossier, et il y crée un dossier au nom du jeu contenant `Nom du jeu.exe`. Ce .exe lance directement ton jeu, sans les éditeurs. Pour le partager, zippe et envoie **tout le dossier**. Chaque jeu garde ses réglages dans son propre dossier (`%APPDATA%\Nom du jeu`) ;
- depuis le navigateur : il télécharge une page `Nom du jeu.html` autonome qui s'ouvre dans Chrome ou Edge.

La physique (éjection, vitesse…) se règle dans la page Jeu ; les joueurs peuvent changer leurs touches, leurs manettes et le son, mais pas la physique.

Le .exe d'un jeu exporté garde l'icône de PlatFight Studio.

## Ressources de Super Smash Flash

Le dossier `ressources/smash-flash/` contient les planches de sprites, décors, sons, musiques et logos du jeu Super Smash Flash (2006), pour fabriquer tes persos et stages. Voir `ressources/smash-flash/LISEZMOI.md`.

Le projet **`projets/Super Smash Flash/`** est déjà prêt à ouvrir (« Ouvrir un projet » dans la version Windows) :

- 30 persos jouables, avec leurs sons : Mario, Luigi, Link, Young Link, Zelda, Sheik, Samus, Pikachu, Jigglypuff, Mewtwo, Kirby, Meta Knight, Fox, Captain Falcon, Mr. Game & Watch, Sonic, Super Sonic, Shadow, Tails, Knuckles, Megaman X, Zero, Cloud, Crono, Lloyd, Inuyasha, Naruto, Mr. Incredible, Blade, Blue ;
- 11 stages avec leur musique : Champ de bataille, Destination Finale, Temple, Château de Peach, Stade Pokémon, Royaume Champignon, Dream Land, Green Hill, Royaume II, Île de Wario, Rêve étoilé.

Ils ont été fabriqués depuis les planches par les scripts de `outils/smash-flash/` (Python 3 + numpy + Pillow) : `python run.py mario link` refait des persos, `python build_stage.py` refait les stages. Chaque perso est décrit dans `outils/smash-flash/specs/<perso>.py` (quelles poses pour quelle anim, réglages des coups) : modifie-le puis relance pour corriger un perso. `python grid.py <planche> apercu.png` montre les poses d'une planche avec leur numéro « rangée.index ». Tu peux aussi tout retoucher directement dans l'éditeur.

## Fichiers

- `.pfchar.json` : un perso PlatFight (sprites, anims, coups, stats, couleurs).
- `.pfstage.json` : un stage PlatFight.
- Options → **Exporter tout le projet** regroupe les persos et stages du projet dans un seul fichier.

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

Le code du jeu est dans `src/` :

- `import/` : lecture des formats Mugen (sff, air, def, cmd, act) et des zip.
- `engine/` : moteur (personnage, chopes, stage, match, IA, entrées, sons).
- `ui/` : écrans (accueil des projets, barre latérale, tableau de bord, combat, import, éditeurs, page Jeu).
- `data/` : formats, bibliothèque, jeux exportés, contenu intégré.

`node build.mjs` assemble le jeu dans `dist/index.html` (version web) et `builder/index.html` (version Windows). Ne modifie pas ces deux fichiers à la main.

Pour fabriquer le .exe :

- **sur ton PC** : `builder/build.bat` (ou `mettre-a-jour.bat`, qui place en plus le résultat dans `PlatFight-Studio-Windows`) ;
- **sur GitHub** : publie une Release avec un tag du type `v1.2.0` (ou lance le workflow à la main dans l'onglet Actions) ; le .zip et le .exe portable sont ajoutés à la Release. Voir `builder/LISEZMOI.md`.
