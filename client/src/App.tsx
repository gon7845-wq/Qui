import { useEffect } from "react";
import { useStore } from "./store";
import { Background } from "./components/Background";
import { Home } from "./screens/Home";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { Final } from "./screens/Final";

export default function App() {
  const { view, connect } = useStore();

  const initialCode = (() => {
    const m = window.location.pathname.match(/^\/r\/([A-Z0-9]{4})/i);
    return m ? m[1].toUpperCase() : null;
  })();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="theatre-vignette relative">
      <Background />
      <div className="ambient-dust" />
      {view === "home" && <Home prefilledCode={initialCode} />}
      {view === "lobby" && <Lobby />}
      {view === "game" && <Game />}
      {view === "final" && <Final />}
    </div>
  );
}
