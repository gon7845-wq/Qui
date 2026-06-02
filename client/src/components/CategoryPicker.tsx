import { TONE } from "../lib/colors";
import type { CategoryMeta } from "../types";

interface Props {
  categories: CategoryMeta[];
  /** ids sélectionnés */
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAll?: () => void;
  onNone?: () => void;
}

export function CategoryPicker({ categories, selected, onToggle, onAll, onNone }: Props) {
  if (categories.length === 0) {
    return <div className="label text-ink-faint py-2 text-center">Chargement…</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap justify-center gap-1.5">
        {categories.map((c) => {
          const on = selected.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => onToggle(c.id)}
              className="pill h-9 px-3 text-sm transition-transform active:scale-95"
              style={
                on
                  ? { background: `linear-gradient(135deg, ${TONE[c.tone].a}, ${TONE[c.tone].b})`, color: "#fff" }
                  : { background: "var(--surface)", color: "var(--ink-soft)" }
              }
            >
              {c.private ? "🔒 " : ""}{c.emoji} {c.name} <span style={{ opacity: 0.7 }}>{c.count}</span>
            </button>
          );
        })}
      </div>
      {(onAll || onNone) && (
        <div className="flex justify-center gap-3">
          {onAll && (
            <button onClick={onAll} className="label text-ink-soft hover:text-ink">
              Tout
            </button>
          )}
          {onNone && (
            <button onClick={onNone} className="label text-ink-soft hover:text-ink">
              Aucune
            </button>
          )}
        </div>
      )}
    </div>
  );
}
