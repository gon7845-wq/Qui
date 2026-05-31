import { useEffect } from "react";
import { useStore } from "./store";
import { Background } from "./components/Background";
import { Home } from "./screens/Home";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { Final } from "./screens/Final";
import { Admin } from "./screens/Admin";

export default function App() {
  const { view, connect, loadCategories } = useStore();

  const isAdmin = window.location.pathname.startsWith("/admin");

  const initialCode = (() => {
    const m = window.location.pathname.match(/^\/r\/([A-Z0-9]{4})/i);
    return m ? m[1].toUpperCase() : null;
  })();

  useEffect(() => {
    if (!isAdmin) {
      connect();
      loadCategories();
    }
  }, [connect, loadCategories, isAdmin]);

  return (
    <div className="relative h-full w-full">
      <Background />
      {isAdmin ? (
        <Admin />
      ) : (
        <>
          {view === "home" && <Home prefilledCode={initialCode} />}
          {view === "lobby" && <Lobby />}
          {view === "game" && <Game />}
          {view === "final" && <Final />}
        </>
      )}
    </div>
  );
}
