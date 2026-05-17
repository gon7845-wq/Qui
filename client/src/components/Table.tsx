import type { ReactNode } from "react";

interface Props {
  children?: ReactNode;
  className?: string;
}

/**
 * The felt table — flat, no nesting hell.
 *
 * One single positioned div with all the visual layers stacked via
 * backgrounds, borders and box-shadows. Children are positioned absolutely
 * relative to this single container.
 */
export function Table({ children, className = "" }: Props) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: "min(92vw, 82vh)",
        height: "min(92vw, 82vh)",
        margin: "0 auto",
        borderRadius: "44%",
        // The felt surface fills the whole element
        background:
          "radial-gradient(ellipse at 50% 35%, #5E2128 0%, #4D1820 35%, #3A1018 70%, #2A0810 100%)",
        // Gold ring + wood rim built with stacked shadows
        boxShadow: [
          "0 0 0 2px #C8A23F", // gold trim ring
          "0 0 0 14px #2B160E", // wood outer rim
          "0 0 0 16px #1A0C08", // wood deep edge
          "0 30px 80px -20px rgba(0,0,0,0.85)", // table shadow
          "inset 0 4px 14px rgba(255,200,140,0.06)", // top warm glow
        ].join(", "),
        overflow: "visible",
      }}
    >
      {/* Felt grain via SVG noise overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: "inherit",
          opacity: 0.28,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.4  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Faint engraved monogram */}
      <div
        aria-hidden
        className="absolute inset-0 grid place-items-center pointer-events-none"
        style={{ opacity: 0.08 }}
      >
        <span
          className="font-display"
          style={{
            fontSize: "26vmin",
            color: "#E8DDC4",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          QUI?
        </span>
      </div>
      {children}
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
  radiusRatio = 0.4
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
