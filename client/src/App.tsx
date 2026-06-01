import { useEffect } from "react";
import { useStore } from "./store";
import { Background } from "./components/Background";
import { Home } from "./screens/Home";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { Final } from "./screens/Final";
import { Admin } from "./screens/Admin";
import { Member } from "./screens/Member";

export default function App() {
  const { view, connect, loadCategories, loadMe } = useStore();

  const path = window.location.pathname;
  const isAdmin = path.startsWith("/admin");
  const isMember = path.startsWith("/moi");

  const initialCode = (() => {
    const m = path.match(/^\/r\/([A-Z0-9]{4})/i);
    return m ? m[1].toUpperCase() : null;
  })();

  useEffect(() => {
    if (isAdmin) return;
    loadMe();
    if (!isMember) {
      connect();
      loadCategories();
    }
  }, [connect, loadCategories, loadMe, isAdmin, isMember]);

  return (
    <div className="relative h-full w-full">
      <Background />
      {isAdmin ? (
        <Admin />
      ) : isMember ? (
        <Member />
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
