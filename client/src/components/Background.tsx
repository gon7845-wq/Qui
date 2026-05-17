export function Background() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ background: "#10050A" }}
    >
      {/* Wine ambient glows */}
      <div
        className="absolute -top-1/3 left-1/4 h-[80vh] w-[80vh] rounded-full opacity-50 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, #4D2231 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] h-[60vh] w-[60vh] rounded-full opacity-40 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, #6B1810 0%, transparent 70%)",
        }}
      />
      {/* Wall paneling effect — subtle vertical lines */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #F0E6D0 1px, transparent 1px)",
          backgroundSize: "120px 100%",
        }}
      />
      {/* Theatre dust grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9   0 0 0 0 0.85   0 0 0 0 0.7   0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
