# Murmure Browser Extension

Cette extension envoie le contexte de navigation (URL et titre de l'onglet actif) à Murmure pour améliorer la détection de contexte lors de la transcription.

## ⚠️ Prérequis important

**L'API HTTP locale est désactivée par défaut.** Vous devez l'activer manuellement :

1. Ouvrir **Murmure**
2. Aller dans **Settings → System**
3. Activer **API HTTP locale** (Expérimental)
4. Le port par défaut est `4800`
5. Redémarrer Murmure si nécessaire

> Sans cette activation, l'extension affichera "Murmure non détecté".

## Installation en mode développeur

### Chrome / Edge / Brave / Opera / Vivaldi

1. Ouvrir `chrome://extensions/` (ou `edge://extensions/` pour Edge)
2. Activer le **Mode développeur** (toggle en haut à droite)
3. Cliquer sur **Charger l'extension non empaquetée**
4. Sélectionner le dossier `browser-extension/chrome/`
5. L'extension apparaît dans la barre d'outils

### Firefox

1. Ouvrir `about:debugging#/runtime/this-firefox`
2. Cliquer sur **Charger un module temporaire**
3. Sélectionner le fichier `browser-extension/firefox/manifest.json`
4. L'extension est active jusqu'au redémarrage de Firefox

Pour une installation permanente sur Firefox:
1. Aller sur `about:config`
2. Définir `xpinstall.signatures.required` à `false`
3. Packager l'extension en `.xpi` avec `web-ext build`

## Configuration du port

Si vous utilisez un port différent de `4800` dans Murmure :

1. Modifier `MURMURE_API_URL` dans `background.js`:
   ```javascript
   const MURMURE_API_URL = 'http://127.0.0.1:VOTRE_PORT/api/context';
   ```
2. Recharger l'extension

## Utilisation

- L'extension envoie automatiquement le contexte à chaque changement d'onglet ou de page
- Cliquez sur l'icône de l'extension pour voir le statut de connexion
- Utilisez le toggle pour activer/désactiver temporairement l'envoi de contexte

## Sans l'extension

Si vous n'activez pas l'API ou n'installez pas l'extension, Murmure utilise un **fallback** qui détecte les URLs à partir du titre de la fenêtre du navigateur. Cette méthode fonctionne pour les services connus (Gmail, YouTube, GitHub, etc.) mais est moins précise.

## Publication

### Chrome Web Store

1. Créer un fichier ZIP du dossier `chrome/`:
   ```bash
   cd browser-extension
   zip -r murmure-context-chrome.zip chrome/
   ```
2. Aller sur [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
3. Créer un nouveau projet et uploader le ZIP
4. Remplir les informations et soumettre pour review

### Firefox Add-ons

1. Installer `web-ext`:
   ```bash
   npm install -g web-ext
   ```
2. Builder l'extension:
   ```bash
   cd browser-extension/firefox
   web-ext build
   ```
3. Aller sur [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
4. Soumettre le fichier `.zip` généré

## Sécurité

- L'extension ne communique qu'avec `localhost` / `127.0.0.1`
- Aucune donnée n'est envoyée à des serveurs externes
- Les URLs système (`chrome://`, `edge://`, `about:`, etc.) sont ignorées

## Dépannage

**"Murmure non détecté"**
- Vérifier que Murmure est lancé
- Vérifier que l'**API HTTP locale est activée** dans Settings → System
- Vérifier que le port correspond (4800 par défaut)

**L'extension ne détecte pas les changements**
- Recharger l'extension
- Vérifier les permissions dans le navigateur
