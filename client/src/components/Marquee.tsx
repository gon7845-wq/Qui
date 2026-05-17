interface Props {
  items: string[];
  speed?: number;
}

export function Marquee({ items, speed = 40 }: Props) {
  const content = items.join("  ✦  ");
  return (
    <div className="overflow-hidden border-y border-white/10 bg-black/30 py-3 backdrop-blur">
      <div
        className="marquee-track"
        style={{
          animation: `marquee ${speed}s linear infinite`,
        }}
      >
        <span className="overline text-white/60 px-6">{content}</span>
        <span className="overline text-white/60 px-6" aria-hidden>
          {content}
        </span>
      </div>
    </div>
  );
}
