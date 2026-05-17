interface Props {
  items: string[];
  speed?: number;
}

export function Marquee({ items, speed = 50 }: Props) {
  const content = items.join("  ✚  ");
  return (
    <div
      className="relative overflow-hidden border-y border-paper/15 py-3"
      style={{ background: "rgba(16,5,10,0.85)" }}
    >
      <div
        className="marquee-track"
        style={{ animation: `marquee ${speed}s linear infinite` }}
      >
        <span className="overline text-paper/70 px-6">{content}</span>
        <span className="overline text-paper/70 px-6" aria-hidden>
          {content}
        </span>
      </div>
    </div>
  );
}
