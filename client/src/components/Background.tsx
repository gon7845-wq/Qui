export function Background() {
  return (
    <div className="fixed inset-0 -z-10 wood-frame">
      {/* Soft overhead spotlight */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[80vh] w-[120vw] -translate-x-1/2 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(232,221,196,0.18) 0%, transparent 55%)",
          filter: "blur(40px)",
        }}
      />
      {/* Bottom warm ambiance */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-[60vh] w-[100vw] -translate-x-1/2 opacity-35"
        style={{
          background:
            "radial-gradient(ellipse at center bottom, rgba(200,162,63,0.15) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
