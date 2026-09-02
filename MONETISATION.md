# Monétisation — Qui ?

Tout est en place dans le code. Ce fichier dit **quoi brancher, dans quel ordre**,
et ce que chaque étape rapporte.

---

## Le modèle

**C'est l'hôte qui paie pour toute la table.**

Une partie créée par un hôte VIP est sans publicité pour ses 12 joueurs. C'est
le seul modèle qui donne une vraie raison de payer : celui qui organise la
soirée ne veut pas imposer des pubs à ses invités. Et l'argument de vente
(« zéro pub pour toute la table ») est bien plus fort que « zéro pub pour toi ».

Le statut VIP est évalué **à la création de la partie** et **rafraîchi au
lancement** — un achat fait pendant l'attente dans le lobby prend effet
immédiatement.

| Offre | Prix | Nature | Pourquoi |
|---|---|---|---|
| Soirée sans pub | 0,99 € | achat unique, 24 h | Prix d'impulsion. Le meilleur levier court terme : décision prise pendant la soirée, sans engagement. |
| VIP mensuel | 2,99 € / mois | abonnement | Pour les groupes qui jouent souvent. |
| VIP annuel | 19,90 € / an | abonnement | Deux mois offerts ; c'est l'offre à mettre en avant. |

Prix et libellés : `server/billing.js` → `PLANS`.

---

## Où la publicité apparaît

| Emplacement | Quand | Pourquoi là |
|---|---|---|
| **Bannière** | pendant la révélation (~9 s), dans le lobby, sur l'écran final | Les yeux sont déjà sur l'écran et personne n'attend son tour. Zéro friction. |
| **Entracte** (plein écran) | toutes les 3 manches, **et juste avant les résultats** | L'entracte d'avant-résultats est le pic d'attention de toute la partie. |

