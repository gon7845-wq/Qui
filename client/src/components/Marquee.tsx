interface Props {
  items: string[];
  speed?: number;
}

export function Marquee({ items, speed = 40 }: Props) {
  const content = items.join("  ✦  ");
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-black/40 py-3 backdrop-blur-md">
      <div
        className="marquee-track"
        style={{
          animation: `marquee ${speed}s linear infinite`,
        }}
      >
        <span className="overline iridescent-text px-6">{content}</span>
        <span className="overline iridescent-text px-6" aria-hidden>
          {content}
        </span>
      </div>
    </div>
  );
}
