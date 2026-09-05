import { Audio, staticFile, useVideoConfig } from "remotion";

/**
 * Musique de fond optionnelle. Aucune piste n'est fournie dans le dépôt (droits) :
 * dépose des MP3 libres de droits dans marketing/public/music/ et passe le nom en prop.
 * Fondu de sortie sur la dernière seconde.
 */
export function Music({ file, volume = 0.35 }: { file?: string | null; volume?: number }) {
  const { durationInFrames, fps } = useVideoConfig();
  if (!file) return null;
  return (
    <Audio
      src={staticFile(`music/${file}`)}
      volume={(f) => {
        const fadeOut = Math.max(0, Math.min(1, (durationInFrames - f) / fps));
        const fadeIn = Math.max(0, Math.min(1, f / (fps * 0.5)));
        return volume * fadeIn * fadeOut;
      }}
    />
  );
}
