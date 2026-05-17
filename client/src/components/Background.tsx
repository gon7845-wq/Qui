export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: "#06060c" }}>
      {/* Conic iridescent halo behind everything */}
      <div
        className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.18] blur-[80px]"
        style={{
          background:
            "conic-gradient(from 90deg at 50% 50%, #9ED3FF 0%, #DDA0FF 18%, #FFB8E1 35%, #FFE9B8 52%, #B8FFE1 70%, #9ED3FF 100%)",
          animation: "shimmer 30s linear infinite",
        }}
      />
      {/* Soft orbs */}
      <div
        className="absolute -top-1/4 left-[8%] h-[60vh] w-[60vh] rounded-full opacity-40 blur-[100px] animate-blob-1"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #DDA0FF 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-[8%] h-[55vh] w-[55vh] rounded-full opacity-40 blur-[100px] animate-blob-2"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #9ED3FF 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute top-1/3 right-1/4 h-[40vh] w-[40vh] rounded-full opacity-30 blur-[120px] animate-blob-3"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #FFB8E1 0%, transparent 60%)",
        }}
      />
      {/* Top vignette */}
      <div
        className="absolute inset-x-0 top-0 h-40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,6,12,0.9), transparent)",
        }}
      />
      {/* Bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            "linear-gradient(to top, rgba(6,6,12,0.9), transparent)",
        }}
      />
      {/* Hairline grid (very subtle) */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px)",
          backgroundSize: "calc(100% / 12) 100%",
        }}
      />
    </div>
  );
}
