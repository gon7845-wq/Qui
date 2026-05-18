import type { AvatarSeed } from "@qui/shared";

interface Props {
  seed: AvatarSeed;
  size?: number;
  dim?: boolean;
  className?: string;
}

export function Avatar({ seed, size = 56, dim = false, className = "" }: Props) {
  const color = `hsl(${seed.hue} 65% 55%)`;
  const dark = `hsl(${seed.hue} 50% 22%)`;
  const collar = togeCollar(seed.toge);

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={dim ? "opacity-40 grayscale" : ""}
      >
        {/* Background medallion */}
        <circle cx="32" cy="32" r="30" fill={dark} stroke={color} strokeWidth="2" />
        {/* Toge / robe collar */}
        <path d={collar} fill={color} opacity="0.85" />
        {/* Head silhouette */}
        <circle cx="32" cy="26" r="11" fill={color} />
        <text
          x="32"
          y="30"
          textAnchor="middle"
          fontFamily="Cinzel, serif"
          fontWeight="700"
          fontSize="12"
          fill={dark}
        >
          {seed.initials}
        </text>
      </svg>
    </div>
  );
}

function togeCollar(toge: 0 | 1 | 2): string {
  switch (toge) {
    case 0:
      // Wide judge mantle
      return "M10 56 C 18 42, 46 42, 54 56 Z";
    case 1:
      // Pointed advocate robe
      return "M14 58 L 32 38 L 50 58 Z";
    case 2:
      // Layered scholar robe
      return "M12 58 C 20 46, 26 50, 32 42 C 38 50, 44 46, 52 58 Z";
  }
}
