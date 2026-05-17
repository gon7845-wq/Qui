export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      {/* Acid blob */}
      <div
        className="absolute -top-1/4 -left-1/4 h-[80vh] w-[80vh] rounded-full opacity-25 blur-[120px] animate-blob-1"
        style={{
          background:
            "radial-gradient(circle at center, #DBFF00 0%, transparent 60%)",
        }}
      />
      {/* Cherry blob */}
      <div
        className="absolute -bottom-1/4 -right-1/4 h-[70vh] w-[70vh] rounded-full opacity-25 blur-[120px] animate-blob-2"
        style={{
          background:
            "radial-gradient(circle at center, #FF3366 0%, transparent 60%)",
        }}
      />
      {/* Vertical hairline grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px)",
          backgroundSize: "calc(100% / 12) 100%",
        }}
      />
      {/* Scan lines */}
      <div className="absolute inset-0 scan-lines" />
    </div>
  );
}
