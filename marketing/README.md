# Marketing vidéo — Qui ?

Une vidéo verticale par jour, générée à partir du jeu lui-même (mêmes couleurs,
mêmes polices, vraies questions de la banque), publiée automatiquement sur
**YouTube Shorts**, **Instagram Reels** et **TikTok**.

```
plan  →  render  →  publish
(quoi)   (Remotion)  (YouTube / Instagram / TikTok)
```

Tout est **déterministe** : la date du jour fixe le format, la question, les
joueurs et le résultat. Pas de base de données, pas d'état à sauvegarder : le
workflow GitHub Actions rejoue la même chaîne chaque soir.

---

## Les trois formats

| Format | Durée | Ce qu'on voit | Pourquoi ça marche |
|---|---|---|---|
| **manche** | 17 s | Une question, 6 potes, les votes tombent en direct, le verdict en gros, la punchline du groupe | C'est le cœur du jeu : suspense + révélation + moquerie |
| **rafale** | 14 s | 5 questions qui s'enchaînent, « Tague le pote qui correspond 👇 » | Appât à commentaires et partages |
| **bulletin** | 14 s | Le portrait de fin de partie d'un joueur : punchline, ses « traits » votés | Montre la récompense de fin, donne envie de connaître le sien |

Rotation sur la semaine : `manche, manche, rafale, manche, bulletin, manche, rafale`.
Chaque vidéo se termine par un écran marque + adresse du jeu (`QUI_PUBLIC_URL`).

Prévisualiser et retoucher en direct :

```bash
cd marketing && npm install && npm run studio
```

---

## Essayer en local

```bash
cd marketing
npm install
npm run plan                       # vidéo du jour → out/<date>-<format>/
npm run render                     # → out/<slug>/video.mp4 (≈ 1 min)
DRY_RUN=1 npm run publish          # montre ce qui partirait, n'envoie rien
```

Variantes : `node scripts/plan.mjs --template rafale --seed test-1 --tone spicy`
(`--tone` : `warm` | `spicy` | `fun`, `--date AAAA-MM-JJ` pour simuler un jour).

---

## Mise en place de la publication

Chaque plateforme est indépendante : configure celles que tu veux, le script
publie sur toutes celles dont les secrets sont présents. Un échec sur l'une
n'empêche pas les autres.

Copie `.env.example` en `.env` pour le local ; en CI, mets les mêmes valeurs
dans **Settings → Secrets and variables → Actions**.

### Option rapide : Upload-Post (une seule clé)

