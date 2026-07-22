import { useEffect, useState } from "react";

// horloge ticker : re-render à intervalle fixe pour comparer Date.now() à un endTime serveur
export function useNow(intervalMs = 100) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
