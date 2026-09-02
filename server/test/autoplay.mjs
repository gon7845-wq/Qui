// Deux invités automatiques pour vérifier une partie de bout en bout.
// Outil de QA manuelle (pas lancé par npm test).
// Usage : node test/autoplay.mjs <CODE> [url]
import { io } from "socket.io-client";

const code = (process.argv[2] || "").toUpperCase();
const url = process.argv[3] || "http://localhost:4041";
if (!code) {
  console.error("usage: node test/autoplay.mjs <CODE> [url]");
  process.exit(1);
}

for (const pseudo of ["Léa", "Karim"]) {
  const s = io(url, { transports: ["websocket"], reconnection: false, forceNew: true });
  let me = null;
  let votedRound = 0;
  s.on("connect", () => {
    s.emit("lobby:join", { code, pseudo }, (r) => {
      if (!r?.ok) return console.error(`${pseudo}: ${r?.error}`);
      me = r.selfId;
      console.log(`${pseudo} a rejoint ${code}`);
    });
  });
  s.on("lobby:update", (l) => {
    if (l.state === "ad") console.log(`${pseudo}: entracte (fin dans ${Math.max(0, l.adEndTime - Date.now())} ms)`);
    if (l.state !== "question" || l.currentRound === votedRound || !me) return;
    votedRound = l.currentRound;
    const others = l.players.filter((p) => p.id !== me);
    const target = others[Math.floor(Math.random() * others.length)];
    setTimeout(() => s.emit("game:vote", { targetId: target.id }), 400);
    console.log(`${pseudo}: manche ${l.currentRound} → vote ${target.pseudo}`);
  });
  s.on("game:end", () => console.log(`${pseudo}: partie terminée`));
}
