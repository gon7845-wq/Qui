# Qui ?

Jeu web multijoueur de vote en temps réel, ambiance tribunal théâtral.

3 à 12 joueurs rejoignent un lobby via une URL partageable (`/r/CODE`).
Chaque manche : une question (« Qui est le plus gentil ? »), tout le monde vote, reveal dramatique, score cumulé.

## Stack

- **Server** — Node + Socket.io + TypeScript (state machine autoritaire)
- **Client** — React + Vite + TypeScript + Tailwind + Framer Motion + Howler + Zustand
- **Shared** — types et événements Socket.io partagés (type-safe bout en bout)
- **Monorepo** — npm workspaces

## Dev

```bash
npm install
npm run dev
```

Le client tourne sur `http://localhost:5173`, le server sur `http://localhost:3001`.
Le proxy Vite redirige `/socket.io` vers le server.

## Structure

```
shared/   types et events Socket.io
server/   state machine, rooms, timers
client/   UI, animations, audio
```
