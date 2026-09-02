# Qui ?

Jeu de soirée : le groupe vote, et révèle le meilleur et le pire de chacun.
3 à 12 joueurs, sur le même wifi ou à distance.

- **Web** : React + Vite (`client/`)
- **Serveur** : Express + Socket.io, parties en mémoire, banque de questions en
  PostgreSQL (`server/`)
- **Mobile** : Capacitor (Android / iOS) — voir [PUBLICATION.md](PUBLICATION.md)
- **Revenus** : pubs entre les manches + VIP — voir [MONETISATION.md](MONETISATION.md)

## Démarrer en local

```bash
npm run install:all
```

Il faut un PostgreSQL. Le plus simple :

```bash
docker run -d --name qui-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=qui -p 5432:5432 postgres:16-alpine
```

Puis, dans deux terminaux :

```bash
DATABASE_URL='postgresql://postgres:dev@localhost:5432/qui?sslmode=disable' ALLOW_DEV_LOGIN=true npm run dev:server
```

```bash
npm run dev:client
```

Le client tourne sur `:5173` et proxifie l'API et les websockets vers `:3001`.

> `?sslmode=disable` est nécessaire en local : en production le SSL est activé
> par défaut (Railway l'exige).

## Tests

```bash
DATABASE_URL='postgresql://postgres:dev@localhost:5432/qui_test?sslmode=disable' npm test
```

Le lanceur démarre un serveur sur un port dédié, joue de vraies parties via
Socket.io (création, votes, révélation, reconnexion, entracte publicitaire,
paiement) puis s'arrête. Utilise une base **jetable** : la suite écrit dedans.

Pour tester un déploiement existant :

```bash
TEST_BASE_URL=https://mon-domaine npm test
```

Les tests destructifs (inondation, quotas, comptes de test) s'ignorent
automatiquement quand la cible n'est pas locale.

QA manuelle d'une partie complète : lance le jeu, récupère le code, puis

```bash
node server/test/autoplay.mjs ABCD http://localhost:3001
```

deux joueurs automatiques rejoignent et votent à chaque manche.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | **requis** — PostgreSQL |
| `SESSION_SECRET` | **requis en prod** — signature des sessions JWT |
| `ADMIN_PASSWORD` | **requis en prod** — accès à `/admin` |
| `APP_URL` | URL publique (liens de connexion, retours de paiement) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | connexion Google |
| `RESEND_API_KEY` | envoi des liens magiques |
| `ALLOW_DEV_LOGIN` | `true` en local : active `/api/auth/dev` |
| `MAX_LOBBIES` | plafond mémoire (défaut 5000) |
| `PGSSL=false` | force la désactivation du SSL Postgres |

Publicité et paiement : voir [MONETISATION.md](MONETISATION.md).

En production, le serveur **refuse de démarrer** si `SESSION_SECRET` ou
`ADMIN_PASSWORD` manquent — sans secret de session, n'importe qui peut se
forger un compte.
