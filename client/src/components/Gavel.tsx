interface Props {
  size?: number;
  className?: string;
}

export function Gavel({ size = 48, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="gv-head" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c9a35a" />
          <stop offset="100%" stopColor="#7a5a2a" />
        </linearGradient>
        <linearGradient id="gv-handle" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4a2c1c" />
          <stop offset="100%" stopColor="#2a1810" />
        </linearGradient>
      </defs>
      {/* handle */}
      <rect
        x="34"
        y="10"
        width="6"
        height="42"
        rx="2"
        transform="rotate(35 37 31)"
        fill="url(#gv-handle)"
      />
      {/* head */}
      <rect
        x="8"
        y="14"
        width="34"
        height="14"
        rx="3"
        transform="rotate(-25 25 21)"
        fill="url(#gv-head)"
        stroke="#3a2410"
        strokeWidth="1"
      />
    </svg>
  );
}
