import { useStore } from "../store";

export function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  return (
    <button
      onClick={toggleTheme}
      aria-label="Changer de thème"
      className="fixed top-5 right-5 z-50 grid h-10 w-10 place-items-center rounded-full text-lg transition-transform hover:scale-110"
      style={{ background: "var(--surface)", color: "var(--ink)" }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