Réglages (variables d'environnement) :

| Variable | Défaut | Effet |
|---|---|---|
| `AD_EVERY_ROUNDS` | `3` | Une entracte toutes N manches. Descendre à 2 augmente l'inventaire mais fatigue la table. |
| `AD_SECONDS` | `7` | Durée d'une entracte. |
| `AD_SKIP_AFTER` | `4` | Délai avant que l'hôte puisse abréger. Imposé par le serveur, pas par le client. |
| `FREE_PRIVATE_QUESTIONS` | `25` | Quota de questions privées en gratuit. |
| `PRIVACY_URL` | — | Lien vers ta politique de confidentialité, affiché dans le bandeau de consentement. |

**Tant qu'aucune régie n'est configurée, les emplacements affichent de
l'autopromo** (offre VIP, création de questions, partage du lien). Ils ne sont
jamais vides et travaillent pour la conversion dès le premier jour.

---

## Étape 1 — Encaisser dès aujourd'hui, sans rien brancher

L'attribution manuelle du VIP fonctionne déjà. Utile pour vendre à la main,
offrir, ou dédommager :

```bash
curl -X POST https://qui-production-8582.up.railway.app/api/admin/vip \
  -H "x-admin-key: $ADMIN_PASSWORD" -H "Content-Type: application/json" \
  -d '{"email":"client@exemple.com","days":365}'
```

- `days` omis → VIP sans date de fin.
- `{"revoke": true}` → retire le VIP.

---

## Étape 2 — Stripe (web) : la priorité

0 % de commission, aucune validation de store à attendre. Le code est complet
(appels REST, webhook signé et vérifié) — il ne manque que les clés.

1. Crée trois produits sur [dashboard.stripe.com](https://dashboard.stripe.com) :
   - un prix récurrent mensuel (2,99 €)
   - un prix récurrent annuel (19,90 €)
   - un prix unique (0,99 €)
2. Crée un endpoint webhook vers `https://<ton-domaine>/api/billing/webhook`,
   avec les événements `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
3. Pose les variables sur Railway :

```
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_VIP_MONTH=price_…
STRIPE_PRICE_VIP_YEAR=price_…
STRIPE_PRICE_VIP_NIGHT=price_…
```

Les boutons de l'espace membre passent alors de « Bientôt » à « Choisir »
tout seuls. Sans ces variables, l'API répond un 501 explicite plutôt que de
faire semblant.

> **Obligations légales avant d'encaisser** : CGV, mentions légales, politique
> de confidentialité et droit de rétractation (14 jours, avec renonciation
> explicite pour du numérique livré immédiatement). Stripe le demandera aussi.

---

## Étape 3 — AdSense (web)

1. Ouvre un compte AdSense et fais valider le domaine. **Il faut déjà du
   trafic réel** : ne compte pas là-dessus au démarrage.
2. Crée deux blocs d'annonces : une bannière et un bloc grand format.
3. Pose les variables :

```
ADSENSE_CLIENT=ca-pub-…
ADSENSE_SLOT_BANNER=…
ADSENSE_SLOT_INTERSTITIAL=…
```

La politique de sécurité du contenu (CSP) s'ouvre automatiquement aux domaines
Google **uniquement quand `ADSENSE_CLIENT` est défini** — sinon elle reste
stricte. Si la régie ne remplit pas un emplacement, l'autopromo reprend la
place au bout de 2,5 s.

> Note : les polices Google sont chargées depuis `fonts.googleapis.com`
> (`client/index.html`), ce qui a déjà valu des condamnations en Europe. Les
> héberger en local règle le sujet en dix minutes.

---

## Consentement publicitaire (RGPD)

Le bandeau est en place. Sa logique tient en une règle, et c'est elle qui le
rend non invasif :

| État | Ce qui se charge |
|---|---|
| Pas de réponse, ou refus | **Aucun script de régie.** Seules nos annonces maison, qui ne déposent rien. |
| Acceptation | La régie est chargée. |

Conséquences directes :

- **Aujourd'hui, aucun bandeau ne s'affiche.** Tant qu'`ADSENSE_CLIENT` n'est
  pas défini, il n'y a aucun cookie tiers, donc rien à consentir. Zéro friction
  ajoutée pour tes joueurs actuels.
- **Refuser ne dégrade rien** : la partie est identique, l'emplacement affiche
  l'autopromo. Le joueur ne perd aucune fonctionnalité, et l'offre VIP continue
  d'être vue.
- Le bandeau **ne s'affiche jamais pendant une partie** — personne ne coupe une
  soirée pour parler de cookies.
- « Refuser » et « Accepter » ont la même taille et le même poids visuel, comme
  l'exige la CNIL. Un bouton fantôme à côté d'un bouton coloré serait considéré
  comme un choix non libre.
- Le choix est gardé **6 mois**, puis redemandé. Il est modifiable à tout moment
  via « Publicité » sur l'écran d'accueil. Changer les finalités ? Incrémente
  `VERSION` dans `client/src/lib/consent.ts` : le choix est redemandé à tous.
- `PRIVACY_URL` : dès que ta politique de confidentialité est en ligne, pose la
  variable et le lien apparaît dans les détails du bandeau. Sans elle, pas de
  lien mort.

### La limite à connaître

Pour servir de la publicité **personnalisée** dans l'EEE et au Royaume-Uni,
Google exige une **CMP certifiée** implémentant le TCF v2.2. Un bandeau maison,
même irréprochable juridiquement, ne coche pas cette case-là.

Deux chemins possibles :

1. **Garder ce bandeau** et activer, dans la console AdSense,
   « Confidentialité et messages » (Funding Choices) — la CMP de Google,
   gratuite et certifiée. Elle gère le signal TCF ; notre bandeau garde le
   contrôle du chargement des scripts. C'est le chemin le plus court.
2. **Passer par une CMP tierce** certifiée (Axeptio, Didomi, Sirdata…) et
   remplacer notre bandeau par le leur. Plus lourd, souvent payant, utile
   surtout si tu vises plusieurs régies.

Dans les deux cas, le verrou côté code reste utile : c'est lui qui garantit
qu'aucun script publicitaire ne part avant une acceptation.

---

## Étape 4 — Stores mobiles (AdMob + achats in-app)

À faire **après** que le web tourne, parce que c'est le plus lent :
Google Play et l'App Store **imposent leur achat in-app** pour un produit
numérique consommé dans l'app (commission 15–30 %).

```
ADMOB_APP_ID=ca-app-pub-…
ADMOB_UNIT_BANNER=…
ADMOB_UNIT_INTERSTITIAL=…
```

Aucune pub n'est chargée dans l'app native pour l'instant (pas de plugin
AdMob installé) — donc rien à consentir de ce côté aujourd'hui. Le jour où tu
l'ajoutes, le consentement mobile passe par le **UMP SDK** de Google, pas par
notre bandeau web : à brancher en même temps que le plugin.

L'endpoint `POST /api/billing/mobile-purchase` existe mais **refuse
volontairement** (501) tant que la validation de reçu n'est pas branchée sur
les API des stores : accorder le VIP sur un reçu non vérifié, ce serait offrir
le produit à quiconque sait envoyer une requête HTTP. Il reste à faire :

1. Créer les produits sur Play Console / App Store Connect.
2. Fournir `GOOGLE_PLAY_SA_JSON` (compte de service, scope `androidpublisher`)
   et/ou `APPSTORE_KEY` (clé App Store Server API).
3. Implémenter la vérification dans `server/billing.js`, puis appeler
   `grantVip({ source: "play" | "appstore", … })`.

Un droit VIP acheté sur un store vaut aussi sur le web (et l'inverse) : il est
porté par le compte, pas par la plateforme.

---

## Ordre de grandeur — à quoi s'attendre

Estimations prudentes, à vérifier avec tes vrais chiffres.

Une partie de 8 manches à 6 joueurs génère environ **8 bannières + 3 entractes
par joueur**, soit ~65 impressions par partie.

| Parties / mois | Impressions | Pub (eCPM 2 €) | VIP (2 % des hôtes) | Total estimé |
|---|---|---|---|---|
| 200 | ~13 000 | ~26 € | ~4 € | ~30 € |
| 1 000 | ~65 000 | ~130 € | ~20 € | ~150 € |
| 10 000 | ~650 000 | ~1 300 € | ~200 € | ~1 500 € |

Ce que ça dit clairement :

1. **La publicité ne paie qu'au volume.** En dessous de ~1 000 parties/mois,
   elle couvre l'hébergement, pas plus.
2. **Le levier immédiat, c'est la « soirée sans pub » à 0,99 €** : décision
   d'impulsion, prise au moment où la pub gêne, par la personne motivée.
3. **Le vrai multiplicateur, c'est la distribution.** Chaque partie envoie un
   lien à 5–11 personnes : c'est déjà un moteur de croissance intégré. Le
   manifeste web (installable depuis le navigateur) et l'app store sont deux
   canaux gratuits à exploiter avant de payer de l'acquisition.

---

## Ce qui reste à faire avant d'encaisser

- [x] Bandeau de consentement (fait) — reste à activer la CMP certifiée Google
      (« Confidentialité et messages » dans la console AdSense) avant de servir
      de la pub personnalisée dans l'EEE
- [ ] CGV / mentions légales / confidentialité (bloquant pour Stripe)
- [ ] Héberger les polices en local (risque CNIL, 10 min)
- [ ] Clés Stripe + produits créés
- [ ] Compte AdSense validé (demande du trafic préalable)
- [ ] Produits store + validation des reçus in-app
