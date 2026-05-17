import type { ReactNode } from "react";

interface Props {
  children?: ReactNode;
  className?: string;
}

/**
 * The felt table. Square aspect, the felt itself is a rounded shape
 * (ellipse-leaning rectangle) framed by darker wood. Children are absolutely
 * positioned inside; (0,0) refers to the upper-left of the felt area.
 *
 * We also expose the felt's exact center & a recommended chip radius
 * via CSS variables so children can compute positions reliably.
 */
export function Table({ children, className = "" }: Props) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        aspectRatio: "1 / 1",
        maxWidth: "min(92vw, 78vh)",
        margin: "0 auto",
      }}
    >
      {/* Wood rim */}
      <div
        className="absolute inset-0 rounded-[44%]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #4A2818 0%, #2B160E 60%, #1A0C08 100%)",
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.85), inset 0 4px 12px rgba(255,200,140,0.06)",
          padding: "5%",
        }}
      >
        {/* Gold trim ring */}
        <div
          className="absolute inset-[3%] rounded-[44%]"
          style={{
            background:
              "conic-gradient(from 90deg, #8C6F22, #E9CB6F, #C8A23F, #5D4810, #E9CB6F, #8C6F22)",
            padding: "1px",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.5), 0 0 30px rgba(200,162,63,0.2)",
          }}
        >
          <div className="absolute inset-px rounded-[44%] bg-[var(--wood-deep)]" />
        </div>
        {/* Felt surface */}
        <div className="absolute inset-[6%] rounded-[44%] felt-surface overflow-hidden">
          {/* Center monogram engraved on felt */}
          <div
            aria-hidden
            className="absolute inset-0 grid place-items-center pointer-events-none"
            style={{ opacity: 0.07 }}
          >
            <span
              className="font-display text-[26vmin]"
              style={{
                color: "#E8DDC4",
                letterSpacing: "-0.04em",
              }}
            >
              QUI?
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Compute (x, y) in pixels relative to a square felt of side `feltSize`,
 * placing chip `i` of `total` on a circle of radius `r`.
 * angleStart is 0 → top; we start at top and go clockwise.
 */
export function seatPosition(
  i: number,
  total: number,
  feltSize: number,
  radiusRatio = 0.36
) {
  const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
  const r = feltSize * radiusRatio;
  const cx = feltSize / 2;
  const cy = feltSize / 2;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
    angle,
  };
}
