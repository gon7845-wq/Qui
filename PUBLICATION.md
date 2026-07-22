# Publier « Qui ? » sur Google Play et l'App Store

L'app mobile est une coquille native **Capacitor** ([client/capacitor.config.ts](client/capacitor.config.ts))
qui embarque le jeu web et se connecte au serveur Railway
(`https://qui-production-8582.up.railway.app`).

> ⚠️ **Avant la toute première publication**, choisis définitivement l'`appId`
> (actuellement `com.quigame.app` dans `capacitor.config.ts`). Une fois l'app
> publiée sur Google Play, il est **impossible d'en changer**.
> Si tu le changes : `npx cap sync` puis vérifie
> `android/app/build.gradle` (applicationId) et le projet Xcode.

---

## 1. Android (Google Play) — faisable depuis ta machine Windows, build dans le cloud

### a. Récupérer un APK de test (déjà possible)
1. Pousse sur `main` → GitHub Actions lance le workflow **Android**.
2. Onglet **Actions** du repo → run « Android » → artifact **qui-debug-apk**.
3. Installe `app-debug.apk` sur un téléphone Android (autoriser les sources inconnues) et teste :
   créer une partie, rejoindre depuis un autre téléphone/le site web, connexion Google et lien magique.

### b. Créer la clé de signature (une seule fois)
1. Onglet **Actions** → workflow **Generate Android Keystore** → « Run workflow ».
2. Télécharge l'artifact `android-keystore-A-SUPPRIMER-APRES`.
3. Dans **Settings → Secrets and variables → Actions**, crée les 4 secrets listés
   dans `SECRETS_A_CREER.txt`.
4. **Garde une copie de `upload.keystore` et du mot de passe en lieu sûr**
   (gestionnaire de mots de passe) — si tu les perds, tu ne pourras plus mettre à jour l'app.
5. **Supprime l'artifact** du run (bouton corbeille) puis relance le workflow **Android** :
   il produira l'artifact **qui-release-aab** signé, prêt pour le Play Store.

### c. Publier sur Google Play
1. Crée un compte développeur : https://play.google.com/console — **25 $ une seule fois**
   (vérification d'identité : quelques jours).
2. « Créer une application » → nom **Qui ?**, français, gratuit.
3. Remplis la fiche : description, icône 512×512 (`client/assets/icon.png` redimensionnée),
   au moins 2 captures d'écran par format (prends-les depuis l'app ou le site en mode mobile),
   bannière 1024×500.
4. Questionnaires obligatoires : classification du contenu, sécurité des données
   (l'app collecte : e-mail si connexion — déclare-le), public cible (13+ conseillé vu le contenu des questions).
5. **Politique de confidentialité** : URL obligatoire. Ajoute une page
   `https://qui-production-8582.up.railway.app/privacy` (à créer) ou une page GitHub Pages.
6. « Production » → « Créer une release » → active **Play App Signing** (proposé par défaut) →
   téléverse `app-release.aab` → soumets pour examen (quelques jours la première fois).

⚠️ Compte perso créé après nov. 2023 : Google impose un **test fermé avec 12 testeurs
pendant 14 jours** avant de pouvoir passer en production. Prévois ça dans le planning
(famille/amis + le lien d'opt-in du Play Console).

### d. Mises à jour
À chaque nouvelle version : incrémente `versionCode` (+1) et `versionName` dans
[client/android/app/build.gradle](client/android/app/build.gradle), pousse sur `main`,
récupère l'AAB signé et téléverse-le dans une nouvelle release.

---

## 2. iOS (App Store) — nécessite un Mac (ou un service cloud)

Le projet Xcode est prêt dans [client/ios](client/ios) (icônes et splash générés,
deep link `qui://` déclaré). Mais **Apple impose Xcode sur macOS** pour compiler et signer.

Options :
- **Un Mac (même d'emprunt)** : `npm ci && npm run build && npx cap open ios` dans `client/`,
  puis Product → Archive → Distribute.
- **Cloud** : Codemagic (offre gratuite ~500 min/mois, config Capacitor native) ou
  Ionic Appflow. GitHub Actions propose aussi des runners macOS (payants hors repos publics).

Étapes :
1. Compte **Apple Developer Program** : https://developer.apple.com — **99 $/an**.
2. Dans App Store Connect : créer l'app, bundle ID `com.quigame.app` (le même que `appId`).
3. Xcode : ouvrir `client/ios/App/App.xcworkspace`, sélectionner ton équipe de signature
   (Signing & Capabilities), Archive, puis upload vers App Store Connect.
4. Fiche App Store : description, captures (6,7" et 6,5" obligatoires), politique de
   confidentialité (même URL), classification 12+.
5. Soumettre pour examen (1–3 jours). Apple est plus exigeant : l'app doit être stable,
   le bouton de connexion Google doit avoir une alternative (c'est le cas : lien magique ✔).

---

## 3. Comment ça marche techniquement

- **Réseau** : sur le web, le client garde ses URLs relatives ; dans l'app native,
  [client/src/lib/api.ts](client/src/lib/api.ts) préfixe tout avec l'URL Railway
  (surchargable au build via `VITE_API_URL`).
- **Connexion** : les cookies ne traversant pas les WebViews natives, le serveur accepte
  aussi un token `Authorization: Bearer` (HTTP + socket). Depuis l'app, Google/lien magique
  s'ouvrent dans le navigateur, puis le serveur renvoie vers **`qui://auth?token=…`**
  qui rouvre l'app ([client/src/main.tsx](client/src/main.tsx)).
- **Partage** : les liens d'invitation pointent toujours vers le site web
  (jouable sans installer l'app).
- **Mise à jour du contenu** : le jeu (questions, logique de partie) vit côté serveur —
  la plupart des évolutions ne nécessitent **pas** de republier l'app, un déploiement
  Railway suffit. Seuls les changements d'interface embarquée demandent une nouvelle release.

## 4. Reste à faire avant soumission

- [ ] Page de politique de confidentialité (obligatoire sur les deux stores).
- [ ] Captures d'écran + textes de fiche store.
- [ ] Tester l'APK debug sur un vrai téléphone (partie + connexion).
- [ ] Vérifier `APP_URL` sur Railway = `https://qui-production-8582.up.railway.app`
      (utilisé pour les liens magiques et le callback Google).
- [ ] Ajouter l'URL de callback Google (`…/api/auth/google/callback`) — déjà en place,
      rien à changer côté Google Cloud Console.
- [ ] (Plus tard) App Links / Universal Links pour que `…/r/CODE` ouvre directement l'app.
