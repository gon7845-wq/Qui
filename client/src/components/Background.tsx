const BLOBS = [
  { color: "#FFD0E2", top: "-14%", left: "-10%", size: "52vmax", delay: "0s" },
  { color: "#FFE6B0", top: "-8%", left: "58%", size: "44vmax", delay: "-3s" },
  { color: "#C6F0DB", top: "58%", left: "-8%", size: "46vmax", delay: "-7s" },
  { color: "#E3D4FF", top: "50%", left: "60%", size: "48vmax", delay: "-5s" },
  { color: "#FFD9C2", top: "30%", left: "30%", size: "34vmax", delay: "-9s" },
];

export function Background() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ background: "linear-gradient(165deg, #FFF7EC 0%, #FFF1F2 48%, #F3F8FF 100%)" }}
    >
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            background: b.color,
            opacity: 0.6,
            filter: "blur(64px)",
            animation: "blob-drift 24s ease-in-out infinite",
            animationDelay: b.delay,
          }}
        />
      ))}
      <div className="grain" />
    </div>
  );
}
