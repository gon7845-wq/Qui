import { motion } from "framer-motion";

type Tone = "guilty" | "innocent" | "verdict";

interface Props {
  text: string;
  tone: Tone;
  size?: "sm" | "md" | "lg";
  delay?: number;
}

const styles: Record<Tone, { border: string; text: string; bg: string }> = {
  guilty: {
    border: "border-court-accuse",
    text: "text-court-accuse",
    bg: "bg-court-accuse/10",
  },
  innocent: {
    border: "border-court-parchment/60",
    text: "text-court-parchment/70",
    bg: "bg-court-ink/50",
  },
  verdict: {
    border: "border-court-brass",
    text: "text-court-brass",
    bg: "bg-court-brass/10",
  },
};

const sizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-xl px-3 py-1 tracking-[0.25em] border-2",
  md: "text-3xl px-5 py-2 tracking-[0.3em] border-4",
  lg: "text-6xl sm:text-7xl px-8 py-3 tracking-[0.35em] border-[6px]",
};

export function Stamp({ text, tone, size = "md", delay = 0 }: Props) {
  const s = styles[tone];
  return (
    <motion.div
      initial={{ scale: 3, rotate: 25, opacity: 0 }}
      animate={{ scale: 1, rotate: -8, opacity: 1 }}
      transition={{
        delay,
        duration: 0.35,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className={`inline-block font-gavel uppercase font-black select-none
        ${sizes[size]} ${s.border} ${s.text} ${s.bg}
        shadow-[0_0_40px_rgba(0,0,0,0.6)]
      `}
      style={{
        textShadow: "2px 2px 0 rgba(0,0,0,0.4)",
        filter: "contrast(1.1)",
      }}
    >
      {text}
    </motion.div>
  );
}
