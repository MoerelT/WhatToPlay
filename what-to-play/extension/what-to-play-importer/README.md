# WhatToPlay Importer

Extension WebExtension locale pour Firefox, Chrome et Edge.

## Installation dans Chrome ou Edge

1. Decompresser le fichier ZIP dans un dossier a conserver.
2. Ouvrir `chrome://extensions` ou `edge://extensions`.
3. Activer le mode developpeur.
4. Choisir `Charger l'extension non empaquetee`.
5. Selectionner le dossier decompresse.

## Installation temporaire dans Firefox

1. Ouvrir `about:debugging#/runtime/this-firefox`.
2. Choisir `Charger un module complementaire temporaire`.
3. Selectionner `manifest.json` dans le dossier decompresse.

## Liaison avec WhatToPlay

1. Sur la page Roue de WhatToPlay, generer puis copier un code de liaison.
2. Ouvrir l'extension depuis la barre d'outils du navigateur.
3. Pendant les tests, laisser l'URL `http://localhost:3000`.
4. Coller le code et choisir `Enregistrer la liaison`.
5. Se connecter au site source dans ce meme navigateur.
6. Utiliser le bouton d'import correspondant.

Pour Steam Family, la connexion doit etre active sur
`https://store.steampowered.com`. Laisser la page
`https://store.steampowered.com/account/familymanagement` ouverte, choisir
l'onglet `Bibliotheque`, cliquer sur `Afficher tout`, puis laisser cet onglet
actif pendant le clic sur `Importer Steam Family`.

Le code autorise l'extension a enregistrer les jeux dans le bon profil
WhatToPlay. Il ne contient aucun mot de passe ni cookie et expire apres
15 minutes. Les jeux importes restent dans la base. L'extension n'est ensuite
necessaire que pour actualiser Steam Family, RetroAchievements ou Instant
Gaming.