Si tu veux publier dès ce soir sans créer trois apps développeur :
[upload-post.com](https://upload-post.com) gère l'OAuth des trois réseaux (et
l'audit TikTok). Gratuit jusqu'à 10 envois / mois, payant au-delà.

1. Crée un compte, connecte tes comptes TikTok / Instagram / YouTube, crée un
   « profil » (son nom = `UPLOAD_POST_USER`).
2. Secrets : `UPLOAD_POST_API_KEY`, `UPLOAD_POST_USER`.

Pour une publication **quotidienne**, la limite gratuite est vite dépassée : les
trois intégrations directes ci-dessous sont gratuites sans limite.

### YouTube Shorts (gratuit, ~15 min)

1. [console.cloud.google.com](https://console.cloud.google.com) → nouveau projet
   → **Activer l'API « YouTube Data API v3 »**.
2. **Écran de consentement OAuth** : type *Externe*, puis passe le statut de
   publication à **« En production »** (sinon le jeton expire tous les 7 jours).
   Pas besoin de faire valider l'app par Google : l'écran « application non
   validée » s'affichera une fois lors de la connexion, c'est normal.
3. **Identifiants → Créer → ID client OAuth → Application de bureau.**
4. Dans `marketing/.env` : `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, puis :
   ```bash
   npm run auth:youtube
   ```
   Le navigateur s'ouvre, connecte-toi avec le compte de la chaîne. Le script
   affiche `YT_REFRESH_TOKEN`. Mets les trois valeurs dans les secrets GitHub.

Quota : un envoi coûte 1 600 unités sur 10 000 / jour — largement suffisant.
`YT_PRIVACY` (variable) : `public` par défaut ; `unlisted` pour tester.

### Instagram Reels (gratuit, ~30 min)

Nécessite un compte Instagram **professionnel** (Créateur ou Entreprise :
Paramètres → Type de compte, gratuit) et une app Meta.

1. [developers.facebook.com](https://developers.facebook.com) → Créer une app →
   cas d'usage **« Instagram »** → *API setup with Instagram business login*.
2. Dans **Instagram → API setup**, récupère l'*Instagram app ID* et l'*app
   secret* ; ajoute une **OAuth redirect URI** : `https://<ton-domaine>/oauth/instagram`
   (n'importe quelle page du jeu convient : le script te demandera de coller
   l'URL de retour).
3. Tant que l'app est en mode *Développement*, ajoute ton compte Instagram
   dans **Rôles de l'app → Testeurs Instagram**, et accepte l'invitation dans
   l'app Instagram (Paramètres → Site web et apps → Invitations de testeur).
4. `marketing/.env` : `IG_APP_ID`, `IG_APP_SECRET`, puis :
   ```bash
   npm run auth:instagram
   ```
   Le script affiche `IG_ACCESS_TOKEN` (60 jours) et `IG_USER_ID`.

Le jeton est **prolongé automatiquement à chaque publication**. Pour que le
workflow enregistre le nouveau jeton à ta place, crée un **jeton personnel
GitHub** (Settings → Developer settings → Fine-grained token, portée
*Secrets: read and write* sur ce dépôt) et mets-le dans le secret `GH_PAT`.
Sans `GH_PAT`, relance `npm run auth:instagram` avant 60 jours.

Instagram ne reçoit pas de fichier : il télécharge la vidéo depuis une URL
publique. Le workflow la dépose dans une release GitHub `marketing-media`
(le dépôt est public) et ne garde que les 14 dernières.

### TikTok (gratuit, mais un audit pour publier en public)

1. [developers.tiktok.com](https://developers.tiktok.com) → Manage apps → créer
   une app. Ajoute les produits **Login Kit** et **Content Posting API**, avec
   les scopes `user.info.basic`, `video.upload`, `video.publish`.
2. Redirect URI : `https://<ton-domaine>/oauth/tiktok`. TikTok exige que le
   domaine soit **vérifié** (URL properties → ajouter le domaine → fichier ou
   balise meta à déposer sur le site, ou enregistrement DNS).
3. `marketing/.env` : `TT_CLIENT_KEY`, `TT_CLIENT_SECRET`, puis :
   ```bash
   npm run auth:tiktok
   ```
   Colle l'URL de retour, le script affiche `TT_REFRESH_TOKEN`.
4. **Audit** : tant que l'app n'est pas approuvée, TikTok force la visibilité
   **SELF_ONLY** (toi seul vois les vidéos — le script le détecte et prévient).
   Soumets l'app à l'audit depuis la console (une courte vidéo de démo du flux
   suffit) ; compte quelques jours. `TT_PRIVACY` passe ensuite à
   `PUBLIC_TO_EVERYONE` tout seul.

Le refresh token TikTok est renouvelé à chaque publication : même mécanisme
`GH_PAT` que pour Instagram.

---

## Le workflow GitHub Actions

`.github/workflows/marketing.yml` tourne **tous les jours à 17:00 UTC**
(19 h à Paris l'été, 18 h l'hiver) et à la demande (onglet *Actions → Marketing
vidéo → Run workflow*) avec le format, la graine, les plateformes et un mode
*dry run* au choix.

Chaque exécution :

1. installe Chrome headless + la police emoji couleur, rend la vidéo (≈ 3 min) ;
2. la conserve 30 jours en *artifact* (pour la reposter à la main si besoin) ;
3. l'héberge en release si Instagram est configuré ;
4. publie, écrit un résumé (liens ou erreurs) dans la page du run ;
5. ré-enregistre les jetons renouvelés si `GH_PAT` est présent.

Le dépôt étant public, les minutes GitHub Actions sont gratuites.

Changer l'heure ou la fréquence : la ligne `cron`. Deux vidéos par jour :
ajoute un second `cron` (la graine inclut la date seulement : passe
`--seed "$(date +%F)-soir"` dans l'étape *Planifier* pour la seconde).

---

## Personnaliser

- **Accroches, appels à l'action, hashtags, titres** : `src/lib/scenario.js`
  (`HOOKS`, `buildRafale` → `cta`, `buildMetadata`).
- **Punchlines** : `src/data/punchlines.js` (extrait de celles du jeu).
- **Prénoms / avatars** : `NAMES` dans `scenario.js`.
- **Rythme, durées** : constantes `T` en tête de chaque composition
  (`src/compositions/*.tsx`).
- **Couleurs / polices** : `src/theme.ts`, `src/lib/fonts.ts` (copies des
  jetons du client).
- **Musique** : dépose des MP3 **libres de droits** dans `public/music/` ; une
  piste est choisie par la graine et mixée avec fondu. Aucune piste n'est
  fournie (droits). Alternative souvent plus efficace : ajouter un son
  tendance **dans l'app** TikTok/Instagram après publication.
- **Adresse affichée** : variable `QUI_PUBLIC_URL` (un vrai nom de domaine
  rendra l'écran final bien plus mémorisable que l'URL Railway).

---

## Licences et limites à connaître

- **Remotion** est gratuit pour les particuliers et les structures de 3 personnes
  ou moins ; au-delà, licence entreprise (remotion.dev/license).
- **Polices** Fredoka et Plus Jakarta Sans : Google Fonts (OFL).
- **YouTube** : jetons d'app « En test » expirent après 7 jours → mets l'écran
  de consentement « En production ».
- **Instagram** : compte professionnel obligatoire ; 25 publications API / 24 h max.
- **TikTok** : privé (`SELF_ONLY`) tant que l'app n'est pas auditée.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Emojis en carrés dans la vidéo (CI) | `fonts-noto-color-emoji` manquant — déjà installé par le workflow |
| `invalid_grant` YouTube | refresh token expiré (app en « test ») ou révoqué → `npm run auth:youtube` |
| Instagram `Media ID is not available` / `EXPIRED` | `MEDIA_URL` non accessible publiquement ou vidéo hors specs (le rendu est 1080×1920 H.264, 30 i/s : conforme) |
| Instagram code 190 | jeton expiré → `npm run auth:instagram` |
| TikTok `unaudited_client_can_only_post_to_private_accounts` | l'app n'est pas auditée : visibilité forcée à SELF_ONLY |
| TikTok `spam_risk_too_many_posts` | limite quotidienne du compte atteinte |
