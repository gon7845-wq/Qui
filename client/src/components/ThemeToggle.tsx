import { useStore } from "../store";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useStore();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Changer de thème"
      className={`grid h-10 w-10 place-items-center rounded-full text-lg transition-transform hover:scale-110 ${className}`}
      style={{ background: "var(--surface)", color: "var(--ink)" }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
